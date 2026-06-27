// Shared UI: header, footer, cart drawer, toasts, cart state, product card.
// Injected on every page. See docs/08-ui-ux-design.md §3.

const NAV = [
  { label: 'Shop All', href: '/shop' },
  { label: 'Whole Spices', href: '/shop/whole-spices' },
  { label: 'Ground Spices', href: '/shop/ground-spices' },
  { label: 'Blends', href: '/shop/blends-masalas' },
  { label: 'Gift Sets', href: '/shop/gift-sets' },
  { label: 'Organic', href: '/shop/organic' },
];

const icons = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

const UI = {
  settings: { store_name: 'Saffra Spices', announcement: '', free_shipping_threshold: 49 },
  me: null,

  async init() {
    try { this.settings = (await API.get('/settings')).data; } catch (_) {}
    try { this.me = (await API.get('/auth/me')).data; } catch (_) { this.me = null; }
    this.renderChrome();
    await Cart.refresh();
    this.bind();
  },

  renderChrome() {
    // Announcement + header
    const header = document.createElement('div');
    header.innerHTML = `
      <a class="skip-link" href="#main">Skip to content</a>
      <div class="announce">${Fmt.escape(this.settings.announcement || 'Freshly ground to order')}</div>
      <header class="site-header">
        <div class="container header-bar">
          <button class="icon-btn menu-toggle" aria-label="Open menu" data-action="open-menu">${icons.menu}</button>
          <nav class="nav-primary">${NAV.map(n => `<a href="${n.href}">${n.label}</a>`).join('')}</nav>
          <a class="brand" href="/">Saffra<span>.</span></a>
          <div class="header-actions">
            <button class="icon-btn" aria-label="Search" data-action="toggle-search">${icons.search}</button>
            <a class="icon-btn" aria-label="Account" href="/account">${icons.user}</a>
            <a class="icon-btn" aria-label="Wishlist" href="/shop">${icons.heart}</a>
            <button class="icon-btn" aria-label="Cart" data-action="open-cart">${icons.bag}<span class="cart-count hidden" id="cart-count">0</span></button>
          </div>
        </div>
        <div class="container hidden" id="search-bar" style="padding-bottom:16px;">
          <input id="search-input" type="search" placeholder="Search spices, blends, gifts…" style="width:100%;padding:14px 18px;border:1px solid var(--color-border);border-radius:999px;">
        </div>
      </header>
      <div class="mobile-nav" id="mobile-nav">
        <div class="drawer-overlay" data-action="close-menu" style="position:absolute"></div>
        <div class="mobile-nav__panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span class="brand" style="text-align:left">Saffra<span>.</span></span>
            <button class="icon-btn" data-action="close-menu" aria-label="Close menu">${icons.close}</button>
          </div>
          ${NAV.map(n => `<a href="${n.href}">${n.label}</a>`).join('')}
          <a href="/account">My Account</a>
        </div>
      </div>`;
    document.body.prepend(header);

    // Cart drawer + overlay + toast container appended to body
    const tail = document.createElement('div');
    tail.innerHTML = `
      <div class="drawer-overlay" id="cart-overlay" data-action="close-cart"></div>
      <aside class="cart-drawer" id="cart-drawer" aria-label="Shopping cart">
        <div class="cart-drawer__head">
          <h3>Your Cart</h3>
          <button class="icon-btn" data-action="close-cart" aria-label="Close cart">${icons.close}</button>
        </div>
        <div class="cart-drawer__items" id="cart-drawer-items"></div>
        <div class="cart-drawer__foot" id="cart-drawer-foot"></div>
      </aside>
      <div class="toast-wrap" id="toast-wrap"></div>`;
    document.body.append(tail);

    this.renderFooter();
  },

  renderFooter() {
    const f = document.createElement('footer');
    f.className = 'site-footer';
    f.innerHTML = `
      <div class="container footer-grid">
        <div>
          <div class="footer-brand">Saffra<span style="color:var(--color-accent)">.</span></div>
          <p style="margin-top:12px;max-width:34ch;">Single-origin spices and small-batch blends, ground fresh and shipped with care.</p>
          <form class="footer-news" id="footer-news">
            <input type="email" name="email" placeholder="Email for 10% off" required>
            <button class="btn btn--primary" type="submit">Join</button>
          </form>
        </div>
        <div><h4>Shop</h4>${NAV.map(n => `<a href="${n.href}">${n.label}</a>`).join('')}</div>
        <div><h4>Company</h4><a href="/about">Our Story</a><a href="/contact">Contact</a><a href="/shop">Recipes</a></div>
        <div><h4>Help</h4><a href="/contact">Shipping & Returns</a><a href="/contact">FAQ</a><a href="/account">Track Order</a></div>
      </div>
      <div class="container footer-bottom">
        <span>© ${new Date().getFullYear()} Saffra Spices. A demo store.</span>
        <span>🔒 Secure SSL checkout · Privacy · Terms</span>
      </div>`;
    document.body.append(f);
    f.querySelector('#footer-news').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = e.target.email.value;
      try { const r = await API.post('/newsletter', { email }); UI.toast(r.data.message); e.target.reset(); }
      catch (err) { UI.toast(err.message, 'error'); }
    });
  },

  bind() {
    document.body.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const a = el.dataset.action;
      if (a === 'open-cart') { e.preventDefault(); this.openCart(); }
      if (a === 'close-cart') this.closeCart();
      if (a === 'open-menu') document.getElementById('mobile-nav').classList.add('open');
      if (a === 'close-menu') document.getElementById('mobile-nav').classList.remove('open');
      if (a === 'toggle-search') {
        const bar = document.getElementById('search-bar');
        bar.classList.toggle('hidden');
        if (!bar.classList.contains('hidden')) document.getElementById('search-input').focus();
      }
    });
    const si = document.getElementById('search-input');
    if (si) si.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) location.href = '/shop?q=' + encodeURIComponent(e.target.value.trim());
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeCart(); });
  },

  openCart() { document.getElementById('cart-overlay').classList.add('open'); document.getElementById('cart-drawer').classList.add('open'); },
  closeCart() { document.getElementById('cart-overlay').classList.remove('open'); document.getElementById('cart-drawer').classList.remove('open'); },

  toast(msg, type) {
    const wrap = document.getElementById('toast-wrap');
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' toast--error' : '');
    t.textContent = msg;
    wrap.append(t);
    setTimeout(() => t.remove(), 3200);
  },

  // Reusable product card (Pillar 1). Used on home, shop, related.
  productCard(p) {
    const badges = [];
    if (p.on_sale && p.max_compare) {
      const pct = Math.round((1 - p.min_price / p.max_compare) * 100);
      badges.push(`<span class="badge badge--sale">Sale -${pct}%</span>`);
    }
    if (p.badge) badges.push(`<span class="badge ${p.badge === 'Organic' ? 'badge--organic' : 'badge--accent'}">${Fmt.escape(p.badge)}</span>`);
    const wished = Wishlist.has(p.slug);
    return `
    <article class="card">
      <a href="/product/${p.slug}" class="card__media" style="${tileStyle(p.accent_color)}" aria-label="${Fmt.escape(p.name)}">
        <span class="tile-emoji">${p.emoji || '🫙'}</span>
      </a>
      <div class="card__badges">${badges.join('')}</div>
      <button class="icon-btn card__wish ${wished ? 'active' : ''}" data-wish="${p.slug}" aria-label="Save to wishlist">${icons.heart}</button>
      <div class="card__quick">
        <button class="btn btn--dark btn--block btn--sm" data-add-slug="${p.slug}">Add to cart</button>
      </div>
      <div class="card__body">
        <span class="card__brand">${Fmt.escape(p.brand || 'Saffra')}</span>
        <a href="/product/${p.slug}"><h3 class="card__title">${Fmt.escape(p.name)}</h3></a>
        <span class="card__rating"><span class="stars">${Fmt.stars(p.rating_avg)}</span> ${p.rating_count || 0}</span>
        <div class="card__price">
          <span class="price-now">${Fmt.money(p.min_price)}</span>
          ${p.on_sale && p.max_compare ? `<span class="price-was">${Fmt.money(p.max_compare)}</span>` : ''}
        </div>
        <span class="stock-dot ${p.in_stock ? '' : 'out'}">${p.in_stock ? 'In stock' : 'Sold out'}</span>
      </div>
    </article>`;
  },

  // Wire up card buttons within a container (call after injecting cards).
  wireCards(container) {
    container.querySelectorAll('[data-add-slug]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const slug = btn.dataset.addSlug;
        btn.disabled = true; btn.textContent = 'Adding…';
        try {
          const p = (await API.get('/products/' + slug)).data;
          const variant = (p.variants || []).find(v => v.stock_qty > 0) || p.variants[0];
          if (!variant) throw new Error('Unavailable');
          await Cart.addItem(variant.id, 1);
          UI.toast(`${p.name} added to cart`);
          UI.openCart();
        } catch (err) { UI.toast(err.message || 'Could not add', 'error'); }
        finally { btn.disabled = false; btn.textContent = 'Add to cart'; }
      });
    });
    container.querySelectorAll('[data-wish]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const on = Wishlist.toggle(btn.dataset.wish);
        btn.classList.toggle('active', on);
        UI.toast(on ? 'Saved to wishlist' : 'Removed from wishlist');
      });
    });
  },
};

