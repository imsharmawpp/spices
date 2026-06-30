// Home page — bestsellers, categories, new arrivals, UGC. See docs/08 §4.1.
document.addEventListener('DOMContentLoaded', async () => {
  await Currency.ensure();
  // Categories
  let cats = [];
  try {
    cats = (await API.get('/categories')).data;
    const tiles = document.getElementById('cat-tiles');
    if (tiles) tiles.innerHTML = cats.map(c => `
      <a class="cat-tile reveal" href="/shop/${c.slug}" style="background:linear-gradient(150deg, ${c.accent_color}, ${c.accent_color}cc)">
        <span class="cat-tile__emoji">${Icons.html(Icons.categoryIcon(c.slug), '#FFFFFF')}</span>
        <h3>${Fmt.escape(c.name)}</h3>
        <span>Shop now</span>
      </a>`).join('');
  } catch (_) {}

  initHeroSlider(cats);

  // Bestsellers
  loadInto('/products?bestseller=1&per_page=8', 'bestsellers');
  // New arrivals
  loadInto('/products?sort=newest&per_page=8', 'new-arrivals');

  async function loadInto(path, id) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      const items = (await API.get(path)).data;
      el.innerHTML = items.map(p => UI.productCard(p)).join('');
      UI.wireCards(el);
    } catch (_) { el.innerHTML = '<p class="muted">Unable to load products.</p>'; }
  }
});

// Build the hero into a category slider (brand slide + one slide per category).
function initHeroSlider(cats) {
  const slidesWrap = document.getElementById('hero-slides');
  const dotsWrap = document.getElementById('hero-dots');
  const hero = document.getElementById('hero');
  if (!slidesWrap || !hero) return;

  const headlines = {
    'whole-spices': 'Whole Spices, Sealed Fresh',
    'ground-spices': 'Ground Fresh, Full of Aroma',
    'blends-masalas': 'House Blends, Balanced by Hand',
    'gift-sets': 'Gifts for Every Home Cook',
    'organic': 'Certified Organic, Pure & Simple',
  };

  (cats || []).forEach(c => {
    const dark = Icons.shade(c.accent_color, -62);
    const slide = document.createElement('div');
    slide.className = 'hero__slide';
    slide.style.background = `linear-gradient(120deg, #2A2118 0%, ${dark} 45%, ${c.accent_color} 115%)`;
    slide.innerHTML = `
      <div class="hero__slide-art">${Icons.html(Icons.categoryIcon(c.slug), '#FFFFFF')}</div>
      <div class="hero__inner"><div class="hero__content">
        <span class="eyebrow" style="color:var(--color-accent)">${Fmt.escape(c.name)}</span>
        <h1>${Fmt.escape(headlines[c.slug] || c.name)}</h1>
        <p>${Fmt.escape(c.description || 'Discover our ' + c.name.toLowerCase() + '.')}</p>
        <div class="hero__cta"><a class="btn btn--primary btn--lg" href="/shop/${c.slug}">Shop ${Fmt.escape(c.name)}</a></div>
      </div></div>`;
    slidesWrap.appendChild(slide);
  });

  const slides = Array.from(slidesWrap.querySelectorAll('.hero__slide'));
  const prev = document.getElementById('hero-prev');
  const next = document.getElementById('hero-next');

  if (slides.length <= 1) {
    if (prev) prev.style.display = 'none';
    if (next) next.style.display = 'none';
    return;
  }

  dotsWrap.innerHTML = slides.map((_, i) => `<button data-i="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Go to slide ${i + 1}"></button>`).join('');
  const dots = Array.from(dotsWrap.children);
  let idx = 0, timer = null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const go = (n) => {
    slides[idx].classList.remove('is-active');
    if (dots[idx]) dots[idx].classList.remove('active');
    idx = (n + slides.length) % slides.length;
    slides[idx].classList.add('is-active');
    if (dots[idx]) dots[idx].classList.add('active');
  };
  const play = () => { if (!reduced) timer = setInterval(() => go(idx + 1), 5000); };
  const restart = () => { clearInterval(timer); play(); };

  dots.forEach(d => d.onclick = () => { go(+d.dataset.i); restart(); });
  if (next) next.onclick = () => { go(idx + 1); restart(); };
  if (prev) prev.onclick = () => { go(idx - 1); restart(); };
  hero.addEventListener('mouseenter', () => clearInterval(timer));
  hero.addEventListener('mouseleave', play);

  let sx = 0;
  hero.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) { go(dx < 0 ? idx + 1 : idx - 1); restart(); }
  }, { passive: true });

  play();
}
