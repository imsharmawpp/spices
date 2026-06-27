-- SQLite schema for the Saffra Spices D2C store (local/demo).
-- Mirrors the production MySQL design in docs/04-database-schema.md.
-- Demo-only columns (accent_color, emoji) help render placeholder visuals
-- without real product photography.

PRAGMA foreign_keys = ON;

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

CREATE TABLE users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    phone           TEXT,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'customer',
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE addresses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label           TEXT,
    recipient_name  TEXT NOT NULL,
    phone           TEXT,
    line1           TEXT NOT NULL,
    line2           TEXT,
    city            TEXT NOT NULL,
    state           TEXT,
    postal_code     TEXT NOT NULL,
    country         TEXT NOT NULL DEFAULT 'US',
    is_default      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT,
    emoji           TEXT,
    accent_color    TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE products (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id       INTEGER NOT NULL REFERENCES categories(id),
    name              TEXT NOT NULL,
    slug              TEXT NOT NULL UNIQUE,
    brand             TEXT DEFAULT 'Saffra',
    short_description TEXT,
    description       TEXT,
    origin            TEXT,
    usage_tips        TEXT,
    is_organic        INTEGER NOT NULL DEFAULT 0,
    form              TEXT,
    emoji             TEXT,
    accent_color      TEXT,
    rating_avg        REAL NOT NULL DEFAULT 0,
    rating_count      INTEGER NOT NULL DEFAULT 0,
    badge             TEXT,
    is_active         INTEGER NOT NULL DEFAULT 1,
    is_featured       INTEGER NOT NULL DEFAULT 0,
    is_bestseller     INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE product_variants (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku               TEXT NOT NULL UNIQUE,
    name              TEXT NOT NULL,
    weight_grams      INTEGER,
    price             REAL NOT NULL,
    compare_at_price  REAL,
    stock_qty         INTEGER NOT NULL DEFAULT 0,
    is_active         INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE product_images (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    path            TEXT NOT NULL,
    alt_text        TEXT,
    is_primary      INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE wishlists (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, product_id)
);

CREATE TABLE reviews (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    author_name     TEXT NOT NULL,
    rating          INTEGER NOT NULL,
    title           TEXT,
    body            TEXT,
    is_approved     INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE carts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token   TEXT,
    coupon_code     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE cart_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id         INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    variant_id      INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity        INTEGER NOT NULL DEFAULT 1,
    UNIQUE (cart_id, variant_id)
);

CREATE TABLE coupons (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    code            TEXT NOT NULL UNIQUE,
    type            TEXT NOT NULL,            -- percent | fixed
    value           REAL NOT NULL,
    min_order_total REAL,
    max_discount    REAL,
    is_active       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE orders (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number           TEXT NOT NULL UNIQUE,
    user_id                INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email                  TEXT NOT NULL,
    status                 TEXT NOT NULL DEFAULT 'pending',
    subtotal               REAL NOT NULL,
    discount_total         REAL NOT NULL DEFAULT 0,
    shipping_total         REAL NOT NULL DEFAULT 0,
    tax_total              REAL NOT NULL DEFAULT 0,
    grand_total            REAL NOT NULL,
    coupon_code            TEXT,
    payment_method         TEXT,
    shipping_address_json  TEXT,
    tracking_number        TEXT,
    placed_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE order_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id      INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name    TEXT NOT NULL,
    variant_name    TEXT NOT NULL,
    sku             TEXT NOT NULL,
    unit_price      REAL NOT NULL,
    quantity        INTEGER NOT NULL,
    line_total      REAL NOT NULL
);

CREATE TABLE payments (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider            TEXT NOT NULL,
    provider_payment_id TEXT,
    method              TEXT,
    amount              REAL NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'USD',
    status              TEXT NOT NULL DEFAULT 'initiated',
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE order_status_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status     TEXT,
    to_status       TEXT NOT NULL,
    note            TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE newsletter_subscribers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    email           TEXT NOT NULL UNIQUE,
    subscribed_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE contact_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL,
    subject         TEXT,
    message         TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE settings (
    key             TEXT PRIMARY KEY,
    value           TEXT
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_flags ON products(is_active, is_featured, is_bestseller);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_reviews_product ON reviews(product_id, is_approved);
CREATE INDEX idx_orders_status ON orders(status);
