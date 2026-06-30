# Database Schema — Spices D2C E-commerce Platform

> **Document status:** Draft v1.0 (planning)
> **Engine:** MySQL 8.0 / MariaDB 10.5+ · InnoDB · `utf8mb4`
> **Last updated:** 2026-06-27

This is the **data model design**. The SQL below is a reference DDL for planning
and review — it is intended to seed the first migration in Phase 1, not to be run
as application code yet.

---

## 1. Entity Overview

```
users ───< addresses
users ───< orders ───< order_items >─── product_variants >─── products >─── categories
users ───< reviews >─── products
users ───< cart (carts ───< cart_items)
products ───< product_images
products ───< product_variants
coupons ──< (applied to) orders
orders ───< payments
orders ───< order_status_history
```

Legend: `A ───< B` = one A has many B.

---

## 2. Tables

### 2.1 users
Stores customers and admins (role-based).

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| name | VARCHAR(120) | |
| email | VARCHAR(190) UNIQUE | login id |
| phone | VARCHAR(20) NULL | |
| password_hash | VARCHAR(255) | `password_hash()` output |
| role | ENUM('customer','admin') | default 'customer' |
| email_verified_at | DATETIME NULL | |
| status | ENUM('active','blocked') | default 'active' |
| created_at / updated_at | DATETIME | |

### 2.2 addresses
Multiple shipping/billing addresses per user.

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| user_id | BIGINT UNSIGNED FK→users.id | |
| label | VARCHAR(50) | e.g., Home, Work |
| recipient_name | VARCHAR(120) | |
| phone | VARCHAR(20) | |
| line1 / line2 | VARCHAR(190) | |
| city | VARCHAR(80) | |
| state | VARCHAR(80) | |
| postal_code | VARCHAR(20) | |
| country | VARCHAR(2) | ISO code |
| is_default | TINYINT(1) | |
| created_at / updated_at | DATETIME | |

### 2.3 categories
Spice categories (e.g., Whole Spices, Ground, Blends, Gift Sets). Self-referencing for sub-categories.

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| parent_id | BIGINT UNSIGNED NULL FK→categories.id | nested categories |
| name | VARCHAR(120) | |
| slug | VARCHAR(140) UNIQUE | SEO URL |
| description | TEXT NULL | |
| image_path | VARCHAR(255) NULL | |
| sort_order | INT | default 0 |
| is_active | TINYINT(1) | default 1 |
| created_at / updated_at | DATETIME | |

### 2.4 products
Base product (e.g., "Turmeric Powder"). Sellable units are `product_variants`.

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| category_id | BIGINT UNSIGNED FK→categories.id | |
| name | VARCHAR(160) | |
| slug | VARCHAR(180) UNIQUE | |
| short_description | VARCHAR(300) NULL | |
| description | TEXT NULL | |
| origin | VARCHAR(120) NULL | sourcing region |
| is_organic | TINYINT(1) | default 0 |
| form | ENUM('whole','ground','blend','other') NULL | |
| rating_avg | DECIMAL(3,2) | denormalized, default 0 |
| rating_count | INT | default 0 |
| is_active | TINYINT(1) | default 1 |
| is_featured | TINYINT(1) | default 0 |
| created_at / updated_at | DATETIME | |

### 2.5 product_variants
The actual SKU sold (e.g., 100g / 250g / 500g). **Price & stock live here.**

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| product_id | BIGINT UNSIGNED FK→products.id | |
| sku | VARCHAR(64) UNIQUE | |
| name | VARCHAR(80) | e.g., "250g" |
| weight_grams | INT NULL | for shipping calc |
| price | DECIMAL(10,2) | selling price |
| compare_at_price | DECIMAL(10,2) NULL | for "was" pricing |
| stock_qty | INT | default 0 |
| is_active | TINYINT(1) | default 1 |
| created_at / updated_at | DATETIME | |

### 2.6 product_images

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| product_id | BIGINT UNSIGNED FK→products.id | |
| path | VARCHAR(255) | |
| alt_text | VARCHAR(160) NULL | accessibility/SEO |
| is_primary | TINYINT(1) | default 0 |
| sort_order | INT | default 0 |

