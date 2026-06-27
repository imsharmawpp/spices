// Saffra Spices — Admin / CMS app (vanilla JS, talks to /api/admin/*).
const h = (s) => Fmt.escape(s);
const money = (n) => Fmt.money(n);

const Admin = {
  me: null,
  cats: [],

  async init() {
    try {
      const me = (await API.get('/auth/me')).data;
      if (me && me.role === 'admin') {
        this.me = me;
        window.__csrf = me.csrf;
        this.renderShell();
        this.go('dashboard');
        return;
      }
      if (me) { this.renderLogin('You are signed in as a customer. Use an admin account.'); return; }
    } catch (_) {}
    this.renderLogin();
  },

  /* ---------------- Login ---------------- */
  renderLogin(msg) {
    document.getElementById('admin-root').innerHTML = `
      <div class="admin-login">
        <form class="admin-login__card" id="login-form">
          <h1>Saffra<span class="brand-dot">.</span> Admin</h1>
          <p class="sub">Sign in to manage your store</p>
          ${msg ? `<p class="note" style="margin-bottom:16px">${h(msg)}</p>` : ''}
          <div class="f"><label>Email</label><input type="email" name="email" required value="admin@saffra.test"></div>
          <div class="f"><label>Password</label><input type="password" name="password" required></div>
          <button class="btn btn--primary btn--block btn--lg">Sign in</button>
          <p class="muted" style="font-size:.78rem;margin-top:14px;text-align:center">Demo: admin@saffra.test / admin123</p>
        </form>
      </div>`;
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const me = (await API.post('/auth/login', { email: fd.get('email'), password: fd.get('password') })).data;
        if (me.role !== 'admin') { this.renderLogin('That account is not an admin.'); return; }
        this.me = me; window.__csrf = me.csrf;
        this.renderShell(); this.go('dashboard');
      } catch (err) { this.toast(err.message || 'Login failed', 'error'); }
    });
  },

  /* ---------------- Shell ---------------- */
  nav: [
    ['dashboard', 'Dashboard'], ['products', 'Products'], ['categories', 'Categories'],
    ['orders', 'Orders'], ['coupons', 'Coupons'], ['reviews', 'Reviews'],
    ['customers', 'Customers'], ['messages', 'Messages'], ['settings', 'Settings'],
  ],

  renderShell() {
    document.getElementById('admin-root').innerHTML = `
      <div class="admin-shell">
        <aside class="admin-side" id="side">
          <div class="brand">Saffra<span>.</span></div>
          <nav class="admin-nav" id="nav">
            ${this.nav.map(([k, label]) => `<a data-view="${k}">${label}<span class="dot" id="dot-${k}" style="display:none"></span></a>`).join('')}
          </nav>
          <div class="admin-side__foot">
            <span style="display:block;padding:4px 12px;color:#fff">${h(this.me.name)}</span>
            <a href="/" target="_blank">View store ↗</a>
            <a id="logout">Log out</a>
          </div>
        </aside>
        <main class="admin-main">
          <div class="admin-head">
            <div style="display:flex;align-items:center;gap:12px">
              <button class="btn btn--light admin-burger" id="burger">☰</button>
              <h1 id="view-title">Dashboard</h1>
            </div>
            <span class="muted" id="view-sub"></span>
          </div>
          <div id="view"></div>
        </main>
      </div>`;
    document.getElementById('nav').addEventListener('click', (e) => {
      const a = e.target.closest('[data-view]');
      if (a) this.go(a.dataset.view);
      document.getElementById('side').classList.remove('open');
    });
    document.getElementById('logout').onclick = async () => { await API.post('/auth/logout'); location.reload(); };
    document.getElementById('burger').onclick = () => document.getElementById('side').classList.toggle('open');
  },

  go(view) {
    this.view = view;
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
    document.getElementById('view-title').textContent = this.nav.find(n => n[0] === view)[1];
    document.getElementById('view-sub').textContent = '';
    const v = document.getElementById('view');
    v.innerHTML = '<div class="loading">Loading…</div>';
    (this.views[view] || (() => {})).call(this, v);
  },

  /* ---------------- helpers ---------------- */
  async load(path) { return (await API.get(path)).data; },
  toast(msg, type) {
    const wrap = document.getElementById('toast-wrap');
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' toast--error' : '');
    t.textContent = msg; wrap.append(t);
    setTimeout(() => t.remove(), 3200);
  },
  modal(title, bodyHtml, footHtml) {
    let ov = document.getElementById('admin-modal');
    if (!ov) { ov = document.createElement('div'); ov.id = 'admin-modal'; ov.className = 'modal-overlay'; document.body.append(ov); }
    ov.innerHTML = `<div class="modal"><div class="modal__head"><h3>${h(title)}</h3><button class="icon-btn" id="m-close">✕</button></div>
      <div class="modal__body">${bodyHtml}</div><div class="modal__foot">${footHtml}</div></div>`;
    ov.classList.add('open');
    ov.querySelector('#m-close').onclick = () => this.closeModal();
    ov.onclick = (e) => { if (e.target === ov) this.closeModal(); };
    return ov;
  },
  closeModal() { const ov = document.getElementById('admin-modal'); if (ov) ov.classList.remove('open'); },
  statusBadge(s) { return `<span class="badge s-${h(s)}">${h(s)}</span>`; },
  errInto(form, details) {
    form.querySelectorAll('.err').forEach(e => e.textContent = '');
    if (details) Object.entries(details).forEach(([k, m]) => { const el = form.querySelector(`[data-err="${k}"]`); if (el) el.textContent = Array.isArray(m) ? m[0] : m; });
  },

  views: {
    /* ---------- Dashboard ---------- */
    async dashboard(v) {
      const d = await this.load('/admin/dashboard');
      v.innerHTML = `
        <div class="kpis">
          <div class="kpi"><div class="kpi__label">Revenue</div><div class="kpi__value accent">${money(d.revenue)}</div></div>
          <div class="kpi"><div class="kpi__label">Orders</div><div class="kpi__value">${d.orders}</div></div>
          <div class="kpi"><div class="kpi__label">Products</div><div class="kpi__value">${d.products}</div></div>
          <div class="kpi"><div class="kpi__label">Customers</div><div class="kpi__value">${d.customers}</div></div>
        </div>
        <div class="grid-2">
          <div class="panel">
            <h3>Recent orders</h3>
            <table class="data"><thead><tr><th>Order</th><th>Status</th><th>Total</th></tr></thead><tbody>
            ${d.recent_orders.length ? d.recent_orders.map(o => `<tr><td><strong>${h(o.order_number)}</strong><br><span class="muted" style="font-size:.78rem">${h(o.email)}</span></td><td>${this.statusBadge(o.status)}</td><td>${money(o.grand_total)}</td></tr>`).join('') : '<tr><td colspan="3" class="empty-row">No orders yet</td></tr>'}
            </tbody></table>
          </div>
          <div class="panel">
            <h3>Top products</h3>
            <table class="data"><thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead><tbody>
            ${d.top_products.length ? d.top_products.map(p => `<tr><td>${h(p.product_name)}</td><td>${p.qty}</td><td>${money(p.revenue)}</td></tr>`).join('') : '<tr><td colspan="3" class="empty-row">No sales yet</td></tr>'}
            </tbody></table>
          </div>
        </div>
        <div class="panel">
          <h3>Low stock (under 20)</h3>
          <table class="data"><thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Stock</th></tr></thead><tbody>
          ${d.low_stock.length ? d.low_stock.map(s => `<tr><td>${h(s.product)}</td><td>${h(s.variant)}</td><td>${h(s.sku)}</td><td><span class="badge ${s.stock < 10 ? 's-cancelled' : 's-pending'}">${s.stock}</span></td></tr>`).join('') : '<tr><td colspan="4" class="empty-row">All well stocked</td></tr>'}
          </tbody></table>
        </div>`;
      if (d.pending_reviews) { const dot = document.getElementById('dot-reviews'); if (dot) dot.style.display = 'inline-block'; }
      if (d.pending_orders) { const dot = document.getElementById('dot-orders'); if (dot) dot.style.display = 'inline-block'; }
    },

    /* ---------- Products ---------- */
    async products(v) {
      this.cats = await this.load('/admin/categories');
      const render = async (q = '') => {
        const res = await API.get('/admin/products?per_page=50' + (q ? '&q=' + encodeURIComponent(q) : ''));
        const rows = res.data;
        body.innerHTML = rows.length ? rows.map(p => `
          <tr>
            <td><div style="display:flex;align-items:center;gap:10px"><span class="row-ico" style="${tileStyle(p.accent_color)}">${Icons.html(Icons.forProduct(p), p.accent_color)}</span><div><strong>${h(p.name)}</strong><br><span class="muted" style="font-size:.78rem">${h(p.category_name)}</span></div></div></td>
            <td>${p.min_price != null ? money(p.min_price) : '—'}</td>
            <td>${p.stock}</td>
            <td>${p.variant_count}</td>
            <td>${p.is_active == 1 ? '<span class="badge on">Active</span>' : '<span class="badge off">Hidden</span>'}</td>
            <td class="t-actions"><span class="link-btn" data-edit="${p.id}">Edit</span><span class="link-btn danger" data-del="${p.id}">Delete</span></td>
          </tr>`).join('') : '<tr><td colspan="6" class="empty-row">No products</td></tr>';
        body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.productModal(+b.dataset.edit));
        body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => this.confirmDelete('product', '/admin/products/' + b.dataset.del, render));
      };
      v.innerHTML = `
        <div class="toolbar">
          <input type="search" id="psearch" placeholder="Search products…">
          <div class="spacer"></div>
          <button class="btn btn--primary" id="new-product">+ New product</button>
        </div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Product</th><th>From</th><th>Stock</th><th>Variants</th><th>Status</th><th></th></tr></thead><tbody id="pbody"></tbody></table></div>`;
      const body = v.querySelector('#pbody');
      document.getElementById('new-product').onclick = () => this.productModal(null);
      let t; document.getElementById('psearch').oninput = (e) => { clearTimeout(t); t = setTimeout(() => render(e.target.value), 250); };
      render();
    },

    /* ---------- Categories ---------- */
    async categories(v) {
      const render = async () => {
        const rows = await this.load('/admin/categories');
        body.innerHTML = rows.map(c => `
          <tr>
            <td><span class="row-ico" style="${tileStyle(c.accent_color)}">${Icons.html(Icons.categoryIcon(c.slug), c.accent_color)}</span></td>
            <td><strong>${h(c.name)}</strong><br><span class="muted" style="font-size:.78rem">/${h(c.slug)}</span></td>
            <td>${c.product_count}</td>
            <td>${c.is_active == 1 ? '<span class="badge on">Active</span>' : '<span class="badge off">Hidden</span>'}</td>
            <td class="t-actions"><span class="link-btn" data-edit="${c.id}">Edit</span><span class="link-btn danger" data-del="${c.id}">Delete</span></td>
          </tr>`).join('');
        body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.categoryModal(rows.find(c => c.id == b.dataset.edit)));
        body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => this.confirmDelete('category', '/admin/categories/' + b.dataset.del, render));
      };
      v.innerHTML = `<div class="toolbar"><div class="spacer"></div><button class="btn btn--primary" id="new-cat">+ New category</button></div>
        <div class="table-wrap"><table class="data"><thead><tr><th></th><th>Name</th><th>Products</th><th>Status</th><th></th></tr></thead><tbody id="cbody"></tbody></table></div>`;
      const body = v.querySelector('#cbody');
      document.getElementById('new-cat').onclick = () => this.categoryModal(null);
      render();
    },

    /* ---------- Orders ---------- */
    async orders(v) {
      const render = async () => {
        const status = v.querySelector('#ostatus').value;
        const q = v.querySelector('#osearch').value;
        const res = await API.get('/admin/orders?per_page=50' + (status ? '&status=' + status : '') + (q ? '&q=' + encodeURIComponent(q) : ''));
        body.innerHTML = res.data.length ? res.data.map(o => `
          <tr>
            <td><strong>${h(o.order_number)}</strong><br><span class="muted" style="font-size:.78rem">${h(o.email)}</span></td>
            <td>${h((o.placed_at || '').slice(0, 16))}</td>
            <td>${this.statusBadge(o.status)}</td>
            <td>${money(o.grand_total)}</td>
            <td class="t-actions"><span class="link-btn" data-view="${h(o.order_number)}">Manage</span></td>
          </tr>`).join('') : '<tr><td colspan="5" class="empty-row">No orders</td></tr>';
        body.querySelectorAll('[data-view]').forEach(b => b.onclick = () => this.orderModal(b.dataset.view));
      };
      v.innerHTML = `
        <div class="toolbar">
          <input type="search" id="osearch" placeholder="Search order # or email…">
          <select id="ostatus"><option value="">All statuses</option>${['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'].map(s => `<option>${s}</option>`).join('')}</select>
        </div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody id="obody"></tbody></table></div>`;
      const body = v.querySelector('#obody');
      let t; v.querySelector('#osearch').oninput = () => { clearTimeout(t); t = setTimeout(render, 250); };
      v.querySelector('#ostatus').onchange = render;
      render();
    },

    /* ---------- Coupons ---------- */
    async coupons(v) {
      const render = async () => {
        const rows = await this.load('/admin/coupons');
        body.innerHTML = rows.length ? rows.map(c => `
          <tr>
            <td><strong>${h(c.code)}</strong></td>
            <td>${c.type === 'percent' ? c.value + '%' : money(c.value)}</td>
            <td>${c.min_order_total ? money(c.min_order_total) : '—'}</td>
            <td>${c.is_active == 1 ? '<span class="badge on">Active</span>' : '<span class="badge off">Off</span>'}</td>
            <td class="t-actions"><span class="link-btn" data-edit="${c.id}">Edit</span><span class="link-btn danger" data-del="${c.id}">Delete</span></td>
          </tr>`).join('') : '<tr><td colspan="5" class="empty-row">No coupons</td></tr>';
        body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.couponModal(rows.find(c => c.id == b.dataset.edit)));
        body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => this.confirmDelete('coupon', '/admin/coupons/' + b.dataset.del, render));
      };
      v.innerHTML = `<div class="toolbar"><div class="spacer"></div><button class="btn btn--primary" id="new-coupon">+ New coupon</button></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Code</th><th>Value</th><th>Min order</th><th>Status</th><th></th></tr></thead><tbody id="cbody"></tbody></table></div>`;
      const body = v.querySelector('#cbody');
      document.getElementById('new-coupon').onclick = () => this.couponModal(null);
      render();
    },

    /* ---------- Reviews ---------- */
    async reviews(v) {
      const render = async () => {
        const rows = await this.load('/admin/reviews');
        body.innerHTML = rows.length ? rows.map(r => `
          <tr>
            <td><strong>${h(r.product_name)}</strong></td>
            <td><span class="stars" style="color:var(--color-accent)">${Fmt.stars(r.rating)}</span></td>
            <td>${h(r.title || '')}<br><span class="muted" style="font-size:.8rem">${h((r.body || '').slice(0, 80))}</span></td>
            <td>${h(r.author_name)}</td>
            <td>${r.is_approved == 1 ? '<span class="badge on">Approved</span>' : '<span class="badge s-pending">Pending</span>'}</td>
            <td class="t-actions">${r.is_approved == 1 ? '' : `<span class="link-btn" data-ok="${r.id}">Approve</span>`}<span class="link-btn danger" data-del="${r.id}">Delete</span></td>
          </tr>`).join('') : '<tr><td colspan="6" class="empty-row">No reviews</td></tr>';
        body.querySelectorAll('[data-ok]').forEach(b => b.onclick = async () => { await API.patch('/admin/reviews/' + b.dataset.ok + '/approve'); this.toast('Review approved'); render(); });
        body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => this.confirmDelete('review', '/admin/reviews/' + b.dataset.del, render));
      };
      v.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>Product</th><th>Rating</th><th>Review</th><th>Author</th><th>Status</th><th></th></tr></thead><tbody id="rbody"></tbody></table></div>`;
      const body = v.querySelector('#rbody');
      render();
    },

    /* ---------- Customers ---------- */
    async customers(v) {
      const rows = await this.load('/admin/customers');
      v.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Email</th><th>Orders</th><th>Spent</th><th>Joined</th></tr></thead><tbody>
        ${rows.length ? rows.map(c => `<tr><td><strong>${h(c.name)}</strong></td><td>${h(c.email)}</td><td>${c.orders}</td><td>${money(c.spent)}</td><td>${h((c.created_at || '').slice(0, 10))}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-row">No customers yet</td></tr>'}
        </tbody></table></div>`;
    },

    /* ---------- Messages ---------- */
    async messages(v) {
      const [msgs, subs] = await Promise.all([this.load('/admin/messages'), this.load('/admin/subscribers')]);
      v.innerHTML = `
        <div class="panel"><h3>Contact messages</h3>
          <table class="data"><thead><tr><th>From</th><th>Subject</th><th>Message</th><th>Date</th></tr></thead><tbody>
          ${msgs.length ? msgs.map(m => `<tr><td><strong>${h(m.name)}</strong><br><span class="muted" style="font-size:.78rem">${h(m.email)}</span></td><td>${h(m.subject || '—')}</td><td>${h(m.message)}</td><td>${h((m.created_at || '').slice(0, 16))}</td></tr>`).join('') : '<tr><td colspan="4" class="empty-row">No messages</td></tr>'}
          </tbody></table>
        </div>
        <div class="panel"><h3>Newsletter subscribers (${subs.length})</h3>
          <table class="data"><thead><tr><th>Email</th><th>Subscribed</th></tr></thead><tbody>
          ${subs.length ? subs.map(s => `<tr><td>${h(s.email)}</td><td>${h((s.subscribed_at || '').slice(0, 16))}</td></tr>`).join('') : '<tr><td colspan="2" class="empty-row">No subscribers</td></tr>'}
          </tbody></table>
        </div>`;
    },

    /* ---------- Settings ---------- */
    async settings(v) {
      const s = await this.load('/admin/settings');
      v.innerHTML = `
        <form class="panel" id="settings-form" style="max-width:640px">
          <h3>Store settings</h3>
          <div class="f"><label>Store name</label><input name="store_name" value="${h(s.store_name || '')}"></div>
          <div class="f"><label>Announcement bar</label><input name="announcement" value="${h(s.announcement || '')}"></div>
          <div class="f-row">
            <div class="f"><label>Free shipping over (₹)</label><input name="free_shipping_threshold" type="number" step="1" value="${h(s.free_shipping_threshold || '')}"></div>
            <div class="f"><label>Flat shipping (₹)</label><input name="flat_shipping" type="number" step="1" value="${h(s.flat_shipping || '')}"></div>
          </div>
          <div class="f"><label>Tax rate (e.g. 0.05 = 5% GST)</label><input name="tax_rate" type="number" step="0.01" value="${h(s.tax_rate || '')}"></div>
          <button class="btn btn--primary">Save settings</button>
        </form>`;
      v.querySelector('#settings-form').onsubmit = async (e) => {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(e.target).entries());
        try { await API.patch('/admin/settings', body); this.toast('Settings saved'); } catch (err) { this.toast(err.message, 'error'); }
      };
    },
  },

  /* ---------------- Modals: product ---------------- */
  async productModal(id) {
    let p = { name: '', category_id: this.cats[0] && this.cats[0].id, brand: 'Saffra', form: 'ground', accent_color: '#C8531B', is_active: 1, variants: [] };
    if (id) p = await this.load('/admin/products/' + id);
    const catOpts = this.cats.map(c => `<option value="${c.id}" ${c.id == p.category_id ? 'selected' : ''}>${h(c.name)}</option>`).join('');
    const forms = ['whole', 'ground', 'blend', 'other'].map(f => `<option ${p.form === f ? 'selected' : ''}>${f}</option>`).join('');
    this.modal(id ? 'Edit product' : 'New product', `
      <form id="pform">
        <div class="f"><label>Name</label><input name="name" value="${h(p.name)}" required><span class="err" data-err="name"></span></div>
        <div class="f-row">
          <div class="f"><label>Category</label><select name="category_id">${catOpts}</select></div>
          <div class="f"><label>Form</label><select name="form">${forms}</select></div>
        </div>
        <div class="f"><label>Short description</label><input name="short_description" value="${h(p.short_description || '')}"></div>
        <div class="f"><label>Description</label><textarea name="description" rows="3">${h(p.description || '')}</textarea></div>
        <div class="f-row">
          <div class="f"><label>Origin</label><input name="origin" value="${h(p.origin || '')}"></div>
          <div class="f"><label>Badge (e.g. Bestseller)</label><input name="badge" value="${h(p.badge || '')}"></div>
        </div>
        <div class="f"><label>How to use</label><input name="usage_tips" value="${h(p.usage_tips || '')}"></div>
        <div class="f-row">
          <div class="f"><label>Accent colour</label><input name="accent_color" type="color" value="${h(p.accent_color || '#C8531B')}"></div>
          <div class="f"><label>Brand</label><input name="brand" value="${h(p.brand || 'Saffra')}"></div>
        </div>
        <div class="f-inline">
          <label class="f-check"><input type="checkbox" name="is_active" ${p.is_active == 1 ? 'checked' : ''}> Active</label>
          <label class="f-check"><input type="checkbox" name="is_featured" ${p.is_featured == 1 ? 'checked' : ''}> Featured</label>
          <label class="f-check"><input type="checkbox" name="is_bestseller" ${p.is_bestseller == 1 ? 'checked' : ''}> Bestseller</label>
          <label class="f-check"><input type="checkbox" name="is_organic" ${p.is_organic == 1 ? 'checked' : ''}> Organic</label>
        </div>
        ${id ? `<h3 style="margin-top:8px">Variants</h3>
          <div class="vrow head"><span>Size / name</span><span>Price ₹</span><span>Compare ₹</span><span>Stock</span><span></span></div>
          <div id="variants">${(p.variants || []).map(vr => this.variantRow(vr)).join('')}</div>
          <button type="button" class="link-btn" id="add-variant">+ Add variant</button>` : '<p class="muted" style="font-size:.85rem">Save the product first, then add sizes/variants.</p>'}
      </form>`, `
      <button class="btn btn--light" id="m-cancel">Cancel</button>
      <button class="btn btn--primary" id="m-save">${id ? 'Save changes' : 'Create product'}</button>`);

    const ov = document.getElementById('admin-modal');
    ov.querySelector('#m-cancel').onclick = () => this.closeModal();
    if (id) {
      ov.querySelector('#add-variant').onclick = () => { ov.querySelector('#variants').insertAdjacentHTML('beforeend', this.variantRow({})); this.wireVariantRows(ov, id); };
      this.wireVariantRows(ov, id);
    }
    ov.querySelector('#m-save').onclick = async () => {
      const form = ov.querySelector('#pform');
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      ['is_active', 'is_featured', 'is_bestseller', 'is_organic'].forEach(k => payload[k] = form.querySelector(`[name="${k}"]`).checked ? 1 : 0);
      try {
        if (id) {
          payload.regenerate_slug = false;
          await API.patch('/admin/products/' + id, payload);
          await this.saveVariantRows(ov, id);
          this.toast('Product saved');
        } else {
          await API.post('/admin/products', payload);
          this.toast('Product created');
        }
        this.closeModal(); this.go('products');
      } catch (err) { this.errInto(form, err.details); this.toast(err.message || 'Save failed', 'error'); }
    };
  },

  variantRow(v) {
    return `<div class="vrow" data-id="${v.id || ''}">
      <input data-k="name" placeholder="250g" value="${h(v.name || '')}">
      <input data-k="price" type="number" step="0.01" placeholder="0" value="${v.price != null ? h(v.price) : ''}">
      <input data-k="compare_at_price" type="number" step="0.01" placeholder="—" value="${v.compare_at_price != null ? h(v.compare_at_price) : ''}">
      <input data-k="stock_qty" type="number" placeholder="0" value="${v.stock_qty != null ? h(v.stock_qty) : '0'}">
      <span class="x" title="Remove">✕</span>
    </div>`;
  },
  wireVariantRows(ov, productId) {
    ov.querySelectorAll('.vrow .x').forEach(x => x.onclick = async (e) => {
      const row = e.target.closest('.vrow');
      const vid = row.dataset.id;
      if (vid) { if (!confirm('Delete this variant?')) return; try { await API.del('/admin/variants/' + vid); } catch (err) { this.toast(err.message, 'error'); return; } }
      row.remove();
    });
  },
  async saveVariantRows(ov, productId) {
    for (const row of ov.querySelectorAll('.vrow:not(.head)')) {
      const data = {};
      row.querySelectorAll('input').forEach(i => data[i.dataset.k] = i.value);
      if (!data.name || data.price === '') continue;
      const vid = row.dataset.id;
      if (vid) await API.patch('/admin/variants/' + vid, data);
      else { const r = await API.post('/admin/products/' + productId + '/variants', data); row.dataset.id = r.data.id; }
    }
  },

  /* ---------------- Modals: category ---------------- */
  categoryModal(c) {
    const isEdit = !!c;
    c = c || { name: '', accent_color: '#C8531B', sort_order: 0, is_active: 1 };
    this.modal(isEdit ? 'Edit category' : 'New category', `
      <form id="cform">
        <div class="f"><label>Name</label><input name="name" value="${h(c.name)}" required><span class="err" data-err="name"></span></div>
        <div class="f"><label>Description</label><textarea name="description" rows="2">${h(c.description || '')}</textarea></div>
        <div class="f-row">
          <div class="f"><label>Accent colour</label><input name="accent_color" type="color" value="${h(c.accent_color || '#C8531B')}"></div>
          <div class="f"><label>Sort order</label><input name="sort_order" type="number" value="${h(c.sort_order || 0)}"></div>
        </div>
        <label class="f-check"><input type="checkbox" name="is_active" ${c.is_active == 1 ? 'checked' : ''}> Active</label>
      </form>`, `<button class="btn btn--light" id="m-cancel">Cancel</button><button class="btn btn--primary" id="m-save">${isEdit ? 'Save' : 'Create'}</button>`);
    const ov = document.getElementById('admin-modal');
    ov.querySelector('#m-cancel').onclick = () => this.closeModal();
    ov.querySelector('#m-save').onclick = async () => {
      const form = ov.querySelector('#cform');
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.is_active = form.querySelector('[name=is_active]').checked ? 1 : 0;
      try {
        if (isEdit) await API.patch('/admin/categories/' + c.id, payload);
        else await API.post('/admin/categories', payload);
        this.toast('Category saved'); this.closeModal(); this.go('categories');
      } catch (err) { this.errInto(form, err.details); this.toast(err.message, 'error'); }
    };
  },

  /* ---------------- Modals: coupon ---------------- */
  couponModal(c) {
    const isEdit = !!c;
    c = c || { code: '', type: 'percent', value: 10, is_active: 1 };
    this.modal(isEdit ? 'Edit coupon' : 'New coupon', `
      <form id="cpform">
        <div class="f"><label>Code</label><input name="code" value="${h(c.code)}" ${isEdit ? 'readonly' : ''} required><span class="err" data-err="code"></span></div>
        <div class="f-row">
          <div class="f"><label>Type</label><select name="type"><option value="percent" ${c.type === 'percent' ? 'selected' : ''}>Percent %</option><option value="fixed" ${c.type === 'fixed' ? 'selected' : ''}>Fixed ₹</option></select></div>
          <div class="f"><label>Value</label><input name="value" type="number" step="0.01" value="${h(c.value)}"><span class="err" data-err="value"></span></div>
        </div>
        <div class="f-row">
          <div class="f"><label>Min order (₹)</label><input name="min_order_total" type="number" step="1" value="${c.min_order_total != null ? h(c.min_order_total) : ''}"></div>
          <div class="f"><label>Max discount (₹)</label><input name="max_discount" type="number" step="1" value="${c.max_discount != null ? h(c.max_discount) : ''}"></div>
        </div>
        <label class="f-check"><input type="checkbox" name="is_active" ${c.is_active == 1 ? 'checked' : ''}> Active</label>
      </form>`, `<button class="btn btn--light" id="m-cancel">Cancel</button><button class="btn btn--primary" id="m-save">${isEdit ? 'Save' : 'Create'}</button>`);
    const ov = document.getElementById('admin-modal');
    ov.querySelector('#m-cancel').onclick = () => this.closeModal();
    ov.querySelector('#m-save').onclick = async () => {
      const form = ov.querySelector('#cpform');
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.is_active = form.querySelector('[name=is_active]').checked ? 1 : 0;
      try {
        if (isEdit) await API.patch('/admin/coupons/' + c.id, payload);
        else await API.post('/admin/coupons', payload);
        this.toast('Coupon saved'); this.closeModal(); this.go('coupons');
      } catch (err) { this.errInto(form, err.details); this.toast(err.message, 'error'); }
    };
  },

  /* ---------------- Modals: order ---------------- */
  async orderModal(num) {
    const o = await this.load('/admin/orders/' + encodeURIComponent(num));
    const a = o.shipping_address || {};
    const statuses = ['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];
    this.modal('Order ' + o.order_number, `
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px">
        <div><span class="muted" style="font-size:.78rem">Customer</span><br>${h(o.email)}</div>
        <div><span class="muted" style="font-size:.78rem">Placed</span><br>${h((o.placed_at || '').slice(0, 16))}</div>
        <div><span class="muted" style="font-size:.78rem">Payment</span><br>${h(o.payment_method || '—')}</div>
      </div>
      <table class="data" style="margin-bottom:14px"><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>
        ${o.items.map(it => `<tr><td>${h(it.product_name)} <span class="muted">(${h(it.variant_name)})</span></td><td>${it.quantity}</td><td>${money(it.line_total)}</td></tr>`).join('')}
      </tbody></table>
      <div style="display:flex;justify-content:space-between"><span class="muted">Subtotal</span><span>${money(o.subtotal)}</span></div>
      ${o.discount_total > 0 ? `<div style="display:flex;justify-content:space-between;color:var(--color-success)"><span>Discount ${o.coupon_code ? '(' + h(o.coupon_code) + ')' : ''}</span><span>−${money(o.discount_total)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between"><span class="muted">Shipping</span><span>${o.shipping_total > 0 ? money(o.shipping_total) : 'Free'}</span></div>
      <div style="display:flex;justify-content:space-between"><span class="muted">Tax</span><span>${money(o.tax_total)}</span></div>
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.1rem;margin-top:6px"><span>Total</span><span>${money(o.grand_total)}</span></div>
      <div class="panel" style="margin-top:16px;background:var(--color-surface-2)">
        <strong style="font-size:.85rem">Ship to</strong>
        <p style="font-size:.85rem;color:var(--color-muted)">${h(a.recipient_name || '')}<br>${h(a.line1 || '')} ${h(a.line2 || '')}<br>${h(a.city || '')} ${h(a.state || '')} ${h(a.postal_code || '')} ${h(a.country || '')}<br>${h(a.phone || '')}</p>
      </div>
      <form id="oform" style="margin-top:16px">
        <div class="f-row">
          <div class="f"><label>Status</label><select name="status">${statuses.map(s => `<option ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
          <div class="f"><label>Tracking number</label><input name="tracking_number" value="${h(o.tracking_number || '')}"></div>
        </div>
        <div class="f"><label>Note (internal)</label><input name="note" placeholder="optional"></div>
      </form>`, `<button class="btn btn--light" id="m-cancel">Close</button><button class="btn btn--primary" id="m-save">Update order</button>`);
    const ov = document.getElementById('admin-modal');
    ov.querySelector('#m-cancel').onclick = () => this.closeModal();
    ov.querySelector('#m-save').onclick = async () => {
      const form = ov.querySelector('#oform');
      const payload = Object.fromEntries(new FormData(form).entries());
      try { await API.patch('/admin/orders/' + encodeURIComponent(num) + '/status', payload); this.toast('Order updated'); this.closeModal(); this.go('orders'); }
      catch (err) { this.toast(err.message, 'error'); }
    };
  },

  /* ---------------- delete confirm ---------------- */
  confirmDelete(label, path, after) {
    if (!confirm('Delete this ' + label + '? This cannot be undone.')) return;
    API.del(path).then(() => { this.toast(label[0].toUpperCase() + label.slice(1) + ' deleted'); after(); })
      .catch(err => this.toast(err.message || 'Delete failed', 'error'));
  },
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
