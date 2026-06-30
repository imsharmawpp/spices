# Development Roadmap & Milestones — Spices D2C E-commerce Platform

> **Document status:** Draft v1.0 (planning)
> **Last updated:** 2026-06-27

Phased, dependency-ordered plan. Durations are **indicative** (adjust to team
size/velocity). Each phase ends with a demoable, verifiable outcome.

---

## Phase 0 — Project Setup  _(est. 2–4 days)_
**Goal:** Everything ready to write code.
- [ ] Create repo folder structure ([06](06-folder-structure.md)).
- [ ] Add `composer.json`, PSR-4 autoload, choose framework (Slim 4 recommended).
- [ ] Add `docker-compose.yml` (php-fpm + mysql + nginx) or document XAMPP setup.
- [ ] Add `.env.example`, `.gitignore`, coding-standard configs (PHP-CS-Fixer/ESLint optional).
- [ ] Add `.kiro/steering/` conventions file.
- [ ] Resolve [open questions](01-project-plan.md#10-open-questions) (payment gateway, shipping, tax, COD).

**Exit:** `composer install` works; local server serves a placeholder page; CI lint passes.

---

## Phase 1 — Database & API Foundation  _(est. 1–1.5 weeks)_
**Goal:** Data layer + auth + core read APIs.
- [ ] Write `0001_init.sql` migration from [04](04-database-schema.md); run it.
- [ ] Seed categories, demo products/variants, admin user.
- [ ] Implement Core: Router, Request/Response, PDO DB, error/JSON envelope.
- [ ] Middleware: JSON, CORS, Auth, CSRF, RateLimit, AdminOnly.
- [ ] Auth APIs: register, login, logout, me, forgot/reset password (FR-14..FR-16).
- [ ] Catalog read APIs: categories, products, product detail, search (FR-1..FR-5).

**Exit:** Can register/login; catalog endpoints return seeded data (verified via curl/Postman).

---

## Phase 2 — Storefront Frontend  _(est. 1.5–2 weeks)_
**Goal:** Customers can browse and build a cart.
- [ ] Design tokens + base/component CSS; responsive shell (header, nav, footer).
- [ ] Home page with featured products + categories (FR-1).
- [ ] Category listing with filters/sort/pagination (FR-2, FR-6).
- [ ] Product detail: gallery, variant select, add to cart, reviews display (FR-3, FR-4, FR-8).
- [ ] Search UI (FR-5).
- [ ] Cart: add/update/remove, totals, coupon field, guest persistence (FR-9..FR-13).
- [ ] Account UI: login/register/profile/addresses/order history (FR-17..FR-19).

**Exit:** End-to-end browse → add to cart works on mobile & desktop.

---

## Phase 3 — Checkout & Payments  _(est. 1.5–2 weeks)_
**Goal:** Customers can pay and place orders.
- [ ] Checkout quote API: shipping + tax computation (FR-22, FR-23).
- [ ] Place-order API with transactional stock decrement (FR-24).
- [ ] Payment gateway integration (sandbox) + webhook verification (FR-25).
- [ ] COD option if in scope (FR-26).
- [ ] Order confirmation email + transactional emails (FR-27, FR-43).
- [ ] Checkout UI: address → shipping → payment → review (FR-21).
- [ ] Order tracking page + cancellation (FR-28, FR-29).

**Exit:** A sandbox order completes: paid → confirmation email → status visible. **MVP customer flow done.**

---

## Phase 4 — Admin Panel  _(est. 1.5–2 weeks)_
**Goal:** Business can run the store.
- [ ] Admin auth/role guard + admin layout.
- [ ] Product/variant/image CRUD (FR-31, FR-33).
- [ ] Category CRUD (FR-32).
- [ ] Order management: list, detail, status + tracking (FR-34).
- [ ] Coupons management (FR-35).
- [ ] Customers list (FR-36); review moderation (FR-8).
- [ ] Settings: shipping/tax/banners (FR-38); basic dashboard (FR-37).

**Exit:** Admin adds a product that appears in storefront and processes an order end-to-end.

---

## Phase 5 — Hardening, SEO, Performance & Launch  _(est. 1–1.5 weeks)_
**Goal:** Production-ready.
- [ ] Security pass against [NFR §2.3](02-requirements.md#23-security): CSRF, rate limits, headers, input validation, RBAC, secure cookies.
- [ ] SEO: clean URLs, meta/OG tags, sitemap.xml, robots.txt, Product JSON-LD (FR-41, FR-42).
- [ ] Performance: image optimization (WebP), lazy-load, minify CSS/JS, OPcache, perf budget (NFR §2.1).
- [ ] Accessibility audit (WCAG AA), Lighthouse targets (Perf ≥85, A11y ≥90, SEO ≥90).
- [ ] Static/legal pages: About, Contact, FAQ, Shipping/Returns, Privacy, Terms (FR-39).
- [ ] Cookie consent + privacy compliance (NFR §2.8).
- [ ] Backups, error logging, uptime monitoring (NFR §2.4, §2.9).
- [ ] QA regression pass against acceptance criteria ([02 §3](02-requirements.md#3-acceptance-criteria-sample-mvp-gate)).
- [ ] Production deploy + smoke tests + DNS/TLS.

**Exit:** Live site passing the MVP acceptance gate.

---

## Post-Launch / Future Phases (from out-of-scope)
| Idea | Phase |
|------|-------|
| Subscriptions / spice boxes | 6 |
| Loyalty & rewards points | 6 |
| Multi-currency / i18n | 7 |
| Recommendation engine | 7 |
| Redis caching / CDN scale-out | as traffic grows |
| Native mobile apps | later |
| 3PL / warehouse integrations | later |

---

## Suggested Build Order (single full-stack dev)
1. DB migration + seeds → 2. Auth + catalog APIs → 3. Storefront browse/cart →
4. Checkout + payment → 5. Admin → 6. Harden/SEO/launch.

> Tip: build each API endpoint and immediately wire the matching UI so every
> feature is demoable as you go, rather than big-bang integration at the end.

---

## Tracking
- Convert each checkbox into an issue/ticket in your tracker.
- Consider using **Kiro Specs** to formalize requirements → design → tasks for
  complex phases (e.g., Checkout & Payments) when you start building.
