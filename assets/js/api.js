// API wrapper + small shared helpers. See docs/05-api-spec.md.
const API = {
  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch('/api' + path, opts);
    let payload = null;
    try { payload = await res.json(); } catch (_) { payload = null; }
    if (!res.ok) {
      const err = (payload && payload.error) || { message: 'Request failed' };
      throw Object.assign(new Error(err.message), { code: err.code, details: err.details, status: res.status });
    }
    return payload;
  },
  get(p) { return this.request('GET', p); },
  post(p, b) { return this.request('POST', p, b); },
  patch(p, b) { return this.request('PATCH', p, b); },
  del(p, b) { return this.request('DELETE', p, b); },
};

// ---- formatting helpers ----
const Fmt = {
  symbol: '₹',
  money(n) {
    const v = Number(n || 0);
    // Indian digit grouping (e.g. ₹1,19,999.00)
    const num = v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return this.symbol + num;
  },
  stars(rating) {
    const full = Math.round(Number(rating) || 0);
    return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
  },
  escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
};

// ---- tile rendering (placeholder visuals, no real photos) ----
function tileStyle(color) {
  const c = color || '#C8531B';
  return `background: radial-gradient(circle at 30% 25%, ${c}33, ${c}14 60%), linear-gradient(135deg, ${c}22, ${c}0d); color:${c};`;
}

// ---- wishlist (localStorage, Pillar 1 / FR-45) ----
const Wishlist = {
  key: 'saffra_wishlist',
  all() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } },
  has(slug) { return this.all().includes(slug); },
  toggle(slug) {
    const list = this.all();
    const i = list.indexOf(slug);
    if (i >= 0) list.splice(i, 1); else list.push(slug);
    localStorage.setItem(this.key, JSON.stringify(list));
    return i < 0;
  },
};
