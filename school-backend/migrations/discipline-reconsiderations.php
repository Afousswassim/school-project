<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../config/db.php';

Database::connection()->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS discipline_reconsiderations (
        report_id INT PRIMARY KEY,
        reason TEXT NOT NULL,
        status ENUM('pending', 'upheld', 'revised') NOT NULL DEFAULT 'pending',
        initial_severity TINYINT UNSIGNED NULL,
        initial_type VARCHAR(160) NULL,
        response TEXT NULL,
        reviewer_user_id INT NULL,
        requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        FOREIGN KEY (report_id) REFERENCES discipline_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    SQL);
