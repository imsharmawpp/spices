# Deploying to Hostinger (WordPress / shared hosting — no VPS, no SSH needed)

This store is plain **PHP + MySQL + static assets**. The project root **is** the
web root, so you simply upload everything into `public_html` and it works at your
domain root — no `/public/` sub-folder, no document-root changes.

> Deploy with **File Manager** (or FTP) + **phpMyAdmin**. No command line required.

---

## 1. Database (you already created this)

| Setting | Value |
|---------|-------|
| Database | `u770423744_spices` |
| User | `u770423744_spices` |
| Password | `Spices@981` |
| Host | `localhost` (Hostinger uses `localhost`, not an IP) |

## 2. Import the data (phpMyAdmin)

1. hPanel → **Databases → phpMyAdmin** → open `u770423744_spices`.
2. **Import** tab → choose file **`database/spices_mysql.sql`** → **Import**.
3. You should end up with ~18 tables and the demo catalogue (14 spices,
   categories, reviews, coupons, an admin user).

> Empty tables only? Import `database/schema.mysql.sql` instead.

## 3. Upload the files — everything goes **inside `public_html`**

Put the **contents of this project** directly into `public_html` so the layout is:

```
public_html/                 ← your web root (the domain points here)
├── index.php                ← front controller
├── .htaccess                ← routing + security (already included)
├── index.html, shop…        ← all *.html pages
├── assets/                  ← css + js
├── app/                     ← backend code  (blocked from the web by .htaccess)
├── database/                ← schema + import file (blocked)
├── storage/                 ← writable cache/logs (blocked)
└── .env                     ← your config (blocked; see step 4)
```

> ⚠️ Important: upload the **files themselves** into `public_html`, not a folder
> containing them. If you see `your-site.com/public/index.html`, you uploaded one
> level too deep — move the files up so `index.php` sits directly in `public_html`.

The bundled `.htaccess` files already return **403** for `app/`, `database/`,
`storage/`, `.env` and any dotfile, so keeping them in the web root is safe.

## 4. Create the `.env` file (in `public_html`, next to `index.php`)

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

## 5. Test

Open your domain (e.g. `https://yellow-dogfish-518936.hostingersite.com/`):
- `/` → styled home page with product tiles
- `/shop` → catalogue with filters
- `/product/turmeric-powder` → product detail
- `/api/products` → JSON list (confirms PHP + DB are connected)

Demo logins: `maya@example.com` / `password` · admin role: `admin@saffra.test` / `admin123`.

### If the page looks unstyled / products don't load
- You're probably viewing `…/public/index.html`. Move the files so `index.php`
  is directly in `public_html` (see step 3) and open the domain root, not `/public/`.
- Make sure `.htaccess` uploaded (it's a hidden file — enable "show hidden files"
  in File Manager).

## 6. Sub-folder install (only if NOT at the domain root)

If the store must live at `yourdomain.com/spices`:
1. Upload the project contents into `public_html/spices/`.
2. In `.env` set `APP_BASE=/spices`.
3. In `public_html/spices/.htaccess` uncomment and set `RewriteBase /spices/`.

> A domain or **sub-domain root** is simpler and recommended.

---

## Local development

```bash
cp .env.example .env   # defaults to sqlite fallback; fine for local
php -S 127.0.0.1:8000 index.php   # run from the project root
# open http://127.0.0.1:8000
```

## Notes
- **Payments are mocked** — integrate a gateway before taking live orders.
- **Product images** are emoji/colour tiles; swap in real photos via `product_images`.
- Re-import to reset the catalogue (drop tables, repeat step 2).
