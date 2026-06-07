<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: ' . (getenv('CORS_ORIGIN') ?: '*'));
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/Response.php';
require_once __DIR__ . '/../middlewares/AuthMiddleware.php';
require_once __DIR__ . '/../models/BaseModel.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Student.php';
require_once __DIR__ . '/../models/Teacher.php';
require_once __DIR__ . '/../models/Subject.php';
require_once __DIR__ . '/../models/ClassModel.php';
require_once __DIR__ . '/../models/Grade.php';
require_once __DIR__ . '/../models/Absence.php';
require_once __DIR__ . '/../models/Payment.php';
require_once __DIR__ . '/../models/Profile.php';
require_once __DIR__ . '/../models/Setting.php';
require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/ResourceController.php';
require_once __DIR__ . '/../controllers/ProfileController.php';
require_once __DIR__ . '/../controllers/SettingsController.php';

set_exception_handler(fn (Throwable $e) => Response::json(false, getenv('APP_ENV') === 'production' ? 'Server error' : $e->getMessage(), null, 500));

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$path = preg_replace('#^/index\.php#', '', $path);
$path = preg_replace('#^/api#', '', $path);
$segments = array_values(array_filter(explode('/', trim($path, '/'))));
$body = json_decode(file_get_contents('php://input') ?: '[]', true);
$body = is_array($body) ? $body : [];

$auth = new AuthController();
if (($segments[0] ?? '') === 'auth') {
    match ($segments[1] ?? '') {
        'login' => $method === 'POST' ? $auth->login($body) : Response::json(false, 'Method not allowed', null, 405),
        'register' => $method === 'POST' ? $auth->register($body) : Response::json(false, 'Method not allowed', null, 405),
        'me' => $method === 'GET' ? $auth->me(AuthMiddleware::user()) : Response::json(false, 'Method not allowed', null, 405),
        default => Response::json(false, 'Route not found', null, 404),
    };
}

if (($segments[0] ?? '') === 'profile') {
    $authUser = AuthMiddleware::requireRoles(['admin', 'teacher', 'student']);
    $profile = new ProfileController();

    match ([$method, $segments[1] ?? '']) {
        ['GET', ''] => $profile->show($authUser),
        ['PUT', ''] => $profile->update($authUser, $body),
        ['PATCH', ''] => $profile->update($authUser, $body),
        ['POST', 'photo'] => $profile->uploadPhoto($authUser),
        ['PUT', 'password'] => $profile->updatePassword($authUser, $body),
        ['PATCH', 'password'] => $profile->updatePassword($authUser, $body),
        default => Response::json(false, 'Route not found', null, 404),
    };
}

/**
 * Settings routes (admin only)
 */
if (($segments[0] ?? '') === 'settings') {
    AuthMiddleware::requireRoles(['admin']);
    $settings = new SettingsController();

    match ([$method, $segments[1] ?? '']) {
        ['GET', ''] => $settings->show(),
        ['PUT', ''] => $settings->update($body),
        ['PATCH', ''] => $settings->update($body),
        default => Response::json(false, 'Route not found', null, 404),
    };
}

/**
 * Dashboard routes (admin only) - returns statistics for dashboard
 */
