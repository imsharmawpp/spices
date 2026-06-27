// Home page — bestsellers, categories, new arrivals, UGC. See docs/08 §4.1.
document.addEventListener('DOMContentLoaded', async () => {
  // Categories
  try {
    const cats = (await API.get('/categories')).data;
    const tiles = document.getElementById('cat-tiles');
    if (tiles) tiles.innerHTML = cats.map(c => `
      <a class="cat-tile reveal" href="/shop/${c.slug}" style="background:linear-gradient(150deg, ${c.accent_color}, ${c.accent_color}cc)">
        <span class="cat-tile__emoji">${Icons.html(Icons.categoryIcon(c.slug), '#FFFFFF')}</span>
        <h3>${Fmt.escape(c.name)}</h3>
        <span>Shop now</span>
      </a>`).join('');
  } catch (_) {}

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
