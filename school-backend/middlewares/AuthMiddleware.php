<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/JwtService.php';
require_once __DIR__ . '/../includes/Response.php';

/**
 * Authorization middleware helpers.
 *
 * - `user()` extracts and validates the Bearer token and returns the JWT payload.
 * - `requireRoles(array $roles)` ensures the current user has one of the allowed roles
 *    and returns the payload; otherwise a JSON error response is sent.
 *
 * This centralizes token parsing and role checks for the API routes.
 */
final class AuthMiddleware
{
    public static function user(): array
    {
        $header = self::authorizationHeader();
        if (!preg_match('/^Bearer\s+(.+)$/i', trim($header), $matches)) {
            Response::json(false, 'Authentication token missing', null, 401);
        }

        $payload = JwtService::decode($matches[1]);
        if (!$payload) {
            Response::json(false, 'Invalid or expired token', null, 401);
        }

        return $payload;
    }

    public static function requireRoles(array $roles): array
    {
        $user = self::user();
        if ($roles && !in_array($user['role'] ?? '', $roles, true)) {
            Response::json(false, 'You are not allowed to access this resource', null, 403);
        }

        return $user;
    }

    private static function authorizationHeader(): string
    {
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            return (string) $_SERVER['HTTP_AUTHORIZATION'];
        }

        if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $name => $value) {
                if (strtolower((string) $name) === 'authorization') {
                    return (string) $value;
                }
            }
        }

        return '';
    }
}
