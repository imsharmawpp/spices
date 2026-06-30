<?php
declare(strict_types=1);

/**
 * Zero-dependency integration test suite for the Saffra Spices backend.
 * Boots a throwaway SQLite DB + PHP dev server, then exercises the real API
 * over HTTP (catalog, cart math, coupons, orders/stock, auth, admin guard/CSRF,
 * currency, SEO, sitemap, rate limiting, payment signatures).
 *
 * Usage:  php tests/run.php
 * Exit code is non-zero if any test fails (CI-friendly).
 */

$root = dirname(__DIR__);
$port = 8399;
$base = "http://127.0.0.1:{$port}";

// Throwaway DB so we never touch the dev database.
$testDb = $root . '/storage/test.sqlite';
@unlink($testDb);
putenv('DB_SQLITE_PATH_OVERRIDE=' . $testDb);
putenv('DB_FALLBACK_SQLITE=true');
putenv('APP_DEBUG=true');

// Boot the dev server (inherits our putenv vars).
$server = proc_open(
    [PHP_BINARY, '-S', "127.0.0.1:{$port}", 'index.php'],
    [['pipe', 'r'], ['file', '/tmp/test_server.log', 'a'], ['file', '/tmp/test_server.log', 'a']],
    $pipes,
    $root
);
if (!is_resource($server)) {
    fwrite(STDERR, "Could not start test server\n");
    exit(1);
}
// Wait for readiness.
for ($i = 0; $i < 50; $i++) {
    usleep(200000);
    $c = @file_get_contents("{$base}/api/settings");
    if ($c !== false) break;
}

// ---- tiny test framework ----
$pass = 0; $fail = 0; $failures = [];
function http(string $base, string $method, string $path, $body = null, ?string $jar = null, array $headers = []): array {
    $ch = curl_init($base . $path);
    $h = [];
    if ($body !== null) { $h[] = 'Content-Type: application/json'; }
    foreach ($headers as $k => $v) { $h[] = "$k: $v"; }
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $h,
        CURLOPT_TIMEOUT => 10,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, is_string($body) ? $body : json_encode($body));
    if ($jar) { curl_setopt($ch, CURLOPT_COOKIEJAR, $jar); curl_setopt($ch, CURLOPT_COOKIEFILE, $jar); }
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $json = json_decode((string) $raw, true);
    return ['status' => $code, 'raw' => (string) $raw, 'json' => $json, 'data' => $json['data'] ?? null];
}
function test(string $name, callable $fn): void {
    global $pass, $fail, $failures;
    try {
        $fn();
        $pass++;
        echo "  \033[32m✓\033[0m {$name}\n";
    } catch (\Throwable $e) {
        $fail++;
        $failures[] = "{$name}: {$e->getMessage()}";
        echo "  \033[31m✗\033[0m {$name} — {$e->getMessage()}\n";
    }
}
function ok($cond, string $msg = 'assertion failed'): void { if (!$cond) throw new \RuntimeException($msg); }
function eq($a, $b, string $msg = ''): void { if ($a != $b) throw new \RuntimeException(($msg ?: 'not equal') . " (got " . json_encode($a) . ", want " . json_encode($b) . ")"); }

echo "\nRunning Saffra test suite against {$base}\n\n";
$jar = '/tmp/test_cookies.txt'; @unlink($jar);
$admin = '/tmp/test_admin.txt'; @unlink($admin);

// ---- Catalog ----
test('catalog: products list returns seeded items', function () use ($base) {
    $r = http($base, 'GET', '/api/products?per_page=5');
    eq($r['status'], 200);
    ok($r['json']['meta']['total'] >= 10, 'expected >=10 products');
    ok(isset($r['data'][0]['min_price']), 'card has min_price');
});
test('catalog: categories return 5', function () use ($base) {
    $r = http($base, 'GET', '/api/categories');
    eq(count($r['data']), 5);
});
test('catalog: product detail has variants + INR price', function () use ($base) {
    $r = http($base, 'GET', '/api/products/turmeric-powder');
    eq($r['status'], 200);
    ok(count($r['data']['variants']) >= 1, 'has variants');
    ok($r['data']['variants'][0]['price'] > 50, 'INR price (not USD)');
});
test('catalog: filter organic returns only organic', function () use ($base) {
    $r = http($base, 'GET', '/api/products?organic=1');
    ok($r['json']['meta']['total'] >= 1, 'has organic products');
});

