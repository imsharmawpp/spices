<?php
declare(strict_types=1);

/**
 * Front controller for the Saffra Spices store.
 * - Serves the JSON API under /api/*
 * - On Apache shared hosting (e.g. Hostinger WordPress plan), .htaccess rewrites
 *   all non-file requests here; static files are served directly by Apache.
 * - On the PHP dev server, it also passes through real static files.
 * - Falls back to serving the matching storefront HTML page (clean URLs).
 */

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Support\Env;

// The project root is the web root (this file lives at the top level so the
// frontend serves directly from public_html). Backend folders sit alongside and
// are protected by their own .htaccess deny rules.
$root = __DIR__;
require $root . '/app/Support/Env.php';
require $root . '/app/Support/autoload.php';

Env::load($root . '/.env');
Env::load($root . '/.env.example'); // sensible defaults if .env is absent

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Optional sub-folder support: set APP_BASE=/your-subfolder in .env.
// (Recommended deployment is a domain or sub-domain root, where APP_BASE is empty.)
$base = rtrim((string) Env::get('APP_BASE', ''), '/');
if ($base !== '' && str_starts_with($path, $base)) {
    $path = substr($path, strlen($base)) ?: '/';
}

// On the PHP dev server: serve real static files directly, but never expose
// backend code, the database, storage or dotfiles (Apache uses .htaccess for this).
if (php_sapi_name() === 'cli-server') {
    if (preg_match('#^/(app|database|storage|docs)(/|$)#', $path) || preg_match('#(^|/)\.#', $path)) {
        http_response_code(403);
        echo 'Forbidden';
        return true;
    }
    if ($path !== '/' && is_file(__DIR__ . $path)) {
        return false;
    }
}

// --- API requests ---
if (str_starts_with($path, '/api')) {
    error_reporting(E_ALL);
    ini_set('display_errors', Env::bool('APP_DEBUG', false) ? '1' : '0');

    // Auto-create + seed the database on first run (demo convenience).
    // Check existence BEFORE connecting (connecting would create the SQLite file).
    $needsSeed = (Database::configuredDriver() === 'sqlite' || Env::bool('DB_FALLBACK_SQLITE', false))
        && !is_file(Database::sqlitePath());
    if ($needsSeed && Database::driver() === 'sqlite') {
        ob_start();
        require $root . '/database/migrate.php';
        ob_end_clean();
    }

    session_start();

    header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    try {
        $router = new Router();
        require $root . '/app/routes.php';
        $router->dispatch(new Request());
    } catch (\Throwable $e) {
        if (Env::bool('APP_DEBUG', false)) {
            Response::error('SERVER_ERROR', $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine(), 500);
        }
        Response::error('SERVER_ERROR', 'Something went wrong', 500);
    }
    exit;
}

// Reusable DB bootstrap (auto-seeds SQLite on first run, mirrors the API path).
$ensureDb = function () use ($root) {
    $need = (Database::configuredDriver() === 'sqlite' || Env::bool('DB_FALLBACK_SQLITE', false))
        && !is_file(Database::sqlitePath());
    if ($need && Database::driver() === 'sqlite') {
        ob_start();
        require $root . '/database/migrate.php';
        ob_end_clean();
    }
};

// --- Dynamic sitemap ---
if ($path === '/sitemap.xml') {
    $ensureDb();
    header('Content-Type: application/xml; charset=utf-8');
    echo \App\Support\Seo::sitemap();
    return;
}

// --- Security headers for HTML responses ---
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

// --- Storefront pages (clean URLs) ---
$routesToPages = [
    '/' => 'index.html',
    '/shop' => 'collection.html',
    '/cart' => 'cart.html',
    '/checkout' => 'checkout.html',
    '/account' => 'account.html',
    '/about' => 'about.html',
    '/contact' => 'contact.html',
    '/order' => 'order.html',
    '/admin' => 'admin.html',
];

// Serve an HTML page, injecting server-side SEO meta where a <!--SEO--> marker exists.
$serve = function (string $file) use ($path, $ensureDb): void {
    $html = file_get_contents($file);
    if ($html !== false && strpos($html, '<!--SEO-->') !== false) {
        $ensureDb();
        $seo = '';
        try { $seo = \App\Support\Seo::head($path); } catch (\Throwable $e) { $seo = ''; }
        $html = str_replace('<!--SEO-->', $seo, $html);
    }
    echo $html;
};

// Dynamic clean URLs
if (preg_match('#^/product/[^/]+$#', $path)) {
    $serve(__DIR__ . '/product.html');
    return;
}
if (preg_match('#^/shop/[^/]+$#', $path)) {
    $serve(__DIR__ . '/collection.html');
    return;
}

$page = $routesToPages[$path] ?? null;
if ($page && is_file(__DIR__ . '/' . $page)) {
    $serve(__DIR__ . '/' . $page);
    return;
}

http_response_code(404);
if (is_file(__DIR__ . '/404.html')) {
    readfile(__DIR__ . '/404.html');
} else {
    echo '404 — Page not found';
}
