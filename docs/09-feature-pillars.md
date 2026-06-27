# Feature Pillars Mapping — Spices D2C E-commerce Platform

> **Document status:** Draft v1.0 (planning)
> **Last updated:** 2026-06-27

This document maps the **five core e-commerce pillars** to concrete features,
functional requirement IDs ([02-requirements.md](02-requirements.md)), UI location
([08-ui-ux-design.md](08-ui-ux-design.md)), API endpoints
([05-api-spec.md](05-api-spec.md)), and data ([04-database-schema.md](04-database-schema.md)).
It is the **traceability bridge** that guarantees every pillar is delivered.

Status legend: ✅ MVP · 🔶 Phase 2+ (Should) · 🔭 Future (Could/roadmap)

---

## Pillar 1 — User Experience & Front-End Design

| Feature | FR | UI location | API / Data | Status |
|---------|----|-------------|-----------|--------|
| Mobile-responsive design | NFR §2.5 | All pages, mobile-first grid (§2.4) | — | ✅ |
| Advanced search & filtering (price, form, organic, rating, availability) | FR-5, FR-6 | Collection toolbar + filter drawer | `GET /api/products?filters`, `GET /api/search` | ✅ search / 🔶 full filters |
| High-quality visuals: multi-angle images & zoom | FR-3 | PDP gallery | `product_images` | ✅ |
| 360° view / video integration | **FR-48** | PDP gallery | media fields on product | 🔭 |
| Wishlist (save for later) | **FR-45** | Header heart, `/wishlist`, card heart | `wishlists` table + endpoints | 🔶 |
| Product comparison (side-by-side) | **FR-46** | `/compare` | client-side + product API | 🔭 |
| Editorial homepage sections (hero, carousels, UGC, stories) | FR-1 | Home modules | `settings`, products, blog | ✅ core / 🔶 UGC |

**Delivered by:** product cards, carousels, mega-menu, gallery, filter UI — all
specified in [08 §3–4](08-ui-ux-design.md).

---

## Pillar 2 — Shopping Cart & Checkout

| Feature | FR | UI location | API / Data | Status |
|---------|----|-------------|-----------|--------|
| Guest checkout | FR-20 | Checkout step 1 | `POST /api/orders` (no auth) | ✅ |
| Secure payment gateways (Razorpay/Stripe/PayPal) | FR-25 | Checkout payment step | `POST /api/orders`, `/api/payments/webhook` | ✅ |
| Discount / coupon codes | FR-13 | Cart + checkout field | `POST /api/cart/coupon`, `coupons` | 🔶 |
| Transparent shipping calculator + delivery estimate | FR-22 | Cart + checkout | `POST /api/checkout/quote` | ✅ |
| Cash on Delivery (optional) | FR-26 | Checkout payment step | order `payment_method` | 🔶 |
| Cart drawer + qty steppers + live totals | FR-9–FR-12 | Slide-in cart drawer | `GET/POST/PATCH/DELETE /api/cart*` | ✅ |

**Key rule:** all money (prices, tax, shipping, discounts) recomputed server-side
([03 §2.2](03-tech-stack-architecture.md), [05 §4](05-api-spec.md)).

---

## Pillar 3 — Customer Account & Retention

| Feature | FR | UI location | API / Data | Status |
|---------|----|-------------|-----------|--------|
| Order tracking & history + invoices | FR-19, FR-28 | Account → Orders | `GET /api/account/orders*`, `order_status_history` | ✅ |
| Reorder past purchases | FR-19 | Order detail | cart API | 🔶 |
| Personalized recommendations (AI-driven) | **FR-47** | Home, PDP "you may like", cart cross-sell | recommendation service | 🔭 (rule-based first, AI later) |
| User-generated reviews — text **and photo** | FR-8, **FR-49** | PDP reviews section | `reviews` (+ image), `POST /products/{slug}/reviews` | ✅ text / 🔶 photo |
| Loyalty / rewards program | **FR-50** | Account → Rewards | loyalty tables | 🔭 |
| Email marketing / newsletter | FR-44, FR-43 | Newsletter band, account | `POST /api/newsletter`, `newsletter_subscribers` | ✅ capture / 🔶 campaigns |

