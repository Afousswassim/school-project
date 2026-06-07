<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/Setting.php';
require_once __DIR__ . '/../includes/Response.php';

final class SettingsController
{
    private Setting $settings;

    public function __construct()
    {
        $this->settings = new Setting();
    }

    /**
     * Get current system settings.
     * Only admin can access this.
     */
    public function show(): void
    {
        $settings = $this->settings->getSettings();
        if (!$settings) {
            Response::json(false, 'Settings not found', null, 404);
        }

        Response::json(true, 'Settings retrieved successfully', $settings);
    }

    /**
     * Update system settings.
     * Only admin can access this.
     */
    public function update(array $data): void
    {
        // Validate required fields
        if (empty($data['school_name'])) {
            Response::json(false, 'School name is required', null, 422);
        }

        $settings = $this->settings->updateSettings($data);
        if (!$settings) {
            Response::json(false, 'Failed to update settings', null, 500);
        }

        Response::json(true, 'Settings updated successfully', $settings);
    }
}
