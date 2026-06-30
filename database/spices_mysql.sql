-- Saffra Spices — MySQL import (schema + demo catalog)
-- Import into your database (e.g. u770423744_spices) via phpMyAdmin > Import.
-- Generated from the seed catalog.

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


SET FOREIGN_KEY_CHECKS = 0;

-- settings (5 rows)
INSERT INTO `settings` (`key`, `value`) VALUES ('store_name', 'Saffra Spices');
INSERT INTO `settings` (`key`, `value`) VALUES ('free_shipping_threshold', '999.00');
INSERT INTO `settings` (`key`, `value`) VALUES ('flat_shipping', '49.00');
INSERT INTO `settings` (`key`, `value`) VALUES ('tax_rate', '0.05');
INSERT INTO `settings` (`key`, `value`) VALUES ('announcement', 'Free shipping on larger orders · Freshly ground to order');

-- users (2 rows)
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `role`, `status`, `created_at`) VALUES ('1', 'Store Admin', 'admin@saffra.test', NULL, '$2y$12$4a/jVdEaXgzWAvBWIVl3oujt0wkkuSs9bF43KjceTf2gOxrv3EMLm', 'admin', 'active', '2026-06-27 12:01:45');
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `role`, `status`, `created_at`) VALUES ('2', 'Maya Patel', 'maya@example.com', NULL, '$2y$12$Gy9RQK8WIeBKh4wf4Qa7NOaCnCPWn1da2dgXR3M8Sme6NJp6Zkuii', 'customer', 'active', '2026-06-27 12:01:45');

-- categories (5 rows)
INSERT INTO `categories` (`id`, `parent_id`, `name`, `slug`, `description`, `emoji`, `accent_color`, `sort_order`, `is_active`) VALUES ('1', NULL, 'Whole Spices', 'whole-spices', 'Sun-dried whole spices, sealed for maximum aroma.', '🫘', '#C8531B', '0', '1');
INSERT INTO `categories` (`id`, `parent_id`, `name`, `slug`, `description`, `emoji`, `accent_color`, `sort_order`, `is_active`) VALUES ('2', NULL, 'Ground Spices', 'ground-spices', 'Stone-ground to order for vivid colour and flavour.', '🧂', '#E0A422', '1', '1');
INSERT INTO `categories` (`id`, `parent_id`, `name`, `slug`, `description`, `emoji`, `accent_color`, `sort_order`, `is_active`) VALUES ('3', NULL, 'Blends & Masalas', 'blends-masalas', 'House blends balanced by our spice masters.', '🍵', '#9E3F12', '2', '1');
INSERT INTO `categories` (`id`, `parent_id`, `name`, `slug`, `description`, `emoji`, `accent_color`, `sort_order`, `is_active`) VALUES ('4', NULL, 'Gift Sets', 'gift-sets', 'Beautifully boxed sets for the cooks you love.', '🎁', '#7A5C3E', '3', '1');
INSERT INTO `categories` (`id`, `parent_id`, `name`, `slug`, `description`, `emoji`, `accent_color`, `sort_order`, `is_active`) VALUES ('5', NULL, 'Organic', 'organic', 'Certified-organic, single-origin spices.', '🌿', '#3F7D3A', '4', '1');

