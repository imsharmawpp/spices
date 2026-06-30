<?php
declare(strict_types=1);

namespace App\Support;

use App\Core\Database;

/**
 * Server-side SEO meta injection for the (otherwise JS-rendered) storefront.
 * Produces per-page <title>, description, canonical, Open Graph, Twitter and
 * schema.org JSON-LD so search engines and social previews work properly.
 * Prices in structured data use the store base currency (INR).
 */
final class Seo
{
    public static function baseUrl(): string
    {
        $env = Env::get('APP_URL', '');
        // Ignore a localhost APP_URL when actually served from a real host.
        if ($env && !str_contains($env, 'localhost') && !str_contains($env, '127.0.0.1')) {
            return rtrim($env, '/');
        }
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') == 443);
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        return ($https ? 'https' : 'http') . '://' . $host;
    }

    /** Build the <head> SEO block for the given path. */
    public static function head(string $path): string
    {
        $store = 'Saffra Spices';
        $base = self::baseUrl();
        $url = $base . $path;
        $title = $store . ' — Single-Origin Spices, Stone-Milled Fresh';
        $desc = 'Single-origin, stone-milled spices and small-batch blends, ground fresh to order and shipped from India. Certified organic options, no fillers.';
        $image = $base . '/assets/og-default.svg';
        $jsonld = [];

        try {
            if (preg_match('#^/product/([^/]+)$#', $path, $m)) {
                [$title, $desc, $image, $jsonld] = self::product($m[1], $base, $store) ?? [$title, $desc, $image, $jsonld];
            } elseif (preg_match('#^/shop/([^/]+)$#', $path, $m)) {
                [$title, $desc, $jsonld] = self::category($m[1], $base, $store) ?? [$title, $desc, $jsonld];
            } elseif ($path === '/shop') {
                $title = 'Shop All Spices · ' . $store;
                $desc = 'Browse single-origin whole spices, stone-ground powders, house blends, gift sets and certified-organic spices.';
            } elseif ($path === '/about') {
                $title = 'Our Story · ' . $store;
                $desc = 'How we source single-origin spices, stone-mill them fresh, support farming families and give back — genuine organic spices, made in India.';
            } elseif ($path === '/contact') {
                $title = 'Contact · ' . $store;
                $desc = 'Questions about an order, a spice or a recipe? Get in touch with the Saffra team.';
            }
        } catch (\Throwable $e) {
            // fall back to defaults
        }

        // Organisation / WebSite JSON-LD on the home page.
        if ($path === '/') {
            $jsonld[] = [
                '@context' => 'https://schema.org', '@type' => 'Organization',
                'name' => $store, 'url' => $base, 'logo' => $image,
                'sameAs' => [],
            ];
        }

        $e = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
        $out = "<title>{$e($title)}</title>\n";
        $out .= "  <meta name=\"description\" content=\"{$e($desc)}\">\n";
        $out .= "  <link rel=\"canonical\" href=\"{$e($url)}\">\n";
        $out .= "  <meta property=\"og:type\" content=\"website\">\n";
        $out .= "  <meta property=\"og:site_name\" content=\"{$e($store)}\">\n";
        $out .= "  <meta property=\"og:title\" content=\"{$e($title)}\">\n";
        $out .= "  <meta property=\"og:description\" content=\"{$e($desc)}\">\n";
        $out .= "  <meta property=\"og:url\" content=\"{$e($url)}\">\n";
        $out .= "  <meta property=\"og:image\" content=\"{$e($image)}\">\n";
        $out .= "  <meta name=\"twitter:card\" content=\"summary_large_image\">\n";
        $out .= "  <meta name=\"twitter:title\" content=\"{$e($title)}\">\n";
        $out .= "  <meta name=\"twitter:description\" content=\"{$e($desc)}\">\n";
        $out .= "  <meta name=\"twitter:image\" content=\"{$e($image)}\">";
        foreach ($jsonld as $block) {
            $out .= "\n  <script type=\"application/ld+json\">" . json_encode($block, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "</script>";
        }
        return $out;
    }

    private static function product(string $slug, string $base, string $store): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT p.id,p.name,p.slug,p.short_description,p.description,p.brand,p.rating_avg,p.rating_count,c.name AS category_name
                               FROM products p JOIN categories c ON c.id=p.category_id WHERE p.slug=? AND p.is_active=1');
        $stmt->execute([$slug]);
        $p = $stmt->fetch();
        if (!$p) {
            return null;
        }
        $price = $pdo->prepare('SELECT MIN(price) FROM product_variants WHERE product_id=? AND is_active=1');
        $price->execute([$p['id']]);
        $min = (float) $price->fetchColumn();

        $img = $pdo->prepare("SELECT path FROM product_images WHERE product_id=? AND path LIKE 'uploads/%' ORDER BY is_primary DESC, sort_order, id LIMIT 1");
        $img->execute([$p['id']]);
        $imgPath = $img->fetchColumn();
        $image = $imgPath ? $base . '/' . ltrim((string) $imgPath, '/') : $base . '/assets/og-default.svg';

        $title = $p['name'] . ' · ' . $store;
        $desc = $p['short_description'] ?: mb_substr((string) $p['description'], 0, 155);

        $offer = [
            '@type' => 'Offer', 'priceCurrency' => 'INR', 'price' => number_format($min, 2, '.', ''),
            'availability' => 'https://schema.org/InStock', 'url' => $base . '/product/' . $p['slug'],
        ];
        $product = [
            '@context' => 'https://schema.org', '@type' => 'Product',
            'name' => $p['name'], 'description' => $desc,
            'brand' => ['@type' => 'Brand', 'name' => $p['brand'] ?: $store],
            'category' => $p['category_name'], 'image' => $image, 'offers' => $offer,
        ];
        if ((int) $p['rating_count'] > 0) {
            $product['aggregateRating'] = [
                '@type' => 'AggregateRating',
                'ratingValue' => (string) $p['rating_avg'], 'reviewCount' => (int) $p['rating_count'],
            ];
        }
        $crumbs = self::breadcrumbs($base, [
            ['Home', '/'], [$p['category_name'], '/shop'], [$p['name'], '/product/' . $p['slug']],
        ]);
        return [$title, $desc, $image, [$product, $crumbs]];
    }

