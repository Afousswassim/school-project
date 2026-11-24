<?php
declare(strict_types=1);

use Dompdf\Canvas;
use Dompdf\Dompdf;
use Dompdf\FontMetrics;

final class DisciplineReportPdf
{
    public function render(array $report, array $school): string
    {
        $localAutoloader = __DIR__ . '/../vendor/autoload.php';
        require_once is_file($localAutoloader) ? $localAutoloader : __DIR__ . '/../../vendor/autoload.php';

        $issuedAt = (new DateTimeImmutable('now', new DateTimeZone('Africa/Casablanca')))->format('d/m/Y');
        $template = require __DIR__ . '/discipline-report-template.php';

        $pdf = new Dompdf(['defaultFont' => 'DejaVu Sans', 'isFontSubsettingEnabled' => true]);
        $pdf->setPaper('A4', 'portrait');
        $pdf->loadHtml($template($issuedAt, $report, $school), 'UTF-8');
        $pdf->render();
        $pdf->addInfo('Title', 'Rapport disciplinaire ' . $report['reference']);
        $pdf->getCanvas()->page_script(static function (int $page, int $pages, Canvas $canvas, FontMetrics $fonts): void {
            $left = 42;
            $right = $canvas->get_width() - 42;
            $y = $canvas->get_height() - 39;
            $ink = [0.28, 0.34, 0.43];
            $font = $fonts->getFont('DejaVu Sans', 'normal');
            $label = "Page $page / $pages";

            $canvas->line($left, $y, $right, $y, [0.83, 0.87, 0.91], 0.7);
            $canvas->text($left, $y + 8, 'Document confidentiel', $font, 8, $ink);
            $canvas->text($right - $fonts->getTextWidth($label, $font, 8), $y + 8, $label, $font, 8, $ink);
        });

        return $pdf->output();
    }
}
