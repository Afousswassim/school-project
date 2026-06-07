<?php
declare(strict_types=1);

final class Payment extends BaseModel
{
    protected string $table = 'payments';
    protected array $fillable = ['student_id', 'amount', 'payment_date', 'due_date', 'method', 'reference', 'status', 'description'];
    protected array $searchable = ['status', 'method', 'reference', 'description'];

    /**
     * Override to join with students table for better display.
     */
    public function all(array $query = []): array
    {
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(100, max(1, (int) ($query['limit'] ?? 10)));
        $offset = ($page - 1) * $limit;
        $search = trim((string) ($query['search'] ?? ''));

        [$where, $params] = $this->searchClause($search);

        // Count total records
        $count = $this->db->prepare("SELECT COUNT(*) FROM payments {$where}");
        $count->execute($params);

        // Select with student information
        $query = "
            SELECT 
                p.id,
                p.student_id,
                CONCAT(s.first_name, ' ', s.last_name) as student_name,
                s.student_number,
                p.amount,
                p.due_date,
                p.payment_date,
                p.method,
                p.reference,
                p.status,
                p.description,
                p.created_at,
                p.updated_at
            FROM payments p
            LEFT JOIN students s ON p.student_id = s.id
            {$where}
            ORDER BY p.id DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items' => $stmt->fetchAll(),
            'page' => $page,
            'limit' => $limit,
            'total' => (int) $count->fetchColumn(),
        ];
    }
}
