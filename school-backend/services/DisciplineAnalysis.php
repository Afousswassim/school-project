<?php
declare(strict_types=1);

final class DisciplineAnalysis
{
    public function analyze(string $text): array
    {
        $url = rtrim(getenv('DISCIPLINE_ML_URL') ?: 'http://ml:5000', '/');
        $payload = json_encode(['report_text' => $text], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        return [
            'bert' => $this->predict($url . '/api/analyze-report', $payload, 120),
            'ml' => $this->predict($url . '/api/analyze-report-ml', $payload, 10),
        ];
    }

    private function predict(string $url, string $payload, int $timeout): array
    {
        $context = stream_context_create(['http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nConnection: close\r\n",
            'content' => $payload,
            'timeout' => $timeout,
            'follow_location' => 0,
        ]]);
        $response = @file_get_contents($url, false, $context);
        $result = $response === false ? null : json_decode($response, true);
        if (!isset($result['disciplinary_level'])) {
            return ['error' => 'Cette méthode est momentanément indisponible.'];
        }
        unset($result['report_text']);
        return ['result' => $result];
    }
}
