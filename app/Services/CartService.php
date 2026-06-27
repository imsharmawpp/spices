<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use PDO;

/**
 * Server-side cart. The cart id is tracked in the PHP session.
 * Totals (subtotal, discount, shipping, tax) are always computed here — never trusted from the client.
 * See docs/05-api-spec.md §4 and docs/03-tech-stack-architecture.md §2.2.
 */
final class CartService
{
    public static function currentCartId(bool $create = true): ?int
    {
        $pdo = Database::connection();
        $userId = $_SESSION['user_id'] ?? null;

        if ($userId) {
            $stmt = $pdo->prepare('SELECT id FROM carts WHERE user_id = ?');
            $stmt->execute([$userId]);
            $id = $stmt->fetchColumn();
            if ($id) {
                $_SESSION['cart_id'] = (int) $id;
                return (int) $id;
            }
        }

        if (!empty($_SESSION['cart_id'])) {
            $stmt = $pdo->prepare('SELECT id FROM carts WHERE id = ?');
            $stmt->execute([$_SESSION['cart_id']]);
            if ($stmt->fetchColumn()) {
                return (int) $_SESSION['cart_id'];
            }
        }

        if (!$create) {
            return null;
        }

        $pdo->prepare('INSERT INTO carts (user_id, session_token) VALUES (?, ?)')
            ->execute([$userId, bin2hex(random_bytes(16))]);
        $id = (int) $pdo->lastInsertId();
        $_SESSION['cart_id'] = $id;
        return $id;
    }

    public static function summary(): array
    {
        $pdo = Database::connection();
        $cartId = self::currentCartId(false);

        $items = [];
        if ($cartId) {
            $stmt = $pdo->prepare(
                'SELECT ci.id, ci.quantity, v.id AS variant_id, v.name AS variant_name, v.price, v.stock_qty, v.sku,
                        p.name AS product_name, p.slug, p.emoji, p.accent_color, p.brand,
                        (SELECT path FROM product_images pi WHERE pi.product_id=p.id AND pi.path LIKE \'uploads/%\' ORDER BY pi.is_primary DESC, pi.sort_order, pi.id LIMIT 1) AS image
                 FROM cart_items ci
                 JOIN product_variants v ON v.id = ci.variant_id
                 JOIN products p ON p.id = v.product_id
                 WHERE ci.cart_id = ?'
            );
            $stmt->execute([$cartId]);
            $items = $stmt->fetchAll();
        }

        $subtotal = 0.0;
        foreach ($items as &$it) {
            $it['price'] = (float) $it['price'];
            $it['quantity'] = (int) $it['quantity'];
            $it['line_total'] = round($it['price'] * $it['quantity'], 2);
            $subtotal += $it['line_total'];
        }
        unset($it);

        // Coupon
        $discount = 0.0;
        $couponCode = null;
        if ($cartId) {
            $c = $pdo->prepare('SELECT coupon_code FROM carts WHERE id=?');
            $c->execute([$cartId]);
            $couponCode = $c->fetchColumn() ?: null;
        }
        if ($couponCode) {
            $discount = self::discountFor($couponCode, $subtotal);
            if ($discount <= 0) {
                $couponCode = null; // no longer valid
            }
        }

        $afterDiscount = max(0, $subtotal - $discount);
        $threshold = Settings::float('free_shipping_threshold', 49);
        $shipping = ($subtotal <= 0 || $afterDiscount >= $threshold) ? 0.0 : Settings::float('flat_shipping', 5.95);
        $tax = round($afterDiscount * Settings::float('tax_rate', 0.08), 2);
        $grand = round($afterDiscount + $shipping + $tax, 2);

        return [
            'items' => $items,
            'item_count' => array_sum(array_column($items, 'quantity')),
            'subtotal' => round($subtotal, 2),
            'discount_total' => round($discount, 2),
            'coupon_code' => $couponCode,
            'shipping_total' => round($shipping, 2),
            'tax_total' => $tax,
            'grand_total' => $grand,
            'free_shipping_threshold' => $threshold,
        ];
    }

    public static function discountFor(string $code, float $subtotal): float
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1');
        $stmt->execute([strtoupper($code)]);
        $coupon = $stmt->fetch();
        if (!$coupon) {
            return 0.0;
        }
        if ($coupon['min_order_total'] !== null && $subtotal < (float) $coupon['min_order_total']) {
            return 0.0;
        }
        if ($coupon['type'] === 'percent') {
            $d = $subtotal * ((float) $coupon['value'] / 100);
            if ($coupon['max_discount'] !== null) {
                $d = min($d, (float) $coupon['max_discount']);
            }
            return round($d, 2);
        }
        return round(min((float) $coupon['value'], $subtotal), 2);
    }
}
