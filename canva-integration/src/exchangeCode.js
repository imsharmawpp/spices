// Step 2 of OAuth: exchange the authorization code for tokens.
import fs from "node:fs";
import { PATHS } from "./config.js";
import { exchangeAuthorizationCode } from "./tokenStore.js";

/** Accept either a raw code or the full redirected URL and extract code+state. */
function parseArg(arg) {
  if (!arg) return {};
  if (arg.includes("code=") || arg.startsWith("http")) {
    try {
      const u = new URL(arg, "http://127.0.0.1");
      return {
        code: u.searchParams.get("code") ?? undefined,
        state: u.searchParams.get("state") ?? undefined,
      };
    } catch {
      /* fall through */
    }
  }
  return { code: arg };
}

async function main() {
  // Accept the code via CLI arg, or from the CANVA_AUTH_CODE secret/env var
  // (full redirected URL or bare code). This avoids pasting tokens in chat.
  const arg = process.argv[2] || process.env.CANVA_AUTH_CODE;
  const { code, state } = parseArg(arg);

  if (!code) {
    console.error(
      'Usage: npm run auth:token -- "<redirected URL or code>"\n' +
        "Run `npm run auth:url` first if you don't have a code yet."
    );
    process.exit(1);
  }

  if (!fs.existsSync(PATHS.authSession)) {
    console.error("No auth session found. Run `npm run auth:url` first.");
    process.exit(1);
  }
  const session = JSON.parse(fs.readFileSync(PATHS.authSession, "utf8"));

  // CSRF protection: verify state if the redirect provided one.
  if (state && session.state && state !== session.state) {
    console.error("State mismatch — aborting for security. Re-run auth:url.");
    process.exit(1);
  }

  const record = await exchangeAuthorizationCode({
    code,
    codeVerifier: session.codeVerifier,
  });

  // The auth session is single-use; remove it.
  fs.rmSync(PATHS.authSession, { force: true });

  console.log("\n✅ Authenticated. Tokens saved to .tokens.json");
  console.log("   scope:", record.scope);
  console.log(
    "   access token expires:",
    new Date(record.expires_at).toISOString()
  );
  console.log("\nNext: npm run generate\n");
}

main().catch((err) => {
  console.error("\n❌", err.message);
  process.exit(1);
});
