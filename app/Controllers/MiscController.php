<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Services\Settings;

final class MiscController
{
    public function settings(Request $req): void
    {
        Response::json([
            'store_name' => Settings::get('store_name', 'Saffra Spices'),
            'announcement' => Settings::get('announcement'),
            'free_shipping_threshold' => Settings::float('free_shipping_threshold', 49),
            'currency_symbol' => \App\Support\Env::get('CURRENCY_SYMBOL', '$'),
        ]);
    }

    public function newsletter(Request $req): void
    {
        $email = strtolower(trim((string) $req->input('email', '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('VALIDATION_ERROR', 'Please enter a valid email', 422);
        }
        $pdo = Database::connection();
        try {
            $pdo->prepare('INSERT INTO newsletter_subscribers (email) VALUES (?)')->execute([$email]);
        } catch (\PDOException $e) {
            // Already subscribed — treat as success (idempotent).
        }
        Response::json(['ok' => true, 'message' => 'Thanks for subscribing!'], 201);
    }

    public function contact(Request $req): void
    {
        $name = trim((string) $req->input('name', ''));
        $email = strtolower(trim((string) $req->input('email', '')));
        $message = trim((string) $req->input('message', ''));
        $subject = trim((string) $req->input('subject', ''));

        $errors = [];
        if ($name === '') $errors['name'] = 'Name is required';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'A valid email is required';
        if ($message === '') $errors['message'] = 'Please enter a message';
        if ($errors) {
            Response::error('VALIDATION_ERROR', 'Please check the form', 422, $errors);
        }

        Database::connection()->prepare('INSERT INTO contact_messages (name,email,subject,message) VALUES (?,?,?,?)')
            ->execute([$name, $email, $subject, $message]);
        Response::json(['ok' => true, 'message' => 'Thanks — we will be in touch soon.'], 201);
    }
}
