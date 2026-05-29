<?php
declare(strict_types=1);

final class User extends BaseModel
{
    protected string $table = 'users';
    protected array $fillable = ['role_id', 'name', 'email', 'password', 'status'];
    protected array $searchable = ['name', 'email', 'status'];

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare('SELECT users.*, roles.name AS role FROM users JOIN roles ON roles.id = users.role_id WHERE users.email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);
        return $stmt->fetch() ?: null;
    }

    public function createUser(array $data): array
    {
        $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        return $this->create($data);
    }
}