---

## Pillar 4 — Back-End Management (Store Owners)

| Feature | FR | UI location | API / Data | Status |
|---------|----|-------------|-----------|--------|
| Inventory & order management (stock, refunds, fulfillment) | FR-33, FR-34 | Admin → Orders / Inventory | `/api/admin/orders*`, `/api/admin/variants/{id}/stock` | ✅ |
| Product & catalog management (descriptions, variants, SKUs) | FR-31, FR-32 | Admin → Products / Categories | `/api/admin/products*`, `/api/admin/categories*` | ✅ |
| SEO & marketing tools (meta tags, sitemap, campaigns) | FR-41, FR-42, FR-35 | Admin → SEO/Settings, per-product fields | `settings`, product meta, `coupons` | ✅ core / 🔶 campaigns |
| Analytics & reporting (sales, behavior, revenue) | FR-37 | Admin → Dashboard | `GET /api/admin/dashboard` | 🔶 basic / 🔭 advanced |
| Manage homepage sections / banners | FR-38 | Admin → Settings | `settings` JSON | 🔶 |
| Review moderation | FR-8 | Admin → Reviews | `/api/admin/reviews` | 🔶 |

---

## Pillar 5 — Trust & Support

| Feature | FR | UI location | API / Data | Status |
|---------|----|-------------|-----------|--------|
| SSL / HTTPS encryption | NFR §2.3 | Site-wide | infra/TLS | ✅ |
| Secure data & payment handling (no raw card storage) | NFR §2.3 | Checkout | gateway delegation | ✅ |
| Live chat & chatbots | **FR-51** | Bottom-right launcher (all pages) | 3rd-party widget or custom | 🔶 |
| Clear policies (returns, shipping, privacy, terms) | FR-39 | Footer + static pages | static content | ✅ |
| Trust badges (secure payment, returns) | FR-39 | Cart/checkout/PDP | static | ✅ |
| Contact form | FR-40 | `/contact` | `POST /api/contact`, `contact_messages` | ✅ |

---

## Coverage Summary

| Pillar | MVP-covered | Needs new FRs |
|--------|-------------|---------------|
| 1 — UX & Front-end | Responsive, search, gallery zoom, editorial home | Wishlist (FR-45), Comparison (FR-46), 360/video (FR-48) |
| 2 — Cart & Checkout | Guest checkout, payments, shipping calc, cart, coupons, COD | — (all mapped to existing FRs) |
| 3 — Account & Retention | Order tracking/history, reviews, newsletter | Recommendations (FR-47), Photo reviews (FR-49), Loyalty (FR-50) |
| 4 — Back-end Mgmt | Catalog, inventory, orders, SEO, basic analytics | — (advanced analytics is roadmap) |
| 5 — Trust & Support | SSL, policies, contact, trust badges | Live chat/chatbot (FR-51) |

> The **bolded FR-45…FR-51** are newly introduced by these pillars and added to
> [02-requirements.md](02-requirements.md). Their build phase is tracked in the
> [roadmap](07-roadmap.md) (MVP vs Phase 2+ vs Future).

---

## Phasing Recommendation

- **MVP (Phases 1–5):** everything marked ✅, plus high-value 🔶 items the team can
  fit (coupons, COD, basic filters, newsletter capture, contact, trust pages).
- **Phase 2+ (post-launch):** wishlist, photo reviews, live chat, richer filters,
  homepage section editor, basic analytics dashboard.
- **Future:** AI recommendations, loyalty program, product comparison, 360/video,
  advanced analytics — see [07 §Post-Launch](07-roadmap.md#post-launch--future-phases-from-out-of-scope).
