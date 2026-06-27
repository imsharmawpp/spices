// API wrapper + small shared helpers. See docs/05-api-spec.md.
const API = {
  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (typeof window !== 'undefined' && window.__csrf) opts.headers['X-CSRF-Token'] = window.__csrf;
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


// =====================================================================
//  3D-STYLE ICON SET  (self-hosted SVG, 3dicons.co-inspired aesthetic)
//  Replaces all emoji. CC0-spirit, original artwork, no external deps.
//  Soft gradients + highlight + grounded shadow for a claymorphic 3D look.
// =====================================================================
const Icons = {
  _uid: 0,

  _hx(hex) {
    hex = String(hex || '#C8531B').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  },
  shade(hex, amt) {
    const [r, g, b] = this._hx(hex);
    const f = amt / 100;
    const adj = v => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * f : v * (1 + f))));
    return '#' + [adj(r), adj(g), adj(b)].map(v => v.toString(16).padStart(2, '0')).join('');
  },
  light(c) { return this.shade(c, 34); },
  dark(c, a = 26) { return this.shade(c, -a); },

  // grounded soft shadow shared by all icons
  _shadow: '<ellipse cx="32" cy="57" rx="17" ry="3.4" fill="#000" opacity=".12"/>',

  shapes: {
    jar(c, id, s) {
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.light(c)}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
        ${s._shadow}
        <rect x="20" y="7" width="24" height="9" rx="3.5" fill="${s.dark(c, 34)}"/>
        <rect x="17" y="15" width="30" height="42" rx="9" fill="url(#${id})"/>
        <rect x="24" y="27" width="16" height="20" rx="4" fill="#fff" opacity=".9"/>
        <rect x="21" y="18" width="6" height="36" rx="3" fill="#fff" opacity=".22"/>`;
    },
    bowl(c, id, s) {
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.light(c)}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
        ${s._shadow}
        <path d="M17 38c3-12 27-12 30 0z" fill="url(#${id})"/>
        <ellipse cx="32" cy="38" rx="20" ry="4.5" fill="${s.dark(c, 12)}" opacity=".5"/>
        <path d="M12 38a20 4.5 0 0 0 40 0 19 14 0 0 1-40 0z" fill="#F1E9DB"/>
        <path d="M12 38a20 4.5 0 0 0 40 0 19 14 0 0 1-40 0z" fill="#000" opacity=".06"/>
        <ellipse cx="25" cy="33" rx="5" ry="2.6" fill="#fff" opacity=".35"/>`;
    },
    seeds(c, id, s) {
      const d = s.dark(c, 18), l = s.light(c);
      let g = s._shadow;
      const pts = [[22, 40, -20], [30, 43, 12], [39, 41, -8], [26, 35, 30], [35, 35, -25], [31, 31, 8], [44, 37, 18], [18, 36, 5]];
      pts.forEach(([x, y, r], i) => {
        g += `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse rx="5" ry="3" fill="${i % 2 ? d : c}"/><ellipse cx="-1" cy="-1" rx="2" ry="1.1" fill="${l}" opacity=".6"/></g>`;
      });
      return g;
    },
    cinnamon(c, id, s) {
      const a = '#A8682F', b = '#7A461C';
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C2853F"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
        ${s._shadow}
        <g transform="rotate(-18 32 34)"><rect x="20" y="16" width="11" height="36" rx="5.5" fill="url(#${id})"/><circle cx="25.5" cy="20" r="4.5" fill="none" stroke="${b}" stroke-width="2"/><circle cx="25.5" cy="20" r="1.6" fill="${b}"/></g>
        <g transform="rotate(14 36 36)"><rect x="33" y="18" width="11" height="34" rx="5.5" fill="${a}"/><circle cx="38.5" cy="22" r="4.5" fill="none" stroke="${b}" stroke-width="2"/></g>`;
    },
    saffron(c, id, s) {
      const r = '#C5172E', o = '#E0532A';
      let g = s._shadow;
      const th = [[26, 46, -30], [32, 48, 6], [38, 46, 28], [29, 44, -10], [35, 44, 16]];
      th.forEach(([x, y, rot]) => { g += `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 8 C -3 0 -3 -8 0 -14" stroke="${r}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cy="-14" r="2.4" fill="${o}"/></g>`; });
      return g;
    },
    pods(c, id, s) {
      const g1 = '#5FA03A', g2 = '#3F7D3A';
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7CBB4E"/><stop offset="1" stop-color="${g2}"/></linearGradient></defs>
        ${s._shadow}
        <g transform="rotate(-16 32 34)"><ellipse cx="26" cy="34" rx="8.5" ry="13" fill="url(#${id})"/><path d="M26 22v24" stroke="${g2}" stroke-width="1.6" opacity=".6"/><ellipse cx="23" cy="28" rx="2.5" ry="5" fill="#fff" opacity=".3"/></g>
        <g transform="rotate(16 38 36)"><ellipse cx="40" cy="36" rx="8" ry="12" fill="${g1}"/><path d="M40 25v22" stroke="${g2}" stroke-width="1.6" opacity=".6"/></g>`;
    },
    flame(c, id, s) {
      return `<defs><linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#E0532A"/><stop offset="1" stop-color="#F0B429"/></linearGradient></defs>
        ${s._shadow}
        <path d="M32 8c10 10 14 16 14 26a14 14 0 0 1-28 0c0-6 3-10 6-13 1 4 3 6 5 6 3 0 4-3 2-8-1-3-1-6 1-9z" fill="url(#${id})"/>
        <path d="M32 30c4 4 6 8 6 12a6 6 0 0 1-12 0c0-4 3-8 6-12z" fill="#FFE08A"/>`;
    },
    gift(c, id, s) {
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.light(c)}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
        ${s._shadow}
        <rect x="14" y="26" width="36" height="28" rx="5" fill="url(#${id})"/>
        <rect x="12" y="19" width="40" height="11" rx="4" fill="${s.dark(c, 18)}"/>
        <rect x="28" y="19" width="8" height="35" fill="#F0C24A"/>
        <path d="M32 19c-4-9-14-7-12 0zM32 19c4-9 14-7 12 0z" fill="#F0C24A"/>
        <circle cx="32" cy="17" r="3.4" fill="#E0A422"/>`;
    },
    leaf(c, id, s) {
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6FBF4A"/><stop offset="1" stop-color="#2F7D34"/></linearGradient></defs>
        ${s._shadow}
        <path d="M48 12C24 12 14 28 14 46c0 0 0 4 2 6 16-2 32-12 34-34 1-4 0-6-2-6z" fill="url(#${id})"/>
        <path d="M18 50C26 36 36 24 46 16" stroke="#fff" stroke-width="2.4" opacity=".55" fill="none" stroke-linecap="round"/>`;
    },
    globe(c, id, s) {
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5FB7E8"/><stop offset="1" stop-color="#2E78B5"/></linearGradient></defs>
        ${s._shadow}
        <circle cx="32" cy="32" r="22" fill="url(#${id})"/>
        <path d="M20 24c6 2 8 6 14 6 3 0 5-3 9-2M16 36c5-1 8 3 13 3 4 0 5 4 3 8" stroke="#3F8F4A" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>
        <ellipse cx="25" cy="23" rx="6" ry="3.4" fill="#fff" opacity=".4"/>`;
    },
    grinder(c, id, s) {
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9C2B6"/><stop offset="1" stop-color="#8C8479"/></linearGradient></defs>
        ${s._shadow}
        <rect x="40" y="10" width="7" height="26" rx="3.5" transform="rotate(24 43 23)" fill="#9A9287"/>
        <path d="M14 36h36a18 13 0 0 1-36 0z" fill="url(#${id})"/>
        <ellipse cx="32" cy="36" rx="18" ry="4.5" fill="#B3AB9E"/>
        <ellipse cx="26" cy="35" rx="6" ry="2.2" fill="#fff" opacity=".4"/>`;
    },
    truck(c, id, s) {
      return `${s._shadow}
        <rect x="6" y="22" width="30" height="22" rx="4" fill="${s.light(c)}"/>
        <rect x="6" y="22" width="30" height="22" rx="4" fill="#000" opacity=".04"/>
        <path d="M36 28h11l7 8v8H36z" fill="${c}"/>
        <rect x="39" y="30" width="9" height="6" rx="2" fill="#CFE6F5"/>
        <circle cx="18" cy="46" r="5.5" fill="#2A2118"/><circle cx="18" cy="46" r="2.2" fill="#9A9287"/>
        <circle cx="44" cy="46" r="5.5" fill="#2A2118"/><circle cx="44" cy="46" r="2.2" fill="#9A9287"/>`;
    },
    flask(c, id, s) {
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.light(c)}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
        ${s._shadow}
        <path d="M27 12h10v14l11 20a5 5 0 0 1-4.5 7.5h-23A5 5 0 0 1 16 46l11-20z" fill="#DCE9F0" opacity=".55"/>
        <path d="M21 38h22l5 8a5 5 0 0 1-4.5 7.5h-23A5 5 0 0 1 16 46z" fill="url(#${id})"/>
        <rect x="25" y="8" width="14" height="6" rx="3" fill="#9AA7AE"/>
        <circle cx="28" cy="46" r="2" fill="#fff" opacity=".6"/><circle cx="36" cy="50" r="1.6" fill="#fff" opacity=".5"/>`;
    },
    lock(c, id, s) {
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0C24A"/><stop offset="1" stop-color="#C8531B"/></linearGradient></defs>
        ${s._shadow}
        <path d="M22 28v-6a10 10 0 0 1 20 0v6" fill="none" stroke="#B98A2E" stroke-width="5"/>
        <rect x="16" y="28" width="32" height="26" rx="7" fill="url(#${id})"/>
        <circle cx="32" cy="39" r="4" fill="#7A3D12"/><rect x="30.5" y="41" width="3" height="7" rx="1.5" fill="#7A3D12"/>
        <rect x="20" y="31" width="6" height="18" rx="3" fill="#fff" opacity=".22"/>`;
    },
    bag(c, id, s) {
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.light(c)}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
        ${s._shadow}
        <path d="M22 22a10 10 0 0 1 20 0" fill="none" stroke="${s.dark(c, 20)}" stroke-width="4"/>
        <path d="M16 22h32l3 30a4 4 0 0 1-4 4.4H17A4 4 0 0 1 13 52z" fill="url(#${id})"/>
        <rect x="19" y="26" width="5" height="22" rx="2.5" fill="#fff" opacity=".2"/>`;
    },
    spark(c, id, s) {
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0C24A"/><stop offset="1" stop-color="#E0A422"/></linearGradient></defs>
        <path d="M32 8c2 14 8 20 22 22-14 2-20 8-22 22-2-14-8-20-22-22 14-2 20-8 22-22z" fill="url(#${id})"/>`;
    },
    search(c, id, s) {
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.light(c)}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
        ${s._shadow}
        <rect x="36" y="36" width="18" height="9" rx="4.5" transform="rotate(45 45 40)" fill="${s.dark(c, 24)}"/>
        <circle cx="27" cy="27" r="16" fill="#EFE7DA"/>
        <circle cx="27" cy="27" r="16" fill="none" stroke="url(#${id})" stroke-width="5"/>
        <ellipse cx="21" cy="21" rx="5" ry="3" fill="#fff" opacity=".6"/>`;
    },
  },

  html(name, color, cls = '') {
    const c = color || '#C8531B';
    const fn = this.shapes[name] || this.shapes.jar;
    const id = 'ic' + (++this._uid);
    return `<svg class="i3d ${cls}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${fn(c, id, this)}</svg>`;
  },

  // Map a product to the most fitting motif.
  forProduct(p) {
    const bySlug = {
      'ceylon-cinnamon-sticks': 'cinnamon', 'saffron-threads': 'saffron', 'cardamom-pods': 'pods',
      'chilli-flakes': 'flame', 'spice-lovers-gift-box': 'gift', 'everyday-curry-kit': 'gift',
      'black-peppercorns': 'seeds', 'cumin-seeds': 'seeds', 'coriander-seeds': 'seeds',
    };
    if (p.slug && bySlug[p.slug]) return bySlug[p.slug];
    const byForm = { ground: 'bowl', whole: 'seeds', blend: 'jar', other: 'jar' };
    return byForm[p.form] || 'jar';
  },
  categoryIcon(slug) {
    return { 'whole-spices': 'seeds', 'ground-spices': 'bowl', 'blends-masalas': 'jar', 'gift-sets': 'gift', 'organic': 'leaf' }[slug] || 'jar';
  },

  // Fill any <i data-icon="name" data-color="#hex"> placeholders.
  hydrate(root = document) {
    root.querySelectorAll('[data-icon]:not([data-iconed])').forEach(el => {
      el.setAttribute('data-iconed', '1');
      el.innerHTML = this.html(el.dataset.icon, el.dataset.color || '');
    });
  },
};

// Convenience: tile markup for a product/cart item.
function productIcon(item, cls = 'tile-ico') {
  return Icons.html(Icons.forProduct(item), item.accent_color, cls);
}
