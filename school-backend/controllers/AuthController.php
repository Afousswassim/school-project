<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../services/JwtService.php';
require_once __DIR__ . '/../includes/Response.php';

final class AuthController
{
    public function login(array $data): void
    {
        $email = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($email === '' || $password === '') {
            Response::json(false, 'Email and password are required', null, 422);
        }

        $model = new User();
        $user = $model->findByEmail($email);
        if (!$user || !password_verify($password, $user['password']) || $user['status'] !== 'active') {
            Response::json(false, 'Invalid credentials', null, 401);
        }

        unset($user['password']);
        $token = JwtService::encode(['sub' => (int) $user['id'], 'email' => $user['email'], 'role' => $user['role'], 'name' => $user['name']]);
        Response::json(true, 'Login successful', ['token' => $token, 'user' => $user]);
    }

    public function register(array $data): void
    {
        foreach (['name', 'email', 'password'] as $field) {
            if (empty($data[$field])) {
                Response::json(false, "{$field} is required", null, 422);
            }
        }

        $roleId = (int) ($data['role_id'] ?? 3);
        $model = new User();
        if ($model->findByEmail((string) $data['email'])) {
            Response::json(false, 'Email already registered', null, 409);
        }

        $user = $model->createUser([
            'role_id' => $roleId,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'status' => 'active',
        ]);
        unset($user['password']);
        Response::json(true, 'Registration successful', $user, 201);
    }

    public function me(array $user): void
    {
        Response::json(true, 'Operation successful', $user);
    }
}
