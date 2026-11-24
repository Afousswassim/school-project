<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../config/db.php';

Database::connection()->exec(<<<'SQL'
    CREATE TABLE IF NOT EXISTS discipline_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NULL,
        teacher_user_id INT NULL,
        class_id INT NULL,
        report_text TEXT NULL,
        text_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        predictions JSON NOT NULL,
        status ENUM('draft', 'pending', 'validated') NOT NULL DEFAULT 'draft',
        finalized_severity TINYINT UNSIGNED NULL,
        finalized_type VARCHAR(160) NULL,
        reviewer_user_id INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP NULL,
        validated_at TIMESTAMP NULL,
        INDEX discipline_status_date (status, created_at),
        INDEX discipline_student_status (student_id, status, submitted_at),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
        FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
        FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    SQL);
