// Minimal, dependency-free environment + path helpers.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

/**
 * Tiny .env parser so the project has zero npm dependencies.
 * Supports `KEY=value` lines and `#` comments. Does not do shell expansion.
 */
function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

function required(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return v;
}

export const config = {
  get clientId() {
    return required("CANVA_CLIENT_ID");
  },
  get clientSecret() {
    return required("CANVA_CLIENT_SECRET");
  },
  get redirectUri() {
    return process.env.CANVA_REDIRECT_URI || "http://127.0.0.1:8910/callback";
  },
  get scopes() {
    return (
      process.env.CANVA_SCOPES ||
      "design:content:read design:content:write design:meta:read asset:read asset:write profile:read"
    );
  },
  get generateMode() {
    return (process.env.CANVA_GENERATE_MODE || "asset").toLowerCase();
  },
  get brandTemplateId() {
    return process.env.CANVA_BRAND_TEMPLATE_ID || "";
  },
  get imageWidth() {
    return Number(process.env.CANVA_IMAGE_WIDTH || 1080);
  },
  get imageHeight() {
    return Number(process.env.CANVA_IMAGE_HEIGHT || 1080);
  },
};

export const PATHS = {
  tokens: path.join(ROOT, ".tokens.json"),
  authSession: path.join(ROOT, ".auth-session.json"),
  output: path.join(ROOT, "output"),
  products: path.join(ROOT, "products.json"),
};

export const API_BASE = "https://api.canva.com/rest/v1";
export const AUTH_BASE = "https://www.canva.com/api/oauth/authorize";
