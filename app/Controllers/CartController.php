<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Services\CartService;

final class CartController
{
    public function show(Request $req): void
    {
        Response::json(CartService::summary());
    }

    public function addItem(Request $req): void
    {
        $variantId = (int) $req->input('variant_id', 0);
        $qty = max(1, (int) $req->input('quantity', 1));
        if ($variantId <= 0) {
            Response::error('VALIDATION_ERROR', 'variant_id is required', 422);
        }

        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT stock_qty FROM product_variants WHERE id=? AND is_active=1');
        $stmt->execute([$variantId]);
        $stock = $stmt->fetchColumn();
        if ($stock === false) {
            Response::error('NOT_FOUND', 'Product variant not found', 404);
        }

        $cartId = CartService::currentCartId();

        $existing = $pdo->prepare('SELECT id, quantity FROM cart_items WHERE cart_id=? AND variant_id=?');
        $existing->execute([$cartId, $variantId]);
        $row = $existing->fetch();

        $newQty = ($row ? (int) $row['quantity'] : 0) + $qty;
        if ($newQty > (int) $stock) {
            Response::error('OUT_OF_STOCK', 'Not enough stock available', 409, ['available' => (int) $stock]);
        }

        if ($row) {
            $pdo->prepare('UPDATE cart_items SET quantity=? WHERE id=?')->execute([$newQty, $row['id']]);
        } else {
            $pdo->prepare('INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?,?,?)')
                ->execute([$cartId, $variantId, $qty]);
        }
        $pdo->prepare("UPDATE carts SET updated_at=datetime('now') WHERE id=?")->execute([$cartId]);

        Response::json(CartService::summary(), 201);
    }

    public function updateItem(Request $req, array $params): void
    {
        $qty = (int) $req->input('quantity', 1);
        $pdo = Database::connection();
        $cartId = CartService::currentCartId(false);
        if (!$cartId) {
            Response::error('NOT_FOUND', 'Cart is empty', 404);
        }

        $stmt = $pdo->prepare('SELECT ci.id, v.stock_qty FROM cart_items ci JOIN product_variants v ON v.id=ci.variant_id WHERE ci.id=? AND ci.cart_id=?');
        $stmt->execute([(int) $params['id'], $cartId]);
        $item = $stmt->fetch();
        if (!$item) {
            Response::error('NOT_FOUND', 'Item not found', 404);
        }

        if ($qty <= 0) {
            $pdo->prepare('DELETE FROM cart_items WHERE id=?')->execute([$item['id']]);
        } else {
            if ($qty > (int) $item['stock_qty']) {
                Response::error('OUT_OF_STOCK', 'Not enough stock available', 409, ['available' => (int) $item['stock_qty']]);
            }
            $pdo->prepare('UPDATE cart_items SET quantity=? WHERE id=?')->execute([$qty, $item['id']]);
        }
        Response::json(CartService::summary());
    }

    public function removeItem(Request $req, array $params): void
    {
        $cartId = CartService::currentCartId(false);
        if ($cartId) {
            Database::connection()->prepare('DELETE FROM cart_items WHERE id=? AND cart_id=?')
                ->execute([(int) $params['id'], $cartId]);
        }
        Response::json(CartService::summary());
    }

    public function applyCoupon(Request $req): void
    {
        $code = strtoupper(trim((string) $req->input('code', '')));
        $cartId = CartService::currentCartId();
        $summary = CartService::summary();
        if ($code === '' || CartService::discountFor($code, $summary['subtotal']) <= 0) {
            Response::error('INVALID_COUPON', 'That code is not valid for this order', 422);
        }
        Database::connection()->prepare('UPDATE carts SET coupon_code=? WHERE id=?')->execute([$code, $cartId]);
        Response::json(CartService::summary());
    }

    public function removeCoupon(Request $req): void
    {
        $cartId = CartService::currentCartId(false);
        if ($cartId) {
            Database::connection()->prepare('UPDATE carts SET coupon_code=NULL WHERE id=?')->execute([$cartId]);
        }
        Response::json(CartService::summary());
    }
}
