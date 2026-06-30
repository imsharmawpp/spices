# Requirements — Spices D2C E-commerce Platform

> **Document status:** Draft v1.0 (planning)
> **Last updated:** 2026-06-27

This document captures **functional** and **non-functional** requirements.
Each functional requirement has an ID (`FR-x`) so it can be traced to API
endpoints, UI screens, and test cases.

---

## 1. Functional Requirements

### 1.1 Catalog & Browsing

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Display a home page with featured products, categories, and promo banners | Must |
| FR-2 | List products by category with pagination | Must |
| FR-3 | Show a product detail page: images, name, description, origin, weight/size variants, price, stock status, reviews | Must |
| FR-4 | Support product **variants** (e.g., 100g / 250g / 500g, whole vs ground) | Must |
| FR-5 | Search products by name/keyword | Must |
| FR-6 | Filter by category, price range, attributes (organic, whole/ground); sort by price/newest/popularity | Should |
| FR-7 | Show "related products" / "you may also like" | Could |
| FR-8 | Display product reviews and average rating | Should |

### 1.2 Cart

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-9 | Add/update/remove cart items (with chosen variant & quantity) | Must |
| FR-10 | Persist cart for guests (localStorage) and for logged-in users (server) | Must |
| FR-11 | Show live cart subtotal, item count, and per-line totals | Must |
| FR-12 | Validate stock availability before checkout | Must |
| FR-13 | Apply a coupon/discount code to the cart | Should |

### 1.3 Accounts & Authentication

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-14 | Register with email + password | Must |
| FR-15 | Login / logout | Must |
| FR-16 | Password reset via emailed token | Must |
| FR-17 | Manage profile (name, phone) | Must |
| FR-18 | Manage multiple shipping addresses (address book) | Must |
| FR-19 | View order history and order detail/status | Must |
| FR-20 | Guest checkout (no account required) | Should |

### 1.4 Checkout & Orders

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-21 | Multi-step or single-page checkout: address → shipping → payment → review | Must |
| FR-22 | Calculate shipping cost (flat / weight-based / free over threshold) | Must |
| FR-23 | Calculate taxes (GST/VAT) per configured rules | Must |
| FR-24 | Place order; decrement stock atomically | Must |
| FR-25 | Online payment via gateway (card/UPI/wallet as supported) | Must |
| FR-26 | Cash on Delivery option (configurable) | Should |
| FR-27 | Send order confirmation email | Must |
| FR-28 | Track order status (placed, paid, packed, shipped, delivered, cancelled) | Must |
| FR-29 | Allow order cancellation before shipment | Should |

### 1.5 Admin Panel

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-30 | Admin login with elevated role | Must |
| FR-31 | CRUD products, variants, images | Must |
| FR-32 | CRUD categories | Must |
| FR-33 | Manage inventory / stock levels | Must |
| FR-34 | View & update orders (change status, add tracking number) | Must |
| FR-35 | Manage coupons/discounts | Should |
| FR-36 | View customers and their orders | Should |
| FR-37 | Basic sales dashboard (orders, revenue, top products) | Could |
| FR-38 | Manage homepage banners / featured products | Should |

### 1.6 Content & SEO

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-39 | Static pages: About, Contact, FAQ, Shipping & Returns, Privacy, Terms | Must |
| FR-40 | Contact form submission | Should |
| FR-41 | SEO-friendly URLs, meta tags, Open Graph, sitemap.xml, robots.txt | Must |
| FR-42 | Structured data (Product schema.org JSON-LD) | Should |

### 1.7 Notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-43 | Transactional emails: welcome, order confirmation, shipping, password reset | Must |
| FR-44 | Newsletter signup capture | Could |

### 1.8 Engagement & Pillar Features

These requirements are introduced to fully satisfy the **five e-commerce pillars**
(see [09-feature-pillars.md](09-feature-pillars.md)). They extend the experience
beyond the core MVP.

