<?php
declare(strict_types=1);

final class Setting extends BaseModel
{
    protected string $table = 'settings';
    protected array $fillable = ['school_name', 'academic_year', 'school_email', 'school_phone', 'school_address'];
    protected array $searchable = [];

    /**
     * Get the first (and usually only) settings record.
     * If no settings exist, create default settings.
     */
    public function getSettings(): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} LIMIT 1");
        $stmt->execute();
        $result = $stmt->fetch();
        
        if (!$result) {
            // Create default settings if none exist
            return $this->createDefaultSettings();
        }
        
        return $result;
    }

    /**
     * Create default settings record
     */
    private function createDefaultSettings(): ?array
    {
        $defaults = [
            'school_name' => 'SchoolPro',
            'academic_year' => '2025/2026',
            'school_email' => 'contact@school.test',
            'school_phone' => '+212 600000000',
            'school_address' => 'School Address',
        ];
        
        $stmt = $this->db->prepare(
            "INSERT INTO {$this->table} (school_name, academic_year, school_email, school_phone, school_address) 
             VALUES (:school_name, :academic_year, :school_email, :school_phone, :school_address)"
        );
        $stmt->execute($defaults);
        
        return $this->getSettings();
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
