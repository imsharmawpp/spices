<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Services\CartService;
use App\Support\Env;

final class CheckoutController
{
    /** Return computed totals for the current cart (shipping + tax + discount). */
    public function quote(Request $req): void
    {
        Response::json(CartService::summary());
    }

    /** Place an order: re-price server-side, decrement stock in a transaction, record payment. */
    public function placeOrder(Request $req): void
    {
        $email = strtolower(trim((string) $req->input('email', '')));
        $address = $req->input('shipping_address', []);
        $method = (string) $req->input('payment_method', 'card');

        $errors = [];
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'A valid email is required';
        }
        foreach (['recipient_name', 'line1', 'city', 'postal_code'] as $f) {
            if (empty($address[$f])) {
                $errors["shipping_address.$f"] = ucfirst(str_replace('_', ' ', $f)) . ' is required';
            }
        }
        if ($errors) {
            Response::error('VALIDATION_ERROR', 'Please complete your details', 422, $errors);
        }

        $pdo = Database::connection();
        $summary = CartService::summary();
        if (empty($summary['items'])) {
            Response::error('EMPTY_CART', 'Your cart is empty', 422);
        }

        try {
            $pdo->beginTransaction();

            // Re-verify and decrement stock atomically.
            foreach ($summary['items'] as $item) {
                $upd = $pdo->prepare('UPDATE product_variants SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?');
                $upd->execute([$item['quantity'], $item['variant_id'], $item['quantity']]);
                if ($upd->rowCount() !== 1) {
                    throw new \RuntimeException('OUT_OF_STOCK:' . $item['product_name']);
                }
            }

            $orderNumber = 'SP-' . date('Y') . '-' . str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
            $userId = $_SESSION['user_id'] ?? null;

            $pdo->prepare('INSERT INTO orders
                (order_number,user_id,email,status,subtotal,discount_total,shipping_total,tax_total,grand_total,coupon_code,payment_method,shipping_address_json)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
                ->execute([
                    $orderNumber, $userId, $email, 'paid',
                    $summary['subtotal'], $summary['discount_total'], $summary['shipping_total'],
                    $summary['tax_total'], $summary['grand_total'], $summary['coupon_code'],
                    $method, json_encode($address),
                ]);
            $orderId = (int) $pdo->lastInsertId();

            $oi = $pdo->prepare('INSERT INTO order_items
                (order_id,variant_id,product_name,variant_name,sku,unit_price,quantity,line_total)
                VALUES (?,?,?,?,?,?,?,?)');
            foreach ($summary['items'] as $item) {
                $oi->execute([
                    $orderId, $item['variant_id'], $item['product_name'], $item['variant_name'],
                    $item['sku'], $item['price'], $item['quantity'], $item['line_total'],
                ]);
            }

            // Mock payment capture (production: delegate to gateway + webhook — see docs/05-api-spec.md §2.5).
            $pdo->prepare('INSERT INTO payments (order_id,provider,provider_payment_id,method,amount,currency,status) VALUES (?,?,?,?,?,?,?)')
                ->execute([$orderId, Env::get('PAYMENT_PROVIDER', 'mock'), 'mock_' . bin2hex(random_bytes(6)), $method, $summary['grand_total'], Env::get('CURRENCY', 'USD'), 'captured']);

            $pdo->prepare('INSERT INTO order_status_history (order_id,from_status,to_status,note) VALUES (?,?,?,?)')
                ->execute([$orderId, null, 'paid', 'Payment captured (mock gateway)']);

            // Clear the cart.
            $cartId = CartService::currentCartId(false);
            if ($cartId) {
                $pdo->prepare('DELETE FROM cart_items WHERE cart_id=?')->execute([$cartId]);
                $pdo->prepare('UPDATE carts SET coupon_code=NULL WHERE id=?')->execute([$cartId]);
            }

            $pdo->commit();

            Response::json([
                'order_number' => $orderNumber,
                'status' => 'paid',
                'email' => $email,
                'grand_total' => $summary['grand_total'],
            ], 201);
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            if (str_starts_with($e->getMessage(), 'OUT_OF_STOCK:')) {
                Response::error('OUT_OF_STOCK', 'Some items went out of stock: ' . substr($e->getMessage(), 13), 409);
            }
            Response::error('ORDER_FAILED', 'We could not place your order. Please try again.', 500);
        }
    }

    public function showOrder(Request $req, array $params): void
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT order_number,email,status,subtotal,discount_total,shipping_total,tax_total,grand_total,coupon_code,payment_method,shipping_address_json,placed_at FROM orders WHERE order_number=?');
        $stmt->execute([$params['order_number']]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('NOT_FOUND', 'Order not found', 404);
        }
        $items = $pdo->prepare('SELECT product_name,variant_name,sku,unit_price,quantity,line_total FROM order_items WHERE order_id=(SELECT id FROM orders WHERE order_number=?)');
        $items->execute([$params['order_number']]);
        $order['items'] = $items->fetchAll();
        $order['shipping_address'] = json_decode($order['shipping_address_json'] ?? '{}', true);
        unset($order['shipping_address_json']);
        Response::json($order);
    }

    public function myOrders(Request $req): void
    {
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            Response::error('UNAUTHENTICATED', 'Please log in', 401);
        }
        $stmt = Database::connection()->prepare('SELECT order_number,status,grand_total,placed_at FROM orders WHERE user_id=? ORDER BY id DESC');
        $stmt->execute([$userId]);
        Response::json($stmt->fetchAll());
    }

    /**
     * Payment webhook. For the mock provider this is a no-op acknowledgement.
     * For a real gateway (e.g. Razorpay) it verifies the HMAC signature before
     * marking the referenced order paid. See docs/05-api-spec.md §2.5.
     */
    public function webhook(Request $req): void
    {
        $provider = \App\Services\Payment::provider();
        if ($provider === 'mock') {
            Response::json(['ok' => true, 'provider' => 'mock']);
        }

        $raw = file_get_contents('php://input') ?: '';
        $sig = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? ($_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '');
        $secret = (string) \App\Support\Env::get('PAYMENT_WEBHOOK_SECRET', '');

        if (!\App\Services\Payment::verifyWebhook($raw, $sig, $secret)) {
            \App\Support\Logger::error('Rejected payment webhook (bad signature)', ['provider' => $provider]);
            Response::error('INVALID_SIGNATURE', 'Webhook signature verification failed', 400);
        }

        $payload = json_decode($raw, true) ?: [];
        $orderNumber = $payload['order_number'] ?? ($payload['notes']['order_number'] ?? null);
        if ($orderNumber) {
            $pdo = Database::connection();
            $stmt = $pdo->prepare('SELECT id,status FROM orders WHERE order_number=?');
            $stmt->execute([$orderNumber]);
            if ($order = $stmt->fetch()) {
                if ($order['status'] === 'pending') {
                    $pdo->prepare('UPDATE orders SET status="paid" WHERE id=?')->execute([$order['id']]);
                    $pdo->prepare('INSERT INTO order_status_history (order_id,from_status,to_status,note) VALUES (?,?,?,?)')
                        ->execute([$order['id'], 'pending', 'paid', 'Payment confirmed via webhook']);
                }
            }
        }
        Response::json(['ok' => true]);
    }
}
