<?php
declare(strict_types=1);

namespace App\Services;

/**
 * Multi-currency display layer.
 * - Base/store currency is INR (everything in the DB and admin is INR).
 * - Live exchange rates come from frankfurter.dev (free, no key), cached locally.
 * - The visitor's currency is detected from their IP, with a manual override on the client.
 * Conversion is display-only; orders are still processed in INR.
 */
final class CurrencyService
{
    /** Supported display currencies (code => name). INR is the base. */
    public const SUPPORTED = [
        'INR' => 'Indian Rupee',
        'USD' => 'US Dollar',
        'EUR' => 'Euro',
        'GBP' => 'British Pound',
        'AUD' => 'Australian Dollar',
        'CAD' => 'Canadian Dollar',
        'JPY' => 'Japanese Yen',
        'SGD' => 'Singapore Dollar',
    ];

    public const BASE = 'INR';
    private const RATES_TTL = 43200; // 12 hours

    /** Approximate fallback rates (INR -> X) if the API and cache are both unavailable. */
    private const FALLBACK = [
        'INR' => 1.0, 'USD' => 0.012, 'EUR' => 0.011, 'GBP' => 0.0095,
        'AUD' => 0.018, 'CAD' => 0.016, 'JPY' => 1.85, 'SGD' => 0.016,
    ];

    /** INR -> {code: rate} for all supported currencies. */
    public static function rates(): array
    {
        $cacheDir = dirname(__DIR__, 2) . '/storage/cache';
        $cacheFile = $cacheDir . '/rates_' . self::BASE . '.json';

        if (is_file($cacheFile) && (time() - filemtime($cacheFile) < self::RATES_TTL)) {
            $cached = json_decode((string) file_get_contents($cacheFile), true);
            if (is_array($cached) && !empty($cached['rates'])) {
                return $cached['rates'];
            }
        }

        $symbols = implode(',', array_filter(array_keys(self::SUPPORTED), fn($c) => $c !== self::BASE));
        $url = 'https://api.frankfurter.dev/v1/latest?base=' . self::BASE . '&symbols=' . $symbols;
        $data = self::fetchJson($url);

        if (!empty($data['rates']) && is_array($data['rates'])) {
            $rates = $data['rates'];
            $rates[self::BASE] = 1.0;
            if (!is_dir($cacheDir)) {
                @mkdir($cacheDir, 0775, true);
            }
            @file_put_contents($cacheFile, json_encode(['rates' => $rates, 'at' => time()]));
            return $rates;
        }

        // Stale cache is better than nothing.
        if (is_file($cacheFile)) {
            $cached = json_decode((string) file_get_contents($cacheFile), true);
            if (is_array($cached) && !empty($cached['rates'])) {
                return $cached['rates'];
            }
        }
        return self::FALLBACK;
    }

    /** Detect the visitor's preferred currency from their IP (cached per session). */
    public static function detect(): string
    {
        if (!empty($_SESSION['geo_currency'])) {
            return $_SESSION['geo_currency'];
        }
        $cur = 'USD'; // global default when unknown
        $ip = self::clientIp();
        $endpoint = ($ip && !self::isPrivate($ip))
            ? "http://ip-api.com/json/{$ip}?fields=status,countryCode,currency"
            : 'http://ip-api.com/json/?fields=status,countryCode,currency';
        $info = self::fetchJson($endpoint);
        if (($info['status'] ?? '') === 'success') {
            $c = strtoupper((string) ($info['currency'] ?? ''));
            $cur = isset(self::SUPPORTED[$c]) ? $c : self::countryToCurrency((string) ($info['countryCode'] ?? ''));
        }
        $_SESSION['geo_currency'] = $cur;
        return $cur;
    }

    private static function countryToCurrency(string $cc): string
    {
        $map = [
            'US' => 'USD', 'GB' => 'GBP', 'AU' => 'AUD', 'CA' => 'CAD', 'JP' => 'JPY', 'SG' => 'SGD', 'IN' => 'INR',
            'DE' => 'EUR', 'FR' => 'EUR', 'ES' => 'EUR', 'IT' => 'EUR', 'NL' => 'EUR', 'IE' => 'EUR',
            'PT' => 'EUR', 'AT' => 'EUR', 'BE' => 'EUR', 'FI' => 'EUR', 'GR' => 'EUR', 'LU' => 'EUR',
        ];
        return $map[$cc] ?? 'USD';
    }

    private static function clientIp(): string
    {
        foreach (['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $k) {
            if (!empty($_SERVER[$k])) {
                $ip = trim(explode(',', $_SERVER[$k])[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return '';
    }

    private static function isPrivate(string $ip): bool
    {
        return !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }

    private static function fetchJson(string $url): array
    {
        $raw = false;
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 4,
                CURLOPT_CONNECTTIMEOUT => 3,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_USERAGENT => 'SaffraStore/1.0',
            ]);
            $raw = curl_exec($ch);
            curl_close($ch);
        }
        if ($raw === false || $raw === null) {
            $ctx = stream_context_create(['http' => ['timeout' => 4, 'header' => "User-Agent: SaffraStore/1.0\r\n"]]);
            $raw = @file_get_contents($url, false, $ctx);
        }
        if (!is_string($raw) || $raw === '') {
            return [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /** Payload for the /api/currency endpoint. */
    public static function payload(): array
    {
        $rates = self::rates();
        $detected = self::detect();
        if (!isset($rates[$detected])) {
            $detected = self::BASE;
        }
        $supported = [];
        foreach (self::SUPPORTED as $code => $name) {
            if (isset($rates[$code])) {
                $supported[] = ['code' => $code, 'name' => $name];
            }
        }
        return [
            'base' => self::BASE,
            'detected' => $detected,
            'rates' => $rates,
            'supported' => $supported,
        ];
    }
}
