// Step 1 of OAuth: build the authorization URL and persist the PKCE session.
import fs from "node:fs";
import { AUTH_BASE, PATHS, config } from "./config.js";
import { createPkcePair } from "./pkce.js";

function main() {
  const { codeVerifier, codeChallenge, state } = createPkcePair();

  // Persist the verifier + state so the token-exchange step can read them.
  fs.writeFileSync(
    PATHS.authSession,
    JSON.stringify({ codeVerifier, state, createdAt: Date.now() }, null, 2)
  );

  const params = new URLSearchParams({
    code_challenge: codeChallenge,
    code_challenge_method: "s256",
    scope: config.scopes,
    response_type: "code",
    client_id: config.clientId,
    state,
    redirect_uri: config.redirectUri,
  });

  const url = `${AUTH_BASE}?${params.toString()}`;

  console.log("\n=== Canva authorization ===\n");
  console.log("1. Open this URL in your browser and click Allow:\n");
  console.log(url + "\n");
  console.log(
    "2. Your browser will redirect to:\n   " +
      config.redirectUri +
      "?code=...&state=...\n" +
      "   (the page may show a connection error — that's fine, it's a loopback URL)\n"
  );
  console.log(
    "3. Copy the FULL redirected URL (or just the `code` value) and run:\n" +
      '   npm run auth:token -- "<paste the redirected URL or code here>"\n'
  );
}

main();
