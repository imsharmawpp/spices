# Documentation Index — Spices D2C E-commerce Platform

Planning and reference documentation for the spices Direct-to-Consumer
e-commerce site. **Stack:** HTML/CSS/Vanilla JS frontend · PHP 8 backend · MySQL/MariaDB.

> Status: **Planning** — these documents define what we will build. No
> application code exists yet.

## Read in this order

| # | Document | What's inside |
|---|----------|---------------|
| 01 | [Project Plan](01-project-plan.md) | Vision, scope, personas, phases, team, risks, open questions |
| 02 | [Requirements](02-requirements.md) | Functional (FR-1..FR-44) + non-functional requirements, acceptance criteria |
| 03 | [Tech Stack & Architecture](03-tech-stack-architecture.md) | Technology choices, layered architecture, standards, decisions |
| 04 | [Database Schema](04-database-schema.md) | Data model, tables, indexing, transactions, reference DDL |
| 05 | [API Specification](05-api-spec.md) | REST/JSON contract: storefront + admin endpoints |
| 06 | [Folder Structure](06-folder-structure.md) | Proposed repo layout & naming conventions |
| 07 | [Roadmap & Milestones](07-roadmap.md) | Phased build plan with exit criteria |
| 08 | [UI / UX & Frontend Design](08-ui-ux-design.md) | Design system, components & page layouts — based on the [Xclusive Couture](https://theme-xclusive-couture.myshopify.com/) theme, adapted for spices |
| 09 | [Feature Pillars Mapping](09-feature-pillars.md) | The 5 e-commerce pillars traced to features, FRs, UI, API & data |

## How these fit together

```
01 Project Plan  ── defines ──>  scope & phases
02 Requirements  ── traced to ─>  05 API + 04 DB + 08 UI
03 Architecture  ── shapes ────>  06 Folder structure
04 DB Schema     ── backs ─────>  05 API responses
08 UI/UX Design  ── realizes ──>  02 requirements visually (ref: Xclusive Couture)
09 Pillars Map   ── verifies ──>  all 5 pillars are covered across 02/05/08
07 Roadmap       ── sequences ─>  building everything above
```

## Next step
Resolve the [open questions](01-project-plan.md#10-open-questions) (payment
gateway, shipping/tax model, COD), then begin **Phase 0** in the
[roadmap](07-roadmap.md).