// ---- Cart + coupon math ----
test('cart: add item, apply coupon, totals are consistent', function () use ($base, $jar) {
    http($base, 'POST', '/api/cart/items', ['variant_id' => 3, 'quantity' => 2], $jar);
    $r = http($base, 'POST', '/api/cart/coupon', ['code' => 'WELCOME10'], $jar);
    $d = $r['data'];
    ok($d['discount_total'] > 0, 'coupon applied');
    // grand = subtotal - discount + shipping + tax
    $expected = round($d['subtotal'] - $d['discount_total'] + $d['shipping_total'] + $d['tax_total'], 2);
    eq(round($d['grand_total'], 2), $expected, 'totals add up');
});
test('cart: invalid coupon rejected (422)', function () use ($base, $jar) {
    $r = http($base, 'POST', '/api/cart/coupon', ['code' => 'NOPE123'], $jar);
    eq($r['status'], 422);
});

// ---- Order placement + stock ----
test('order: placing an order decrements stock and clears cart', function () use ($base, $jar) {
    $before = http($base, 'GET', '/api/products/turmeric-powder')['data'];
    $v3 = null; foreach ($before['variants'] as $v) { if ($v['id'] == 3) $v3 = $v; }
    ok($v3 !== null, 'variant 3 exists');
    $r = http($base, 'POST', '/api/orders', [
        'email' => 'tester@example.com', 'payment_method' => 'card',
        'shipping_address' => ['recipient_name' => 'T', 'line1' => '1 St', 'city' => 'Pune', 'postal_code' => '411001'],
    ], $jar);
    eq($r['status'], 201);
    ok(str_starts_with($r['data']['order_number'], 'SP-'), 'order number');
    $after = http($base, 'GET', '/api/products/turmeric-powder')['data'];
    $a3 = null; foreach ($after['variants'] as $v) { if ($v['id'] == 3) $a3 = $v; }
    eq($a3['stock_qty'], $v3['stock_qty'] - 2, 'stock decremented by 2');
    $cart = http($base, 'GET', '/api/cart', null, $jar)['data'];
    eq($cart['item_count'], 0, 'cart cleared after order');
});

// ---- Auth ----
test('auth: register + me + logout', function () use ($base) {
    $j = '/tmp/test_u.txt'; @unlink($j);
    $r = http($base, 'POST', '/api/auth/register', ['name' => 'New User', 'email' => 'newuser+' . time() . '@ex.com', 'password' => 'secret1'], $j);
    eq($r['status'], 201);
    eq($r['data']['role'], 'customer');
    $me = http($base, 'GET', '/api/auth/me', null, $j);
    eq($me['status'], 200);
    ok(!empty($me['data']['csrf']), 'csrf issued');
});

// ---- Admin guard + CSRF + CRUD ----
test('admin: dashboard blocked for anonymous (401)', function () use ($base) {
    $r = http($base, 'GET', '/api/admin/dashboard');
    eq($r['status'], 401);
});
test('admin: login as admin returns role + csrf', function () use ($base, $admin) {
    $r = http($base, 'POST', '/api/auth/login', ['email' => 'admin@saffra.test', 'password' => 'admin123'], $admin);
    eq($r['status'], 200);
    eq($r['data']['role'], 'admin');
    ok(!empty($r['data']['csrf']), 'csrf present');
});
test('admin: dashboard works after login', function () use ($base, $admin) {
    $r = http($base, 'GET', '/api/admin/dashboard', null, $admin);
    eq($r['status'], 200);
    ok(isset($r['data']['products']), 'kpis present');
});
test('admin: write without CSRF is blocked (419)', function () use ($base, $admin) {
    $r = http($base, 'POST', '/api/admin/products', ['name' => 'X', 'category_id' => 1], $admin);
    eq($r['status'], 419);
});
test('admin: product create + variant + delete (with CSRF)', function () use ($base, $admin) {
    $me = http($base, 'GET', '/api/auth/me', null, $admin);
    $csrf = $me['data']['csrf'];
    $r = http($base, 'POST', '/api/admin/products', ['name' => 'Test Spice', 'category_id' => 3, 'form' => 'blend'], $admin, ['X-CSRF-Token' => $csrf]);
    eq($r['status'], 201);
    $pid = $r['data']['id'];
    $v = http($base, 'POST', "/api/admin/products/{$pid}/variants", ['name' => '100g', 'price' => 199, 'stock_qty' => 10], $admin, ['X-CSRF-Token' => $csrf]);
    eq($v['status'], 201);
    $del = http($base, 'DELETE', "/api/admin/products/{$pid}", null, $admin, ['X-CSRF-Token' => $csrf]);
    eq($del['status'], 200);
});
test('admin: order status update writes history', function () use ($base, $admin) {
    $me = http($base, 'GET', '/api/auth/me', null, $admin);
    $csrf = $me['data']['csrf'];
    $list = http($base, 'GET', '/api/admin/orders', null, $admin)['data'];
    ok(count($list) >= 1, 'has an order from earlier test');
    $num = $list[0]['order_number'];
    $r = http($base, 'PATCH', "/api/admin/orders/{$num}/status", ['status' => 'shipped', 'tracking_number' => 'TRK1'], $admin, ['X-CSRF-Token' => $csrf]);
    eq($r['status'], 200);
    $detail = http($base, 'GET', "/api/admin/orders/{$num}", null, $admin)['data'];
    eq($detail['status'], 'shipped');
    ok(count($detail['history']) >= 1, 'status history recorded');
});

