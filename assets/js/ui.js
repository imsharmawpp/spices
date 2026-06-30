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
    await Currency.ensure();
    try { this.me = (await API.get('/auth/me')).data; } catch (_) { this.me = null; }
    this.renderChrome();
    this.initCurrencySwitcher();
    Currency.hydrate(document);
    await Cart.refresh();
    this.bind();
    Icons.hydrate();
    this.setFavicon();
    Anim.init();
  },

  initCurrencySwitcher() {
    const sel = document.getElementById('cur-select');
    if (!sel) return;
    sel.innerHTML = Currency.supported.map(c => `<option value="${c.code}" ${c.code === Currency.display ? 'selected' : ''}>${c.code}</option>`).join('');
    sel.title = (Currency.supported.find(c => c.code === Currency.display) || {}).name || 'Currency';
    sel.onchange = () => { Currency.set(sel.value); location.reload(); };
  },

  setFavicon() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${Icons.shapes.jar('#C8531B', 'fav', Icons)}</svg>`;
    const href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.type = 'image/svg+xml';
    link.href = href;
  },

  renderChrome() {
    // Announcement + header
    const header = document.createElement('div');
    header.innerHTML = `
      <a class="skip-link" href="#main">Skip to content</a>
      <div class="scroll-progress" id="scroll-progress" aria-hidden="true"></div>
      <div class="announce">${Fmt.escape(this.settings.announcement || 'Freshly ground to order')}</div>
      <header class="site-header">
        <div class="container header-bar">
          <button class="icon-btn menu-toggle" aria-label="Open menu" data-action="open-menu">${icons.menu}</button>
          <nav class="nav-primary">${NAV.map(n => `<a href="${n.href}">${n.label}</a>`).join('')}</nav>
          <a class="brand" href="/">Saffra<span>.</span></a>
          <div class="header-actions">
            <select class="cur-select" id="cur-select" aria-label="Display currency"></select>
            <button class="icon-btn" aria-label="Search" data-action="toggle-search">${icons.search}</button>
            <a class="icon-btn hide-xs" aria-label="Account" href="/account">${icons.user}</a>
            <a class="icon-btn hide-xs" aria-label="Wishlist" href="/shop">${icons.heart}</a>
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
    <article class="card reveal">
      <a href="/product/${p.slug}" class="card__media" style="${tileStyle(p.accent_color)}" aria-label="${Fmt.escape(p.name)}">
        <span class="tile-emoji">${productThumb(p)}</span>
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
      items.innerHTML = `<div class="cart-empty"><span class="empty-ico">${Icons.html('bag', '#C8531B')}</span><p>Your cart is empty.</p><a class="btn btn--primary" href="/shop" style="margin-top:12px">Start shopping</a></div>`;
      foot.innerHTML = '';
      return;
    }

    items.innerHTML = this.data.items.map(it => `
      <div class="cart-line">
        <a href="/product/${it.slug}" class="cart-line__media" style="${tileStyle(it.accent_color)}">${productThumb(it, 'tile-ico tile-ico--sm')}</a>
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
      ${Currency.isConverted() ? `<p class="cur-note">${Currency.note(d.grand_total)}</p>` : ''}
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

// ---- Motion layer (scroll reveal, header state, hero, magnetic buttons) ----
const Anim = {
  reduced: false,

  init() {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.classList.add('anim-ready');

    // Page fade-in + hero load trigger
    requestAnimationFrame(() => {
      document.body.classList.add('page-ready');
      requestAnimationFrame(() => document.body.classList.add('loaded'));
    });

    this.splitHeroTitle();
    this.observeReveals();
    this.headerScroll();
    this.heroParallax();
    this.scrollProgress();
    this.counters();
    this.spotlight();
    this.wordRotator();
    if (!this.reduced) this.magnetic();
  },

  // Split the hero <h1> into word spans for a staggered mask reveal.
  splitHeroTitle() {
    if (document.querySelector('.hero-slider')) return; // slider manages its own slides
    const h = document.querySelector('.hero h1');
    if (!h || h.dataset.split) return;
    h.dataset.split = '1';
    h.classList.add('hero-title');
    const words = h.textContent.trim().split(/\s+/);
    h.innerHTML = words.map(w => `<span class="word"><span>${Fmt.escape(w)}</span></span>`).join(' ');
  },

  // IntersectionObserver-based scroll reveal, auto-applied to .reveal elements.
  observeReveals() {
    if (this.reduced || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    const stagger = (el) => {
      // Stagger siblings within the same grid/carousel for a cascade effect.
      const parent = el.parentElement;
      if (parent && (parent.classList.contains('product-grid') || parent.classList.contains('cat-tiles') || parent.classList.contains('carousel'))) {
        const i = Array.prototype.indexOf.call(parent.children, el);
        el.style.setProperty('--reveal-delay', Math.min(i, 8) * 0.07 + 's');
      }
    };

    const observeAll = (root) => root.querySelectorAll('.reveal:not(.in-view)').forEach(el => { stagger(el); io.observe(el); });
    observeAll(document);

    // Re-scan when content is injected dynamically (cards, etc.)
    this._mo = new MutationObserver((muts) => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (typeof Icons !== 'undefined' && n.querySelectorAll) Icons.hydrate(n);
        if (n.classList && n.classList.contains('reveal')) { stagger(n); io.observe(n); }
        if (n.querySelectorAll) observeAll(n);
      }));
    });
    this._mo.observe(document.body, { childList: true, subtree: true });
  },

  headerScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  },

  heroParallax() {
    if (this.reduced) return;
    const float = document.querySelector('.hero__art-float');
    const hero = document.querySelector('.hero');
    if (!hero) return;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) {
        if (float) float.style.transform = `translateY(${y * 0.18}px)`;
        const content = hero.querySelector('.hero__content');
        if (content) content.style.transform = `translateY(${y * 0.06}px)`;
      }
    }, { passive: true });
  },

  // Subtle magnetic pull on large buttons (desktop pointers only).
  magnetic() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    document.body.addEventListener('mousemove', (e) => {
      const btn = e.target.closest('.btn--lg, .icon-btn');
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      btn.style.transform = `translate(${mx * 0.18}px, ${my * 0.22}px)`;
    });
    document.body.addEventListener('mouseout', (e) => {
      const btn = e.target.closest('.btn--lg, .icon-btn');
      if (btn) btn.style.transform = '';
    });
  },

  // Top scroll-progress indicator.
  scrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  },

  // Count-up animated numbers ([data-count], optional data-suffix / data-dec).
  counters() {
    const els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    if (this.reduced || !('IntersectionObserver' in window)) {
      els.forEach(el => this.setCount(el, parseFloat(el.dataset.count)));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { this.countUp(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    els.forEach(el => io.observe(el));
  },
  setCount(el, val) {
    const dec = el.dataset.dec ? parseInt(el.dataset.dec, 10) : 0;
    el.textContent = (dec ? val.toFixed(dec) : Math.round(val).toLocaleString('en-IN')) + (el.dataset.suffix || '');
  },
  countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dur = 1500, start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      this.setCount(el, target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  // Cursor spotlight inside bento grids.
  spotlight() {
    if (this.reduced) return;
    document.querySelectorAll('.bento').forEach(grid => {
      grid.addEventListener('mousemove', (e) => {
        const cell = e.target.closest('.bento__cell');
        if (!cell) return;
        const r = cell.getBoundingClientRect();
        cell.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        cell.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  },

  // Rotating kinetic word(s).
  wordRotator() {
    document.querySelectorAll('.rotator').forEach(r => {
      const items = Array.from(r.children);
      if (!items.length) return;
      items[0].classList.add('active');
      if (this.reduced || items.length < 2) return;
      let i = 0;
      setInterval(() => {
        items[i].classList.remove('active');
        i = (i + 1) % items.length;
        items[i].classList.add('active');
      }, 2300);
    });
  },
};

// ---- Full-screen image lightbox (reusable) ----
const Lightbox = {
  images: [], index: 0, el: null,

  mount() {
    if (this.el) return;
    const el = document.createElement('div');
    el.className = 'lightbox';
    el.id = 'lightbox';
    el.innerHTML = `
      <button class="lightbox__close" aria-label="Close">✕</button>
      <button class="lightbox__nav prev" aria-label="Previous">‹</button>
      <img class="lightbox__img" id="lightbox-img" alt="">
      <button class="lightbox__nav next" aria-label="Next">›</button>
      <div class="lightbox__count" id="lightbox-count"></div>`;
    document.body.appendChild(el);
    this.el = el;
    el.querySelector('.lightbox__close').onclick = () => this.close();
    el.querySelector('.prev').onclick = (e) => { e.stopPropagation(); this.go(-1); };
    el.querySelector('.next').onclick = (e) => { e.stopPropagation(); this.go(1); };
    el.onclick = (e) => { if (e.target === el) this.close(); };
    document.addEventListener('keydown', (e) => {
      if (!this.el.classList.contains('open')) return;
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowRight') this.go(1);
      if (e.key === 'ArrowLeft') this.go(-1);
    });
  },

  open(images, index = 0) {
    if (!images || !images.length) return;
    this.mount();
    this.images = images;
    this.index = index;
    this.render();
    this.el.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  go(delta) {
    this.index = (this.index + delta + this.images.length) % this.images.length;
    this.render();
  },

  render() {
    this.el.querySelector('#lightbox-img').src = this.images[this.index];
    const multi = this.images.length > 1;
    this.el.querySelectorAll('.lightbox__nav').forEach(n => n.style.display = multi ? 'grid' : 'none');
    const count = this.el.querySelector('#lightbox-count');
    count.textContent = multi ? `${this.index + 1} / ${this.images.length}` : '';
  },

  close() {
    if (this.el) this.el.classList.remove('open');
    document.body.style.overflow = '';
  },
};

document.addEventListener('DOMContentLoaded', () => UI.init());
