<?php
declare(strict_types=1);

final class ClassModel extends BaseModel
{
    protected string $table = 'classes';
    protected array $fillable = ['teacher_id', 'name', 'level', 'section', 'academic_year', 'capacity', 'status'];
    protected array $searchable = ['name', 'level', 'section', 'academic_year', 'status'];
}