### 2.7 carts & cart_items
Server-side cart for logged-in users (guests use localStorage; merged on login).

**carts**
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| user_id | BIGINT UNSIGNED NULL FK→users.id | |
| session_token | VARCHAR(64) NULL | for guest persistence |
| created_at / updated_at | DATETIME | |

**cart_items**
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| cart_id | BIGINT UNSIGNED FK→carts.id | |
| variant_id | BIGINT UNSIGNED FK→product_variants.id | |
| quantity | INT | ≥ 1 |
| UNIQUE | (cart_id, variant_id) | one line per variant |

### 2.8 orders
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| order_number | VARCHAR(20) UNIQUE | human-friendly, e.g., SP-2026-000123 |
| user_id | BIGINT UNSIGNED NULL FK→users.id | null for guest |
| email | VARCHAR(190) | snapshot |
| status | ENUM('pending','paid','packed','shipped','delivered','cancelled','refunded') | default 'pending' |
| subtotal | DECIMAL(10,2) | |
| discount_total | DECIMAL(10,2) | default 0 |
| shipping_total | DECIMAL(10,2) | default 0 |
| tax_total | DECIMAL(10,2) | default 0 |
| grand_total | DECIMAL(10,2) | |
| coupon_id | BIGINT UNSIGNED NULL FK→coupons.id | |
| shipping_address_json | JSON | snapshot at purchase time |
| billing_address_json | JSON NULL | |
| tracking_number | VARCHAR(80) NULL | |
| placed_at | DATETIME | |
| created_at / updated_at | DATETIME | |

> Address is **snapshotted as JSON** so later edits to the address book don't
> mutate historical orders.

### 2.9 order_items
Line items snapshot product/variant details at purchase time.

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| order_id | BIGINT UNSIGNED FK→orders.id | |
| variant_id | BIGINT UNSIGNED NULL FK→product_variants.id | nullable if variant later deleted |
| product_name | VARCHAR(160) | snapshot |
| variant_name | VARCHAR(80) | snapshot |
| sku | VARCHAR(64) | snapshot |
| unit_price | DECIMAL(10,2) | snapshot |
| quantity | INT | |
| line_total | DECIMAL(10,2) | |

### 2.10 payments
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| order_id | BIGINT UNSIGNED FK→orders.id | |
| provider | VARCHAR(40) | e.g., razorpay/stripe |
| provider_payment_id | VARCHAR(120) NULL | gateway reference |
| method | VARCHAR(40) NULL | card/upi/cod |
| amount | DECIMAL(10,2) | |
| currency | VARCHAR(3) | e.g., INR/USD |
| status | ENUM('initiated','authorized','captured','failed','refunded') | |
| raw_response_json | JSON NULL | for audit/debug (no full card data) |
| created_at / updated_at | DATETIME | |

### 2.11 order_status_history
Audit trail for status changes (FR-28, security audit).

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| order_id | BIGINT UNSIGNED FK→orders.id | |
| from_status | VARCHAR(20) NULL | |
| to_status | VARCHAR(20) | |
| changed_by | BIGINT UNSIGNED NULL FK→users.id | admin/user/system |
| note | VARCHAR(255) NULL | |
| created_at | DATETIME | |

### 2.12 coupons
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| code | VARCHAR(40) UNIQUE | |
| type | ENUM('percent','fixed') | |
| value | DECIMAL(10,2) | percent or amount |
| min_order_total | DECIMAL(10,2) NULL | |
| max_discount | DECIMAL(10,2) NULL | cap for percent |
| usage_limit | INT NULL | total redemptions |
| used_count | INT | default 0 |
| starts_at / expires_at | DATETIME NULL | |
| is_active | TINYINT(1) | default 1 |

### 2.13 reviews
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| product_id | BIGINT UNSIGNED FK→products.id | |
| user_id | BIGINT UNSIGNED FK→users.id | |
| rating | TINYINT | 1–5 |
| title | VARCHAR(120) NULL | |
| body | TEXT NULL | |
| is_approved | TINYINT(1) | default 0 (moderation) |
| created_at | DATETIME | |
| UNIQUE | (product_id, user_id) | one review per user/product |

