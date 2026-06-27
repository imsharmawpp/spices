<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

final class AuthController
{
    public function register(Request $req): void
    {
        $name = trim((string) $req->input('name', ''));
        $email = strtolower(trim((string) $req->input('email', '')));
        $password = (string) $req->input('password', '');

        $errors = [];
        if ($name === '') $errors['name'] = 'Name is required';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'A valid email is required';
        if (strlen($password) < 6) $errors['password'] = 'Password must be at least 6 characters';
        if ($errors) {
            Response::error('VALIDATION_ERROR', 'Please check the form', 422, $errors);
        }

        $pdo = Database::connection();
        $exists = $pdo->prepare('SELECT id FROM users WHERE email=?');
        $exists->execute([$email]);
        if ($exists->fetchColumn()) {
            Response::error('EMAIL_TAKEN', 'An account with that email already exists', 409);
        }

        $pdo->prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)')
            ->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
        $id = (int) $pdo->lastInsertId();
        $this->login_session($id);
        Response::json($this->me_payload($id), 201);
    }

    public function login(Request $req): void
    {
        $email = strtolower(trim((string) $req->input('email', '')));
        $password = (string) $req->input('password', '');

        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE email=? AND status="active"');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            Response::error('INVALID_CREDENTIALS', 'Incorrect email or password', 401);
        }
        $this->login_session((int) $user['id']);
        Response::json($this->me_payload((int) $user['id']));
    }

    public function logout(Request $req): void
    {
        unset($_SESSION['user_id'], $_SESSION['cart_id']);
        Response::json(['ok' => true]);
    }

    public function me(Request $req): void
    {
        $id = $_SESSION['user_id'] ?? null;
        if (!$id) {
            Response::error('UNAUTHENTICATED', 'Not logged in', 401);
        }
        Response::json($this->me_payload((int) $id));
    }

    private function login_session(int $userId): void
    {
        // Merge any guest cart into the user's cart on login.
        $pdo = Database::connection();
        $guestCartId = $_SESSION['cart_id'] ?? null;
        $_SESSION['user_id'] = $userId;

        if ($guestCartId) {
            $userCart = $pdo->prepare('SELECT id FROM carts WHERE user_id=?');
            $userCart->execute([$userId]);
            $userCartId = $userCart->fetchColumn();
            if (!$userCartId) {
                $pdo->prepare('UPDATE carts SET user_id=? WHERE id=?')->execute([$userId, $guestCartId]);
            } else {
                // Move items from guest cart into the user cart.
                $items = $pdo->prepare('SELECT variant_id, quantity FROM cart_items WHERE cart_id=?');
                $items->execute([$guestCartId]);
                foreach ($items->fetchAll() as $it) {
                    $pdo->prepare('INSERT INTO cart_items (cart_id,variant_id,quantity) VALUES (?,?,?)
                        ON CONFLICT(cart_id,variant_id) DO UPDATE SET quantity=quantity+excluded.quantity')
                        ->execute([$userCartId, $it['variant_id'], $it['quantity']]);
                }
                $pdo->prepare('DELETE FROM carts WHERE id=?')->execute([$guestCartId]);
                $_SESSION['cart_id'] = (int) $userCartId;
            }
        }
    }

    private function me_payload(int $id): array
    {
        $stmt = Database::connection()->prepare('SELECT id,name,email,phone,role FROM users WHERE id=?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: [];
    }
}