if (($segments[0] ?? '') === 'dashboard') {
    AuthMiddleware::requireRoles(['admin']);
    
    if ($method === 'GET' && ($segments[1] ?? '') === 'stats') {
        $student = new Student();
        $teacher = new Teacher();
        $subject = new Subject();
        $classModel = new ClassModel();
        $payment = new Payment();
        $grade = new Grade();
        $absence = new Absence();
        
        // Get total counts (use the model's pagination response)
        $studentData = $student->all(['limit' => 1]);
        $teacherData = $teacher->all(['limit' => 1]);
        $subjectData = $subject->all(['limit' => 1]);
        $classData = $classModel->all(['limit' => 1]);
        $paymentsData = $payment->all(['limit' => 10000]);

        $totalStudents = $studentData['total'] ?? 0;
        $totalTeachers = $teacherData['total'] ?? 0;
        $totalSubjects = $subjectData['total'] ?? 0;
        $totalClasses = $classData['total'] ?? 0;
        $totalPayments = $paymentsData['total'] ?? 0;

        // Calculate payment amounts
        $paidAmount = 0.0;
        $pendingAmount = 0.0;
        $paymentsItems = is_array($paymentsData['items'] ?? null) ? array_values(array_filter($paymentsData['items'], 'is_array')) : [];
        foreach ($paymentsItems as $p) {
            $status = $p['status'] ?? '';
            $amount = (float) ($p['amount'] ?? 0);
            if ($status === 'paid') {
                $paidAmount += $amount;
            } elseif ($status === 'pending' || $status === 'overdue') {
                $pendingAmount += $amount;
            }
        }

        // Get absence and grade stats
        $absencesData = $absence->all(['limit' => 10000]);
        $totalAbsences = $absencesData['total'] ?? 0;
        $absencesItems = is_array($absencesData['items'] ?? null) ? array_values(array_filter($absencesData['items'], 'is_array')) : [];
        $absencesByStatus = array_count_values(array_column($absencesItems, 'status'));

        $gradesData = $grade->all(['limit' => 10000]);
        $gradesItems = is_array($gradesData['items'] ?? null) ? array_values(array_filter($gradesData['items'], 'is_array')) : [];
        $averageGrade = 0.0;
        if (!empty($gradesItems)) {
            $scores = array_column($gradesItems, 'score');
            $numericScores = array_map(fn($s) => (float) $s, $scores);
            $countScores = count($numericScores);
            if ($countScores > 0) {
                $averageGrade = array_sum($numericScores) / $countScores;
            }
        }
        
        $data = [
            'total_students' => $totalStudents,
            'total_teachers' => $totalTeachers,
            'total_subjects' => $totalSubjects,
            'total_classes' => $totalClasses,
            'total_payments' => $totalPayments,
            'paid_amount' => number_format($paidAmount, 2),
            'pending_amount' => number_format($pendingAmount, 2),
            'absences_count' => $totalAbsences,
            'average_grade' => number_format($averageGrade, 2),
            'total_attendance_records' => $totalAbsences,
            'present_count' => $absencesByStatus['present'] ?? 0,
            'absent_count' => $absencesByStatus['absent'] ?? 0,
        ];
        
        Response::json(true, 'Dashboard data loaded successfully', $data);
    } else {
        Response::json(false, 'Route not found', null, 404);
    }
}

$resources = [
    'students' => Student::class,
    'teachers' => Teacher::class,
    'subjects' => Subject::class,
    'classes' => ClassModel::class,
    'grades' => Grade::class,
    'attendance' => Absence::class,
    'absences' => Absence::class,
    'payments' => Payment::class,
];

$resourceRoles = [
    'students' => ['read' => ['admin'], 'write' => ['admin']],
    'teachers' => ['read' => ['admin'], 'write' => ['admin']],
    'subjects' => ['read' => ['admin'], 'write' => ['admin']],
    'classes' => ['read' => ['admin', 'teacher'], 'write' => ['admin']],
    'grades' => ['read' => ['admin', 'teacher', 'student'], 'write' => ['admin', 'teacher']],
    'attendance' => ['read' => ['admin', 'teacher', 'student'], 'write' => ['admin', 'teacher']],
    'absences' => ['read' => ['admin', 'teacher', 'student'], 'write' => ['admin', 'teacher']],
    'payments' => ['read' => ['admin'], 'write' => ['admin']],
];

$resource = $segments[0] ?? '';
if (!isset($resources[$resource])) {
    Response::json(false, 'Route not found', null, 404);
}

$permission = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true) ? 'write' : 'read';
AuthMiddleware::requireRoles($resourceRoles[$resource][$permission] ?? ['admin']);

$controller = new ResourceController(new $resources[$resource]());
$id = isset($segments[1]) ? (int) $segments[1] : null;

match ($method) {
    'GET' => $id ? $controller->show($id) : $controller->index(),
    'POST' => $controller->store($body),
    'PUT', 'PATCH' => $id ? $controller->update($id, $body) : Response::json(false, 'Record id is required', null, 422),
    'DELETE' => $id ? $controller->destroy($id) : Response::json(false, 'Record id is required', null, 422),
    default => Response::json(false, 'Method not allowed', null, 405),
};