### 2.14 wishlists (Pillar 1 — FR-45)
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK AI | |
| user_id | BIGINT UNSIGNED FK→users.id | |
| product_id | BIGINT UNSIGNED FK→products.id | |
| created_at | DATETIME | |
| UNIQUE | (user_id, product_id) | one entry per product |

> Guests' wishlists persist in `localStorage` and merge into this table on login
> (same pattern as the cart).

### 2.15 Supporting tables
- **password_resets** (`email`, `token_hash`, `expires_at`).
- **newsletter_subscribers** (`email` UNIQUE, `subscribed_at`).
- **contact_messages** (`name`, `email`, `subject`, `message`, `created_at`).
- **settings** (`key` UNIQUE, `value` JSON) — store config like shipping rules, tax rates, homepage sections/banners.
- **review_images** (`review_id` FK→reviews.id, `path`) — photo reviews (FR-49).
- _(Future)_ **loyalty_accounts / loyalty_transactions** — rewards program (FR-50).

---

## 3. Indexing Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| products | `slug` (unique), `category_id`, `is_active, is_featured` | catalog/listing |
| product_variants | `product_id`, `sku` (unique) | product detail, lookups |
| orders | `order_number` (unique), `user_id`, `status`, `placed_at` | admin queue, history |
| order_items | `order_id`, `variant_id` | order detail |
| reviews | `product_id, is_approved` | product reviews |
| categories | `slug` (unique), `parent_id` | nav |
| coupons | `code` (unique) | checkout lookup |

Add full-text index on `products(name, short_description, description)` for search (FR-5),
or use `LIKE`-based search for MVP.

---

## 4. Integrity & Transactions

- All FKs use InnoDB with appropriate `ON DELETE` rules:
  - `order_items.variant_id` → `ON DELETE SET NULL` (preserve history).
  - `cart_items.variant_id` → `ON DELETE CASCADE`.
  - `addresses.user_id` → `ON DELETE CASCADE`.
- **Order placement** runs in a single transaction: validate stock → insert order
  → insert items → decrement `stock_qty` → record payment intent. Roll back on any failure.
- Prevent overselling with a conditional update:
  `UPDATE product_variants SET stock_qty = stock_qty - :qty WHERE id = :id AND stock_qty >= :qty;`
  and verify affected rows = 1.

---

## 5. Reference DDL (excerpt)

> Full DDL becomes `database/migrations/0001_init.sql` in Phase 1. Excerpt shown for review.

```sql
CREATE TABLE users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(190) NOT NULL,
  phone           VARCHAR(20) NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  email_verified_at DATETIME NULL,
  status          ENUM('active','blocked') NOT NULL DEFAULT 'active',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id       BIGINT UNSIGNED NOT NULL,
  name              VARCHAR(160) NOT NULL,
  slug              VARCHAR(180) NOT NULL,
  short_description VARCHAR(300) NULL,
  description       TEXT NULL,
  origin            VARCHAR(120) NULL,
  is_organic        TINYINT(1) NOT NULL DEFAULT 0,
  form              ENUM('whole','ground','blend','other') NULL,
  rating_avg        DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count      INT NOT NULL DEFAULT 0,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  is_featured       TINYINT(1) NOT NULL DEFAULT 0,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  KEY idx_products_category (category_id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_variants (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id       BIGINT UNSIGNED NOT NULL,
  sku              VARCHAR(64) NOT NULL,
  name             VARCHAR(80) NOT NULL,
  weight_grams     INT NULL,
  price            DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2) NULL,
  stock_qty        INT NOT NULL DEFAULT 0,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_variant_sku (sku),
  KEY idx_variant_product (product_id),
  CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 6. Seed Data (planning)

For dev/demo, seed: 4–6 categories, ~20 products with 2–3 variants each, an admin
user, a sample coupon, and a few reviews. Seed scripts go in `database/seeds/`.
