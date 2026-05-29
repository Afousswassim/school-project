<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers/Env.php';
Env::load(__DIR__ . '/.env');

require_once __DIR__ . '/routes/api.php';
