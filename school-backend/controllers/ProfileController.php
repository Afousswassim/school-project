<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/Profile.php';
require_once __DIR__ . '/../includes/Response.php';

final class ProfileController
{
    private Profile $profiles;

    public function __construct()
    {
        $this->profiles = new Profile();
    }

    public function show(array $authUser): void
    {
        $profile = $this->profiles->findForUser((int) $authUser['sub']);
        if (!$profile) {
            Response::json(false, 'Profile not found', null, 404);
        }

        Response::json(true, 'Operation successful', $profile);
    }

    public function update(array $authUser, array $data): void
    {
        $profile = $this->profiles->updateProfile((int) $authUser['sub'], $data);
        if (!$profile) {
            Response::json(false, 'Profile not found', null, 404);
        }

        Response::json(true, 'Profile updated successfully', $profile);
    }

    public function uploadPhoto(array $authUser): void
    {
        if (empty($_FILES['photo']) || !is_array($_FILES['photo'])) {
            Response::json(false, 'Profile photo is required', null, 422);
        }

        $file = $_FILES['photo'];
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::json(false, 'Photo upload failed', null, 422);
        }

        $maxBytes = 2 * 1024 * 1024;
        if ((int) $file['size'] > $maxBytes) {
            Response::json(false, 'Photo must be 2MB or smaller', null, 422);
        }

        $tmpPath = (string) $file['tmp_name'];
        $mime = finfo_file(finfo_open(FILEINFO_MIME_TYPE), $tmpPath) ?: '';
        $allowed = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];

        if (!isset($allowed[$mime]) || !getimagesize($tmpPath)) {
            Response::json(false, 'Only JPG, PNG, or WEBP images are allowed', null, 422);
        }

        $uploadDir = dirname(__DIR__) . '/uploads/profiles';
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
            Response::json(false, 'Upload directory is not writable', null, 500);
        }

        $filename = 'profile-' . (int) $authUser['sub'] . '-' . bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
        $target = $uploadDir . '/' . $filename;

        if (!move_uploaded_file($tmpPath, $target)) {
            Response::json(false, 'Could not save uploaded photo', null, 500);
        }

        $profile = $this->profiles->updatePhoto((int) $authUser['sub'], '/uploads/profiles/' . $filename);
        Response::json(true, 'Profile photo updated successfully', $profile);
    }

    public function updatePassword(array $authUser, array $data): void
    {
        $current = (string) ($data['current_password'] ?? '');
        $new = (string) ($data['new_password'] ?? '');
        $confirm = (string) ($data['confirm_password'] ?? '');

        if ($current === '' || $new === '' || $confirm === '') {
            Response::json(false, 'All password fields are required', null, 422);
        }
        if (strlen($new) < 8) {
            Response::json(false, 'New password must be at least 8 characters', null, 422);
        }
        if ($new !== $confirm) {
            Response::json(false, 'Password confirmation does not match', null, 422);
        }

        if (!$this->profiles->updatePassword((int) $authUser['sub'], $current, $new)) {
            Response::json(false, 'Current password is incorrect', null, 422);
        }

        Response::json(true, 'Password updated successfully');
    }
}