| ID | Requirement | Pillar | Priority |
|----|-------------|--------|----------|
| FR-45 | Wishlist — save products for later (header + product card heart; `/wishlist` page) | 1 | Should |
| FR-46 | Product comparison — compare multiple products side-by-side | 1 | Could |
| FR-47 | Personalized recommendations ("you may also like", cross-sell); rule-based first, AI-driven later | 3 | Could |
| FR-48 | Rich media on product detail — image zoom, 360° view, and/or video | 1 | Could |
| FR-49 | Photo reviews — let customers attach images to reviews | 3 | Should |
| FR-50 | Loyalty / rewards program — earn & redeem points | 3 | Won't (now) |
| FR-51 | Live chat & chatbot support widget (site-wide) | 5 | Should |

> Priority legend (MoSCoW): **Must** = MVP, **Should** = high value, **Could** = nice-to-have, **Won't (now)** = future.

---

## 2. Non-Functional Requirements

### 2.1 Performance
- LCP < 2.5s, TTFB < 600ms on mid-tier mobile / 4G.
- Product images served optimized (WebP where supported) and lazy-loaded.
- API responses < 300ms for typical catalog reads (cached where possible).
- Frontend JS bundle kept lean (vanilla JS, no heavy framework).

### 2.2 Scalability
- Stateless backend so it can run behind a load balancer.
- DB indexed on common query paths (slug, category, order status).
- Pagination on all list endpoints (no unbounded queries).
- Designed to add caching (e.g., page/object cache) without re-architecting.

### 2.3 Security
- **HTTPS everywhere**; HSTS enabled.
- Passwords hashed with `password_hash()` (bcrypt/argon2). Never store plaintext.
- **Never** store raw card data — delegate to PCI-compliant gateway; verify
  payments server-side via webhook/signature.
- Protect against SQL injection via **prepared statements / parameterized queries**.
- Output encoding to prevent **XSS**; sanitize all inputs.
- **CSRF** protection on state-changing requests.
- Rate limiting on login, register, password reset.
- Role-based access control (customer vs admin).
- Secure session cookies (`HttpOnly`, `Secure`, `SameSite`).
- Secrets in environment config, never committed to git.
- Audit log for admin actions on orders/products.

### 2.4 Reliability & Availability
- Target 99.5% uptime.
- Daily automated database backups; tested restore procedure.
- Graceful error pages (404, 500) — never leak stack traces in production.
- Idempotent payment webhook handling.

### 2.5 Usability & Accessibility
- Mobile-first responsive design (breakpoints: 360, 768, 1024, 1440).
- WCAG 2.1 AA targets: semantic HTML, alt text, keyboard navigation, color contrast.
- Checkout achievable in ≤ 3 steps.
- Clear inline form validation and error messaging.

### 2.6 Maintainability
- Clear separation: frontend (`public/`) vs backend (`api/`/`app/`).
- Consistent coding standards (PSR-12 for PHP; documented JS style).
- Reusable components and shared CSS variables/design tokens.
- Configuration via `.env`; no hard-coded credentials.
- Documented setup in README.

### 2.7 Compatibility
- Browsers: last 2 versions of Chrome, Firefox, Safari, Edge.
- PHP 8.1+; MySQL 8.0+ / MariaDB 10.5+.

### 2.8 Privacy & Compliance
- Collect only necessary PII; documented retention policy.
- Cookie consent banner.
- Privacy policy & terms pages.
- Honor data deletion requests (account & associated PII).

### 2.9 Logging & Monitoring
- Application error logging (server-side) with severity levels.
- Access logs retained per hosting policy.
- Basic uptime monitoring + alerting on 5xx spikes.

---

## 3. Acceptance Criteria (sample, MVP gate)

The MVP is "done" when:
- A guest can browse → add to cart → check out → pay (sandbox) → receive a confirmation email.
- A registered user can log in, see order history, and reorder.
- An admin can add a product with variants/images and it appears in the storefront.
- An admin can move an order through its full status lifecycle.
- Security checklist (§2.3) items for MVP are verified.
- Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 90, SEO ≥ 90.

---

## 4. Traceability

Each `FR-x` maps to:
- a UI screen (see [06-folder-structure.md](06-folder-structure.md)),
- one or more API endpoints (see [05-api-spec.md](05-api-spec.md)),
- DB tables (see [04-database-schema.md](04-database-schema.md)),
- and a test case (to be authored in Phase QA — **not** part of this planning task).
