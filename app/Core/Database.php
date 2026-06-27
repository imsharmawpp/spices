<?php
declare(strict_types=1);

namespace App\Core;

use App\Support\Env;
use PDO;

/**
 * PDO connection factory. Supports SQLite (default, local/demo) and MySQL (production).
 * See docs/03-tech-stack-architecture.md and docs/04-database-schema.md.
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function connection(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $driver = Env::get('DB_DRIVER', 'sqlite');

        if ($driver === 'mysql') {
            $host = Env::get('DB_HOST', '127.0.0.1');
            $port = Env::get('DB_PORT', '3306');
            $name = Env::get('DB_NAME', 'spices');
            $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
            self::$pdo = new PDO($dsn, Env::get('DB_USER', 'root'), Env::get('DB_PASS', ''), [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } else {
            $path = Env::get('DB_SQLITE_PATH', 'storage/database.sqlite');
            if ($path[0] !== '/') {
                $path = dirname(__DIR__, 2) . '/' . $path;
            }
            $dir = dirname($path);
            if (!is_dir($dir)) {
                mkdir($dir, 0775, true);
            }
            self::$pdo = new PDO('sqlite:' . $path, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            self::$pdo->exec('PRAGMA foreign_keys = ON');
        }

        return self::$pdo;
    }

    public static function driver(): string
    {
        return Env::get('DB_DRIVER', 'sqlite');
    }

    /** SQLite db file path (for existence checks / auto-seed). */
    public static function sqlitePath(): string
    {
        $path = Env::get('DB_SQLITE_PATH', 'storage/database.sqlite');
        if ($path[0] !== '/') {
            $path = dirname(__DIR__, 2) . '/' . $path;
        }
        return $path;
    }
}
