// Full cart page. See docs/08 §4.4.
document.addEventListener('DOMContentLoaded', () => {
  const wrap = document.getElementById('cart-page-root');
  if (!wrap) return;

  function render() {
    const d = Cart.data;
    if (!d.items || !d.items.length) {
      wrap.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="big-emoji">${Icons.html('bag', '#C8531B')}</div><h2 style="margin:12px 0">Your cart is empty</h2><a class="btn btn--primary btn--lg" href="/shop">Browse spices</a></div>`;
      return;
    }
    wrap.innerHTML = `
      <div class="panel">
        <h2 style="margin-bottom:8px">Your Cart</h2>
        <div id="cart-rows">
          ${d.items.map(it => `
            <div class="cart-row">
              <a href="/product/${it.slug}" class="cart-row__media" style="${tileStyle(it.accent_color)}">${productThumb(it)}</a>
              <div>
                <div style="font-weight:600">${Fmt.escape(it.product_name)}</div>
                <div class="muted" style="font-size:.85rem">${Fmt.escape(it.brand)} · ${Fmt.escape(it.variant_name)}</div>
                <div class="qty" style="margin-top:8px">
                  <button data-dec="${it.id}">−</button><span>${it.quantity}</span><button data-inc="${it.id}">+</button>
                </div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700">${Fmt.money(it.line_total)}</div>
                <button class="cart-line__remove" data-rm="${it.id}">Remove</button>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="panel order-summary">
        <h3 style="margin-bottom:12px">Order Summary</h3>
        <div class="coupon-form">
          <input id="coupon-input" placeholder="Discount code" value="${d.coupon_code || ''}">
          <button class="btn btn--dark" id="coupon-btn">${d.coupon_code ? 'Remove' : 'Apply'}</button>
        </div>
        ${d.discount_total > 0 ? `<div class="summary-row" style="color:var(--color-success)"><span>Discount (${d.coupon_code})</span><span>−${Fmt.money(d.discount_total)}</span></div>` : ''}
        <div class="summary-row"><span>Subtotal</span><span>${Fmt.money(d.subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${d.shipping_total > 0 ? Fmt.money(d.shipping_total) : 'Free'}</span></div>
        <div class="summary-row"><span>Tax</span><span>${Fmt.money(d.tax_total)}</span></div>
        <hr style="border:none;border-top:1px solid var(--color-border);margin:12px 0">
        <div class="summary-row total"><span>Total</span><span>${Fmt.money(d.grand_total)}</span></div>
        <a class="btn btn--primary btn--block btn--lg" href="/checkout" style="margin-top:16px">Proceed to checkout</a>
        ${d.subtotal < d.free_shipping_threshold ? `<p class="note" style="margin-top:12px">Add ${Fmt.money(d.free_shipping_threshold - d.subtotal)} more for free shipping 🚚</p>` : ''}
      </div>`;

    wrap.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => Cart.changeQty(b.dataset.inc, 1));
    wrap.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => Cart.changeQty(b.dataset.dec, -1));
    wrap.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => Cart.removeItem(b.dataset.rm).catch(e => UI.toast(e.message, 'error')));

    const cbtn = wrap.querySelector('#coupon-btn');
    if (cbtn) cbtn.onclick = async () => {
      try {
        if (Cart.data.coupon_code) { await Cart.removeCoupon(); UI.toast('Coupon removed'); }
        else { await Cart.applyCoupon(wrap.querySelector('#coupon-input').value.trim()); UI.toast('Coupon applied'); }
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  }

  document.addEventListener('cart:update', render);
  // Initial (Cart.refresh in UI.init may finish after this; render now + on update)
  setTimeout(render, 250);
});
