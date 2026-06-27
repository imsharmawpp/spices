# Deploying to Hostinger (WordPress / shared hosting — no VPS, no SSH needed)

This store is plain **PHP + MySQL + static assets**, so it runs on a standard
Apache shared-hosting plan. You deploy it with **File Manager** (or FTP) and
**phpMyAdmin** — no command line required.

> **Recommended:** host the store on its **own domain or sub-domain root** (e.g.
> `shop.yourdomain.com`). That keeps the links/assets working with no extra
> config. A sub-folder under an existing WordPress site is possible but needs
> the extra `APP_BASE` step in section 6.

---

## 1. Create the database (you already have this)

| Setting | Value |
|---------|-------|
| Database | `u770423744_spices` |
| User | `u770423744_spices` |
| Password | `Spices@981` |
| Host | `localhost` (Hostinger uses `localhost`, not an IP) |

## 2. Import the data (phpMyAdmin)

1. Hostinger panel → **Databases → phpMyAdmin** → open `u770423744_spices`.
2. Go to the **Import** tab.
3. Choose file: **`database/spices_mysql.sql`** (from this project).
4. Make sure format is **SQL** and charset is **utf8mb4**, then click **Import**.

This creates all tables and loads the demo catalog (14 spices, categories,
reviews, coupons, an admin user). You should see ~18 tables afterwards.

> If you only want empty tables, import `database/schema.mysql.sql` instead.

## 3. Upload the files

Using **File Manager** (or FTP), with the store on its own domain/sub-domain
whose document root is, say, `.../public_html`:

- Upload **everything inside the project's `public/` folder** into the web root
  (`public_html`) — this includes `index.php`, `.htaccess`, the `*.html` pages
  and the `assets/` folder.
- Upload the `app/` and `database/` folders **one level above** the web root
  (the same level as `public_html`, i.e. your account home directory).
- Create an empty `storage/` folder one level above the web root too.

Resulting layout:

```
/home/u770423744/
├── app/                 (backend code — not web-accessible)
├── database/            (schema + import file)
├── storage/             (writable; logs/cache; not web-accessible)
├── .env                 (your config — see step 4)
└── public_html/         (web root)
    ├── index.php
    ├── .htaccess
    ├── *.html
    └── assets/
```

The included `.htaccess` files already block direct web access to `app/`,
`database/` and `storage/` if they ever end up inside the web root.

## 4. Create the `.env` file

In the folder **one level above** `public_html` (next to `app/`), create a file
named `.env` with:

```
APP_ENV=production
APP_DEBUG=false
APP_BASE=

DB_DRIVER=mysql
DB_FALLBACK_SQLITE=false
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u770423744_spices
DB_USER=u770423744_spices
DB_PASS=Spices@981

CURRENCY=USD
CURRENCY_SYMBOL=$
PAYMENT_PROVIDER=mock
```

> The app reads `.env` from the project root (one level above `public_html`).
> Keep this file out of the web root. It is git-ignored on purpose.

## 5. Test

Visit your domain/sub-domain. You should see the storefront with products.
Quick checks:
- `https://your-site/` → home page with spices
- `https://your-site/shop` → catalogue with filters
- `https://your-site/api/products` → JSON list of products

Demo logins: `maya@example.com` / `password` · admin role: `admin@saffra.test` / `admin123`.

## 6. (Only if using a sub-folder, e.g. `yourdomain.com/spices`)

1. Put the `public/` contents into `public_html/spices/` and `app/`,`database/`,
   `storage/`,`.env` into `public_html/` (above the `spices` folder won't be
   above the web root, so rely on the bundled `.htaccess` deny rules).
2. In `.env` set `APP_BASE=/spices`.
3. In `public_html/spices/.htaccess` uncomment and set `RewriteBase /spices/`.

> Sub-folder hosting also requires the front-end asset/API paths to resolve from
> that sub-folder. The simplest, most reliable option remains a **sub-domain**.

---

## Notes
- **Payments are mocked** — no real charge is taken. Integrate a gateway
  (Razorpay/Stripe/PayPal) before taking live orders (see `docs/05-api-spec.md`).
- **Product images** are rendered as on-brand emoji/colour tiles; swap in real
  photography by populating `product_images` and updating the card/PDP rendering.
- To re-import a clean catalogue later, drop the tables and re-run step 2.
