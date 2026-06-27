<?php
declare(strict_types=1);

namespace App\Core;

use App\Support\Env;
use PDO;

/**
 * PDO connection factory. Supports MySQL (production) and SQLite (local/demo).
 * If DB_DRIVER=mysql is unreachable and DB_FALLBACK_SQLITE=true, it transparently
 * falls back to SQLite so the same config runs on the host and in the sandbox.
 * See docs/03-tech-stack-architecture.md and docs/04-database-schema.md.
 */
final class Database
{
    private static ?PDO $pdo = null;
    private static ?string $effectiveDriver = null;

    public static function connection(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $configured = self::configuredDriver();

        if ($configured === 'mysql') {
            try {
                self::$pdo = self::connectMysql();
                self::$effectiveDriver = 'mysql';
                return self::$pdo;
            } catch (\PDOException $e) {
                if (!Env::bool('DB_FALLBACK_SQLITE', false)) {
                    throw $e;
                }
                // Fall through to SQLite (e.g. no MySQL server in this sandbox).
                error_log('[DB] MySQL unavailable, falling back to SQLite: ' . $e->getMessage());
            }
        }

        self::$pdo = self::connectSqlite();
        self::$effectiveDriver = 'sqlite';
        return self::$pdo;
    }

    private static function connectMysql(): PDO
    {
        $host = Env::get('DB_HOST', '127.0.0.1');
        $port = Env::get('DB_PORT', '3306');
        $name = Env::get('DB_NAME', 'spices');
        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
        return new PDO($dsn, Env::get('DB_USER', 'root'), Env::get('DB_PASS', ''), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5,
        ]);
    }

    private static function connectSqlite(): PDO
    {
        $path = self::sqlitePath();
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec('PRAGMA foreign_keys = ON');
        return $pdo;
    }

    /** The driver requested in config. */
    public static function configuredDriver(): string
    {
        return Env::get('DB_DRIVER', 'sqlite');
    }

    /** The driver actually in use after any fallback (requires a connection). */
    public static function driver(): string
    {
        if (self::$effectiveDriver === null) {
            self::connection();
        }
        return self::$effectiveDriver;
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
