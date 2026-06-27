<?php
declare(strict_types=1);

namespace App\Support;

final class Str
{
    public static function slug(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
        return trim($value, '-');
    }
}

final class Money
{
    /** Format a numeric amount with the configured currency symbol. */
    public static function format(float|int|string $amount): string
    {
        $symbol = Env::get('CURRENCY_SYMBOL', '$');
        return $symbol . number_format((float) $amount, 2);
    }
}
