<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use PDO;

final class CatalogController
{
    public function categories(Request $req): void
    {
        $rows = Database::connection()
            ->query('SELECT id,name,slug,description,emoji,accent_color FROM categories WHERE is_active=1 ORDER BY sort_order')
            ->fetchAll();
        Response::json($rows);
    }

    public function products(Request $req): void
    {
        $pdo = Database::connection();
        $where = ['p.is_active = 1'];
        $params = [];

        if ($cat = $req->query('category')) {
            $where[] = 'c.slug = :cat';
            $params[':cat'] = $cat;
        }
        if ($q = $req->query('q')) {
            $where[] = '(p.name LIKE :q OR p.short_description LIKE :q OR p.description LIKE :q)';
            $params[':q'] = '%' . $q . '%';
        }
        if ($req->query('organic') === '1') {
            $where[] = 'p.is_organic = 1';
        }
        if ($form = $req->query('form')) {
            $where[] = 'p.form = :form';
            $params[':form'] = $form;
        }
        if ($req->query('featured') === '1') {
            $where[] = 'p.is_featured = 1';
        }
        if ($req->query('bestseller') === '1') {
            $where[] = 'p.is_bestseller = 1';
        }

        $sort = match ($req->query('sort')) {
            'price_asc' => 'min_price ASC',
            'price_desc' => 'min_price DESC',
            'rating' => 'p.rating_avg DESC',
            'newest' => 'p.id DESC',
            default => 'p.is_bestseller DESC, p.rating_count DESC',
        };

        $page = max(1, (int) $req->query('page', 1));
        $perPage = min(48, max(1, (int) $req->query('per_page', 12)));
        $offset = ($page - 1) * $perPage;

        $whereSql = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) FROM products p JOIN categories c ON c.id=p.category_id WHERE $whereSql";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT p.id,p.name,p.slug,p.brand,p.short_description,p.is_organic,p.form,
                       p.emoji,p.accent_color,p.badge,p.rating_avg,p.rating_count,
                       c.name AS category_name, c.slug AS category_slug,
                       (SELECT MIN(price) FROM product_variants v WHERE v.product_id=p.id) AS min_price,
                       (SELECT MAX(compare_at_price) FROM product_variants v WHERE v.product_id=p.id) AS max_compare,
                       (SELECT SUM(stock_qty) FROM product_variants v WHERE v.product_id=p.id) AS total_stock,
                       (SELECT path FROM product_images pi WHERE pi.product_id=p.id AND pi.path LIKE 'uploads/%' ORDER BY pi.is_primary DESC, pi.sort_order, pi.id LIMIT 1) AS image
                FROM products p JOIN categories c ON c.id=p.category_id
                WHERE $whereSql ORDER BY $sort LIMIT $perPage OFFSET $offset";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Response::json(array_map([$this, 'shapeCard'], $rows), 200, [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'pages' => (int) ceil($total / $perPage),
        ]);
    }

    public function show(Request $req, array $params): void
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT p.*, c.name AS category_name, c.slug AS category_slug
                               FROM products p JOIN categories c ON c.id=p.category_id
                               WHERE p.slug = ? AND p.is_active = 1');
        $stmt->execute([$params['slug']]);
        $product = $stmt->fetch();
        if (!$product) {
            Response::error('NOT_FOUND', 'Product not found', 404);
        }

        $variants = $pdo->prepare('SELECT id,sku,name,weight_grams,price,compare_at_price,stock_qty FROM product_variants WHERE product_id=? AND is_active=1 ORDER BY price');
        $variants->execute([$product['id']]);

        $images = $pdo->prepare("SELECT path,alt_text,is_primary FROM product_images WHERE product_id=? AND path LIKE 'uploads/%' ORDER BY is_primary DESC, sort_order, id");
        $images->execute([$product['id']]);

        $reviews = $pdo->prepare('SELECT author_name,rating,title,body,created_at FROM reviews WHERE product_id=? AND is_approved=1 ORDER BY id DESC');
        $reviews->execute([$product['id']]);

        $product['variants'] = $variants->fetchAll();
        $product['images'] = $images->fetchAll();
        $product['image'] = $product['images'][0]['path'] ?? null;
        $product['reviews'] = $reviews->fetchAll();
        $product['is_organic'] = (bool) $product['is_organic'];

        Response::json($product);
    }

    public function related(Request $req, array $params): void
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT category_id FROM products WHERE slug=?');
        $stmt->execute([$params['slug']]);
        $catId = $stmt->fetchColumn();
        if ($catId === false) {
            Response::json([]);
        }
        $rel = $pdo->prepare("SELECT p.id,p.name,p.slug,p.brand,p.short_description,p.is_organic,p.form,
                       p.emoji,p.accent_color,p.badge,p.rating_avg,p.rating_count,
                       (SELECT MIN(price) FROM product_variants v WHERE v.product_id=p.id) AS min_price,
                       (SELECT MAX(compare_at_price) FROM product_variants v WHERE v.product_id=p.id) AS max_compare,
                       (SELECT SUM(stock_qty) FROM product_variants v WHERE v.product_id=p.id) AS total_stock,
                       (SELECT path FROM product_images pi WHERE pi.product_id=p.id AND pi.path LIKE 'uploads/%' ORDER BY pi.is_primary DESC, pi.sort_order, pi.id LIMIT 1) AS image
                FROM products p WHERE p.category_id=? AND p.slug<>? AND p.is_active=1
                ORDER BY p.rating_count DESC LIMIT 4");
        $rel->execute([$catId, $params['slug']]);
        Response::json(array_map([$this, 'shapeCard'], $rel->fetchAll()));
    }

    private function shapeCard(array $r): array
    {
        $r['is_organic'] = (bool) $r['is_organic'];
        $r['min_price'] = $r['min_price'] !== null ? (float) $r['min_price'] : null;
        $r['max_compare'] = $r['max_compare'] !== null ? (float) $r['max_compare'] : null;
        $r['rating_avg'] = (float) $r['rating_avg'];
        $r['on_sale'] = $r['max_compare'] !== null && $r['max_compare'] > $r['min_price'];
        $r['in_stock'] = (int) ($r['total_stock'] ?? 0) > 0;
        return $r;
    }
}
