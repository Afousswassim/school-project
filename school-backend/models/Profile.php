<?php
declare(strict_types=1);

final class Profile
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
        $this->ensureProfileColumns();
    }

    public function findForUser(int $userId): ?array
    {
        $user = $this->fetchUser($userId);
        if (!$user) {
            return null;
        }

        return match ($user['role']) {
            'student' => $this->studentProfile($user),
            'teacher' => $this->teacherProfile($user),
            default => $this->basicProfile($user),
        };
    }

    public function updateProfile(int $userId, array $data): ?array
    {
        $profile = $this->findForUser($userId);
        if (!$profile) {
            return null;
        }

        $table = $profile['role'] === 'teacher' ? 'teachers' : ($profile['role'] === 'student' ? 'students' : null);
        $recordId = (int) ($profile['profile_id'] ?? 0);
        if (!$table || !$recordId) {
            return $profile;
        }

        $payload = $this->validatedProfileFields($data, $table);
        if ($payload) {
            $assignments = array_map(fn (string $column): string => "{$column} = :{$column}", array_keys($payload));
            $payload['id'] = $recordId;
            $stmt = $this->db->prepare("UPDATE {$table} SET " . implode(', ', $assignments) . " WHERE id = :id");
            $stmt->execute($payload);
        }

        if (isset($payload['first_name']) || isset($payload['last_name'])) {
            $fresh = $this->findForUser($userId);
            if ($fresh) {
                $this->updateUserName($userId, trim($fresh['first_name'] . ' ' . $fresh['last_name']));
            }
        }

        return $this->findForUser($userId);
    }

    public function updatePhoto(int $userId, string $path): ?array
    {
        $stmt = $this->db->prepare('UPDATE users SET profile_photo = :profile_photo WHERE id = :id');
        $stmt->execute([':profile_photo' => $path, ':id' => $userId]);
        return $this->findForUser($userId);
    }

    public function updatePassword(int $userId, string $currentPassword, string $newPassword): bool
    {
        $stmt = $this->db->prepare('SELECT password FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $userId]);
        $hash = (string) ($stmt->fetchColumn() ?: '');

        if ($hash === '' || !password_verify($currentPassword, $hash)) {
            return false;
        }

        $stmt = $this->db->prepare('UPDATE users SET password = :password WHERE id = :id');
        return $stmt->execute([
            ':password' => password_hash($newPassword, PASSWORD_DEFAULT),
            ':id' => $userId,
        ]);
    }

    private function fetchUser(int $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT users.id, users.name, users.email, users.status, users.created_at, users.profile_photo, roles.name AS role FROM users JOIN roles ON roles.id = users.role_id WHERE users.id = :id LIMIT 1');
        $stmt->execute([':id' => $userId]);
        return $stmt->fetch() ?: null;
    }

    private function basicProfile(array $user): array
    {
        return [
            ...$user,
            'profile_id' => null,
            'first_name' => $user['name'],
            'last_name' => '',
            'phone' => null,
            'address' => null,
            'date_of_birth' => null,
            'gender' => null,
            'class_info' => null,
            'subjects' => [],
        ];
    }

    private function studentProfile(array $user): array
    {
        $sql = 'SELECT students.*, classes.name AS class_name, classes.level AS class_level, classes.section AS class_section, classes.academic_year
                FROM students
                LEFT JOIN classes ON classes.id = students.class_id
                WHERE students.user_id = :user_id LIMIT 1';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $user['id']]);
        $student = $stmt->fetch() ?: [];

        return [
            ...$this->basicProfile($user),
            'profile_id' => $student['id'] ?? null,
            'first_name' => $student['first_name'] ?? $user['name'],
            'last_name' => $student['last_name'] ?? '',
            'phone' => $student['phone'] ?? null,
            'address' => $student['address'] ?? null,
            'date_of_birth' => $student['date_of_birth'] ?? null,
            'gender' => $student['gender'] ?? null,
            'status' => $student['status'] ?? $user['status'],
            'student_number' => $student['student_number'] ?? null,
            'enrollment_date' => $student['enrollment_date'] ?? null,
            'created_at' => $student['created_at'] ?? $user['created_at'],
            'class_info' => empty($student['class_id']) ? null : [
                'id' => $student['class_id'],
                'name' => $student['class_name'] ?? null,
                'level' => $student['class_level'] ?? null,
                'section' => $student['class_section'] ?? null,
                'academic_year' => $student['academic_year'] ?? null,
            ],
        ];
    }

    private function teacherProfile(array $user): array
    {
        $stmt = $this->db->prepare('SELECT * FROM teachers WHERE user_id = :user_id LIMIT 1');
        $stmt->execute([':user_id' => $user['id']]);
        $teacher = $stmt->fetch() ?: [];

        $subjects = [];
        if (!empty($teacher['id'])) {
            $subjectStmt = $this->db->prepare('SELECT id, code, name, credits, status FROM subjects WHERE teacher_id = :teacher_id ORDER BY name ASC');
            $subjectStmt->execute([':teacher_id' => $teacher['id']]);
            $subjects = $subjectStmt->fetchAll();
        }

        return [
            ...$this->basicProfile($user),
            'profile_id' => $teacher['id'] ?? null,
            'first_name' => $teacher['first_name'] ?? $user['name'],
            'last_name' => $teacher['last_name'] ?? '',
            'phone' => $teacher['phone'] ?? null,
            'address' => $teacher['address'] ?? null,
            'date_of_birth' => $teacher['date_of_birth'] ?? null,
            'gender' => $teacher['gender'] ?? null,
            'status' => $teacher['status'] ?? $user['status'],
            'employee_number' => $teacher['employee_number'] ?? null,
            'hire_date' => $teacher['hire_date'] ?? null,
            'qualification' => $teacher['qualification'] ?? null,
            'created_at' => $teacher['created_at'] ?? $user['created_at'],
            'subjects' => $subjects,
        ];
    }

    private function validatedProfileFields(array $data, string $table): array
    {
        $fields = ['first_name', 'last_name', 'phone', 'address', 'date_of_birth', 'gender'];
        $payload = [];

        foreach ($fields as $field) {
            if (!array_key_exists($field, $data) || !$this->hasColumn($table, $field)) {
                continue;
            }

            $value = is_string($data[$field]) ? trim($data[$field]) : $data[$field];
            if (in_array($field, ['first_name', 'last_name'], true) && $value === '') {
                continue;
            }
            if ($field === 'gender' && $value !== '' && !in_array($value, ['male', 'female', 'other'], true)) {
                continue;
            }
            if ($field === 'date_of_birth' && $value !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $value)) {
                continue;
            }

            $payload[$field] = $value === '' ? null : $value;
        }

        return $payload;
    }

    private function updateUserName(int $userId, string $name): void
    {
        if ($name === '') {
            return;
        }
        $stmt = $this->db->prepare('UPDATE users SET name = :name WHERE id = :id');
        $stmt->execute([':name' => $name, ':id' => $userId]);
    }

    private function ensureProfileColumns(): void
    {
        $this->addColumnIfMissing('users', 'profile_photo', "VARCHAR(255) NULL AFTER status");
        $this->addColumnIfMissing('teachers', 'address', "TEXT NULL AFTER qualification");
        $this->addColumnIfMissing('teachers', 'date_of_birth', "DATE NULL AFTER phone");
        $this->addColumnIfMissing('teachers', 'gender', "ENUM('male','female','other') NULL AFTER date_of_birth");
    }

    private function addColumnIfMissing(string $table, string $column, string $definition): void
    {
        if ($this->hasColumn($table, $column)) {
            return;
        }
        $this->db->exec("ALTER TABLE {$table} ADD COLUMN {$column} {$definition}");
    }

    private function hasColumn(string $table, string $column): bool
    {
        $allowedTables = ['users', 'teachers', 'students'];
        if (!in_array($table, $allowedTables, true)) {
            return false;
        }

        $stmt = $this->db->prepare(
            'SELECT COUNT(*)
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name
               AND COLUMN_NAME = :column_name'
        );
        $stmt->execute([
            ':table_name' => $table,
            ':column_name' => $column,
        ]);
        return (int) $stmt->fetchColumn() > 0;
    }
}
