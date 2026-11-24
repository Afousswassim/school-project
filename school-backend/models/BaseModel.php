<?php
declare(strict_types=1);

abstract class BaseModel
{
    protected PDO $db;
    protected string $table;
    protected array $fillable = [];
    protected array $searchable = [];
    protected string $select = '*';
    protected ?string $readScope = null;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    public function all(array $query = [], ?int $ownerId = null): array
    {
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(100, max(1, (int) ($query['limit'] ?? 10)));
        $offset = ($page - 1) * $limit;
        $search = trim((string) ($query['search'] ?? ''));

        [$conditions, $params] = $this->searchClause($search);
        if ($ownerId !== null) {
            $conditions[] = $this->ownershipCondition();
            $params[':owner_id'] = $ownerId;
        }
        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $count = $this->db->prepare("SELECT COUNT(*) FROM {$this->table} {$where}");
        $count->execute($params);

        $stmt = $this->db->prepare("SELECT {$this->select} FROM {$this->table} {$where} ORDER BY id DESC LIMIT :limit OFFSET :offset");
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

    public function find(int $id, ?int $ownerId = null): ?array
    {
        $sql = "SELECT {$this->select} FROM {$this->table} WHERE id = :id";
        $params = [':id' => $id];
        if ($ownerId !== null) {
            $sql .= ' AND ' . $this->ownershipCondition();
            $params[':owner_id'] = $ownerId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch() ?: null;
    }

    public function create(array $data): array
    {
        $data = $this->onlyFillable($data);
        if (!$data) {
            return [];
        }
        $columns = array_keys($data);
        $params = array_map(fn ($column) => ":{$column}", $columns);
        $stmt = $this->db->prepare("INSERT INTO {$this->table} (" . implode(',', $columns) . ") VALUES (" . implode(',', $params) . ")");
        $stmt->execute($data);
        return $this->find((int) $this->db->lastInsertId()) ?? [];
    }

    public function update(int $id, array $data): ?array
    {
        $data = $this->onlyFillable($data);
        if (!$data) {
            return $this->find($id);
        }

        $assignments = array_map(fn ($column) => "{$column} = :{$column}", array_keys($data));
        $data['id'] = $id;
        $stmt = $this->db->prepare("UPDATE {$this->table} SET " . implode(',', $assignments) . " WHERE id = :id");
        $stmt->execute($data);
        return $this->find($id);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }

    protected function onlyFillable(array $data): array
    {
        return array_filter(
            array_intersect_key($data, array_flip($this->fillable)),
            fn ($value) => $value !== '' && $value !== null
        );
    }

    protected function searchClause(string $search): array
    {
        if ($search === '') {
            return [[], []];
        }
        $columns = $this->searchable ?: $this->fillable ?: ['id'];
        $likes = [];
        $params = [];
        foreach ($columns as $index => $column) {
            $parameter = ':search' . $index;
            $likes[] = "{$column} LIKE {$parameter}";
            $params[$parameter] = "%{$search}%";
        }
        return [['(' . implode(' OR ', $likes) . ')'], $params];
    }

    private function ownershipCondition(): string
    {
        return $this->readScope ?? throw new LogicException('No ownership scope for ' . $this->table);
    }
}
