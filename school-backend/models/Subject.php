<?php
declare(strict_types=1);

final class Subject extends BaseModel
{
    protected string $table = 'subjects';
    protected array $fillable = ['teacher_id', 'code', 'name', 'description', 'credits', 'status'];
    protected array $searchable = ['code', 'name', 'description', 'status'];
}
