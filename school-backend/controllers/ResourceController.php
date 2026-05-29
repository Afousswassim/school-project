<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/Response.php';

final class ResourceController
{
    public function __construct(private BaseModel $model)
    {
    }

    public function index(): void
    {
        Response::json(true, 'Operation successful', $this->model->all($_GET));
    }

    public function show(int $id): void
    {
        $record = $this->model->find($id);
        if (!$record) {
            Response::json(false, 'Record not found', null, 404);
        }

        Response::json(true, 'Operation successful', $record);
    }

    public function store(array $data): void
    {
        Response::json(true, 'Record created successfully', $this->model->create($data), 201);
    }

    public function update(int $id, array $data): void
    {
        if (!$this->model->find($id)) {
            Response::json(false, 'Record not found', null, 404);
        }

        Response::json(true, 'Record updated successfully', $this->model->update($id, $data));
    }

    public function destroy(int $id): void
    {
        if (!$this->model->find($id)) {
            Response::json(false, 'Record not found', null, 404);
        }

        $this->model->delete($id);
        Response::json(true, 'Record deleted successfully', ['id' => $id]);
    }
}