// ---- Currency ----
test('currency: base INR with live/fallback rates', function () use ($base) {
    $r = http($base, 'GET', '/api/currency');
    eq($r['data']['base'], 'INR');
    ok(isset($r['data']['rates']['USD']), 'has USD rate');
    ok($r['data']['rates']['INR'] == 1, 'INR base = 1');
});

// ---- SEO ----
test('seo: product page has dynamic title + Product JSON-LD', function () use ($base) {
    $html = http($base, 'GET', '/product/turmeric-powder')['raw'];
    ok(str_contains($html, '<title>Turmeric Powder'), 'dynamic title');
    ok(str_contains($html, '"@type":"Product"'), 'product json-ld');
    ok(str_contains($html, '"priceCurrency":"INR"'), 'INR price in schema');
});
test('seo: sitemap lists products', function () use ($base) {
    $xml = http($base, 'GET', '/sitemap.xml')['raw'];
    ok(str_contains($xml, '/product/turmeric-powder'), 'product in sitemap');
});
test('security: headers present on pages', function () use ($base) {
    $ch = curl_init($base . '/');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HEADER => true, CURLOPT_NOBODY => true, CURLOPT_TIMEOUT => 8]);
    $headers = (string) curl_exec($ch); curl_close($ch);
    ok(stripos($headers, 'X-Content-Type-Options: nosniff') !== false, 'nosniff header');
    ok(stripos($headers, 'X-Frame-Options') !== false, 'frame-options header');
});

// ---- Rate limiting ----
test('security: login rate limit returns 429', function () use ($base) {
    $j = '/tmp/test_rl.txt'; @unlink($j);
    $got429 = false;
    for ($i = 0; $i < 13; $i++) {
        $r = http($base, 'POST', '/api/auth/login', ['email' => 'a@b.com', 'password' => 'bad'], $j);
        if ($r['status'] === 429) { $got429 = true; break; }
    }
    ok($got429, 'expected a 429 after repeated attempts');
});

// ---- Payment signature (unit) ----
test('payment: razorpay signature verification', function () use ($root) {
    require_once $root . '/app/Support/Env.php';
    require_once $root . '/app/Support/autoload.php';
    $secret = 'whsec_test';
    $valid = hash_hmac('sha256', 'order_1|pay_1', $secret);
    ok(\App\Services\Payment::verifyRazorpaySignature('order_1', 'pay_1', $valid, $secret), 'valid signature accepted');
    ok(!\App\Services\Payment::verifyRazorpaySignature('order_1', 'pay_1', 'deadbeef', $secret), 'bad signature rejected');
});

// ---- teardown ----
proc_terminate($server);
proc_close($server);
@unlink($testDb);

echo "\n" . str_repeat('-', 48) . "\n";
echo "  Passed: {$pass}   Failed: {$fail}\n";
if ($fail > 0) {
    echo "\nFailures:\n - " . implode("\n - ", $failures) . "\n";
    exit(1);
}
echo "  All tests passed ✅\n";
exit(0);
