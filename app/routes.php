<?php
declare(strict_types=1);

use App\Core\Router;
use App\Controllers\CatalogController;
use App\Controllers\CartController;
use App\Controllers\AuthController;
use App\Controllers\CheckoutController;
use App\Controllers\MiscController;
use App\Controllers\AdminController;
use App\Support\Guard;

/** @var Router $router */

$catalog = new CatalogController();
$cart = new CartController();
$auth = new AuthController();
$checkout = new CheckoutController();
$misc = new MiscController();

// Storefront — catalog
$router->get('/api/settings', [$misc, 'settings']);
$router->get('/api/currency', [$misc, 'currency']);
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

// ---------------- Admin / CMS (guarded) ----------------
$ac = new AdminController();
$admin = fn(callable $cb) => function (App\Core\Request $req, array $params = []) use ($cb) {
    Guard::admin($req);
    $cb($req, $params);
};

$router->get('/api/admin/dashboard', $admin([$ac, 'dashboard']));

$router->get('/api/admin/products', $admin([$ac, 'listProducts']));
$router->post('/api/admin/products', $admin([$ac, 'createProduct']));
$router->get('/api/admin/products/{id}', $admin([$ac, 'getProduct']));
$router->patch('/api/admin/products/{id}', $admin([$ac, 'updateProduct']));
$router->delete('/api/admin/products/{id}', $admin([$ac, 'deleteProduct']));
$router->post('/api/admin/products/{id}/variants', $admin([$ac, 'createVariant']));
$router->post('/api/admin/products/{id}/images', $admin([$ac, 'uploadImage']));

$router->patch('/api/admin/images/{id}/primary', $admin([$ac, 'setPrimaryImage']));
$router->delete('/api/admin/images/{id}', $admin([$ac, 'deleteImage']));

$router->patch('/api/admin/variants/{id}', $admin([$ac, 'updateVariant']));
$router->delete('/api/admin/variants/{id}', $admin([$ac, 'deleteVariant']));

$router->get('/api/admin/categories', $admin([$ac, 'listCategories']));
$router->post('/api/admin/categories', $admin([$ac, 'createCategory']));
$router->patch('/api/admin/categories/{id}', $admin([$ac, 'updateCategory']));
$router->delete('/api/admin/categories/{id}', $admin([$ac, 'deleteCategory']));

$router->get('/api/admin/orders', $admin([$ac, 'listOrders']));
$router->get('/api/admin/orders/{order_number}', $admin([$ac, 'getOrder']));
$router->patch('/api/admin/orders/{order_number}/status', $admin([$ac, 'updateOrderStatus']));

$router->get('/api/admin/coupons', $admin([$ac, 'listCoupons']));
$router->post('/api/admin/coupons', $admin([$ac, 'createCoupon']));
$router->patch('/api/admin/coupons/{id}', $admin([$ac, 'updateCoupon']));
$router->delete('/api/admin/coupons/{id}', $admin([$ac, 'deleteCoupon']));

$router->get('/api/admin/reviews', $admin([$ac, 'listReviews']));
$router->patch('/api/admin/reviews/{id}/approve', $admin([$ac, 'approveReview']));
$router->delete('/api/admin/reviews/{id}', $admin([$ac, 'deleteReview']));

$router->get('/api/admin/customers', $admin([$ac, 'listCustomers']));
$router->get('/api/admin/messages', $admin([$ac, 'listMessages']));
$router->get('/api/admin/subscribers', $admin([$ac, 'listSubscribers']));

$router->get('/api/admin/settings', $admin([$ac, 'getSettings']));
$router->patch('/api/admin/settings', $admin([$ac, 'updateSettings']));
