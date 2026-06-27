# Tech Stack & Architecture — Spices D2C E-commerce Platform

> **Document status:** Draft v1.0 (planning)
> **Last updated:** 2026-06-27

---

## 1. Technology Stack

### 1.1 Frontend
| Concern | Choice | Notes |
|---------|--------|-------|
| Markup | **HTML5** | Semantic, accessible |
| Styling | **CSS3** | Custom properties (design tokens), Flexbox/Grid, mobile-first |
| Behavior | **Vanilla JavaScript (ES6+)** | `fetch()` for API calls; modules; no heavy framework |
| Architecture | Multi-page (MPA) with progressive enhancement; cart/checkout use JS + API | Keeps it lightweight & SEO-friendly |
| Build (optional) | Minify/bundle CSS/JS at deploy (e.g., esbuild) | Not required for MVP; can ship plain files |

**Why vanilla JS:** the requirement is HTML/CSS/JS. Avoiding a SPA framework keeps
the bundle small, improves SEO and first paint, and reduces maintenance burden.

### 1.2 Backend
| Concern | Choice | Notes |
|---------|--------|-------|
| Language | **PHP 8.1+** | Typed properties, enums, match, named args |
| Style | Lightweight MVC-ish: Router → Controller → Service → Repository | Framework-optional |
| Framework option A | **No framework** (custom micro-router) | Max control, minimal deps |
| Framework option B | **Slim 4** (micro-framework) | Routing, PSR-7, middleware — recommended if comfortable with Composer |
| Framework option C | **Laravel** | Full-featured; heavier; use if team prefers batteries-included |
| API style | **REST + JSON** | See [05-api-spec.md](05-api-spec.md) |
| Auth | Session-based for storefront/admin **or** JWT for API; CSRF for forms | Choose one; session is simpler for MVP |
| Dependency mgmt | **Composer** | Even "no framework" benefits (autoload, libs) |

> **Recommendation for MVP:** PHP 8.1 + **Slim 4** + Composer. It gives clean
> routing/middleware without Laravel's weight, and pairs well with a vanilla-JS
> frontend talking to a JSON API. If the team prefers zero dependencies, the
> custom micro-router is documented below.

### 1.3 Database
| Concern | Choice | Notes |
|---------|--------|-------|
| Engine | **MySQL 8.0** or **MariaDB 10.5+** | InnoDB for transactions/FKs |
| Access | **PDO** with prepared statements | Driver-agnostic, safe from SQLi |
| Migrations | SQL migration files (versioned) or Phinx | Track schema in git |
| Charset | `utf8mb4` | Full Unicode (emoji, all scripts) |

### 1.4 Infrastructure
| Concern | Choice |
|---------|--------|
| Web server | Apache (mod_php) or **Nginx + PHP-FPM** (preferred for perf) |
| TLS | Let's Encrypt / provider-managed |
| Email | SMTP via transactional provider (e.g., SES, Mailgun, SMTP) using PHPMailer |
| File/image storage | Local `storage/` for MVP; S3-compatible later |
| Caching (later) | OPcache (PHP), object cache (Redis) when needed |
| Payments | One gateway with PHP SDK/REST (selection in open questions) |

---

## 2. Architecture Overview

### 2.1 Logical Layers (backend)

```
HTTP Request
   │
   ▼
┌───────────────┐
│  Router       │  maps method+path -> handler
└──────┬────────┘
       ▼
┌───────────────┐
│  Middleware   │  auth, CSRF, rate-limit, JSON parse, CORS
└──────┬────────┘
       ▼
┌───────────────┐
│  Controller   │  validates input, builds response
└──────┬────────┘
       ▼
┌───────────────┐
│  Service      │  business logic (pricing, stock, orders)
└──────┬────────┘
       ▼
┌───────────────┐
│  Repository   │  PDO queries (prepared statements)
└──────┬────────┘
       ▼
┌───────────────┐
│  MySQL/MariaDB│
└───────────────┘
```

### 2.2 Request Flow (example: place order)

1. Frontend `POST /api/orders` with cart + address + payment intent.
2. Middleware authenticates session/JWT, verifies CSRF.
3. `OrderController` validates payload.
4. `OrderService` re-prices server-side (never trust client prices),
   checks stock, begins a **DB transaction**, decrements stock, creates
   `orders` + `order_items`.
5. Initiates payment with the gateway; stores `payment` record.
6. On gateway **webhook** confirming payment → mark order `paid`, send email.
7. Commit transaction; return order summary.

> **Golden rule:** prices, taxes, shipping, and stock are always recalculated
> on the server. The client is never trusted for money or inventory.

### 2.3 Frontend Structure

- Server-rendered/static HTML pages for SEO-critical content (home, category, product).
- JavaScript modules handle: cart state, async catalog fetches, checkout, form validation.
- A small shared `api.js` wraps `fetch()` with base URL, auth headers, and error handling.
- Design tokens (colors, spacing, typography) centralized in CSS custom properties.

---

## 3. Environments

| Env | Purpose | Notes |
|-----|---------|-------|
| Local | Development | Docker (PHP-FPM + MySQL + Nginx) or XAMPP/MAMP |
| Staging | Pre-prod QA | Mirrors prod; sandbox payment keys |
| Production | Live | Real keys, backups, monitoring |

Configuration is environment-specific via `.env` (DB creds, gateway keys, SMTP).
**Never commit secrets.** Provide a committed `.env.example` template.

---

## 4. Key Cross-Cutting Concerns

| Concern | Approach |
|---------|----------|
| Validation | Server-side validation on every endpoint; mirror lightweight checks on client |
| Error handling | Consistent JSON error envelope: `{ "error": { "code", "message", "details" } }` |
| Auth & roles | RBAC: `customer`, `admin`; middleware-guarded admin routes |
| Money | Store amounts as integer minor units (e.g., paise/cents) or `DECIMAL(10,2)`; pick one and be consistent (schema uses `DECIMAL`) |
| Time | Store UTC in DB; format in UI |
| Idempotency | Payment webhooks idempotent via gateway event id |
| Logging | Structured logs with levels; no PII/secrets in logs |

---

## 5. Coding Standards

- **PHP:** PSR-12 formatting, PSR-4 autoloading, typed signatures, `declare(strict_types=1)`.
- **JS:** ES modules, `const`/`let`, no globals, documented with JSDoc where useful.
- **CSS:** BEM-like naming or utility classes; tokens via `:root` variables.
- **Git:** feature branches, PRs, conventional commit messages (e.g., `feat:`, `fix:`).
- **SQL:** snake_case tables/columns; explicit column lists (no `SELECT *` in app code).

---

## 6. Decision Log (ADR-lite)

| # | Decision | Rationale | Status |
|---|----------|-----------|--------|
| 1 | Vanilla JS frontend (no SPA framework) | Lightweight, SEO, requirement-aligned | Accepted |
| 2 | PHP 8.1 backend | Required stack; modern features | Accepted |
| 3 | MySQL/MariaDB + PDO | Relational data, transactions, SQLi-safe | Accepted |
| 4 | Slim 4 recommended (framework-optional) | Routing/middleware without bloat | Proposed |
| 5 | Session auth for MVP | Simpler than JWT for server-rendered pages | Proposed |
| 6 | Payment data delegated to gateway | PCI scope reduction | Accepted |

> ADRs marked "Proposed" should be confirmed in Phase 0.
