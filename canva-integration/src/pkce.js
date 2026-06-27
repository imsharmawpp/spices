// PKCE (RFC 7636) + state helpers for the OAuth 2.0 Authorization Code flow.
import crypto from "node:crypto";

/** High-entropy, URL-safe random string (used for code_verifier and state). */
export function randomUrlSafe(bytes = 96) {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Derive the S256 code_challenge from a code_verifier. */
export function codeChallengeFromVerifier(codeVerifier) {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

/** Generate a fresh { codeVerifier, codeChallenge, state } triple. */
export function createPkcePair() {
  const codeVerifier = randomUrlSafe(96);
  const codeChallenge = codeChallengeFromVerifier(codeVerifier);
  const state = randomUrlSafe(96);
  return { codeVerifier, codeChallenge, state };
}
