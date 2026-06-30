<?php
declare(strict_types=1);

namespace App\Services;

use App\Support\Env;

/**
 * Payment gateway abstraction. The store ships with a "mock" provider (no real
 * charge) and is ready for a real gateway: set PAYMENT_PROVIDER + keys in .env.
 * Signature verification is implemented for Razorpay-style HMAC-SHA256 webhooks.
 * See docs/05-api-spec.md §2.5.
 */
final class Payment
{
    public static function provider(): string
    {
        return Env::get('PAYMENT_PROVIDER', 'mock') ?: 'mock';
    }

    /** Verify a Razorpay checkout signature: HMAC_SHA256(order_id|payment_id, secret). */
    public static function verifyRazorpaySignature(string $orderId, string $paymentId, string $signature, string $secret): bool
    {
        if ($secret === '' || $signature === '') {
            return false;
        }
        $expected = hash_hmac('sha256', $orderId . '|' . $paymentId, $secret);
        return hash_equals($expected, $signature);
    }

    /** Verify a webhook payload signature: HMAC_SHA256(raw_body, webhook_secret). */
    public static function verifyWebhook(string $rawBody, string $signature, string $secret): bool
    {
        if ($secret === '' || $signature === '') {
            return false;
        }
        return hash_equals(hash_hmac('sha256', $rawBody, $secret), $signature);
    }
}
