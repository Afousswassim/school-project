<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/DisciplineAnalysis.php';

final class DisciplineReportController
{
    public function students(int $teacherUserId): void
    {
        $students = (new Student())->forTeacher($teacherUserId);
        Response::json(true, 'Élèves chargés.', $students);
    }

    public function classes(int $teacherUserId): void
    {
        Response::json(true, 'Classes chargées.', (new ClassModel())->forTeacher($teacherUserId));
    }

    public function analyze(int $teacherUserId, array $body): void
    {
        [$student, $text] = $this->teacherReport($teacherUserId, $body);
        $results = (new DisciplineAnalysis())->analyze($text);
        $reports = new DisciplineReport();
        $reports->purgeExpiredAnalyses();
        $results['analysis_id'] = $reports->saveAnalysis(
            $teacherUserId, (int) $student['id'], (int) $student['class_id'], $text, $results
        );
        Response::json(true, 'Analyse terminée.', $results);
    }

    public function submit(int $teacherUserId, array $body): void
    {
        [$student, $text] = $this->teacherReport($teacherUserId, $body);
        $id = filter_var($body['analysis_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false || !(new DisciplineReport())->submit($id, $teacherUserId, (int) $student['id'], $text)) {
            Response::json(false, 'Cette analyse ne peut plus être utilisée. Analysez à nouveau le rapport.', null, 409);
        }
        Response::json(true, 'Rapport envoyé pour examen.', ['id' => $id, 'status' => 'pending'], 201);
    }

    public function reviewList(): void
    {
        Response::json(true, 'Rapports chargés.', (new DisciplineReport())->forReview());
    }

    public function reviewDetails(int $id): void
    {
        $report = (new DisciplineReport())->reviewDetails($id);
        if ($report === null) {
            Response::json(false, 'Rapport introuvable.', null, 404);
        }
        Response::json(true, 'Rapport chargé.', $report);
    }

    public function validate(int $adminId, int $id, array $body): void
    {
        $severity = $this->severity($body['severity'] ?? null);
        $type = $this->incidentType($body['incident_type'] ?? null);
        $reports = new DisciplineReport();
        if ($reports->reviewDetails($id) === null) {
            Response::json(false, 'Rapport introuvable.', null, 404);
        }
        if (!$reports->validate($id, $adminId, $severity, $type)) {
            Response::json(false, 'Ce rapport a déjà été validé.', null, 409);
        }
        Response::json(true, 'Rapport validé.', $reports->reviewDetails($id));
    }

    public function studentReports(int $userId): void
    {
        Response::json(true, 'Rapports chargés.', (new DisciplineReport())->forStudent($userId));
    }

    public function requestReconsideration(int $userId, int $id, array $body): void
    {
        $reason = $this->requiredText($body['reason'] ?? null, 'Saisissez le motif de la demande.');
        $reports = new DisciplineReport();
        $result = $reports->requestReconsideration($id, $userId, $reason);
        match ($result) {
            'not_found' => Response::json(false, 'Rapport introuvable.', null, 404),
            'duplicate' => Response::json(false, 'Une demande de réexamen existe déjà pour ce rapport.', null, 409),
            'created' => Response::json(true, 'Demande de réexamen envoyée.', $reports->forStudent($userId, $id)[0] ?? null, 201),
        };
    }

    public function resolveReconsideration(int $adminId, int $id, array $body): void
    {
        $outcome = $body['outcome'] ?? null;
        if (!in_array($outcome, ['upheld', 'revised'], true)) {
            Response::json(false, 'Choisissez de maintenir ou de réviser la décision.', null, 422);
        }
        $response = $this->requiredText($body['response'] ?? null, 'Saisissez une réponse pour l’élève.');
        $severity = $outcome === 'revised' ? $this->severity($body['severity'] ?? null) : null;
        $type = $outcome === 'revised' ? $this->incidentType($body['incident_type'] ?? null) : null;
        $reports = new DisciplineReport();
        $result = $reports->resolveReconsideration($id, $adminId, $outcome, $response, $severity, $type);
        match ($result) {
            'not_found' => Response::json(false, 'Rapport introuvable.', null, 404),
            'conflict' => Response::json(false, 'Aucune demande de réexamen en attente pour ce rapport.', null, 409),
            'resolved' => Response::json(true, 'Réexamen enregistré.', $reports->reviewDetails($id)),
        };
    }

    private function requiredText(mixed $value, string $message): string
    {
        if (!is_string($value) || preg_match('/\S/u', $value) !== 1) {
            Response::json(false, $message, null, 422);
        }
        $text = trim($value);
        if (preg_match('/\A.{1,2000}\z/us', $text) !== 1) {
            Response::json(false, 'Le texte doit comporter au maximum 2 000 caractères.', null, 422);
        }
        return $text;
    }

    private function severity(mixed $value): int
    {
        $severity = filter_var($value, FILTER_VALIDATE_INT);
        if (!in_array($severity, [1, 2, 3], true)) {
            Response::json(false, 'Sélectionnez une gravité valide.', null, 422);
        }
        return $severity;
    }

    private function incidentType(mixed $type): ?string
    {
        if ($type !== null && (!is_string($type) || preg_match('/^.{0,160}$/usD', $type) !== 1)) {
            Response::json(false, 'Le type doit comporter au maximum 160 caractères.', null, 422);
        }
        $type = trim($type ?? '');
        return $type === '' ? null : $type;
    }

    private function teacherReport(int $teacherUserId, array $body): array
    {
        $studentId = filter_var($body['student_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $text = $body['report_text'] ?? null;
        if ($studentId === false) {
            Response::json(false, 'Sélectionnez un élève.', null, 422);
        }
        if (!is_string($text) || preg_match('/\S/u', $text) !== 1) {
            Response::json(false, 'Saisissez un rapport non vide.', null, 422);
        }
        if (strlen($text) > 10000) {
            Response::json(false, 'Le rapport dépasse la taille maximale de 10 000 octets.', null, 422);
        }
        $students = (new Student())->forTeacher($teacherUserId, $studentId);
        if (!$students) {
            Response::json(false, 'Cet élève ne fait pas partie de vos classes.', null, 403);
        }
        return [$students[0], $text];
    }

}
