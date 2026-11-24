<?php
declare(strict_types=1);

final class ClassModel extends BaseModel
{
    protected string $table = 'classes';
    protected ?string $readScope = 'teacher_id IN (SELECT id FROM teachers WHERE user_id = :owner_id)';
    protected array $fillable = ['teacher_id', 'name', 'level', 'section', 'academic_year', 'capacity', 'status'];
    protected array $searchable = ['name', 'level', 'section', 'academic_year', 'status'];

    public function forTeacher(int $teacherUserId): array
    {
        $stmt = $this->db->prepare('SELECT c.id, c.name, c.academic_year
            FROM classes c JOIN teachers t ON t.id = c.teacher_id
            WHERE t.user_id = ? ORDER BY c.name, c.academic_year, c.id');
        $stmt->execute([$teacherUserId]);
        return $stmt->fetchAll();
    }
}
