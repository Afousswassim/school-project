<?php
declare(strict_types=1);

final class Student extends BaseModel
{
    protected string $table = 'students';
    protected array $fillable = ['user_id', 'class_id', 'student_number', 'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'address', 'enrollment_date', 'status'];
    protected array $searchable = ['student_number', 'first_name', 'last_name', 'email', 'phone', 'status'];

    public function forTeacher(int $teacherUserId, ?int $studentId = null): array
    {
        $sql = 'SELECT s.id, s.first_name, s.last_name, s.class_id
                FROM students s
                JOIN classes c ON c.id = s.class_id
                JOIN teachers t ON t.id = c.teacher_id
                WHERE t.user_id = :user_id';
        $params = ['user_id' => $teacherUserId];
        if ($studentId !== null) {
            $sql .= ' AND s.id = :student_id';
            $params['student_id'] = $studentId;
        }
        $stmt = $this->db->prepare($sql . ' ORDER BY s.last_name, s.first_name, s.id');
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
