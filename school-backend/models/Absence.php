<?php
declare(strict_types=1);

final class Absence extends BaseModel
{
    protected string $table = 'attendance';
    protected array $fillable = ['student_id', 'class_id', 'subject_id', 'teacher_id', 'attendance_date', 'status', 'remarks'];
    protected array $searchable = ['attendance_date', 'status', 'remarks'];
}
