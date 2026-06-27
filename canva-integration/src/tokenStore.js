// Token persistence + automatic refresh against the Canva token endpoint.
import fs from "node:fs";
import { API_BASE, PATHS, config } from "./config.js";

function basicAuthHeader() {
  const creds = `${config.clientId}:${config.clientSecret}`;
  return `Basic ${Buffer.from(creds).toString("base64")}`;
}

export function readTokens() {
  if (!fs.existsSync(PATHS.tokens)) return null;
  return JSON.parse(fs.readFileSync(PATHS.tokens, "utf8"));
}

export function writeTokens(tokenResponse) {
  // Persist with an absolute expiry so we can refresh proactively.
  const expiresAt = Date.now() + (tokenResponse.expires_in ?? 0) * 1000;
  const record = {
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token,
    token_type: tokenResponse.token_type,
    scope: tokenResponse.scope,
    expires_at: expiresAt,
    obtained_at: Date.now(),
  };
  fs.writeFileSync(PATHS.tokens, JSON.stringify(record, null, 2));
  return record;
}

/** Exchange an authorization code for tokens (basic auth). */
export async function exchangeAuthorizationCode({ code, codeVerifier }) {
  // NOTE: We intentionally do NOT send redirect_uri here. The authorize URL
  // already pins the redirect, and Canva's token endpoint rejects an explicit
  // redirect_uri that doesn't byte-match its normalized form. Omitting it lets
  // Canva use the single registered redirect, which is the robust path.
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
  });
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Token exchange failed (${res.status}): ${JSON.stringify(json)}`
    );
  }
  return writeTokens(json);
}

/** Exchange the stored refresh token for a fresh access token. */
export async function refreshAccessToken() {
  const tokens = readTokens();
  if (!tokens?.refresh_token) {
    throw new Error("No refresh token on disk. Run `npm run auth:url` first.");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
  });
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Token refresh failed (${res.status}): ${JSON.stringify(json)}. ` +
        "You may need to re-authorize with `npm run auth:url`."
    );
  }
  return writeTokens(json);
}

/**
 * Return a valid access token, refreshing if it expires within 60s.
 * This is what every API call should use.
 */
export async function getValidAccessToken() {
  let tokens = readTokens();
  if (!tokens) {
    throw new Error(
      "Not authenticated. Run `npm run auth:url`, authorize, then `npm run auth:token`."
    );
  }
  const aboutToExpire = Date.now() > tokens.expires_at - 60_000;
  if (aboutToExpire) {
    tokens = await refreshAccessToken();
  }
  return tokens.access_token;
}
