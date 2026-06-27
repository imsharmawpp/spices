// Quick auth sanity check: refresh if needed and print the current user.
import { getCurrentUser } from "./canvaClient.js";
import { readTokens } from "./tokenStore.js";

async function main() {
  const tokens = readTokens();
  if (!tokens) {
    console.log("Not authenticated. Run `npm run auth:url`.");
    return;
  }
  console.log("Token scope:", tokens.scope);
  console.log("Expires at:", new Date(tokens.expires_at).toISOString());
  const me = await getCurrentUser();
  console.log("Authenticated user:", JSON.stringify(me, null, 2));
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
