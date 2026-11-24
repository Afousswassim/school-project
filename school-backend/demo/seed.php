<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

if (getenv('APP_ENV') !== 'local') {
    fwrite(STDERR, "Ce seed est réservé à APP_ENV=local.\n");
    exit(1);
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../models/BaseModel.php';
require_once __DIR__ . '/../services/DisciplineAnalysis.php';
foreach (['User', 'Teacher', 'ClassModel', 'Student', 'Subject', 'Grade', 'Absence', 'DisciplineReport'] as $model) {
    require_once __DIR__ . "/../models/{$model}.php";
}

function demoRow(PDO $db, string $sql, array $params = []): ?array
{
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetch() ?: null;
}

function demoUser(PDO $db, User $users, string $role, string $email, string $name, string $avatar): array
{
    $photo = "/demo/avatars/{$avatar}.png";
    if (!is_file(__DIR__ . "/avatars/{$avatar}.png")) {
        throw new RuntimeException("Avatar manquant pour {$email}.");
    }

    $existing = $users->findByEmail($email);
    if (!$existing) {
        $roleId = demoRow($db, 'SELECT id FROM roles WHERE name = ?', [$role])['id']
            ?? throw new RuntimeException("Rôle manquant : {$role}.");
        return $users->createUser([
            'email' => $email, 'name' => $name, 'role_id' => $roleId,
            'password' => 'password', 'profile_photo' => $photo,
        ]);
    }
    if ($existing['role'] !== $role) {
        throw new RuntimeException("Le compte {$email} correspond à un autre rôle.");
    }

    $currentPhoto = $existing['profile_photo'];
    $missingUpload = $currentPhoto && str_starts_with($currentPhoto, '/uploads/profiles/')
        && !is_file(__DIR__ . '/../uploads/profiles/' . basename($currentPhoto));
    if (!$currentPhoto || $missingUpload) {
        $update = $db->prepare('UPDATE users SET profile_photo = ? WHERE id = ? AND profile_photo <=> ?');
        $update->execute([$photo, $existing['id'], $currentPhoto]);
    }
    return $existing;
}

function seedSchoolDemo(PDO $db): void
{
    $groups = [
        [
            'section' => 'A',
            'teacher' => ['teacher@school.test', 'Teacher', 'User', 'T-1001', 'teacher'],
            'students' => [
                ['student@school.test', 'Student', 'User', 'S-1001', 'student'],
                ['mila.demo@school.test', 'Mila', 'Moreau', 'SD-002', 'mila'],
                ['yanis.demo@school.test', 'Yanis', 'Belaïd', 'SD-003', 'yanis'],
                ['noa.demo@school.test', 'Noa', 'Bernard', 'SD-004', 'noa'],
            ],
            'subjects' => [
                ['MATH10', 'Mathematics', 'Mathématiques'],
                ['DEMO-SCI10', 'Sciences', 'Sciences'],
            ],
        ],
        [
            'section' => 'B',
            'teacher' => ['teacher.demo.b@school.test', 'Camille', 'Robert', 'TD-002', 'teacher-b'],
            'students' => [
                ['student.demo.other@school.test', 'Second', 'Élève Démo', 'DEMO-DISC-OTHER', 'student-other'],
                ['hana.demo@school.test', 'Hana', 'Laurent', 'SD-006', 'hana'],
                ['ilyes.demo@school.test', 'Ilyes', 'Martin', 'SD-007', 'ilyes'],
                ['sara.demo@school.test', 'Sara', 'Girard', 'SD-008', 'sara'],
            ],
            'subjects' => [
                ['DEMO-FR10', 'Français', 'Français'],
                ['DEMO-HIS10', 'Histoire', 'Histoire'],
            ],
        ],
    ];

    $users = new User();
    $teachers = new Teacher();
    $classes = new ClassModel();
    $students = new Student();
    $subjects = new Subject();
    $grades = new Grade();
    $attendance = new Absence();
    $assignments = [];

    foreach ($groups as $group) {
        [$email, $first, $last, $number, $avatar] = $group['teacher'];
        $teacherUser = demoUser($db, $users, 'teacher', $email, "{$first} {$last}", $avatar);
        $teacher = demoRow($db, 'SELECT * FROM teachers WHERE email = ?', [$email]) ?? $teachers->create([
            'user_id' => $teacherUser['id'], 'email' => $email, 'first_name' => $first,
            'last_name' => $last, 'employee_number' => $number,
        ]);
        if ($teacher['user_id'] === null) {
            $teacher = $teachers->update((int) $teacher['id'], ['user_id' => $teacherUser['id']]);
        }
        if ((int) $teacher['user_id'] !== (int) $teacherUser['id']) {
            throw new RuntimeException("La fiche enseignant {$email} est liée à un autre compte.");
        }

        $className = 'Grade 10 ' . $group['section'];
        $year = '2025-2026';
        $class = demoRow($db, 'SELECT * FROM classes WHERE name = ? AND academic_year = ? AND teacher_id = ? ORDER BY id LIMIT 1',
            [$className, $year, $teacher['id']]) ?? $classes->create([
            'name' => $className, 'level' => 'Grade 10', 'section' => $group['section'],
            'academic_year' => $year, 'teacher_id' => $teacher['id'],
        ]);

        $lessons = [];
        foreach ($group['subjects'] as [$code, $name, $label]) {
            $subject = demoRow($db, 'SELECT * FROM subjects WHERE code = ?', [$code]) ?? $subjects->create([
                'code' => $code, 'name' => $name, 'teacher_id' => $teacher['id'],
            ]);
            if ((int) $subject['teacher_id'] !== (int) $teacher['id']) {
                throw new RuntimeException("La matière {$code} est affectée à un autre enseignant.");
            }
            $lessons[] = [$subject['id'], $label];
        }

        foreach ($group['students'] as $index => [$email, $first, $last, $number, $avatar]) {
            $studentUser = demoUser($db, $users, 'student', $email, "{$first} {$last}", $avatar);
            $student = demoRow($db, 'SELECT * FROM students WHERE email = ?', [$email]) ?? $students->create([
                'user_id' => $studentUser['id'], 'class_id' => $class['id'], 'email' => $email,
                'first_name' => $first, 'last_name' => $last, 'student_number' => $number,
            ]);
            if (($student['user_id'] !== null && (int) $student['user_id'] !== (int) $studentUser['id'])
                || ($student['class_id'] !== null && (int) $student['class_id'] !== (int) $class['id'])) {
                throw new RuntimeException("La fiche élève {$email} est liée à un autre compte ou à une autre classe.");
            }
            if ($student['user_id'] === null || $student['class_id'] === null) {
                $students->update((int) $student['id'], ['user_id' => $studentUser['id'], 'class_id' => $class['id']]);
            }
            $assignments[$email] = [(int) $student['id'], (int) $class['id'], (int) $teacherUser['id']];

            foreach ($lessons as $lesson => [$subjectId, $label]) {
                $exam = "Démo — {$label}";
                $date = '2026-01-' . (12 + $lesson);
                $found = demoRow($db, 'SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND exam_name = ? AND exam_date = ?',
                    [$student['id'], $subjectId, $exam, $date]);
                if (!$found) {
                    $grades->create([
                        'student_id' => $student['id'], 'subject_id' => $subjectId, 'teacher_id' => $teacher['id'],
                        'exam_name' => $exam, 'exam_date' => $date, 'score' => 72 + ($index * 4) + ($lesson * 5),
                        'max_score' => 100, 'term' => 'Term 2',
                    ]);
                }
            }
            $statuses = ['present', 'absent', 'late', 'excused'];
            foreach ($statuses as $day => $status) {
                $subjectId = $lessons[$day % count($lessons)][0];
                $date = '2026-01-' . (12 + $day);
                $found = demoRow($db, 'SELECT id FROM attendance WHERE student_id = ? AND subject_id = ? AND attendance_date = ?',
                    [$student['id'], $subjectId, $date]);
                if (!$found) {
                    $attendance->create([
                        'student_id' => $student['id'], 'subject_id' => $subjectId, 'class_id' => $class['id'],
                        'teacher_id' => $teacher['id'], 'attendance_date' => $date, 'status' => $status,
                    ]);
                }
            }
        }
    }

    seedDemoReports($db, $assignments);
}

function seedDemoReports(PDO $db, array $assignments): void
{
    $examples = [
        ['student@school.test', 'L’élève est arrivé en retard de dix minutes au début du cours.', 'Retard', 1],
        ['mila.demo@school.test', 'Pendant le contrôle, l’élève a triché en recopiant les réponses de son voisin.', 'Triche', null],
        ['hana.demo@school.test', 'L’élève a insulté un camarade, mais n’a porté aucun coup et le cours a repris.', 'Insulte', null],
    ];
    $reports = new DisciplineReport();
    $analysis = new DisciplineAnalysis();
    foreach ($examples as [$email, $text, $type, $severity]) {
        [$studentId, $classId, $teacherId] = $assignments[$email];
        $existing = demoRow($db, "SELECT id, status FROM discipline_reports
            WHERE student_id = ? AND teacher_user_id = ? AND text_hash = ? AND status IN ('pending', 'validated')
            ORDER BY id LIMIT 1", [$studentId, $teacherId, hash('sha256', $text)]);
        if ($existing) {
            printf("%s : rapport %d déjà présent (%s).\n", $type, $existing['id'], $existing['status']);
            continue;
        }

        $predictions = $analysis->analyze($text);
        foreach ($predictions as $method => $prediction) {
            if (!isset($prediction['result'])) {
                throw new RuntimeException("Analyse {$method} indisponible pour {$type}. Préparez les modèles Flask puis relancez.");
            }
        }
        $reportId = $reports->saveAnalysis($teacherId, $studentId, $classId, $text, $predictions);
        if (!$reports->submit($reportId, $teacherId, $studentId, $text)) {
            throw new RuntimeException("Le rapport {$type} n’a pas pu être transmis.");
        }
        if ($severity !== null && !$reports->validate($reportId, null, $severity, $type)) {
            throw new RuntimeException("Le rapport {$type} n’a pas pu être validé.");
        }
        printf("%s : rapport %d créé. BERT %s, TF-IDF %s.\n", $type, $reportId,
            $predictions['bert']['result']['disciplinary_level'], $predictions['ml']['result']['disciplinary_level']);
    }
}

$db = Database::connection();
if ((int) $db->query("SELECT GET_LOCK(CONCAT('schoolpro:demo:', DATABASE()), 15)")->fetchColumn() !== 1) {
    fwrite(STDERR, "Un chargement de démo est déjà en cours.\n");
    exit(1);
}
$exitCode = 0;
try {
    $db->beginTransaction();
    seedSchoolDemo($db);
    $db->commit();
    echo "Démo prête : 2 enseignants, 8 élèves, 2 classes.\n";
} catch (Throwable $error) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    fwrite(STDERR, $error->getMessage() . "\n");
    $exitCode = 1;
} finally {
    $db->query("SELECT RELEASE_LOCK(CONCAT('schoolpro:demo:', DATABASE()))");
}
exit($exitCode);
