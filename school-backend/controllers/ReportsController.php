<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/Response.php';

final class ReportsController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /**
     * Get comprehensive school reports and statistics.
     * Only admin can access this.
     */
    public function summary(): void
    {
        $data = [
            'total_students' => $this->getTotalStudents(),
            'total_teachers' => $this->getTotalTeachers(),
            'total_subjects' => $this->getTotalSubjects(),
            'total_classes' => $this->getTotalClasses(),
            'total_payments' => $this->getTotalPayments(),
            'paid_amount' => $this->getPaidPaymentsAmount(),
            'pending_amount' => $this->getPendingPaymentsAmount(),
            'absences_count' => $this->getAbsencesCount(),
            'average_grade' => $this->getAverageGrade(),
            'total_attendance_records' => $this->getTotalAttendanceRecords(),
            'present_count' => $this->getPresentCount(),
            'absent_count' => $this->getAbsentCount(),
        ];

        Response::json(true, 'Reports loaded successfully', $data);
    }

    private function getTotalStudents(): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM students WHERE status = 'active'");
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    private function getTotalTeachers(): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM teachers WHERE status = 'active'");
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    private function getTotalSubjects(): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM subjects WHERE status = 'active'");
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    private function getTotalClasses(): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM classes WHERE status = 'active'");
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    private function getTotalPayments(): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM payments");
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    private function getPaidPaymentsAmount(): string
    {
        $stmt = $this->db->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid'");
        $stmt->execute();
        return (string) number_format((float) $stmt->fetchColumn(), 2);
    }

    private function getPendingPaymentsAmount(): string
    {
        $stmt = $this->db->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status IN ('pending', 'overdue')");
        $stmt->execute();
        return (string) number_format((float) $stmt->fetchColumn(), 2);
    }

    private function getAbsencesCount(): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM attendance WHERE status = 'absent'");
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    private function getTotalAttendanceRecords(): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM attendance");
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    private function getPresentCount(): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM attendance WHERE status = 'present'");
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    private function getAbsentCount(): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM attendance WHERE status = 'absent'");
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    private function getAverageGrade(): string
    {
        $stmt = $this->db->prepare("SELECT COALESCE(AVG(score), 0) FROM grades");
        $stmt->execute();
        return (string) number_format((float) $stmt->fetchColumn(), 2);
    }
}
