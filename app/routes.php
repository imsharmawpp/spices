<?php
declare(strict_types=1);

use App\Core\Router;
use App\Controllers\CatalogController;
use App\Controllers\CartController;
use App\Controllers\AuthController;
use App\Controllers\CheckoutController;
use App\Controllers\MiscController;

/** @var Router $router */

$catalog = new CatalogController();
$cart = new CartController();
$auth = new AuthController();
$checkout = new CheckoutController();
$misc = new MiscController();

// Storefront — catalog
$router->get('/api/settings', [$misc, 'settings']);
$router->get('/api/categories', [$catalog, 'categories']);
$router->get('/api/products', [$catalog, 'products']);
$router->get('/api/products/{slug}/related', [$catalog, 'related']);
$router->get('/api/products/{slug}', [$catalog, 'show']);
$router->get('/api/search', [$catalog, 'products']);

// Cart
$router->get('/api/cart', [$cart, 'show']);
$router->post('/api/cart/items', [$cart, 'addItem']);
$router->patch('/api/cart/items/{id}', [$cart, 'updateItem']);
$router->delete('/api/cart/items/{id}', [$cart, 'removeItem']);
$router->post('/api/cart/coupon', [$cart, 'applyCoupon']);
$router->delete('/api/cart/coupon', [$cart, 'removeCoupon']);

// Auth & account
$router->post('/api/auth/register', [$auth, 'register']);
$router->post('/api/auth/login', [$auth, 'login']);
$router->post('/api/auth/logout', [$auth, 'logout']);
$router->get('/api/auth/me', [$auth, 'me']);
$router->get('/api/account/orders', [$checkout, 'myOrders']);

// Checkout & orders
$router->post('/api/checkout/quote', [$checkout, 'quote']);
$router->post('/api/orders', [$checkout, 'placeOrder']);
$router->get('/api/orders/{order_number}', [$checkout, 'showOrder']);

// Content
$router->post('/api/newsletter', [$misc, 'newsletter']);
$router->post('/api/contact', [$misc, 'contact']);
