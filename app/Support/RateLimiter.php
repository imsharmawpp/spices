<?php
declare(strict_types=1);

namespace App\Support;

/**
 * Lightweight file-based rate limiter (sliding window) for sensitive endpoints
 * like login/register. See docs/02-requirements.md §2.3.
 */
final class RateLimiter
{
    /** Returns true if the key has exceeded $max hits within $window seconds. */
    public static function tooMany(string $key, int $max, int $window): bool
    {
        $dir = dirname(__DIR__, 2) . '/storage/cache/ratelimit';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $file = $dir . '/' . md5($key) . '.json';
        $now = time();
        $hits = [];
        if (is_file($file)) {
            $hits = json_decode((string) file_get_contents($file), true) ?: [];
        }
        $hits = array_values(array_filter($hits, static fn($t) => (int) $t > $now - $window));
        if (count($hits) >= $max) {
            return true;
        }
        $hits[] = $now;
        @file_put_contents($file, json_encode($hits));
        return false;
    }

    public static function ip(): string
    {
        foreach (['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $k) {
            if (!empty($_SERVER[$k])) {
                return trim(explode(',', $_SERVER[$k])[0]);
            }
        }
        return 'cli';
    }
}
