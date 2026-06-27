# Spices — Canva Connect integration

A small, **reusable** Node.js integration that authenticates a Canva user via
OAuth 2.0 (Authorization Code + PKCE) and uses the [Canva Connect REST API](https://www.canva.dev/docs/connect/)
to create designs and export them as PNGs — used here to produce dhaniya
(coriander) powder product images.

Zero npm dependencies — it uses Node's built-in `fetch` and `crypto`.
Requires **Node 18+** (20+ recommended).

## What this can and can't do

The Connect API does **not** generate images from a text prompt. It can:

- **`asset` mode** (any Canva plan): upload a base photo, place it in a
  correctly-sized design, and export a PNG. Output = your photo as a product image.
- **`autofill` mode** (best output, **requires Canva Enterprise** or a limited
  trial on paid plans): fill a **Brand Template** you design once in Canva — with
  text + image placeholders — then export. This is how you get branded layouts
  (name, weight, tagline, packshot) generated programmatically.
- **`blank` mode**: create empty designs and export — only useful to smoke-test
  the pipeline.

## One-time setup in the Canva Developer Portal

1. Enable MFA on your Canva account (required to create integrations).
2. Go to [Your integrations](https://www.canva.com/developers/integrations) →
   **Create an integration** (Public or Private).
3. On **Configure**: copy the **Client ID**, click **Generate secret** and copy
   the **Client secret** (shown once; starts with `cnvca`).
4. On **Scopes**, enable at least:
   `design:content:read`, `design:content:write`, `design:meta:read`,
   `asset:read`, `asset:write`, `profile:read`
   (add `brandtemplate:meta:read`, `brandtemplate:content:read` for autofill).
5. On **Authentication → Authorized redirects**, add:
   `http://127.0.0.1:8910/callback`
   (`localhost` is not allowed; a loopback IP is fine for this CLI flow).

## Configure locally

```bash
cp .env.example .env
# then fill in CANVA_CLIENT_ID and CANVA_CLIENT_SECRET
```

## Authorize (OAuth)

```bash
npm run auth:url
```

This prints an authorization URL. Open it in your browser and click **Allow**.
Canva redirects you to `http://127.0.0.1:8910/callback?code=...&state=...` — the
page may show a connection error (there's no local server), which is expected.
Copy the full address-bar URL and run:

```bash
npm run auth:token -- "<paste the redirected URL here>"
```

Tokens (including the refresh token) are saved to `.tokens.json` and refreshed
automatically. Re-authorization is only needed if the refresh token is revoked.

Verify anytime with:

```bash
npm run auth:status
```

## Generate the product images

Edit `products.json` to taste, then:

```bash
# asset mode: put base photos at assets/dhaniya-1.jpg ... and set CANVA_GENERATE_MODE=asset
npm run generate
```

PNGs are written to `output/`. For `autofill` mode, set
`CANVA_GENERATE_MODE=autofill` and `CANVA_BRAND_TEMPLATE_ID`, and make the field
keys in `products.json` (`autofillData`) match your template's dataset
(see [Get brand template dataset](https://www.canva.dev/docs/connect/api-reference/brand-templates/get-brand-template-dataset/)).

## Files

| File | Purpose |
| --- | --- |
| `src/config.js` | Loads `.env`, paths, constants |
| `src/pkce.js` | PKCE `code_verifier`/`code_challenge`/`state` |
| `src/tokenStore.js` | Token exchange, refresh, persistence |
| `src/authUrl.js` | Build the authorization URL (`npm run auth:url`) |
| `src/exchangeCode.js` | Exchange the code for tokens (`npm run auth:token`) |
| `src/status.js` | Auth sanity check (`npm run auth:status`) |
| `src/canvaClient.js` | REST wrapper: assets, designs, autofill, export |
| `src/generateImages.js` | Orchestrates create + export (`npm run generate`) |
| `products.json` | Product definitions for the 3 images |

## Security notes

- `.env`, `.tokens.json`, `.auth-session.json` and `output/` are git-ignored.
- The client secret and tokens never leave your machine. Token exchange uses
  HTTP Basic auth and must run from a backend (never a browser), per Canva's
  CORS policy.
