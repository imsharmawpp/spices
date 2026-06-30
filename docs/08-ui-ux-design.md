# UI / UX & Frontend Design — Spices D2C E-commerce Platform

> **Document status:** Draft v1.0 (planning)
> **Design reference:** [Xclusive Couture Shopify theme](https://theme-xclusive-couture.myshopify.com/)
> **Last updated:** 2026-06-27

This document defines the **visual language, components, and page layouts** for the
storefront. The structure and UX patterns are **derived from the Xclusive Couture
theme** (a clean, elegant, editorial commerce theme) and **adapted for a spices
brand**. We reproduce the *layout patterns and interaction model*, not the theme's
proprietary assets or copy.

> _Design patterns observed on the reference site were summarized and reinterpreted
> for our spices brand. Content was rephrased for compliance with licensing restrictions._

---

## 1. Design Principles (from the reference theme)

The reference theme's strengths we will adopt:

1. **Editorial & minimal** — generous whitespace, large imagery, restrained typography lets products breathe.
2. **Product-first** — clean product cards with strong photography are the hero of every page.
3. **Trust signals everywhere** — visible stock counts, delivery promises, reviews, and badges.
4. **Merchandising via sections** — the homepage is a stack of modular, reorderable content blocks (carousels, promos, UGC, stories).
5. **Accessible by default** — skip-links ("go to navigation / search / content / footer"), keyboard nav, alt text.
6. **Soft, premium feel** — rounded corners, subtle shadows, gentle hover transitions.

### Brand adaptation (fashion/jewelry → spices)
- Warm, earthy, appetizing palette (turmeric, paprika, saffron tones) instead of cool fashion neutrals.
- Imagery: spices in bowls, textured close-ups, lifestyle cooking shots, origin/farm photography.
- Copy voice: fresh, authentic, sensory ("aroma", "single-origin", "freshly ground").

---

## 2. Design Tokens

Centralize in `public/assets/css/tokens.css` as CSS custom properties.

### 2.1 Color
| Token | Suggested value | Use |
|-------|-----------------|-----|
| `--color-bg` | `#FBF8F3` (warm off-white) | page background |
| `--color-surface` | `#FFFFFF` | cards, header |
| `--color-text` | `#2A2118` (deep brown-black) | body text |
| `--color-muted` | `#8A7F70` | secondary text |
| `--color-primary` | `#C8531B` (paprika/terracotta) | CTAs, links |
| `--color-primary-dark` | `#9E3F12` | hover |
| `--color-accent` | `#E0A422` (turmeric/saffron) | highlights, badges |
| `--color-success` | `#3F7D3A` | in-stock, confirmations |
| `--color-sale` | `#B3261E` | sale/discount badges |
| `--color-border` | `#E7DFD3` | dividers, card borders |

> Final palette to be confirmed with brand assets (see [open questions](01-project-plan.md#10-open-questions)).

### 2.2 Typography
| Token | Suggestion |
|-------|------------|
| `--font-heading` | An elegant serif (e.g., "Cormorant Garamond"/"Playfair Display") for editorial headlines |
| `--font-body` | A clean sans-serif (e.g., "Inter"/"Work Sans") for UI & body |
| Scale | `--fs-xs:.75rem … --fs-h1:clamp(2.2rem,5vw,3.5rem)` (fluid) |

### 2.3 Spacing, radius, shadow, motion
- Spacing scale: `4, 8, 12, 16, 24, 32, 48, 64, 96` (px) via `--space-*`.
- Radius: `--radius-sm:6px`, `--radius-md:12px`, `--radius-pill:999px`.
- Shadow: `--shadow-card: 0 4px 20px rgba(0,0,0,.06)`.
- Motion: `--transition: 200ms ease` for hovers; respect `prefers-reduced-motion`.

### 2.4 Layout grid
- Max content width `--container: 1280px`, gutters 16–24px.
- Breakpoints: `360` (small mobile), `768` (tablet), `1024` (laptop), `1440` (desktop).
- Product grids: 2 cols mobile → 3 tablet → 4 desktop.

---

## 3. Component Library

Built as reusable vanilla-JS modules + CSS classes (`public/assets/`).

### 3.1 Header / Navigation (from reference)
- **Announcement bar** (top): rotating message — e.g., free shipping threshold, "Next-day delivery". The reference uses this for delivery promises.
- **Main header:** logo (center or left), primary nav, icons: search, account, **wishlist (heart)**, **cart (with item-count badge)**.
- **Mega-menu** for categories (reference nav: Bestsellers / Jewelry / Accessories / Clothing → ours: **Bestsellers / Whole Spices / Ground Spices / Blends & Masalas / Gift Sets / Organic**), with featured imagery in the dropdown.
- **Sticky on scroll**; condensed height after scroll.
- **Mobile:** hamburger → slide-in drawer nav; sticky bottom utility bar optional.
- **Search:** opens an overlay with predictive/typeahead results (FR-5).

### 3.2 Product Card (the core component)
Mirrors the reference card anatomy:
- Product image with **hover image swap** (second image on hover).
- **Badges** (top-left/right corners): `Sale -XX%`, custom merch labels like "Trending 🫶" / "Last ones 🚀" / "New" / "Organic".
- Vendor/brand line (small, muted) + **product title**.
- **Price**: current price; if on sale, show struck-through `compare_at_price` + sale price.
- **Rating**: stars + review count (when present).
- **Stock indicator**: e.g., "10 in stock" (success color) / "Low stock" / "Sold out".
- **Quick "Add to cart"** button revealed on hover (desktop) / always visible (mobile).
- Optional **delivery note tooltip** ("Next-day delivery") like the reference.
- **Quick-view** modal (optional) + **wishlist heart** toggle.

### 3.3 Carousel / Slider
- Horizontal scroll/slider for **Bestsellers**, **New Arrivals**, **Related products**, **Recently viewed**. Snap scrolling, prev/next arrows, drag on touch.

### 3.4 Section blocks (homepage modules)
Reusable, reorderable sections (admin-configurable later via `settings`):
- **Hero / editorial banner** with headline, subcopy, CTA (reference: "Find the Piece That Tells Your Story" → ours: e.g., "Spices That Tell a Story").
- **Featured collection promo** (image + text + "Shop collection" CTA).
- **Category tiles** (Whole / Ground / Blends / Gift Sets).
- **Tabbed product showcase** ("New in / Stainless Steel / Jewelry" pattern → "New in / Bestsellers / Organic").
- **UGC / social feed** ("Follow Our Journey" — Instagram-style grid with shoppable tags).
- **Brand logos** ("Our brands" strip — for ours, certifications: Organic, FSSAI, etc.).
- **Stories / blog** teasers (recipes, spice guides).
- **Promo banner** ("Shine Every Day" → "Freshly Ground, Every Day").
- **Newsletter signup** band.

### 3.5 Forms, buttons, feedback
- Buttons: primary (filled paprika), secondary (outline), text/link. Pill or slightly-rounded.
- Inputs with floating/inline labels, clear focus rings, inline validation messages.
- **Toasts** for add-to-cart / wishlist confirmations.
- **Cart drawer** (slide-in from right) showing line items, qty steppers, subtotal, "Checkout" CTA — opens on add-to-cart.
- Skeleton loaders for async product/data fetches.

### 3.6 Trust & support components (Pillar 5)
- **Live chat / chatbot** launcher (bottom-right bubble).
- Trust badges near cart/checkout (SSL/secure payment, returns).
- Footer policy links (Returns, Shipping, Privacy, Terms).

---

## 4. Page-by-Page Layouts (wireframe outlines)

### 4.1 Home (`/`)
```
[ Announcement bar ]
[ Header + mega-menu ]
[ Hero editorial banner + CTA ]
[ Bestsellers carousel ]
[ Category tiles ]
[ New arrivals (with sale badges) carousel ]
[ Featured collection promo (image + Shop collection) ]
[ Tabbed product showcase: New in / Bestsellers / Organic ]
[ UGC "Follow Our Journey" shoppable grid ]
[ Stories / recipes teasers ]
[ Promo banner: Freshly Ground, Every Day ]
[ Certifications / "Our standards" strip ]
[ Newsletter signup ]
[ Footer ]
```

### 4.2 Collection / Category (`/collections/{slug}`)
```
[ Collection header: title + short description + banner ]
[ Toolbar: result count | sort dropdown | filter toggle ]
[ Sidebar/Drawer filters: category, price range, form (whole/ground),
  organic, rating, availability ]  (FR-6)
[ Responsive product grid (cards) + pagination / infinite scroll ]
```

### 4.3 Product Detail (PDP) (`/products/{slug}`)
```
[ Breadcrumb ]
[ Gallery (left): multi-image, thumbnails, ZOOM, optional 360/video ]  (FR-3, FR-48)
[ Info (right):
    brand • title • rating(reviews) • price/compare-at • sale badge
    variant selector (100g / 250g / 500g; whole/ground)
    qty stepper • Add to cart • Wishlist • stock status
    delivery estimate • secure-payment trust row
    accordions: Description • Origin & sourcing • How to use/recipes • Shipping & returns ]
[ Tabs/section: full description, attributes, nutritional/origin info ]
[ Reviews section: rating summary + photo reviews + write-a-review ]  (FR-8, FR-49)
[ "You may also like" / related carousel ]  (FR-7, FR-47)
[ Recently viewed carousel ]
```

### 4.4 Cart (`/cart`) + Cart drawer
```
[ Line items: image, title, variant, qty stepper, line total, remove ]
[ Coupon code field ]                         (FR-13)
[ Order summary: subtotal, est. shipping, est. tax, total ]
[ Trust badges + "Proceed to checkout" / "Continue shopping" ]
[ Cross-sell: "Complete your pantry" suggestions ]
```

### 4.5 Checkout (`/checkout`)
```
[ Steps: Contact → Shipping address → Shipping method → Payment → Review ]  (FR-21)
[ Guest checkout option (no account required) ]   (FR-20)
[ Live order summary sidebar (sticky) ]
[ Shipping calculator + estimated delivery ]      (FR-22)
[ Secure payment (gateway) + COD if enabled ]     (FR-25, FR-26)
```

### 4.6 Account (`/account/*`)
```
[ Dashboard: greeting, recent orders, quick links ]
[ Orders: list + detail + tracking + reorder ]    (FR-19, FR-28)
[ Wishlist ]                                       (FR-45)
[ Addresses (CRUD) ]                               (FR-18)
[ Profile / password ]                             (FR-17)
[ Loyalty points / rewards (future) ]              (FR-50)
```

### 4.7 Supporting pages
- **Wishlist** (`/wishlist`), **Compare** (`/compare`) (FR-45, FR-46).
- **Search results** (`/search`) with same grid + filters.
- **Stories/Blog** (`/blog`, `/blog/{post}`) — recipes & spice guides (SEO content).
- **Static/legal**: About, Contact (form), FAQ, Shipping & Returns, Privacy, Terms (FR-39, FR-40).
- **Auth**: Login, Register, Forgot/Reset password.
- **404 / empty states** styled on-brand.

---

## 5. Responsive & Accessibility

- **Mobile-first** CSS; product grids and sections reflow per breakpoint (§2.4).
- Tap targets ≥ 44px; cart/nav as drawers on mobile.
- WCAG 2.1 AA: semantic landmarks, skip-links (as in reference), focus-visible states, `alt` on all imagery, color-contrast checked against tokens, ARIA on menus/carousels/modals.
- `prefers-reduced-motion` disables non-essential animation.

---

## 6. Frontend Implementation Notes

- Plain HTML/CSS/JS per [tech stack](03-tech-stack-architecture.md); no SPA framework.
- JS modules map to components: `cart.js` (drawer + state), `catalog.js` (filters/sort), `product.js` (gallery/zoom/variants), `wishlist.js`, `compare.js`, `search.js` (typeahead), `ugc.js`.
- All data via the JSON API in [05-api-spec.md](05-api-spec.md).
- Images: responsive `srcset`, lazy-load, WebP, defined aspect ratios to prevent layout shift (CLS).
- Design tokens drive theming so the brand palette can be tuned in one file.

---

## 7. Mapping to the Five Pillars
This UI directly serves the five feature pillars — see the dedicated mapping in
[09-feature-pillars.md](09-feature-pillars.md). At a glance:
- **Pillar 1 (UX/Front-end):** responsive grid, advanced filters, gallery zoom/360/video, wishlist, comparison.
- **Pillar 2 (Cart/Checkout):** cart drawer, guest checkout, coupons, shipping calculator, secure payment.
- **Pillar 3 (Account/Retention):** order tracking, recommendations, photo reviews, loyalty, newsletter.
- **Pillar 4 (Back-end mgmt):** admin-configurable sections, catalog/inventory tools (see admin in API spec).
- **Pillar 5 (Trust/Support):** SSL, live chat, visible policies & trust badges.

---

## 8. Attribution
Layout and interaction patterns were studied from the publicly viewable
[Xclusive Couture demo theme](https://theme-xclusive-couture.myshopify.com/) and
**reinterpreted** for the spices brand. No theme code, images, or copy are copied;
we re-implement equivalent UX with our own assets. Content was rephrased for
compliance with licensing restrictions.
