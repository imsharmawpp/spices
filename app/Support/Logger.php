<?php
declare(strict_types=1);

namespace App\Support;

/**
 * Minimal application logger — appends structured lines to storage/logs/app.log.
 * Never logs secrets or PII. See docs/02-requirements.md §2.9.
 */
final class Logger
{
    public static function write(string $level, string $message, array $context = []): void
    {
        $dir = dirname(__DIR__, 2) . '/storage/logs';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $line = '[' . date('c') . '] ' . strtoupper($level) . ': ' . $message;
        if ($context) {
            $line .= ' ' . json_encode($context, JSON_UNESCAPED_SLASHES);
        }
        @file_put_contents($dir . '/app.log', $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    }

    public static function error(string $message, array $context = []): void
    {
        self::write('error', $message, $context);
    }

    public static function info(string $message, array $context = []): void
    {
        self::write('info', $message, $context);
    }
}
