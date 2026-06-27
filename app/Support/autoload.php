<?php
declare(strict_types=1);

/**
 * Minimal PSR-4 style autoloader mapping App\ -> app/.
 * Keeps the project dependency-free and runnable without `composer install`.
 * (Production may switch to Composer's autoloader — see docs/06-folder-structure.md.)
 */
spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/../' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

// Support files that define multiple classes / functions.
require __DIR__ . '/helpers.php';
