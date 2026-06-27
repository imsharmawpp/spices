<?php
declare(strict_types=1);

namespace App\Support;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

/**
 * Access guard for admin/CMS endpoints.
 * - Requires an authenticated user with role = admin.
 * - Requires a valid CSRF token (X-CSRF-Token header) for state-changing methods.
 * See docs/02-requirements.md §2.3 (security) and docs/05-api-spec.md §3.
 */
final class Guard
{
    /** Ensure the current session belongs to an admin; returns the admin user id. */
    public static function admin(Request $req): int
    {
        $uid = $_SESSION['user_id'] ?? null;
        if (!$uid) {
            Response::error('UNAUTHENTICATED', 'Please log in', 401);
        }

        $stmt = Database::connection()->prepare('SELECT role, status FROM users WHERE id = ?');
        $stmt->execute([$uid]);
        $user = $stmt->fetch();
        if (!$user || $user['status'] !== 'active' || $user['role'] !== 'admin') {
            Response::error('FORBIDDEN', 'Admin access required', 403);
        }

        if (!in_array($req->method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? (string) $req->input('_csrf', '');
            $session = (string) ($_SESSION['csrf'] ?? '');
            if ($session === '' || !hash_equals($session, (string) $token)) {
                Response::error('CSRF', 'Invalid or missing CSRF token', 419);
            }
        }

        return (int) $uid;
    }
}
