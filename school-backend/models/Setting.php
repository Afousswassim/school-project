<?php
declare(strict_types=1);

final class Setting extends BaseModel
{
    protected string $table = 'settings';
    protected array $fillable = ['school_name', 'academic_year', 'school_email', 'school_phone', 'school_address'];
    protected array $searchable = [];

    /**
     * Get the first (and usually only) settings record.
     * Settings are typically singleton in design.
     */
    public function getSettings(): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} LIMIT 1");
        $stmt->execute();
        return $stmt->fetch() ?: null;
    }

    /**
     * Update the first settings record.
     */
    public function updateSettings(array $data): ?array
    {
        $data = $this->onlyFillable($data);
        if (!$data) {
            return $this->getSettings();
        }

        $assignments = array_map(fn ($column) => "{$column} = :{$column}", array_keys($data));
        $stmt = $this->db->prepare("UPDATE {$this->table} SET " . implode(',', $assignments) . " LIMIT 1");
        $stmt->execute($data);
        return $this->getSettings();
    }
}
