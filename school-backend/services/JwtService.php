<?php
declare(strict_types=1);

/**
 * Simple JWT implementation used by the API for authentication.
 *
 * - `encode(array $payload)` returns a signed token string.
 * - `decode(string $token)` validates signature and expiration and
 *    returns the original payload array or null on failure.
 *
 * NOTE: This is a minimal implementation for learning/demo purposes.
 * Use a well-tested library for production (e.g. firebase/php-jwt).
 */
final class JwtService
{
    public static function encode(array $payload): string
    {
        $secret = getenv('JWT_SECRET') ?: 'change_this_secret_in_production';
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $payload['iat'] = time();
        $payload['exp'] = time() + (int) (getenv('JWT_TTL') ?: 86400);

        $segments = [
            self::base64UrlEncode(json_encode($header)),
            self::base64UrlEncode(json_encode($payload)),
        ];
        $signature = hash_hmac('sha256', implode('.', $segments), $secret, true);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    public static function decode(string $token): ?array
    {
        $secret = getenv('JWT_SECRET') ?: 'change_this_secret_in_production';
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$header, $payload, $signature] = $parts;
        $valid = self::base64UrlEncode(hash_hmac('sha256', "{$header}.{$payload}", $secret, true));
        if (!hash_equals($valid, $signature)) {
            return null;
        }

        $decoded = json_decode(self::base64UrlDecode($payload), true);
        if (!is_array($decoded) || (($decoded['exp'] ?? 0) < time())) {
            return null;
        }

        return $decoded;
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/')) ?: '';
    }
}
