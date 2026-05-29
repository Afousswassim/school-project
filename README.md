# School Management System

Full-stack school platform with React/Vite, PHP MVC REST API, MySQL, JWT authentication, role-based access, and Docker Compose deployment.

## Run With Docker

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- phpMyAdmin: http://localhost:8080

Seed login accounts use password `password`:

- Admin: `admin@school.test`
- Teacher: `teacher@school.test`
- Student: `student@school.test`

## API

Protected endpoints return:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Core resources:

- `/api/students`
- `/api/teachers`
- `/api/subjects`
- `/api/classes`
- `/api/grades`
- `/api/attendance`
- `/api/payments`

Auth:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
