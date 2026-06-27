// Order confirmation / tracking page.
document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('order-root');
  if (!root) return;
  const params = new URLSearchParams(location.search);
  const num = params.get('n');
  const isNew = params.get('new') === '1';

  if (!num) {
    root.innerHTML = `
      <div class="auth-wrap">
        <h1 style="text-align:center">Track your order</h1>
        <form id="track-form" class="panel" style="margin-top:20px">
          <div class="field"><label>Order number</label><input name="n" placeholder="SP-2026-000123" required></div>
          <button class="btn btn--primary btn--block btn--lg">Find order</button>
        </form>
      </div>`;
    root.querySelector('#track-form').onsubmit = e => { e.preventDefault(); location.href = '/order?n=' + encodeURIComponent(e.target.n.value.trim()); };
    return;
  }

  let order;
  try { order = (await API.get('/orders/' + encodeURIComponent(num))).data; }
  catch (e) { root.innerHTML = `<div class="empty-state"><div class="big-emoji">${Icons.html('search', '#C8531B')}</div><p>Order not found.</p><a class="btn btn--primary" href="/order">Try again</a></div>`; return; }

  const steps = ['pending', 'paid', 'packed', 'shipped', 'delivered'];
  const idx = Math.max(0, steps.indexOf(order.status));

  root.innerHTML = `
    ${isNew ? `<div class="text-center" style="margin-bottom:24px"><div class="empty-ico" style="margin:0 auto;width:64px">${Icons.html('spark', '#E0A422')}</div><h1>Thank you!</h1><p class="muted">Your order is confirmed. A receipt is on its way to ${Fmt.escape(order.email)}.</p></div>` : `<h1 style="text-align:center;margin-bottom:24px">Order ${Fmt.escape(order.order_number)}</h1>`}
    <div class="checkout-page">
      <div class="panel">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
          <div><span class="muted" style="font-size:.8rem">Order</span><div style="font-weight:700">${Fmt.escape(order.order_number)}</div></div>
          <div><span class="muted" style="font-size:.8rem">Placed</span><div>${Fmt.escape(order.placed_at)}</div></div>
          <div><span class="muted" style="font-size:.8rem">Status</span><div><span class="badge badge--accent">${order.status}</span></div></div>
        </div>
        <div class="steps">
          ${steps.map((s, i) => `<div class="step"><b style="${i <= idx ? 'background:var(--color-primary);color:#fff' : ''}">${i + 1}</b>${s}</div>`).join('')}
        </div>
        <hr style="border:none;border-top:1px solid var(--color-border);margin:16px 0">
        ${order.items.map(it => `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span>${Fmt.escape(it.product_name)} <span class="muted">(${Fmt.escape(it.variant_name)}) × ${it.quantity}</span></span>
            <strong>${Fmt.money(it.line_total)}</strong>
          </div>`).join('')}
      </div>
      <div class="panel order-summary">
        <h3 style="margin-bottom:12px">Summary</h3>
        ${order.discount_total > 0 ? `<div class="summary-row" style="color:var(--color-success)"><span>Discount</span><span>−${Fmt.money(order.discount_total)}</span></div>` : ''}
        <div class="summary-row"><span>Subtotal</span><span>${Fmt.money(order.subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${order.shipping_total > 0 ? Fmt.money(order.shipping_total) : 'Free'}</span></div>
        <div class="summary-row"><span>Tax</span><span>${Fmt.money(order.tax_total)}</span></div>
        <div class="summary-row total" style="margin-top:8px"><span>Total</span><span>${Fmt.money(order.grand_total)}</span></div>
        <div style="margin-top:16px" class="muted">
          <strong style="color:var(--color-text)">Shipping to</strong><br>
          ${Fmt.escape(order.shipping_address.recipient_name || '')}<br>
          ${Fmt.escape(order.shipping_address.line1 || '')} ${Fmt.escape(order.shipping_address.city || '')} ${Fmt.escape(order.shipping_address.postal_code || '')}
        </div>
        <a class="btn btn--light btn--block" href="/shop" style="margin-top:16px">Continue shopping</a>
      </div>
    </div>`;
});