// ---- Cart state (server-backed) ----
const Cart = {
  data: { items: [], item_count: 0 },

  async refresh() { try { this.data = (await API.get('/cart')).data; } catch (_) {} this.render(); },
  async addItem(variantId, qty = 1) { this.data = (await API.post('/cart/items', { variant_id: variantId, quantity: qty })).data; this.render(); document.dispatchEvent(new Event('cart:update')); },
  async updateItem(id, qty) { this.data = (await API.patch('/cart/items/' + id, { quantity: qty })).data; this.render(); document.dispatchEvent(new Event('cart:update')); },
  async removeItem(id) { this.data = (await API.del('/cart/items/' + id)).data; this.render(); document.dispatchEvent(new Event('cart:update')); },
  async applyCoupon(code) { this.data = (await API.post('/cart/coupon', { code })).data; this.render(); document.dispatchEvent(new Event('cart:update')); },
  async removeCoupon() { this.data = (await API.del('/cart/coupon')).data; this.render(); document.dispatchEvent(new Event('cart:update')); },

  render() {
    const count = this.data.item_count || 0;
    const badge = document.getElementById('cart-count');
    if (badge) { badge.textContent = count; badge.classList.toggle('hidden', count === 0); }

    const items = document.getElementById('cart-drawer-items');
    const foot = document.getElementById('cart-drawer-foot');
    if (!items || !foot) return;

    if (!this.data.items || !this.data.items.length) {
      items.innerHTML = `<div class="cart-empty"><p style="font-size:2.5rem">🛒</p><p>Your cart is empty.</p><a class="btn btn--primary" href="/shop" style="margin-top:12px">Start shopping</a></div>`;
      foot.innerHTML = '';
      return;
    }

    items.innerHTML = this.data.items.map(it => `
      <div class="cart-line">
        <a href="/product/${it.slug}" class="cart-line__media" style="${tileStyle(it.accent_color)}">${it.emoji || '🫙'}</a>
        <div>
          <div class="cart-line__title">${Fmt.escape(it.product_name)}</div>
          <div class="cart-line__meta">${Fmt.escape(it.variant_name)} · ${Fmt.money(it.price)}</div>
          <div class="qty" style="margin-top:6px">
            <button data-dec="${it.id}" aria-label="Decrease">−</button>
            <span>${it.quantity}</span>
            <button data-inc="${it.id}" aria-label="Increase">+</button>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700">${Fmt.money(it.line_total)}</div>
          <button class="cart-line__remove" data-rm="${it.id}">Remove</button>
        </div>
      </div>`).join('');

    const d = this.data;
    foot.innerHTML = `
      ${d.discount_total > 0 ? `<div class="summary-row"><span>Discount ${d.coupon_code ? '(' + d.coupon_code + ')' : ''}</span><span>−${Fmt.money(d.discount_total)}</span></div>` : ''}
      <div class="summary-row"><span>Subtotal</span><span>${Fmt.money(d.subtotal)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${d.shipping_total > 0 ? Fmt.money(d.shipping_total) : 'Free'}</span></div>
      <div class="summary-row total"><span>Total</span><span>${Fmt.money(d.grand_total)}</span></div>
      <a class="btn btn--primary btn--block btn--lg" href="/checkout">Checkout</a>
      <a class="btn btn--light btn--block" href="/cart">View cart</a>`;

    items.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => this.changeQty(b.dataset.inc, 1));
    items.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => this.changeQty(b.dataset.dec, -1));
    items.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => this.removeItem(b.dataset.rm).catch(e => UI.toast(e.message, 'error')));
  },

  changeQty(id, delta) {
    const it = this.data.items.find(i => String(i.id) === String(id));
    if (!it) return;
    this.updateItem(id, it.quantity + delta).catch(e => UI.toast(e.message, 'error'));
  },
};

document.addEventListener('DOMContentLoaded', () => UI.init());
