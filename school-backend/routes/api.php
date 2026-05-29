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
require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/ResourceController.php';

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

$resource = $segments[0] ?? '';
if (!isset($resources[$resource])) {
    Response::json(false, 'Route not found', null, 404);
}

$writeRoles = ['admin'];
if (in_array($resource, ['grades', 'attendance', 'absences'], true)) {
    $writeRoles = ['admin', 'teacher'];
}

if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    AuthMiddleware::requireRoles($writeRoles);
} else {
    AuthMiddleware::user();
}

$controller = new ResourceController(new $resources[$resource]());
$id = isset($segments[1]) ? (int) $segments[1] : null;

match ($method) {
    'GET' => $id ? $controller->show($id) : $controller->index(),
    'POST' => $controller->store($body),
    'PUT', 'PATCH' => $id ? $controller->update($id, $body) : Response::json(false, 'Record id is required', null, 422),
    'DELETE' => $id ? $controller->destroy($id) : Response::json(false, 'Record id is required', null, 422),
    default => Response::json(false, 'Method not allowed', null, 405),
};
