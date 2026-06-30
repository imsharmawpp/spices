// Account page — login/register tabs + order history. See docs/08 §4.6.
document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('account-root');
  if (!root) return;
  await Currency.ensure();

  async function refresh() {
    let me = null;
    try { me = (await API.get('/auth/me')).data; } catch (_) {}
    if (me) renderDashboard(me); else renderAuth();
  }

  async function renderDashboard(me) {
    let orders = [];
    try { orders = (await API.get('/account/orders')).data; } catch (_) {}
    root.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div><span class="eyebrow">My Account</span><h1 style="margin-top:6px">Hello, ${Fmt.escape(me.name)}</h1></div>
        <button class="btn btn--light" id="logout-btn">Log out</button>
      </div>
      <div class="panel account-orders" style="margin-top:24px">
        <h3 style="margin-bottom:16px">Order history</h3>
        ${orders.length ? orders.map(o => `
          <div class="order-item">
            <div><strong>${o.order_number}</strong><div class="muted" style="font-size:.8rem">${o.placed_at}</div></div>
            <div style="text-align:right"><span class="badge badge--accent">${o.status}</span><div style="font-weight:700;margin-top:4px">${Fmt.money(o.grand_total)}</div></div>
          </div>`).join('') : '<p class="muted">No orders yet. <a href="/shop">Start shopping →</a></p>'}
      </div>`;
    root.querySelector('#logout-btn').onclick = async () => { await API.post('/auth/logout'); UI.toast('Logged out'); refresh(); };
  }

  function renderAuth() {
    root.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-tabs">
          <button class="active" data-tab="login">Log in</button>
          <button data-tab="register">Create account</button>
        </div>
        <div class="panel">
          <form id="login-form">
            <div class="field"><label>Email</label><input type="email" name="email" required><span class="err" data-err="email"></span></div>
            <div class="field"><label>Password</label><input type="password" name="password" required><span class="err" data-err="password"></span></div>
            <button class="btn btn--primary btn--block btn--lg">Log in</button>
            <p class="muted" style="font-size:.8rem;margin-top:12px">Try the demo: maya@example.com / password</p>
          </form>
          <form id="register-form" class="hidden">
            <div class="field"><label>Name</label><input type="text" name="name" required><span class="err" data-err="name"></span></div>
            <div class="field"><label>Email</label><input type="email" name="email" required><span class="err" data-err="email"></span></div>
            <div class="field"><label>Password</label><input type="password" name="password" required><span class="err" data-err="password"></span></div>
            <button class="btn btn--primary btn--block btn--lg">Create account</button>
          </form>
        </div>
      </div>`;

    const tabs = root.querySelectorAll('[data-tab]');
    tabs.forEach(t => t.onclick = () => {
      tabs.forEach(x => x.classList.remove('active')); t.classList.add('active');
      root.querySelector('#login-form').classList.toggle('hidden', t.dataset.tab !== 'login');
      root.querySelector('#register-form').classList.toggle('hidden', t.dataset.tab !== 'register');
    });

    bindForm('#login-form', '/auth/login');
    bindForm('#register-form', '/auth/register');
  }

  function bindForm(sel, endpoint) {
    const form = root.querySelector(sel);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      form.querySelectorAll('.err').forEach(x => x.textContent = '');
      const body = Object.fromEntries(new FormData(form).entries());
      try { await API.post(endpoint, body); UI.toast('Welcome!'); await Cart.refresh(); refresh(); }
      catch (err) {
        if (err.details) Object.entries(err.details).forEach(([k, m]) => { const el = form.querySelector(`[data-err="${k}"]`); if (el) el.textContent = Array.isArray(m) ? m[0] : m; });
        UI.toast(err.message, 'error');
      }
    });
  }

  refresh();
});
