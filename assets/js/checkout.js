// Checkout page — address, summary, place order. See docs/08 §4.5.
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('checkout-root');
  if (!root) return;

  function renderSummary() {
    const d = Cart.data;
    const box = document.getElementById('checkout-summary');
    if (!box) return;
    if (!d.items || !d.items.length) {
      box.innerHTML = '<p class="muted">Your cart is empty.</p>';
      return;
    }
    box.innerHTML = `
      <h3 style="margin-bottom:12px">Order Summary</h3>
      ${d.items.map(it => `
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">
          <span class="cart-row__media" style="width:48px;height:48px;${tileStyle(it.accent_color)}">${productThumb(it, 'tile-ico tile-ico--sm')}</span>
          <div style="flex:1"><div style="font-size:.9rem;font-weight:600">${Fmt.escape(it.product_name)}</div><div class="muted" style="font-size:.8rem">${Fmt.escape(it.variant_name)} × ${it.quantity}</div></div>
          <strong>${Fmt.money(it.line_total)}</strong>
        </div>`).join('')}
      <hr style="border:none;border-top:1px solid var(--color-border);margin:12px 0">
      ${d.discount_total > 0 ? `<div class="summary-row" style="color:var(--color-success)"><span>Discount</span><span>−${Fmt.money(d.discount_total)}</span></div>` : ''}
      <div class="summary-row"><span>Subtotal</span><span>${Fmt.money(d.subtotal)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${d.shipping_total > 0 ? Fmt.money(d.shipping_total) : 'Free'}</span></div>
      <div class="summary-row"><span>Tax</span><span>${Fmt.money(d.tax_total)}</span></div>
      <div class="summary-row total" style="margin-top:8px"><span>Total</span><span>${Fmt.money(d.grand_total)}</span></div>
      ${Currency.isConverted() ? `<p class="cur-note">${Currency.note(d.grand_total)}</p>` : ''}`;
  }

  document.addEventListener('cart:update', renderSummary);
  Currency.ensure().then(renderSummary);

  const form = document.getElementById('checkout-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!Cart.data.items || !Cart.data.items.length) { UI.toast('Your cart is empty', 'error'); return; }
    clearErrors();
    const fd = new FormData(form);
    const payload = {
      email: fd.get('email'),
      payment_method: fd.get('payment_method') || 'card',
      shipping_address: {
        recipient_name: fd.get('recipient_name'),
        phone: fd.get('phone'),
        line1: fd.get('line1'),
        line2: fd.get('line2'),
        city: fd.get('city'),
        state: fd.get('state'),
        postal_code: fd.get('postal_code'),
        country: fd.get('country') || 'US',
      },
    };
    const btn = form.querySelector('#place-order');
    btn.disabled = true; btn.textContent = 'Placing order…';
    try {
      const res = await API.post('/orders', payload);
      location.href = '/order?n=' + encodeURIComponent(res.data.order_number) + '&new=1';
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Place order';
      if (err.details) {
        Object.entries(err.details).forEach(([k, msg]) => {
          const field = k.replace('shipping_address.', '');
          const el = form.querySelector(`[data-err="${field}"]`);
          if (el) el.textContent = Array.isArray(msg) ? msg[0] : msg;
        });
      }
      UI.toast(err.message || 'Could not place order', 'error');
    }
  });

  function clearErrors() { form.querySelectorAll('.err').forEach(e => e.textContent = ''); }
});
