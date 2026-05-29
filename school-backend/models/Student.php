<?php
declare(strict_types=1);

final class Student extends BaseModel
{
    protected string $table = 'students';
    protected array $fillable = ['user_id', 'class_id', 'student_number', 'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'address', 'enrollment_date', 'status'];
    protected array $searchable = ['student_number', 'first_name', 'last_name', 'email', 'phone', 'status'];
}
