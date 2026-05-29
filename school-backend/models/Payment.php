<?php
declare(strict_types=1);

final class Payment extends BaseModel
{
    protected string $table = 'payments';
    protected array $fillable = ['student_id', 'amount', 'payment_date', 'due_date', 'method', 'reference', 'status', 'description'];
    protected array $searchable = ['payment_date', 'method', 'reference', 'status', 'description'];
}