    private static function category(string $slug, string $base, string $store): ?array
    {
        $stmt = Database::connection()->prepare('SELECT name,description FROM categories WHERE slug=? AND is_active=1');
        $stmt->execute([$slug]);
        $c = $stmt->fetch();
        if (!$c) {
            return null;
        }
        $title = $c['name'] . ' · ' . $store;
        $desc = $c['description'] ?: ('Shop ' . $c['name'] . ' at ' . $store . '.');
        $crumbs = self::breadcrumbs($base, [['Home', '/'], ['Shop', '/shop'], [$c['name'], '/shop/' . $slug]]);
        return [$title, $desc, [$crumbs]];
    }

    private static function breadcrumbs(string $base, array $items): array
    {
        $list = [];
        foreach ($items as $i => [$name, $path]) {
            $list[] = ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $name, 'item' => $base . $path];
        }
        return ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => $list];
    }

    /** Dynamic sitemap.xml content. */
    public static function sitemap(): string
    {
        $base = self::baseUrl();
        $urls = ['/', '/shop', '/about', '/contact'];
        try {
            $pdo = Database::connection();
            foreach ($pdo->query('SELECT slug FROM categories WHERE is_active=1')->fetchAll() as $r) {
                $urls[] = '/shop/' . $r['slug'];
            }
            foreach ($pdo->query('SELECT slug FROM products WHERE is_active=1')->fetchAll() as $r) {
                $urls[] = '/product/' . $r['slug'];
            }
        } catch (\Throwable $e) {
        }
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($urls as $u) {
            $xml .= '  <url><loc>' . htmlspecialchars($base . $u, ENT_QUOTES) . '</loc></url>' . "\n";
        }
        $xml .= '</urlset>';
        return $xml;
    }
}
