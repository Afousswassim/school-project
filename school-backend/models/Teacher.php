<?php
declare(strict_types=1);

final class Teacher extends BaseModel
{
    protected string $table = 'teachers';
    protected array $fillable = ['user_id', 'employee_number', 'first_name', 'last_name', 'email', 'phone', 'hire_date', 'qualification', 'status'];
    protected array $searchable = ['employee_number', 'first_name', 'last_name', 'email', 'phone', 'qualification', 'status'];
}