-- products (14 rows)
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('1', '2', 'Turmeric Powder', 'turmeric-powder', 'Saffra', 'Single-origin, high-curcumin golden turmeric.', 'Vibrant, earthy turmeric stone-ground from Erode roots. High curcumin content gives a deep golden colour and warm, peppery aroma.', 'Erode, India', 'Bloom in warm oil for curries, golden milk, and roasted vegetables.', '1', 'ground', '🟡', '#E0A422', '4.8', '126', 'Bestseller', '1', '1', '1', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('2', '2', 'Smoked Paprika', 'smoked-paprika', 'Saffra', 'Slow oak-smoked sweet paprika.', 'Sweet peppers smoked over oak then milled to a silky powder. Adds colour and a gentle campfire warmth to anything it touches.', 'La Vera, Spain', 'Dust over eggs, potatoes, and grilled meats; stir into stews.', '0', 'ground', '🌶', '#C8531B', '4.7', '88', 'Trending', '1', '1', '1', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('3', '1', 'Ceylon Cinnamon Sticks', 'ceylon-cinnamon-sticks', 'Saffra', 'True cinnamon quills, delicate and sweet.', 'Hand-rolled true Ceylon cinnamon quills with a fragrant, gently sweet profile far softer than cassia.', 'Sri Lanka', 'Simmer in milk, mulled drinks, rice, and tagines.', '0', 'whole', '🧴', '#9E3F12', '4.9', '64', NULL, '1', '0', '1', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('4', '1', 'Black Peppercorns', 'black-peppercorns', 'Saffra', 'Bold Tellicherry peppercorns.', 'Large, late-harvested Tellicherry peppercorns bursting with citrus and pine notes. Grind fresh for the best bite.', 'Malabar Coast, India', 'Grind over everything; toast whole for stocks and brines.', '0', 'whole', '⚫', '#2A2118', '4.8', '142', 'Bestseller', '1', '1', '1', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('5', '1', 'Saffron Threads', 'saffron-threads', 'Saffra', 'Grade A1 Sargol saffron threads.', 'Deep crimson, all-red Sargol threads with intense honeyed aroma. A little blooms into a glorious golden hue.', 'Khorasan, Iran', 'Steep in warm water; use in paella, biryani, and desserts.', '0', 'whole', '🏵', '#B3261E', '5', '39', 'Premium', '1', '1', '0', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('6', '3', 'Garam Masala', 'garam-masala', 'Saffra', 'Warm North-Indian house blend.', 'Our signature garam masala: cardamom, clove, cinnamon, cumin and black pepper toasted and ground in small batches.', 'House blend', 'Add near the end of cooking to finish curries and dals.', '0', 'blend', '🍛', '#9E3F12', '4.9', '110', 'Bestseller', '1', '1', '1', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('7', '1', 'Cumin Seeds', 'cumin-seeds', 'Saffra', 'Aromatic whole cumin.', 'Sun-dried whole cumin with a warm, nutty aroma that blooms when toasted.', 'Gujarat, India', 'Temper in hot oil to start curries; toast and grind for rubs.', '1', 'whole', '🌾', '#B07B3E', '4.6', '57', NULL, '1', '0', '0', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('8', '1', 'Cardamom Pods', 'cardamom-pods', 'Saffra', 'Plump green cardamom pods.', 'Bright green cardamom pods with an intense floral-citrus perfume. The queen of spices.', 'Idukki, India', 'Crush into chai, rice, and desserts; whole in biryani.', '1', 'whole', '🟢', '#3F7D3A', '4.8', '73', 'Trending', '1', '1', '0', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('9', '2', 'Chilli Flakes', 'chilli-flakes', 'Saffra', 'Crushed sun-ripened red chillies.', 'Coarsely crushed red chillies with seeds for a bright, building heat.', 'Andhra Pradesh, India', 'Scatter over pizza, pasta, and roasted veg.', '0', 'ground', '🔥', '#C8531B', '4.5', '49', NULL, '1', '0', '1', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('10', '3', 'Tandoori Masala', 'tandoori-masala', 'Saffra', 'Smoky, vivid grilling blend.', 'A vivid blend of paprika, ginger, garlic and warm spices built for the grill and the oven.', 'House blend', 'Mix with yoghurt to marinate chicken, paneer, or cauliflower.', '0', 'blend', '🍗', '#B3261E', '4.7', '61', NULL, '1', '1', '0', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('11', '1', 'Coriander Seeds', 'coriander-seeds', 'Saffra', 'Citrusy whole coriander.', 'Pale, round coriander seeds with a fresh, lemony sweetness. A backbone of countless blends.', 'Rajasthan, India', 'Toast and grind for curries, pickles, and rubs.', '1', 'whole', '🟤', '#B07B3E', '4.4', '33', NULL, '1', '0', '0', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('12', '4', 'Spice Lovers Gift Box', 'spice-lovers-gift-box', 'Saffra', 'Six signature spices, beautifully boxed.', 'A curated wooden box of six of our most-loved spices and blends, ready to gift with a handwritten card.', 'Assorted', 'The perfect present for any home cook.', '0', 'other', '🎁', '#7A5C3E', '4.9', '47', 'Gift', '1', '1', '1', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('13', '4', 'Everyday Curry Kit', 'everyday-curry-kit', 'Saffra', 'Everything for a weeknight curry.', 'Turmeric, cumin, garam masala and chilli flakes with a recipe card to build curries from scratch.', 'Assorted', 'Start here if you are new to cooking with spices.', '0', 'other', '🧺', '#C8531B', '4.8', '28', NULL, '1', '0', '0', '2026-06-27 12:01:46');
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `brand`, `short_description`, `description`, `origin`, `usage_tips`, `is_organic`, `form`, `emoji`, `accent_color`, `rating_avg`, `rating_count`, `badge`, `is_active`, `is_featured`, `is_bestseller`, `created_at`) VALUES ('14', '5', 'Organic Ginger Powder', 'organic-ginger-powder', 'Saffra', 'Warming certified-organic ginger.', 'Certified-organic dried ginger, finely milled for a clean, warming heat with citrus undertones.', 'Kerala, India', 'Whisk into baking, dressings, and warming drinks.', '1', 'ground', '🫚', '#E0A422', '4.6', '41', 'Organic', '1', '1', '0', '2026-06-27 12:01:46');

-- product_variants (27 rows)
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('1', '1', 'TURM-1', '100g', '100', '149', '199', '240', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('2', '1', 'TURM-2', '250g', '250', '299', NULL, '120', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('3', '1', 'TURM-3', '500g', '500', '499', NULL, '60', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('4', '2', 'SMOK-1', '100g', '100', '199', NULL, '180', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('5', '2', 'SMOK-2', '250g', '250', '379', NULL, '90', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('6', '3', 'CEYL-1', '8 sticks', '40', '199', '249', '150', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('7', '3', 'CEYL-2', '16 sticks', '80', '359', NULL, '70', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('8', '4', 'BLAC-1', '100g', '100', '179', NULL, '300', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('9', '4', 'BLAC-2', '250g', '250', '339', NULL, '140', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('10', '5', 'SAFF-1', '1g', '1', '399', NULL, '80', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('11', '5', 'SAFF-2', '2g', '2', '749', '849', '40', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('12', '6', 'GARA-1', '80g', '80', '199', NULL, '200', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('13', '6', 'GARA-2', '200g', '200', '399', NULL, '95', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('14', '7', 'CUMI-1', '100g', '100', '119', NULL, '260', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('15', '7', 'CUMI-2', '250g', '250', '249', NULL, '130', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('16', '8', 'CARD-1', '50g', '50', '299', NULL, '160', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('17', '8', 'CARD-2', '100g', '100', '549', '599', '80', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('18', '9', 'CHIL-1', '80g', '80', '129', NULL, '220', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('19', '9', 'CHIL-2', '200g', '200', '269', NULL, '110', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('20', '10', 'TAND-1', '90g', '90', '199', NULL, '140', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('21', '10', 'TAND-2', '220g', '220', '399', NULL, '70', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('22', '11', 'CORI-1', '100g', '100', '99', NULL, '280', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('23', '11', 'CORI-2', '250g', '250', '189', NULL, '150', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('24', '12', 'SPIC-1', '6-jar box', '360', '999', '1199', '55', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('25', '13', 'EVER-1', '4-jar kit', '300', '699', NULL, '75', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('26', '14', 'ORGA-1', '100g', '100', '159', NULL, '170', '1');
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `name`, `weight_grams`, `price`, `compare_at_price`, `stock_qty`, `is_active`) VALUES ('27', '14', 'ORGA-2', '250g', '250', '319', NULL, '85', '1');

-- product_images (28 rows)
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('1', '1', 'tile:🟡', 'Turmeric Powder', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('2', '1', 'tile2:🟡', 'Turmeric Powder detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('3', '2', 'tile:🌶', 'Smoked Paprika', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('4', '2', 'tile2:🌶', 'Smoked Paprika detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('5', '3', 'tile:🧴', 'Ceylon Cinnamon Sticks', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('6', '3', 'tile2:🧴', 'Ceylon Cinnamon Sticks detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('7', '4', 'tile:⚫', 'Black Peppercorns', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('8', '4', 'tile2:⚫', 'Black Peppercorns detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('9', '5', 'tile:🏵', 'Saffron Threads', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('10', '5', 'tile2:🏵', 'Saffron Threads detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('11', '6', 'tile:🍛', 'Garam Masala', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('12', '6', 'tile2:🍛', 'Garam Masala detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('13', '7', 'tile:🌾', 'Cumin Seeds', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('14', '7', 'tile2:🌾', 'Cumin Seeds detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('15', '8', 'tile:🟢', 'Cardamom Pods', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('16', '8', 'tile2:🟢', 'Cardamom Pods detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('17', '9', 'tile:🔥', 'Chilli Flakes', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('18', '9', 'tile2:🔥', 'Chilli Flakes detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('19', '10', 'tile:🍗', 'Tandoori Masala', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('20', '10', 'tile2:🍗', 'Tandoori Masala detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('21', '11', 'tile:🟤', 'Coriander Seeds', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('22', '11', 'tile2:🟤', 'Coriander Seeds detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('23', '12', 'tile:🎁', 'Spice Lovers Gift Box', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('24', '12', 'tile2:🎁', 'Spice Lovers Gift Box detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('25', '13', 'tile:🧺', 'Everyday Curry Kit', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('26', '13', 'tile2:🧺', 'Everyday Curry Kit detail', '0', '1');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('27', '14', 'tile:🫚', 'Organic Ginger Powder', '1', '0');
INSERT INTO `product_images` (`id`, `product_id`, `path`, `alt_text`, `is_primary`, `sort_order`) VALUES ('28', '14', 'tile2:🫚', 'Organic Ginger Powder detail', '0', '1');

-- reviews (6 rows)
INSERT INTO `reviews` (`id`, `product_id`, `author_name`, `rating`, `title`, `body`, `is_approved`, `created_at`) VALUES ('1', '1', 'Aisha', '5', 'Golden everything', 'The colour is unreal and the aroma fills the kitchen. My curries have never looked better.', '1', '2026-06-27 12:01:46');
INSERT INTO `reviews` (`id`, `product_id`, `author_name`, `rating`, `title`, `body`, `is_approved`, `created_at`) VALUES ('2', '1', 'Tom', '5', 'Best turmeric', 'You can tell this is fresh. Worlds apart from supermarket jars.', '1', '2026-06-27 12:01:46');
INSERT INTO `reviews` (`id`, `product_id`, `author_name`, `rating`, `title`, `body`, `is_approved`, `created_at`) VALUES ('3', '4', 'Priya', '5', 'Fragrant and bold', 'Grinding these fresh changed my cooking. Citrusy and punchy.', '1', '2026-06-27 12:01:46');
INSERT INTO `reviews` (`id`, `product_id`, `author_name`, `rating`, `title`, `body`, `is_approved`, `created_at`) VALUES ('4', '6', 'Daniel', '5', 'Restaurant quality', 'This garam masala tastes like my favourite restaurant. Incredible finish.', '1', '2026-06-27 12:01:46');
INSERT INTO `reviews` (`id`, `product_id`, `author_name`, `rating`, `title`, `body`, `is_approved`, `created_at`) VALUES ('5', '5', 'Elena', '5', 'Worth every thread', 'A pinch transforms a dish. Beautiful deep red threads.', '1', '2026-06-27 12:01:46');
INSERT INTO `reviews` (`id`, `product_id`, `author_name`, `rating`, `title`, `body`, `is_approved`, `created_at`) VALUES ('6', '11', 'Sam', '5', 'Perfect gift', 'Gave this to my dad who loves to cook. The box is gorgeous.', '1', '2026-06-27 12:01:46');

-- coupons (2 rows)
INSERT INTO `coupons` (`id`, `code`, `type`, `value`, `min_order_total`, `max_discount`, `is_active`) VALUES ('1', 'WELCOME10', 'percent', '10', '0', NULL, '1');
INSERT INTO `coupons` (`id`, `code`, `type`, `value`, `min_order_total`, `max_discount`, `is_active`) VALUES ('2', 'SAVE100', 'fixed', '100', '799', NULL, '1');

SET FOREIGN_KEY_CHECKS = 1;
