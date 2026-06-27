# API Specification — Spices D2C E-commerce Platform

> **Document status:** Draft v1.0 (planning)
> **Style:** REST + JSON · Base path `/api`
> **Last updated:** 2026-06-27

This is the **contract** between the vanilla-JS frontend and the PHP backend.
Endpoints reference functional requirements (`FR-x`) from
[02-requirements.md](02-requirements.md) and tables from
[04-database-schema.md](04-database-schema.md).

---

## 1. Conventions

- **Base URL:** `https://{host}/api`
- **Content type:** `application/json` (requests & responses). File uploads use `multipart/form-data`.
- **Auth:** session cookie (MVP) or `Authorization: Bearer <token>` (if JWT chosen).
- **Money:** `DECIMAL` strings/numbers in the store currency (e.g., `"249.00"`).
- **Timestamps:** ISO 8601 UTC (e.g., `2026-06-27T10:00:00Z`).
- **Pagination:** query params `?page=1&per_page=20`; responses include `meta`.

### 1.1 Success envelope
```json
{ "data": { /* resource or array */ }, "meta": { "page": 1, "per_page": 20, "total": 134 } }
```

### 1.2 Error envelope
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Email is required", "details": { "email": ["required"] } } }
```

### 1.3 Status codes
| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No content |
| 400 | Bad request / validation |
| 401 | Unauthenticated |
| 403 | Forbidden (role) |
| 404 | Not found |
| 409 | Conflict (e.g., out of stock, duplicate) |
| 422 | Unprocessable entity |
| 429 | Rate limited |
| 500 | Server error |

---

## 2. Public / Storefront Endpoints

### 2.1 Catalog (FR-1..FR-8)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | List active categories (tree) |
| GET | `/api/categories/{slug}` | Category detail |
| GET | `/api/products` | List products. Query: `category`, `q`, `min_price`, `max_price`, `organic`, `form`, `sort`, `page`, `per_page` |
| GET | `/api/products/{slug}` | Product detail with variants, images, rating |
| GET | `/api/products/{slug}/related` | Related products |
| GET | `/api/products/{slug}/reviews` | Approved reviews (paginated) |
| GET | `/api/search?q=` | Search products (FR-5) |

**Example — GET `/api/products/{slug}`**
```json
{
  "data": {
    "id": 12, "slug": "turmeric-powder", "name": "Turmeric Powder",
    "short_description": "Single-origin, high curcumin",
    "origin": "Erode, India", "is_organic": true, "form": "ground",
    "rating_avg": "4.6", "rating_count": 87,
    "images": [{ "path": "/storage/products/turmeric-1.webp", "alt_text": "Turmeric powder", "is_primary": true }],
    "variants": [
      { "id": 31, "sku": "TUR-100", "name": "100g", "price": "129.00", "compare_at_price": "149.00", "stock_qty": 240, "weight_grams": 100 },
      { "id": 32, "sku": "TUR-250", "name": "250g", "price": "289.00", "stock_qty": 120, "weight_grams": 250 }
    ]
  }
}
```

### 2.2 Cart (FR-9..FR-13)
Cart can be guest (via `session_token`) or user (via auth).
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cart` | Get current cart with computed totals |
| POST | `/api/cart/items` | Add item `{ variant_id, quantity }` |
| PATCH | `/api/cart/items/{id}` | Update quantity `{ quantity }` |
| DELETE | `/api/cart/items/{id}` | Remove item |
| POST | `/api/cart/coupon` | Apply coupon `{ code }` (FR-13) |
| DELETE | `/api/cart/coupon` | Remove coupon |

> Cart totals (subtotal, discount, shipping estimate, tax, grand total) are
> always computed server-side.

### 2.3 Auth & Account (FR-14..FR-20)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | `{ name, email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/forgot-password` | `{ email }` → emails reset token (FR-16) |
| POST | `/api/auth/reset-password` | `{ token, password }` |
| GET | `/api/account/profile` | Get profile |
| PATCH | `/api/account/profile` | Update `{ name, phone }` |
| GET | `/api/account/addresses` | List addresses |
| POST | `/api/account/addresses` | Create address |
| PATCH | `/api/account/addresses/{id}` | Update address |
| DELETE | `/api/account/addresses/{id}` | Delete address |
| GET | `/api/account/orders` | Order history |
| GET | `/api/account/orders/{order_number}` | Order detail |

