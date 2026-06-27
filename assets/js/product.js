// Product detail page — gallery, variants, add-to-cart, reviews, related. See docs/08 §4.3.
document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('pdp-root');
  if (!root) return;
  const slug = location.pathname.split('/').pop();

  let product;
  try { product = (await API.get('/products/' + slug)).data; }
  catch (e) { root.innerHTML = `<div class="empty-state"><div class="big-emoji">${Icons.html('jar', '#C8531B')}</div><p>Product not found.</p><a class="btn btn--primary" href="/shop">Back to shop</a></div>`; return; }

  document.title = `${product.name} · Saffra Spices`;
  let selected = (product.variants.find(v => v.stock_qty > 0) || product.variants[0]);
  const tiles = [product.emoji, product.emoji].filter(Boolean);

  function priceBlock() {
    const onSale = selected.compare_at_price && selected.compare_at_price > selected.price;
    return `<span class="price-now">${Fmt.money(selected.price)}</span>
            ${onSale ? `<span class="price-was">${Fmt.money(selected.compare_at_price)}</span>` : ''}`;
  }

  function render() {
    root.innerHTML = `
    <nav class="breadcrumb"><a href="/">Home</a> / <a href="/shop/${product.category_slug}">${Fmt.escape(product.category_name)}</a> / ${Fmt.escape(product.name)}</nav>
    <div class="pdp">
      <div class="pdp__gallery">
        <div class="pdp__main" id="pdp-main" style="${tileStyle(product.accent_color)}">${productIcon(product, 'pdp-ico')}</div>
        <div class="pdp__thumbs">
          ${tiles.map((t, i) => `<button class="${i === 0 ? 'active' : ''}" data-thumb="${i}" style="${tileStyle(product.accent_color)}">${productIcon(product, 'tile-ico tile-ico--sm')}</button>`).join('')}
        </div>
      </div>
      <div class="pdp__info">
        <span class="card__brand">${Fmt.escape(product.brand || 'Saffra')}${product.is_organic ? ' · Organic' : ''}</span>
        <h1>${Fmt.escape(product.name)}</h1>
        <span class="card__rating"><span class="stars">${Fmt.stars(product.rating_avg)}</span> ${product.rating_avg} (${product.rating_count} reviews)</span>
        <div class="pdp__price">${priceBlock()}</div>
        <p>${Fmt.escape(product.short_description || '')}</p>

        <div style="margin-top:16px"><strong style="font-size:.9rem">Size</strong>
          <div class="variant-options" id="variant-options">
            ${product.variants.map(v => `<button class="variant-opt ${v.id === selected.id ? 'active' : ''}" data-variant="${v.id}" ${v.stock_qty <= 0 ? 'disabled' : ''}>${Fmt.escape(v.name)}</button>`).join('')}
          </div>
        </div>

        <div class="pdp__actions">
          <div class="qty">
            <button id="q-dec" aria-label="Decrease">−</button>
            <span id="q-val">1</span>
            <button id="q-inc" aria-label="Increase">+</button>
          </div>
          <button class="btn btn--primary btn--lg" id="add-btn" ${selected.stock_qty <= 0 ? 'disabled' : ''}>${selected.stock_qty <= 0 ? 'Sold out' : 'Add to cart'}</button>
          <button class="icon-btn card__wish ${Wishlist.has(product.slug) ? 'active' : ''}" id="wish-btn" aria-label="Save">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/></svg>'}</button>
        </div>
        <div class="stock-dot ${selected.stock_qty > 0 ? '' : 'out'}">${selected.stock_qty > 0 ? selected.stock_qty + ' in stock' : 'Currently unavailable'}</div>
        <div class="trust-row">
          <span>${Icons.html('lock', '#C8531B', 'trust-ico')} Secure checkout</span><span>${Icons.html('truck', '#C8531B', 'trust-ico')} Free over ${Fmt.money(UI.settings.free_shipping_threshold)}</span><span>${Icons.html('leaf', '#3F7D3A', 'trust-ico')} Freshly ground</span>
        </div>

        <div class="accordion" style="margin-top:24px">
          ${accordionItem('Description', Fmt.escape(product.description || ''), true)}
          ${accordionItem('Origin & sourcing', Fmt.escape(product.origin || 'Carefully sourced.'))}
          ${accordionItem('How to use', Fmt.escape(product.usage_tips || ''))}
          ${accordionItem('Shipping & returns', 'Ships in 1–2 business days. Free returns within 30 days.')}
        </div>
      </div>
    </div>

    <section class="section">
      <div class="rating-summary" style="margin-bottom:16px">
        <span class="big">${product.rating_avg}</span>
        <div><div class="stars" style="font-size:1.2rem">${Fmt.stars(product.rating_avg)}</div><span class="muted">${product.rating_count} reviews</span></div>
      </div>
      <div class="reviews">
        ${(product.reviews || []).length ? product.reviews.map(r => `
          <div class="review">
            <div class="review__head"><strong>${Fmt.escape(r.title || 'Review')}</strong><span class="stars">${Fmt.stars(r.rating)}</span></div>
            <p>${Fmt.escape(r.body || '')}</p>
            <span class="muted" style="font-size:.8rem">— ${Fmt.escape(r.author_name)}</span>
          </div>`).join('') : '<p class="muted">No reviews yet.</p>'}
      </div>
    </section>

    <section class="section section--tight">
      <div class="carousel-head"><h2>You may also like</h2></div>
      <div class="product-grid" id="related"></div>
    </section>`;

    wire();
  }

  function accordionItem(title, body, open = false) {
    return `<div class="accordion__item ${open ? 'open' : ''}">
      <button class="accordion__head">${title}<span class="chev">+</span></button>
      <div class="accordion__body">${body || '—'}</div>
    </div>`;
  }

  let qty = 1;
  function wire() {
    root.querySelectorAll('[data-variant]').forEach(b => b.onclick = () => {
      if (b.disabled) return;
      selected = product.variants.find(v => String(v.id) === b.dataset.variant);
      render();
    });
    root.querySelectorAll('[data-thumb]').forEach(b => b.onclick = () => {
      root.querySelectorAll('[data-thumb]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
    root.querySelector('#q-inc').onclick = () => { qty = Math.min(selected.stock_qty, qty + 1); root.querySelector('#q-val').textContent = qty; };
    root.querySelector('#q-dec').onclick = () => { qty = Math.max(1, qty - 1); root.querySelector('#q-val').textContent = qty; };
    root.querySelectorAll('.accordion__head').forEach(h => h.onclick = () => h.parentElement.classList.toggle('open'));

    const addBtn = root.querySelector('#add-btn');
    if (addBtn) addBtn.onclick = async () => {
      addBtn.disabled = true; addBtn.textContent = 'Adding…';
      try { await Cart.addItem(selected.id, qty); UI.toast(`${product.name} added`); UI.openCart(); }
      catch (e) { UI.toast(e.message, 'error'); }
      finally { addBtn.disabled = false; addBtn.textContent = 'Add to cart'; }
    };
    const wishBtn = root.querySelector('#wish-btn');
    wishBtn.onclick = () => { const on = Wishlist.toggle(product.slug); wishBtn.classList.toggle('active', on); UI.toast(on ? 'Saved to wishlist' : 'Removed'); };

    qty = 1;
  }

  render();

  // Related
  try {
    const rel = (await API.get('/products/' + slug + '/related')).data;
    const relEl = document.getElementById('related');
    if (relEl) { relEl.innerHTML = rel.map(p => UI.productCard(p)).join(''); UI.wireCards(relEl); }
  } catch (_) {}
});
