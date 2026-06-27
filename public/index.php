<?php
declare(strict_types=1);

/**
 * Front controller for the Saffra Spices store.
 * - Serves the JSON API under /api/*
 * - Lets the PHP dev server serve static assets directly
 * - Falls back to serving the matching storefront HTML page (clean URLs)
 */

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Support\Env;

$root = dirname(__DIR__);
require $root . '/app/Support/Env.php';
require $root . '/app/Support/autoload.php';

Env::load($root . '/.env');
Env::load($root . '/.env.example'); // sensible defaults if .env is absent

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Let the built-in server handle real static files (assets, html).
if (php_sapi_name() === 'cli-server' && $path !== '/' && is_file(__DIR__ . $path)) {
    return false;
}

// --- API requests ---
if (str_starts_with($path, '/api')) {
    error_reporting(E_ALL);
    ini_set('display_errors', Env::bool('APP_DEBUG', false) ? '1' : '0');

    // Auto-create + seed the SQLite database on first run (demo convenience).
    if (Database::driver() === 'sqlite' && !is_file(Database::sqlitePath())) {
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
];

// Dynamic clean URLs
if (preg_match('#^/product/[^/]+$#', $path)) {
    readfile(__DIR__ . '/product.html');
    return;
}
if (preg_match('#^/shop/[^/]+$#', $path)) {
    readfile(__DIR__ . '/collection.html');
    return;
}

$page = $routesToPages[$path] ?? null;
if ($page && is_file(__DIR__ . '/' . $page)) {
    readfile(__DIR__ . '/' . $page);
    return;
}

http_response_code(404);
if (is_file(__DIR__ . '/404.html')) {
    readfile(__DIR__ . '/404.html');
} else {
    echo '404 — Page not found';
}
