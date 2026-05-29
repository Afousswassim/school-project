<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/JwtService.php';
require_once __DIR__ . '/../includes/Response.php';

final class AuthMiddleware
{
    public static function user(): array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/Bearer\s+(.+)/', $header, $matches)) {
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
}
