<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Support\Str;
use PDO;

/**
 * Admin / CMS API. Every method is reached through a Guard::admin() wrapper
 * (see app/routes.php), so by the time we get here the caller is a verified admin
 * with a valid CSRF token for writes. See docs/05-api-spec.md §3.
 */
final class AdminController
{
    private function db(): PDO { return Database::connection(); }

    /* ---------------- Dashboard ---------------- */
    public function dashboard(Request $req): void
    {
        $pdo = $this->db();
        $paidStatuses = "('paid','packed','shipped','delivered')";

        $revenue = (float) $pdo->query("SELECT COALESCE(SUM(grand_total),0) FROM orders WHERE status IN $paidStatuses")->fetchColumn();
        $orderCount = (int) $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
        $productCount = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
        $customerCount = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role='customer'")->fetchColumn();
        $pendingCount = (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE status='pending'")->fetchColumn();
        $pendingReviews = (int) $pdo->query('SELECT COUNT(*) FROM reviews WHERE is_approved=0')->fetchColumn();

        $recent = $pdo->query('SELECT order_number,email,status,grand_total,placed_at FROM orders ORDER BY id DESC LIMIT 6')->fetchAll();

        $lowStock = $pdo->query("SELECT v.sku, v.name AS variant, v.stock_qty, p.name AS product
                                 FROM product_variants v JOIN products p ON p.id=v.product_id
                                 WHERE v.stock_qty < 20 ORDER BY v.stock_qty ASC LIMIT 8")->fetchAll();

        $topProducts = $pdo->query('SELECT product_name, SUM(quantity) AS qty, SUM(line_total) AS revenue
                                    FROM order_items GROUP BY product_name ORDER BY qty DESC LIMIT 6')->fetchAll();

        Response::json([
            'revenue' => round($revenue, 2),
            'orders' => $orderCount,
            'pending_orders' => $pendingCount,
            'products' => $productCount,
            'customers' => $customerCount,
            'pending_reviews' => $pendingReviews,
            'recent_orders' => $recent,
            'low_stock' => $lowStock,
            'top_products' => $topProducts,
        ]);
    }

    /* ---------------- Products ---------------- */
    public function listProducts(Request $req): void
    {
        $pdo = $this->db();
        $where = '1=1';
        $params = [];
        if ($q = $req->query('q')) { $where .= ' AND p.name LIKE ?'; $params[] = '%' . $q . '%'; }
        if ($cat = $req->query('category')) { $where .= ' AND c.slug = ?'; $params[] = $cat; }

        $page = max(1, (int) $req->query('page', 1));
        $per = min(50, max(1, (int) $req->query('per_page', 20)));
        $offset = ($page - 1) * $per;

        $count = $pdo->prepare("SELECT COUNT(*) FROM products p JOIN categories c ON c.id=p.category_id WHERE $where");
        $count->execute($params);
        $total = (int) $count->fetchColumn();

        $sql = "SELECT p.id,p.name,p.slug,p.brand,p.form,p.accent_color,p.badge,p.is_active,p.is_featured,p.is_bestseller,p.is_organic,
                       c.name AS category_name, c.slug AS category_slug,
                       (SELECT MIN(price) FROM product_variants v WHERE v.product_id=p.id) AS min_price,
                       (SELECT COALESCE(SUM(stock_qty),0) FROM product_variants v WHERE v.product_id=p.id) AS stock,
                       (SELECT COUNT(*) FROM product_variants v WHERE v.product_id=p.id) AS variant_count
                FROM products p JOIN categories c ON c.id=p.category_id
                WHERE $where ORDER BY p.id DESC LIMIT $per OFFSET $offset";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        Response::json($stmt->fetchAll(), 200, ['page' => $page, 'per_page' => $per, 'total' => $total, 'pages' => (int) ceil($total / $per)]);
    }

    public function getProduct(Request $req, array $p): void
    {
        $pdo = $this->db();
        $stmt = $pdo->prepare('SELECT * FROM products WHERE id=?');
        $stmt->execute([(int) $p['id']]);
        $product = $stmt->fetch();
        if (!$product) Response::error('NOT_FOUND', 'Product not found', 404);

        $v = $pdo->prepare('SELECT * FROM product_variants WHERE product_id=? ORDER BY id');
        $v->execute([$product['id']]);
        $product['variants'] = $v->fetchAll();
        Response::json($product);
    }

    public function createProduct(Request $req): void
    {
        $b = $req->body();
        $errors = [];
        if (empty($b['name'])) $errors['name'] = 'Name is required';
        if (empty($b['category_id'])) $errors['category_id'] = 'Category is required';
        if ($errors) Response::error('VALIDATION_ERROR', 'Please check the form', 422, $errors);

        $pdo = $this->db();
        $slug = $this->uniqueSlug('products', Str::slug($b['slug'] ?? $b['name']));
        $pdo->prepare('INSERT INTO products
            (category_id,name,slug,brand,short_description,description,origin,usage_tips,is_organic,form,accent_color,badge,is_active,is_featured,is_bestseller)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([
                (int) $b['category_id'], $b['name'], $slug, $b['brand'] ?? 'Saffra',
                $b['short_description'] ?? null, $b['description'] ?? null, $b['origin'] ?? null, $b['usage_tips'] ?? null,
                !empty($b['is_organic']) ? 1 : 0, $b['form'] ?? 'ground', $b['accent_color'] ?? '#C8531B', $b['badge'] ?? null,
                isset($b['is_active']) ? (int) (bool) $b['is_active'] : 1, !empty($b['is_featured']) ? 1 : 0, !empty($b['is_bestseller']) ? 1 : 0,
            ]);
        $id = (int) $pdo->lastInsertId();
        $pdo->prepare("INSERT INTO product_images (product_id,path,alt_text,is_primary) VALUES (?,?,?,1)")
            ->execute([$id, 'tile', $b['name']]);
        Response::json(['id' => $id, 'slug' => $slug], 201);
    }

    public function updateProduct(Request $req, array $p): void
    {
        $pdo = $this->db();
        $id = (int) $p['id'];
        $exists = $pdo->prepare('SELECT id FROM products WHERE id=?');
        $exists->execute([$id]);
        if (!$exists->fetchColumn()) Response::error('NOT_FOUND', 'Product not found', 404);

        $b = $req->body();
        $fields = [
            'category_id' => fn($v) => (int) $v, 'name' => null, 'brand' => null,
            'short_description' => null, 'description' => null, 'origin' => null, 'usage_tips' => null,
            'form' => null, 'accent_color' => null, 'badge' => null,
            'is_organic' => fn($v) => (int) (bool) $v, 'is_active' => fn($v) => (int) (bool) $v,
            'is_featured' => fn($v) => (int) (bool) $v, 'is_bestseller' => fn($v) => (int) (bool) $v,
        ];
        $set = [];
        $vals = [];
        foreach ($fields as $col => $cast) {
            if (array_key_exists($col, $b)) {
                $set[] = "$col = ?";
                $vals[] = $cast ? $cast($b[$col]) : $b[$col];
            }
        }
        if (!empty($b['name']) && !empty($b['regenerate_slug'])) {
            $set[] = 'slug = ?';
            $vals[] = $this->uniqueSlug('products', Str::slug($b['name']), $id);
        }
        if (!$set) Response::error('VALIDATION_ERROR', 'Nothing to update', 422);
        $vals[] = $id;
        $pdo->prepare('UPDATE products SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($vals);
        Response::json(['ok' => true]);
    }

    public function deleteProduct(Request $req, array $p): void
    {
        $this->db()->prepare('DELETE FROM products WHERE id=?')->execute([(int) $p['id']]);
        Response::json(['ok' => true]);
    }

    /* ---------------- Variants ---------------- */
    public function createVariant(Request $req, array $p): void
    {
        $b = $req->body();
        $errors = [];
        if (empty($b['name'])) $errors['name'] = 'Size/name is required';
        if (!isset($b['price'])) $errors['price'] = 'Price is required';
        if ($errors) Response::error('VALIDATION_ERROR', 'Please check the form', 422, $errors);

        $pdo = $this->db();
        $sku = $b['sku'] ?? (strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $b['name'] . 'SKU'), 0, 4)) . '-' . random_int(100, 999));
        try {
            $pdo->prepare('INSERT INTO product_variants (product_id,sku,name,weight_grams,price,compare_at_price,stock_qty,is_active) VALUES (?,?,?,?,?,?,?,?)')
                ->execute([
                    (int) $p['id'], $sku, $b['name'], isset($b['weight_grams']) ? (int) $b['weight_grams'] : null,
                    (float) $b['price'], isset($b['compare_at_price']) && $b['compare_at_price'] !== '' ? (float) $b['compare_at_price'] : null,
                    (int) ($b['stock_qty'] ?? 0), isset($b['is_active']) ? (int) (bool) $b['is_active'] : 1,
                ]);
        } catch (\PDOException $e) {
            Response::error('SKU_TAKEN', 'That SKU already exists', 409);
        }
        Response::json(['id' => (int) $pdo->lastInsertId()], 201);
    }

    public function updateVariant(Request $req, array $p): void
    {
        $pdo = $this->db();
        $b = $req->body();
        $fields = ['name' => null, 'weight_grams' => fn($v) => $v === '' ? null : (int) $v, 'price' => fn($v) => (float) $v,
            'compare_at_price' => fn($v) => $v === '' || $v === null ? null : (float) $v, 'stock_qty' => fn($v) => (int) $v, 'is_active' => fn($v) => (int) (bool) $v];
        $set = []; $vals = [];
        foreach ($fields as $col => $cast) {
            if (array_key_exists($col, $b)) { $set[] = "$col = ?"; $vals[] = $cast ? $cast($b[$col]) : $b[$col]; }
        }
        if (!$set) Response::error('VALIDATION_ERROR', 'Nothing to update', 422);
        $vals[] = (int) $p['id'];
        $pdo->prepare('UPDATE product_variants SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($vals);
        Response::json(['ok' => true]);
    }

    public function deleteVariant(Request $req, array $p): void
    {
        $this->db()->prepare('DELETE FROM product_variants WHERE id=?')->execute([(int) $p['id']]);
        Response::json(['ok' => true]);
    }

    /* ---------------- Categories ---------------- */
    public function listCategories(Request $req): void
    {
        $rows = $this->db()->query('SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) AS product_count FROM categories c ORDER BY sort_order, name')->fetchAll();
        Response::json($rows);
    }

    public function createCategory(Request $req): void
    {
        $b = $req->body();
        if (empty($b['name'])) Response::error('VALIDATION_ERROR', 'Name is required', 422, ['name' => 'Name is required']);
        $pdo = $this->db();
        $slug = $this->uniqueSlug('categories', Str::slug($b['slug'] ?? $b['name']));
        $pdo->prepare('INSERT INTO categories (name,slug,description,accent_color,sort_order,is_active) VALUES (?,?,?,?,?,?)')
            ->execute([$b['name'], $slug, $b['description'] ?? null, $b['accent_color'] ?? '#C8531B', (int) ($b['sort_order'] ?? 0), isset($b['is_active']) ? (int) (bool) $b['is_active'] : 1]);
        Response::json(['id' => (int) $pdo->lastInsertId(), 'slug' => $slug], 201);
    }

    public function updateCategory(Request $req, array $p): void
    {
        $pdo = $this->db();
        $b = $req->body();
        $fields = ['name' => null, 'description' => null, 'accent_color' => null, 'sort_order' => fn($v) => (int) $v, 'is_active' => fn($v) => (int) (bool) $v];
        $set = []; $vals = [];
        foreach ($fields as $col => $cast) {
            if (array_key_exists($col, $b)) { $set[] = "$col = ?"; $vals[] = $cast ? $cast($b[$col]) : $b[$col]; }
        }
        if (!$set) Response::error('VALIDATION_ERROR', 'Nothing to update', 422);
        $vals[] = (int) $p['id'];
        $pdo->prepare('UPDATE categories SET ' . implode(', ', $set) . ' WHERE id=?')->execute($vals);
        Response::json(['ok' => true]);
    }

    public function deleteCategory(Request $req, array $p): void
    {
        $pdo = $this->db();
        $id = (int) $p['id'];
        $inUse = $pdo->prepare('SELECT COUNT(*) FROM products WHERE category_id=?');
        $inUse->execute([$id]);
        if ((int) $inUse->fetchColumn() > 0) {
            Response::error('CATEGORY_IN_USE', 'Move or delete its products first', 409);
        }
        $pdo->prepare('DELETE FROM categories WHERE id=?')->execute([$id]);
        Response::json(['ok' => true]);
    }

    /* ---------------- Orders ---------------- */
    public function listOrders(Request $req): void
    {
        $pdo = $this->db();
        $where = '1=1'; $params = [];
        if ($s = $req->query('status')) { $where .= ' AND status = ?'; $params[] = $s; }
        if ($q = $req->query('q')) { $where .= ' AND (order_number LIKE ? OR email LIKE ?)'; $params[] = "%$q%"; $params[] = "%$q%"; }
        $page = max(1, (int) $req->query('page', 1));
        $per = min(50, max(1, (int) $req->query('per_page', 20)));
        $offset = ($page - 1) * $per;

        $count = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE $where");
        $count->execute($params);
        $total = (int) $count->fetchColumn();

        $stmt = $pdo->prepare("SELECT order_number,email,status,subtotal,discount_total,shipping_total,tax_total,grand_total,payment_method,placed_at
                               FROM orders WHERE $where ORDER BY id DESC LIMIT $per OFFSET $offset");
        $stmt->execute($params);
        Response::json($stmt->fetchAll(), 200, ['page' => $page, 'per_page' => $per, 'total' => $total, 'pages' => (int) ceil($total / $per)]);
    }

    public function getOrder(Request $req, array $p): void
    {
        $pdo = $this->db();
        $stmt = $pdo->prepare('SELECT * FROM orders WHERE order_number=?');
        $stmt->execute([$p['order_number']]);
        $order = $stmt->fetch();
        if (!$order) Response::error('NOT_FOUND', 'Order not found', 404);

        $items = $pdo->prepare('SELECT product_name,variant_name,sku,unit_price,quantity,line_total FROM order_items WHERE order_id=?');
        $items->execute([$order['id']]);
        $order['items'] = $items->fetchAll();
        $order['shipping_address'] = json_decode($order['shipping_address_json'] ?? '{}', true);

        $hist = $pdo->prepare('SELECT from_status,to_status,note,created_at FROM order_status_history WHERE order_id=? ORDER BY id');
        $hist->execute([$order['id']]);
        $order['history'] = $hist->fetchAll();
        unset($order['shipping_address_json']);
        Response::json($order);
    }

    public function updateOrderStatus(Request $req, array $p): void
    {
        $pdo = $this->db();
        $b = $req->body();
        $status = $b['status'] ?? '';
        $allowed = ['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];
        if (!in_array($status, $allowed, true)) {
            Response::error('VALIDATION_ERROR', 'Invalid status', 422, ['status' => 'Choose a valid status']);
        }
        $stmt = $pdo->prepare('SELECT id,status FROM orders WHERE order_number=?');
        $stmt->execute([$p['order_number']]);
        $order = $stmt->fetch();
        if (!$order) Response::error('NOT_FOUND', 'Order not found', 404);

        $tracking = $b['tracking_number'] ?? null;
        $pdo->prepare('UPDATE orders SET status=?, tracking_number=COALESCE(?,tracking_number) WHERE id=?')
            ->execute([$status, $tracking, $order['id']]);
        $pdo->prepare('INSERT INTO order_status_history (order_id,from_status,to_status,note) VALUES (?,?,?,?)')
            ->execute([$order['id'], $order['status'], $status, $b['note'] ?? null]);
        Response::json(['ok' => true]);
    }

    /* ---------------- Coupons ---------------- */
    public function listCoupons(Request $req): void
    {
        Response::json($this->db()->query('SELECT * FROM coupons ORDER BY id DESC')->fetchAll());
    }

    public function createCoupon(Request $req): void
    {
        $b = $req->body();
        $errors = [];
        $code = strtoupper(trim((string) ($b['code'] ?? '')));
        if ($code === '') $errors['code'] = 'Code is required';
        if (!in_array($b['type'] ?? '', ['percent', 'fixed'], true)) $errors['type'] = 'Type must be percent or fixed';
        if (!isset($b['value'])) $errors['value'] = 'Value is required';
        if ($errors) Response::error('VALIDATION_ERROR', 'Please check the form', 422, $errors);

        $pdo = $this->db();
        try {
            $pdo->prepare('INSERT INTO coupons (code,type,value,min_order_total,max_discount,is_active) VALUES (?,?,?,?,?,?)')
                ->execute([$code, $b['type'], (float) $b['value'],
                    isset($b['min_order_total']) && $b['min_order_total'] !== '' ? (float) $b['min_order_total'] : null,
                    isset($b['max_discount']) && $b['max_discount'] !== '' ? (float) $b['max_discount'] : null,
                    isset($b['is_active']) ? (int) (bool) $b['is_active'] : 1]);
        } catch (\PDOException $e) {
            Response::error('CODE_TAKEN', 'That coupon code already exists', 409);
        }
        Response::json(['id' => (int) $pdo->lastInsertId()], 201);
    }

    public function updateCoupon(Request $req, array $p): void
    {
        $pdo = $this->db();
        $b = $req->body();
        $fields = ['type' => null, 'value' => fn($v) => (float) $v,
            'min_order_total' => fn($v) => $v === '' || $v === null ? null : (float) $v,
            'max_discount' => fn($v) => $v === '' || $v === null ? null : (float) $v,
            'is_active' => fn($v) => (int) (bool) $v];
        $set = []; $vals = [];
        foreach ($fields as $col => $cast) {
            if (array_key_exists($col, $b)) { $set[] = "$col = ?"; $vals[] = $cast ? $cast($b[$col]) : $b[$col]; }
        }
        if (!$set) Response::error('VALIDATION_ERROR', 'Nothing to update', 422);
        $vals[] = (int) $p['id'];
        $pdo->prepare('UPDATE coupons SET ' . implode(', ', $set) . ' WHERE id=?')->execute($vals);
        Response::json(['ok' => true]);
    }

    public function deleteCoupon(Request $req, array $p): void
    {
        $this->db()->prepare('DELETE FROM coupons WHERE id=?')->execute([(int) $p['id']]);
        Response::json(['ok' => true]);
    }

    /* ---------------- Reviews ---------------- */
    public function listReviews(Request $req): void
    {
        $rows = $this->db()->query('SELECT r.*, p.name AS product_name, p.slug FROM reviews r JOIN products p ON p.id=r.product_id ORDER BY r.is_approved ASC, r.id DESC')->fetchAll();
        Response::json($rows);
    }

    public function approveReview(Request $req, array $p): void
    {
        $this->db()->prepare('UPDATE reviews SET is_approved=1 WHERE id=?')->execute([(int) $p['id']]);
        $this->recalcRating();
        Response::json(['ok' => true]);
    }

    public function deleteReview(Request $req, array $p): void
    {
        $this->db()->prepare('DELETE FROM reviews WHERE id=?')->execute([(int) $p['id']]);
        $this->recalcRating();
        Response::json(['ok' => true]);
    }

    /* ---------------- Customers ---------------- */
    public function listCustomers(Request $req): void
    {
        $rows = $this->db()->query("SELECT u.id,u.name,u.email,u.phone,u.status,u.created_at,
                                    (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) AS orders,
                                    (SELECT COALESCE(SUM(grand_total),0) FROM orders o WHERE o.user_id=u.id) AS spent
                                    FROM users u WHERE u.role='customer' ORDER BY u.id DESC")->fetchAll();
        Response::json($rows);
    }

    /* ---------------- Messages / subscribers ---------------- */
    public function listMessages(Request $req): void
    {
        Response::json($this->db()->query('SELECT * FROM contact_messages ORDER BY id DESC LIMIT 100')->fetchAll());
    }

    public function listSubscribers(Request $req): void
    {
        Response::json($this->db()->query('SELECT * FROM newsletter_subscribers ORDER BY id DESC LIMIT 200')->fetchAll());
    }

    /* ---------------- Settings ---------------- */
    public function getSettings(Request $req): void
    {
        $rows = $this->db()->query('SELECT `key`, value FROM settings')->fetchAll();
        $out = [];
        foreach ($rows as $r) $out[$r['key']] = $r['value'];
        Response::json($out);
    }

    public function updateSettings(Request $req): void
    {
        $pdo = $this->db();
        $b = $req->body();
        $allowed = ['store_name', 'announcement', 'free_shipping_threshold', 'flat_shipping', 'tax_rate'];
        foreach ($b as $k => $v) {
            if (!in_array($k, $allowed, true)) continue;
            $exists = $pdo->prepare('SELECT 1 FROM settings WHERE `key`=?');
            $exists->execute([$k]);
            if ($exists->fetchColumn()) {
                $pdo->prepare('UPDATE settings SET value=? WHERE `key`=?')->execute([(string) $v, $k]);
            } else {
                $pdo->prepare('INSERT INTO settings (`key`,value) VALUES (?,?)')->execute([$k, (string) $v]);
            }
        }
        Response::json(['ok' => true]);
    }

    /* ---------------- helpers ---------------- */
    private function uniqueSlug(string $table, string $base, int $ignoreId = 0): string
    {
        $base = $base !== '' ? $base : 'item';
        $pdo = $this->db();
        $slug = $base;
        $i = 1;
        while (true) {
            $stmt = $pdo->prepare("SELECT id FROM $table WHERE slug=? AND id<>?");
            $stmt->execute([$slug, $ignoreId]);
            if (!$stmt->fetchColumn()) return $slug;
            $slug = $base . '-' . (++$i);
        }
    }

    private function recalcRating(): void
    {
        $this->db()->exec('UPDATE products SET
            rating_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id=products.id AND r.is_approved=1),
            rating_avg = COALESCE((SELECT ROUND(AVG(rating),1) FROM reviews r WHERE r.product_id=products.id AND r.is_approved=1),0)');
    }
}
