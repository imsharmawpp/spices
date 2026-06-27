# Project Plan — Spices D2C E-commerce Platform

> **Working title:** Spices D2C Store
> **Document status:** Draft v1.0 (planning)
> **Owner:** _TBD_
> **Last updated:** 2026-06-27

---

## 1. Executive Summary

We are building a **Direct-to-Consumer (D2C) e-commerce website** for a spices
company. Customers will be able to browse the spice catalog, read product
details, add items to a cart, check out, pay, and track their orders. The
business will manage products, inventory, orders, and content through an admin
panel.

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Backend | PHP (8.x) |
| Database | SQL (MySQL / MariaDB) |
| Web server | Apache or Nginx + PHP-FPM |

The platform is intentionally built on a **classic, dependency-light stack** so
it is easy to host on standard shared/VPS PHP hosting and easy to maintain.

---

## 2. Business Goals

1. **Sell spices online directly to consumers** (no marketplace middleman).
2. Present the brand as **premium, fresh, and trustworthy**.
3. Make the **buying journey frictionless** on mobile and desktop.
4. Give the business **full control** over catalog, pricing, promotions, and orders.
5. Lay a foundation that can **scale** with traffic and SKUs over time.

### Success metrics (initial targets)
- Conversion rate ≥ 2% of sessions.
- Cart abandonment ≤ 70%.
- Page load (LCP) < 2.5s on 4G mobile.
- Checkout completion in ≤ 3 steps.
- Zero critical security incidents.

---

## 3. Scope

### 3.1 In Scope (MVP)
- Public storefront: home, catalog/category, product detail, search.
- Cart and guest + registered checkout.
- User accounts (register, login, profile, address book, order history).
- Online payment (one gateway) + Cash on Delivery (optional).
- Order lifecycle (placed → paid → packed → shipped → delivered).
- Admin panel: product, category, inventory, order, and customer management.
- Coupons / basic discounts.
- Transactional emails (order confirmation, shipping).
- Responsive design (mobile-first).
- Basic SEO (meta tags, clean URLs, sitemap).

### 3.2 Out of Scope (for MVP — future phases)
- Subscriptions / recurring spice boxes.
- Loyalty / rewards points program.
- Multi-currency / multi-language (i18n).
- Marketplace / multi-vendor.
- Mobile native apps.
- Advanced recommendation engine.
- Warehouse / 3PL integrations.

> Anything in "Out of Scope" is parked in the [Roadmap](07-roadmap.md) for later phases.

---

## 4. Target Users / Personas

| Persona | Description | Key needs |
|---------|-------------|-----------|
| **Home cook (primary)** | Buys spices for daily cooking | Freshness, authenticity, easy reorder |
| **Gifting buyer** | Buys spice gift sets | Presentation, gift packaging, fast delivery |
| **Health-conscious buyer** | Looks for organic / single-origin | Sourcing info, certifications, no additives |
| **Store admin (internal)** | Manages catalog & orders | Fast bulk edits, clear order queue |

---

## 5. High-Level Architecture

```
[ Browser ]  HTML / CSS / JS (SPA-lite, fetch() to API)
     |
     | HTTPS (JSON REST)
     v
[ PHP Backend ]  Routing -> Controllers -> Services -> Repositories
     |                                   |
     |                                   +-- Auth (session/JWT), Validation
     v
[ MySQL / MariaDB ]  products, orders, users, ...
     |
     +-- File storage (product images)
     +-- SMTP (transactional email)
     +-- Payment gateway (server-to-server)
```

See [03-tech-stack-architecture.md](03-tech-stack-architecture.md) for detail.

---

## 6. Project Phases & Milestones

| Phase | Name | Goal | Exit criteria |
|-------|------|------|---------------|
| 0 | **Setup** | Repo, environment, conventions | Local dev runs; CI lint passes |
| 1 | **Database & API foundation** | Schema + auth + core CRUD APIs | APIs return data; auth works |
| 2 | **Storefront frontend** | Catalog, product, cart UI | Browse + add to cart end-to-end |
| 3 | **Checkout & payments** | Orders + payment integration | Test order paid successfully |
| 4 | **Admin panel** | Manage catalog/orders | Admin can run the store |
| 5 | **Hardening & launch** | Security, SEO, perf, QA | Production deploy + smoke tests pass |

Detailed breakdown lives in [07-roadmap.md](07-roadmap.md).

---

## 7. Team & Roles (suggested)

| Role | Responsibility |
|------|----------------|
| Product owner | Priorities, acceptance |
| Frontend dev | HTML/CSS/JS storefront + admin UI |
| Backend dev | PHP APIs, DB, integrations |
| Designer | UI/UX, brand visuals |
| QA | Test plans, regression |
| DevOps (part-time) | Hosting, backups, deploys |

> Small teams may combine roles. The docs are written so one full-stack
> developer could execute the whole plan sequentially.

---

## 8. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Payment integration delays | High | Medium | Start gateway sandbox in Phase 1; COD fallback |
| Security (PII, payments) | High | Medium | Follow [security checklist](02-requirements.md#non-functional-requirements); never store raw card data |
| Scope creep | Medium | High | Lock MVP scope; route extras to roadmap |
| SEO/perf on launch | Medium | Medium | Build perf budget + SEO checklist into Phase 5 |
| Inventory oversell | Medium | Medium | Atomic stock decrement on order placement |
| Hosting limits (shared PHP) | Medium | Low | Validate host specs early; plan VPS upgrade path |

---

## 9. Assumptions

- Single brand, single currency, single language at launch.
- One warehouse / fulfillment location initially.
- A payment gateway with a PHP-friendly REST API is available in the target region.
- Standard LAMP-style hosting is available.

## 10. Open Questions (to resolve before/early in Phase 0)

1. Which **payment gateway**? (e.g., Razorpay, Stripe, PayPal, regional provider)
2. Which **shipping/courier** partner and rate model (flat, weight-based, free over X)?
3. Tax model (inclusive vs exclusive; GST/VAT rates)?
4. Brand assets (logo, colors, fonts) — available?
5. Domain + hosting provider chosen?
6. Do we need **Cash on Delivery** at launch?

---

## 11. Related Documents

- [02 — Requirements](02-requirements.md)
- [03 — Tech Stack & Architecture](03-tech-stack-architecture.md)
- [04 — Database Schema](04-database-schema.md)
- [05 — API Specification](05-api-spec.md)
- [06 — Folder Structure](06-folder-structure.md)
- [07 — Roadmap & Milestones](07-roadmap.md)
