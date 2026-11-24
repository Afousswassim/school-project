<?php
declare(strict_types=1);

final class DisciplineReport extends BaseModel
{
    protected string $table = 'discipline_reports';

    public function purgeExpiredAnalyses(): void
    {
        $this->db->exec("DELETE FROM discipline_reports WHERE status = 'draft'
            AND created_at < CURRENT_TIMESTAMP - INTERVAL 1 DAY");
    }

    public function saveAnalysis(int $teacherId, int $studentId, int $classId, string $text, array $results): int
    {
        $stmt = $this->db->prepare('INSERT INTO discipline_reports
            (teacher_user_id, student_id, class_id, text_hash, predictions) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$teacherId, $studentId, $classId, hash('sha256', $text), json_encode($results, JSON_THROW_ON_ERROR)]);
        return (int) $this->db->lastInsertId();
    }

    public function submit(int $id, int $teacherId, int $studentId, string $text): bool
    {
        $stmt = $this->db->prepare("UPDATE discipline_reports r
            JOIN students s ON s.id = r.student_id AND s.class_id = r.class_id
            JOIN classes c ON c.id = s.class_id
            JOIN teachers t ON t.id = c.teacher_id AND t.user_id = r.teacher_user_id
            SET r.report_text = ?, r.status = 'pending', r.submitted_at = CURRENT_TIMESTAMP
            WHERE r.id = ? AND r.teacher_user_id = ? AND r.student_id = ? AND r.text_hash = ?
              AND r.status = 'draft' AND r.created_at >= CURRENT_TIMESTAMP - INTERVAL 1 DAY");
        $stmt->execute([$text, $id, $teacherId, $studentId, hash('sha256', $text)]);
        return $stmt->rowCount() === 1;
    }

    public function pendingCount(): int
    {
        return (int) $this->db->query("SELECT COUNT(*) FROM discipline_reports WHERE status = 'pending'")->fetchColumn();
    }

    public function forReview(): array
    {
        return $this->db->query("SELECT r.id, r.status, DATE(r.submitted_at) AS report_date,
                CONCAT_WS(' ', s.first_name, s.last_name) AS student_name, q.status AS reconsideration_status
            FROM discipline_reports r LEFT JOIN students s ON s.id = r.student_id
            LEFT JOIN discipline_reconsiderations q ON q.report_id = r.id
            WHERE r.status IN ('pending', 'validated')
            ORDER BY COALESCE(q.status = 'pending', 0) DESC, r.status, r.submitted_at DESC, r.id DESC")->fetchAll();
    }

    public function reviewDetails(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT r.id, r.status, r.report_text, r.predictions, r.finalized_severity,
                r.finalized_type, DATE(r.submitted_at) AS report_date,
                CONCAT_WS(' ', s.first_name, s.last_name) AS student_name, c.name AS class_name, u.name AS teacher_name,
                q.status AS reconsideration_status, q.reason, q.response, q.requested_at, q.reviewed_at,
                q.initial_severity, q.initial_type
            FROM discipline_reports r
            LEFT JOIN students s ON s.id = r.student_id
            LEFT JOIN classes c ON c.id = r.class_id
            LEFT JOIN users u ON u.id = r.teacher_user_id
            LEFT JOIN discipline_reconsiderations q ON q.report_id = r.id
            WHERE r.id = ? AND r.status IN ('pending', 'validated')");
        $stmt->execute([$id]);
        $report = $stmt->fetch();
        if (!$report) {
            return null;
        }
        $report['predictions'] = json_decode($report['predictions'], true, 512, JSON_THROW_ON_ERROR);
        return self::withReconsideration($report);
    }

    public function validate(int $id, ?int $adminId, int $severity, ?string $type): bool
    {
        $stmt = $this->db->prepare("UPDATE discipline_reports
            SET status = 'validated', finalized_severity = ?, finalized_type = ?,
                reviewer_user_id = ?, validated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'pending'");
        $stmt->execute([$severity, $type, $adminId, $id]);
        return $stmt->rowCount() === 1;
    }

    public function forStudent(int $userId, ?int $id = null): array
    {
        $reportFilter = $id === null ? "" : " AND r.id = ?";
        $stmt = $this->db->prepare("SELECT r.id, DATE(r.submitted_at) AS report_date,
                r.finalized_type, r.finalized_severity,
                q.status AS reconsideration_status, q.reason, q.response, q.requested_at, q.reviewed_at
            FROM discipline_reports r JOIN students s ON s.id = r.student_id
            LEFT JOIN discipline_reconsiderations q ON q.report_id = r.id
            WHERE s.user_id = ? AND r.status = 'validated'{$reportFilter}
            ORDER BY r.submitted_at DESC, r.id DESC");
        $stmt->execute($id === null ? [$userId] : [$userId, $id]);
        return array_map(self::withReconsideration(...), $stmt->fetchAll());
    }

    public function requestReconsideration(int $id, int $userId, string $reason): string
    {
        $stmt = $this->db->prepare("INSERT INTO discipline_reconsiderations
                (report_id, reason, initial_severity, initial_type)
            SELECT r.id, ?, r.finalized_severity, r.finalized_type
            FROM discipline_reports r JOIN students s ON s.id = r.student_id
            WHERE r.id = ? AND s.user_id = ? AND r.status = 'validated'");
        try {
            $stmt->execute([$reason, $id, $userId]);
        } catch (PDOException $error) {
            if (($error->errorInfo[1] ?? null) === 1062) {
                return 'duplicate';
            }
            throw $error;
        }
        return $stmt->rowCount() === 1 ? 'created' : 'not_found';
    }

    public function resolveReconsideration(int $id, int $adminId, string $outcome, string $response, ?int $severity, ?string $type): string
    {
        $this->db->beginTransaction();
        try {
            $report = $this->db->prepare("SELECT id FROM discipline_reports WHERE id = ? AND status = 'validated' FOR UPDATE");
            $report->execute([$id]);
            if (!$report->fetchColumn()) {
                return 'not_found';
            }

            $request = $this->db->prepare("UPDATE discipline_reconsiderations
                SET status = ?, response = ?, reviewer_user_id = ?, reviewed_at = CURRENT_TIMESTAMP
                WHERE report_id = ? AND status = 'pending'");
            $request->execute([$outcome, $response, $adminId, $id]);
            if ($request->rowCount() !== 1) {
                return 'conflict';
            }

            if ($outcome === 'revised') {
                $update = $this->db->prepare("UPDATE discipline_reports
                    SET finalized_severity = ?, finalized_type = ? WHERE id = ?");
                $update->execute([$severity, $type, $id]);
            }

            $this->db->commit();
            return 'resolved';
        } finally {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
        }
    }

    private static function withReconsideration(array $report): array
    {
        $fields = ['reason', 'response', 'requested_at', 'reviewed_at', 'initial_severity', 'initial_type'];
        $details = array_intersect_key($report, array_flip($fields));
        $status = $report['reconsideration_status'];
        unset($report['reconsideration_status']);
        $report['reconsideration'] = $status === null ? null : ['status' => $status] + $details;
        return array_diff_key($report, $details);
    }
}