### 2.4 Checkout & Orders (FR-21..FR-29)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/checkout/quote` | Compute shipping+tax+total for `{ items, address }` (FR-22, FR-23) |
| POST | `/api/orders` | Place order (creates order, decrements stock in txn, returns payment intent) |
| GET | `/api/orders/{order_number}` | Public order status by number+email (guest tracking) |
| POST | `/api/orders/{order_number}/cancel` | Cancel before shipment (FR-29) |

**Example — POST `/api/orders` request**
```json
{
  "email": "buyer@example.com",
  "shipping_address": { "recipient_name": "A B", "line1": "...", "city": "...", "state": "...", "postal_code": "...", "country": "IN", "phone": "..." },
  "payment_method": "card",
  "coupon_code": "WELCOME10"
}
```
**Response (201)**
```json
{
  "data": {
    "order_number": "SP-2026-000123",
    "status": "pending",
    "grand_total": "578.00",
    "payment": { "provider": "razorpay", "client_secret": "…", "amount": "578.00", "currency": "INR" }
  }
}
```

### 2.5 Payments (FR-25)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments/webhook` | Gateway → server callback; verify signature; mark order paid (idempotent) |
| POST | `/api/payments/{order_number}/verify` | Optional client-confirm step (verified server-side) |

### 2.6 Content & Misc (FR-39..FR-44)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/contact` | Contact form (FR-40) |
| POST | `/api/newsletter` | Subscribe `{ email }` (FR-44) |
| POST | `/api/products/{slug}/reviews` | Submit review (auth, FR-8) — pending moderation |

---

## 3. Admin Endpoints (role: admin) (FR-30..FR-38)

All under `/api/admin/*`, protected by auth + admin role middleware.

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/admin/products` | List / create products |
| GET/PATCH/DELETE | `/api/admin/products/{id}` | Read / update / delete |
| POST | `/api/admin/products/{id}/variants` | Add variant |
| PATCH/DELETE | `/api/admin/variants/{id}` | Update / delete variant |
| POST | `/api/admin/products/{id}/images` | Upload image (multipart) |
| DELETE | `/api/admin/images/{id}` | Delete image |
| GET/POST | `/api/admin/categories` | List / create |
| PATCH/DELETE | `/api/admin/categories/{id}` | Update / delete |
| PATCH | `/api/admin/variants/{id}/stock` | Adjust stock (FR-33) |
| GET | `/api/admin/orders` | List orders (filter by status/date) |
| GET | `/api/admin/orders/{order_number}` | Order detail |
| PATCH | `/api/admin/orders/{order_number}/status` | Update status + tracking (FR-34) |
| GET/POST | `/api/admin/coupons` | List / create coupons (FR-35) |
| PATCH/DELETE | `/api/admin/coupons/{id}` | Update / delete |
| GET | `/api/admin/customers` | List customers (FR-36) |
| GET | `/api/admin/dashboard` | KPIs: revenue, orders, top products (FR-37) |
| GET/PATCH | `/api/admin/settings` | Shipping/tax/banner settings (FR-38) |
| GET | `/api/admin/reviews` / PATCH `/{id}/approve` | Moderate reviews |

---

## 4. Security Rules (applies to all endpoints)

- All write endpoints require **CSRF token** (session auth) or bearer token (JWT).
- Admin endpoints require `role = admin`; return 403 otherwise.
- **Server recomputes** all prices/totals; client-supplied money fields are ignored.
- Rate-limit auth endpoints (`/auth/login`, `/auth/register`, `/auth/forgot-password`): 429 on abuse.
- Validate & sanitize every input; reject unknown fields.
- Webhook endpoint verifies provider signature before acting; never trust payload alone.
- Never return password hashes, tokens, or full gateway payloads to clients.

---

## 5. Versioning & Future

- MVP uses unversioned `/api`. If breaking changes arise, introduce `/api/v2`.
- Consider documenting the contract later as an **OpenAPI 3.1** spec
  (`docs/openapi.yaml`) and referencing it from a steering file so implementation
  stays in sync — deferred until build phase.
