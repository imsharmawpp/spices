// Collection / shop page — filters, sort, pagination. See docs/08 §4.2.
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  await Currency.ensure();

  const state = { category: '', q: '', organic: '', form: '', sort: 'popular', page: 1 };

  // Seed from URL: /shop/{slug} or ?q= / ?category=
  const pathMatch = location.pathname.match(/^\/shop\/([^/]+)$/);
  if (pathMatch) state.category = decodeURIComponent(pathMatch[1]);
  const params = new URLSearchParams(location.search);
  if (params.get('q')) state.q = params.get('q');
  if (params.get('category')) state.category = params.get('category');

  // Build category filter list
  let cats = [];
  try { cats = (await API.get('/categories')).data; } catch (_) {}

  const catTitle = document.getElementById('collection-title');
  const catDesc = document.getElementById('collection-desc');
  const activeCat = cats.find(c => c.slug === state.category);
  if (catTitle) catTitle.textContent = state.q ? `Results for “${state.q}”` : (activeCat ? activeCat.name : 'Shop All Spices');
  if (catDesc && activeCat) catDesc.textContent = activeCat.description;

  // Render filters
  const filterBox = document.getElementById('filter-categories');
  if (filterBox) {
    filterBox.innerHTML = `<label><input type="radio" name="cat" value="" ${!state.category ? 'checked' : ''}> All</label>` +
      cats.map(c => `<label><input type="radio" name="cat" value="${c.slug}" ${state.category === c.slug ? 'checked' : ''}> ${Fmt.escape(c.name)}</label>`).join('');
    filterBox.addEventListener('change', e => { state.category = e.target.value; state.page = 1; load(); });
  }

  document.querySelectorAll('[data-form-filter]').forEach(cb => cb.addEventListener('change', () => {
    state.form = document.querySelector('[data-form-filter]:checked')?.value || '';
    state.page = 1; load();
  }));
  const organicCb = document.getElementById('filter-organic');
  if (organicCb) organicCb.addEventListener('change', () => { state.organic = organicCb.checked ? '1' : ''; state.page = 1; load(); });

  const sortSel = document.getElementById('sort-select');
  if (sortSel) sortSel.addEventListener('change', () => { state.sort = sortSel.value; state.page = 1; load(); });

  // Mobile filter drawer
  const ft = document.getElementById('filter-toggle');
  const filters = document.getElementById('filters');
  if (ft) ft.addEventListener('click', () => filters.classList.toggle('open'));

  async function load() {
    grid.innerHTML = Array.from({ length: 8 }).map(() => '<div class="skeleton" style="aspect-ratio:3/4"></div>').join('');
    const qs = new URLSearchParams();
    if (state.category) qs.set('category', state.category);
    if (state.q) qs.set('q', state.q);
    if (state.organic) qs.set('organic', state.organic);
    if (state.form) qs.set('form', state.form);
    qs.set('sort', state.sort);
    qs.set('page', state.page);
    qs.set('per_page', 12);
    try {
      const res = await API.get('/products?' + qs.toString());
      const items = res.data;
      document.getElementById('result-count').textContent = `${res.meta.total} product${res.meta.total === 1 ? '' : 's'}`;
      if (!items.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="big-emoji">${Icons.html('search', '#C8531B')}</div><p>No spices match these filters.</p></div>`;
        document.getElementById('pagination').innerHTML = '';
        return;
      }
      grid.innerHTML = items.map(p => UI.productCard(p)).join('');
      UI.wireCards(grid);
      renderPagination(res.meta);
    } catch (e) {
      grid.innerHTML = '<p class="muted">Failed to load products.</p>';
    }
  }

  function renderPagination(meta) {
    const pag = document.getElementById('pagination');
    if (!pag || meta.pages <= 1) { if (pag) pag.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= meta.pages; i++) {
      html += `<button class="pill ${i === meta.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    pag.innerHTML = html;
    pag.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { state.page = +b.dataset.page; load(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  load();
});
