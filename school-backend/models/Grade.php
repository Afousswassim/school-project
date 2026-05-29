<?php
declare(strict_types=1);

final class Grade extends BaseModel
{
    protected string $table = 'grades';
    protected array $fillable = ['student_id', 'subject_id', 'teacher_id', 'exam_name', 'exam_date', 'score', 'max_score', 'term', 'remarks'];
    protected array $searchable = ['exam_name', 'term', 'remarks'];
}
