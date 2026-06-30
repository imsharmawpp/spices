<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;

final class Settings
{
    private static array $cache = [];

    public static function get(string $key, string $default = ''): string
    {
        if (!self::$cache) {
            $rows = Database::connection()->query('SELECT `key`, value FROM settings')->fetchAll();
            foreach ($rows as $row) {
                self::$cache[$row['key']] = $row['value'];
            }
        }
        return self::$cache[$key] ?? $default;
    }

    public static function float(string $key, float $default = 0): float
    {
        return (float) self::get($key, (string) $default);
    }
}
