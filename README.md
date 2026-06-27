# Saffra Spices — D2C E-commerce Store

A Direct-to-Consumer online store for a spices company.

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Backend | PHP 8.1+ (custom micro-framework, no runtime dependencies) |
| Database | SQL via PDO — **SQLite** out of the box, **MySQL/MariaDB**-ready for production |
| Web server | PHP built-in server (dev) · Nginx/Apache + PHP-FPM (production) |

> The UI/UX is modelled on the editorial [Xclusive Couture](https://theme-xclusive-couture.myshopify.com/) theme, adapted into a warm, spice-led brand. Product imagery is rendered as on-brand emoji/colour tiles (no licensed photography is bundled).

---

## Quick start (local)

Requirements: PHP 8.1+ with `pdo_sqlite` (PHP 8.4 used in development).

```bash
# 1. From the project root
cp .env.example .env          # optional — sensible defaults are used if absent

# 2. Start the dev server (the project root IS the web root)
php -S 127.0.0.1:8000 index.php

# 3. Open the store
#    http://127.0.0.1:8000
```

The SQLite database is created and seeded automatically at `storage/database.sqlite`
on the first API request if it doesn't exist. To reset, delete that file.

### Demo accounts & codes
- **Customer:** `maya@example.com` / `password`
- **Admin (role only):** `admin@saffra.test` / `admin123`
- **Coupons:** `WELCOME10` (10% off) · `SAVE100` (₹100 off orders over ₹799)

---

## What's implemented

**Storefront (Pillars 1–3, 5)**
- Home with hero, bestsellers, category tiles, new arrivals, gift promo, UGC strip, newsletter.
- Shop/collection with category, form & organic filters, sorting, pagination, search.
- Product detail: variants, quantity, gallery, accordions, reviews, related products, wishlist.
- Slide-in cart drawer + full cart page with live, **server-computed** totals.
- Coupon codes, free-shipping threshold, tax calculation.
- Guest + registered checkout, atomic stock decrement, order confirmation & tracking.
- Accounts: register/login/logout, order history.
- Contact form, newsletter signup, responsive design, accessibility (skip links, semantics).

**Backend (Pillar 4 foundations)**
- JSON REST API (`/api/*`) following [docs/05-api-spec.md](docs/05-api-spec.md).
- PDO data layer (SQLite/MySQL), prepared statements, transactional order placement.
- Session auth with guest-cart merge on login; mock payment capture.

See **[docs/](docs/README.md)** for the full plan, requirements, schema, API spec, UI/UX and roadmap.

---

## Project structure

The project root is the **web root** (so it deploys straight into `public_html`).
Backend folders sit alongside and are blocked from the web by `.htaccess`.

```
spices/  (= public_html on the host)
├── index.php             # front controller (API + clean-URL page routing)
├── .htaccess             # routing + security (blocks app/database/storage/.env)
├── *.html                # storefront pages
├── assets/{css,js}/      # design system + page modules
├── app/                  # PHP backend (Core, Controllers, Services, Support) — web-blocked
│   ├── Core/             # Database (PDO), Router, Request, Response
│   ├── Controllers/      # Catalog, Cart, Auth, Checkout, Misc
│   ├── Services/         # CartService (totals), Settings
│   └── routes.php        # API route table
├── database/             # schema (sqlite + mysql) + seed + phpMyAdmin import — web-blocked
│   ├── schema.mysql.sql
│   ├── spices_mysql.sql  # ready-to-import dump (schema + demo catalogue)
│   └── migrate.php
├── storage/              # SQLite db, logs, cache (gitignored, web-blocked)
├── docs/                 # planning & reference documentation
├── .env                  # config/secrets (gitignored, web-blocked)
└── composer.json         # PSR-4 autoload + helper scripts
```

## Deploying to live hosting (Hostinger / shared / WordPress plan)

No VPS or SSH required — deploy with File Manager + phpMyAdmin. Full step-by-step
in **[DEPLOY.md](DEPLOY.md)**. In short:

1. **Import** `database/spices_mysql.sql` into your MySQL database via phpMyAdmin.
2. **Upload** the contents of `public/` to your web root, and `app/` + `database/`
   + `storage/` one level above it.
3. **Create `.env`** (above the web root) with your DB credentials and `DB_DRIVER=mysql`.
4. The bundled `.htaccess` handles clean URLs and protects backend folders.

> Recommended: host on a domain or **sub-domain root** so asset/API paths resolve cleanly.

## Switching to MySQL

Set `DB_DRIVER=mysql` and the `DB_*` values in `.env`. The app is driver-agnostic
(PDO). Two ways to create the schema:
- **phpMyAdmin import:** `database/spices_mysql.sql` (schema + demo catalogue) — best for shared hosting.
- **CLI (if available):** `php database/migrate.php` (uses `database/schema.mysql.sql`).

`DB_FALLBACK_SQLITE=true` lets the app fall back to SQLite when MySQL is
unreachable (useful locally); set it to `false` in production.

## Notes & next steps
- Payments are mocked for the demo; integrate a real gateway + webhook (see [docs/05 §2.5](docs/05-api-spec.md)).
- A full admin UI, photo reviews, live chat and AI recommendations are planned — see the [roadmap](docs/07-roadmap.md) and [pillars map](docs/09-feature-pillars.md).
