# Proposed Folder Structure — Spices D2C E-commerce Platform

> **Document status:** Draft v1.0 (planning)
> **Last updated:** 2026-06-27

This is the **proposed** repository layout to be created in Phase 0. Nothing here
is built yet — it is the blueprint the team will scaffold against.

---

## 1. Top-Level Layout

```
spices/
├── docs/                     # Planning & reference docs (this folder)
│   ├── 01-project-plan.md
│   ├── 02-requirements.md
│   ├── 03-tech-stack-architecture.md
│   ├── 04-database-schema.md
│   ├── 05-api-spec.md
│   ├── 06-folder-structure.md
│   └── 07-roadmap.md
│
├── public/                   # Web root (served by Nginx/Apache)
│   ├── index.php             # Front controller -> routes API + serves pages
│   ├── .htaccess             # (Apache) rewrite to index.php
│   ├── assets/
│   │   ├── css/
│   │   │   ├── tokens.css     # design tokens (colors, spacing, type)
│   │   │   ├── base.css       # reset + base elements
│   │   │   ├── components.css # buttons, cards, forms, nav
│   │   │   └── pages.css      # page-specific styles
│   │   ├── js/
│   │   │   ├── api.js         # fetch() wrapper (base URL, auth, errors)
│   │   │   ├── cart.js        # cart state + UI
│   │   │   ├── catalog.js     # product list/filter/search
│   │   │   ├── product.js     # product detail (variant select, add to cart)
│   │   │   ├── checkout.js    # checkout flow + payment
│   │   │   ├── auth.js        # login/register/forms
│   │   │   └── main.js        # bootstraps page modules
│   │   └── images/            # static brand images, icons
│   └── pages/                # storefront HTML (or PHP-rendered templates)
│       ├── index.html        # home
│       ├── category.html     # category listing
│       ├── product.html      # product detail
│       ├── cart.html
│       ├── checkout.html
│       ├── account/          # login, register, profile, orders
│       └── static/           # about, contact, faq, policies
│
├── app/                      # PHP backend (not web-accessible)
│   ├── Config/               # app config loaders (reads .env)
│   ├── Core/                 # Router, Request, Response, Middleware base, DB (PDO)
│   ├── Middleware/           # Auth, AdminOnly, Csrf, RateLimit, Json, Cors
│   ├── Controllers/
│   │   ├── Storefront/       # Catalog, Cart, Auth, Account, Checkout, Order, Payment
│   │   └── Admin/            # Product, Category, Order, Coupon, Customer, Dashboard
│   ├── Services/             # PricingService, StockService, OrderService, AuthService, MailService, CouponService, PaymentService
│   ├── Repositories/         # ProductRepo, OrderRepo, UserRepo, ... (PDO queries)
│   ├── Models/               # plain data objects / entities
│   ├── Support/              # helpers: validation, slugify, money, response envelope
│   └── routes.php            # route definitions (maps to API spec)
│
├── database/
│   ├── migrations/           # versioned SQL (0001_init.sql, 0002_*.sql, ...)
│   ├── seeds/                # seed data scripts (categories, demo products, admin)
│   └── schema.sql            # generated full schema snapshot (optional)
│
├── storage/                  # runtime files (NOT in web root)
│   ├── uploads/products/     # product images
│   ├── logs/                 # app logs
│   └── cache/                # cached views/objects (later)
│
├── tests/                    # PHPUnit (backend) + JS tests (added in QA phase)
│   ├── Unit/
│   └── Feature/
│
├── .kiro/
│   └── steering/             # project conventions for Kiro (added in Phase 0)
│
├── .env.example              # template for env vars (committed)
├── .env                      # real secrets (gitignored, NOT committed)
├── .gitignore
├── composer.json             # PHP deps + PSR-4 autoload
├── composer.lock
├── docker-compose.yml        # local dev: php-fpm + mysql + nginx (optional)
└── README.md
```

---

## 2. Notes & Rationale

- **`public/` is the only web-accessible directory.** Everything sensitive
  (`app/`, `database/`, `storage/`, `.env`) sits outside the web root so it can
  never be served directly. The web server points its document root at `public/`.
- **Front controller pattern:** all requests hit `public/index.php`, which routes
  `/api/*` to the backend and serves storefront pages. Clean URLs via rewrite rules.
- **Separation of concerns:** Controllers (HTTP) → Services (business logic) →
  Repositories (DB). Matches the architecture in [03](03-tech-stack-architecture.md).
- **Frontend is plain HTML/CSS/JS** under `public/`, talking to the API via
  `assets/js/api.js`. Pages can also be PHP templates if server-side rendering of
  SEO pages is preferred — decide in Phase 2.
- **Migrations & seeds** live in `database/` and are version-controlled so any
  environment can be rebuilt deterministically.
- **`storage/`** holds uploads/logs/cache and must be writable by PHP but not
  publicly served (serve images via a controlled route or symlink a public subset).

### If using Slim 4 (recommended)
- `public/index.php` bootstraps the Slim app and loads `app/routes.php`.
- Middleware registered on the Slim app; PSR-4 autoload via Composer (`app/` → `App\`).

### If using Laravel (alternative)
- Replace `app/`, `routes.php`, `public/index.php` with Laravel's structure
  (`app/Http/Controllers`, `routes/api.php`, `resources/`, `database/migrations`).
  The conceptual mapping (controllers/services/repos, migrations, public assets)
  remains the same.

---

## 3. Naming Conventions

| Thing | Convention | Example |
|-------|------------|---------|
| PHP classes | PascalCase, PSR-4 | `OrderService.php` |
| PHP namespaces | `App\...` | `App\Controllers\Storefront` |
| DB tables/columns | snake_case | `product_variants`, `stock_qty` |
| JS files/modules | camelCase or kebab | `cart.js`, `api.js` |
| CSS classes | BEM-ish / kebab | `.product-card__price` |
| Routes | kebab, plural nouns | `/api/products`, `/api/account/addresses` |
| Env vars | UPPER_SNAKE | `DB_HOST`, `PAYMENT_SECRET` |

---

## 4. `.env.example` (planned keys)

```
APP_ENV=local
APP_URL=http://localhost:8080
APP_KEY=

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=spices
DB_USER=spices
DB_PASS=

MAIL_HOST=
MAIL_PORT=587
MAIL_USER=
MAIL_PASS=
MAIL_FROM="Spices Store <no-reply@example.com>"

PAYMENT_PROVIDER=razorpay
PAYMENT_KEY=
PAYMENT_SECRET=
PAYMENT_WEBHOOK_SECRET=

CURRENCY=INR
```

> Actual secret values go only in `.env` (gitignored). Commit `.env.example` only.
