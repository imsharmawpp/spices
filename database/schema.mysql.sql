-- MySQL / MariaDB schema for Saffra Spices (production).
-- Mirrors the SQLite schema and the design in docs/04-database-schema.md.
-- Charset utf8mb4 so emoji/all scripts import cleanly.
-- Demo-only columns (emoji, accent_color) render placeholder tiles when no photos exist.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS wishlists;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS newsletter_subscribers;
DROP TABLE IF EXISTS contact_messages;
DROP TABLE IF EXISTS settings;

CREATE TABLE settings (
  `key`  VARCHAR(191) NOT NULL,
  value  TEXT,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  phone         VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'customer',
  status        VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE addresses (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  label          VARCHAR(50) NULL,
  recipient_name VARCHAR(120) NOT NULL,
  phone          VARCHAR(20) NULL,
  line1          VARCHAR(190) NOT NULL,
  line2          VARCHAR(190) NULL,
  city           VARCHAR(80) NOT NULL,
  state          VARCHAR(80) NULL,
  postal_code    VARCHAR(20) NOT NULL,
  country        VARCHAR(2) NOT NULL DEFAULT 'US',
  is_default     TINYINT NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_addresses_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id    BIGINT UNSIGNED NULL,
  name         VARCHAR(120) NOT NULL,
  slug         VARCHAR(140) NOT NULL,
  description  TEXT NULL,
  emoji        VARCHAR(16) NULL,
  accent_color VARCHAR(16) NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id       BIGINT UNSIGNED NOT NULL,
  name              VARCHAR(160) NOT NULL,
  slug              VARCHAR(180) NOT NULL,
  brand             VARCHAR(120) NULL DEFAULT 'Saffra',
  short_description VARCHAR(300) NULL,
  description       TEXT NULL,
  origin            VARCHAR(120) NULL,
  usage_tips        TEXT NULL,
  is_organic        TINYINT NOT NULL DEFAULT 0,
  form              VARCHAR(20) NULL,
  emoji             VARCHAR(16) NULL,
  accent_color      VARCHAR(16) NULL,
  rating_avg        DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count      INT NOT NULL DEFAULT 0,
  badge             VARCHAR(40) NULL,
  is_active         TINYINT NOT NULL DEFAULT 1,
  is_featured       TINYINT NOT NULL DEFAULT 0,
  is_bestseller     TINYINT NOT NULL DEFAULT 0,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  KEY idx_products_category (category_id),
  KEY idx_products_flags (is_active, is_featured, is_bestseller)
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
  is_active        TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_variant_sku (sku),
  KEY idx_variant_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_images (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  path       VARCHAR(255) NOT NULL,
  alt_text   VARCHAR(160) NULL,
  is_primary TINYINT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_images_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wishlists (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wishlist (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reviews (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  BIGINT UNSIGNED NOT NULL,
  author_name VARCHAR(120) NOT NULL,
  rating      TINYINT NOT NULL,
  title       VARCHAR(120) NULL,
  body        TEXT NULL,
  is_approved TINYINT NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_product (product_id, is_approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE carts (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NULL,
  session_token VARCHAR(64) NULL,
  coupon_code   VARCHAR(40) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_carts_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cart_items (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cart_id    BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NOT NULL,
  quantity   INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_variant (cart_id, variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE coupons (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(40) NOT NULL,
  type            VARCHAR(10) NOT NULL,
  value           DECIMAL(10,2) NOT NULL,
  min_order_total DECIMAL(10,2) NULL,
  max_discount    DECIMAL(10,2) NULL,
  is_active       TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupon_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number          VARCHAR(20) NOT NULL,
  user_id               BIGINT UNSIGNED NULL,
  email                 VARCHAR(190) NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'pending',
  subtotal              DECIMAL(10,2) NOT NULL,
  discount_total        DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_total        DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_total             DECIMAL(10,2) NOT NULL DEFAULT 0,
  grand_total           DECIMAL(10,2) NOT NULL,
  coupon_code           VARCHAR(40) NULL,
  payment_method        VARCHAR(40) NULL,
  shipping_address_json TEXT NULL,
  tracking_number       VARCHAR(80) NULL,
  placed_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_number (order_number),
  KEY idx_orders_user (user_id),
  KEY idx_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id     BIGINT UNSIGNED NOT NULL,
  variant_id   BIGINT UNSIGNED NULL,
  product_name VARCHAR(160) NOT NULL,
  variant_name VARCHAR(80) NOT NULL,
  sku          VARCHAR(64) NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  quantity     INT NOT NULL,
  line_total   DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id            BIGINT UNSIGNED NOT NULL,
  provider            VARCHAR(40) NOT NULL,
  provider_payment_id VARCHAR(120) NULL,
  method              VARCHAR(40) NULL,
  amount              DECIMAL(10,2) NOT NULL,
  currency            VARCHAR(3) NOT NULL DEFAULT 'USD',
  status              VARCHAR(20) NOT NULL DEFAULT 'initiated',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_status_history (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(20) NULL,
  to_status   VARCHAR(20) NOT NULL,
  note        VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_osh_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE newsletter_subscribers (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(190) NOT NULL,
  subscribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_news_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contact_messages (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(190) NOT NULL,
  subject    VARCHAR(190) NULL,
  message    TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
