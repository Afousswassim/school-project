<?php
declare(strict_types=1);

return static function (string $issuedAt, array $report, array $school): string {
    $escape = static fn (mixed $value): string => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $field = static fn (mixed $value): string => $value === null || $value === '' ? 'Non renseigné' : $escape($value);
    $date = static fn (?string $value): ?string => $value ? (new DateTimeImmutable($value))->format('d/m/Y') : null;
    $levels = [1 => 'Mineur', 2 => 'Modéré', 3 => 'Grave'];
    $badge = static function (mixed $value) use ($levels): string {
        return isset($levels[$value])
            ? '<span class="severity severity-' . (int) $value . '">' . $levels[$value] . '</span>'
            : 'Non renseignée';
    };
    $percent = static fn (mixed $value): ?string => is_numeric($value)
        ? number_format((float) $value * 100, 1, ',', ' ') . ' %'
        : null;

    $bert = $report['predictions']['bert'] ?? [];
    $ml = $report['predictions']['ml'] ?? [];
    $details = $bert['result']['details'] ?? [];
    $type = $ml['result']['incident_type'] ?? null;
    $typeScore = $percent($ml['result']['incident_type_probabilities'][$type] ?? null);
    $severityProbabilities = [];
    foreach ($levels as $label) {
        $probability = $percent($ml['result']['probabilities'][mb_strtolower($label, 'UTF-8')] ?? null);
        if ($probability !== null) {
            $severityProbabilities[] = $label . ' · ' . $probability;
        }
    }
    $request = $report['reconsideration'];
    $statuses = ['pending' => 'En attente', 'upheld' => 'Décision maintenue', 'revised' => 'Décision révisée'];
    $logo = '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">'
        . '<rect width="36" height="36" rx="8" fill="#3567df"/>'
        . '<path d="M18 13c-3-2.5-6-3-10-2v14c4-1 7-.5 10 2 3-2.5 6-3 10-2V11c-4-1-7-.5-10 2v14" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'
        . '</svg>';

    ob_start();
    ?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
    @page { margin: 36pt 42pt 52pt; }
    body { margin: 0; font: 10pt/1.46 "DejaVu Sans", sans-serif; color: #1f2f45; }
    h1, h2, p { margin: 0; }
    h1 { color: #fff; font-size: 21pt; line-height: 1.15; margin-top: 7pt; }
    h2 { color: #142840; font-size: 12pt; line-height: 1.15; margin: 11pt 0 5pt; padding-bottom: 3pt; border-bottom: 1pt solid #d7e1ec; page-break-after: avoid; }
    .heading { background: #142840; color: #fff; padding: 11pt 15pt; page-break-inside: avoid; }
    .brand { font-size: 14pt; font-weight: bold; }
    .brand img { vertical-align: middle; width: 26pt; height: 26pt; margin-right: 7pt; }
    .school { font-size: 9pt; line-height: 1.2; color: #e5edf6; text-align: right; overflow-wrap: break-word; }
    .school-name { font-weight: bold; color: #fff; }
    .issue { font-size: 9pt; color: #e5edf6; margin-top: 4pt; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    td, th { vertical-align: top; text-align: left; }
    .info td { width: 50%; padding: 3pt 8pt; line-height: 1.25; background: #f2f5f9; border: 1pt solid #fff; overflow-wrap: break-word; }
    .label { color: #465870; font-size: 8pt; font-weight: bold; display: block; }
    .text { white-space: pre-wrap; overflow-wrap: break-word; }
    .analysis th { background: #e6edf5; color: #142840; font-size: 9pt; }
    .analysis th, .analysis td { border: 0.6pt solid #d7e1ec; padding: 3pt 7pt; line-height: 1.22; overflow-wrap: break-word; }
    .analysis .attribute { width: 28%; }
    .analysis tbody th { background: #f4f6f9; font-size: 8.5pt; }
    .help { font-size: 8.5pt; color: #465870; margin-top: 5pt; }
    .severity { padding: 1pt 5pt; font-size: 9pt; font-weight: bold; }
    .severity-1 { background: #e5f4ec; color: #225c43; }
    .severity-2 { background: #fff0d1; color: #774600; }
    .severity-3 { background: #fbe6e8; color: #912d3d; }
    .request-text { margin-top: 7pt; }
    .signatures { margin-top: 11pt; page-break-inside: avoid; color: #465870; font-size: 8.5pt; }
    .signatures td { width: 50%; }
    .signature { height: 47pt; padding: 6pt 8pt; border: 0.7pt solid #d7e1ec; }
    .signature-first { margin-right: 10pt; }
</style>
</head>
<body>
<header class="heading">
    <table><tr>
        <td class="brand"><img alt="" src="data:image/svg+xml;base64,<?= base64_encode($logo) ?>">SchoolPro</td>
        <td class="school">
            <?php if (!empty($school['school_name'])): ?><div class="school-name"><?= $escape($school['school_name']) ?></div><?php endif; ?>
            <?php foreach (['school_address', 'school_phone', 'school_email'] as $key): ?>
                <?php if (!empty($school[$key])): ?><div><?= nl2br($escape($school[$key]), false) ?></div><?php endif; ?>
            <?php endforeach; ?>
        </td>
    </tr></table>
    <h1>Rapport disciplinaire</h1>
    <p class="issue"><?= $escape($report['reference']) ?> &nbsp;·&nbsp; Émis le <?= $escape($issuedAt) ?></p>
</header>

<h2>Informations générales</h2>
<table class="info">
    <tr>
        <td><span class="label">Élève</span><?= $field($report['student_name']) ?></td>
        <td><span class="label">Classe</span><?= $field($report['class_name']) ?></td>
    </tr>
    <tr>
        <td colspan="2"><span class="label">Enseignant</span><?= $field($report['teacher_name']) ?></td>
    </tr>
</table>

<h2>Description de l’incident</h2>
<p class="text"><?= $field($report['report_text']) ?></p>

<h2>Résultats de l’analyse intelligente</h2>
<table class="analysis">
    <thead>
        <tr><th class="attribute">Indicateur</th><th>BERT + mots-clés</th><th>TF-IDF + régression logistique</th></tr>
    </thead>
    <tbody>
        <tr>
            <th>Gravité proposée</th>
            <td><?= isset($bert['error']) ? $escape($bert['error']) : $badge($bert['result']['disciplinary_level'] ?? null) ?></td>
            <td><?= isset($ml['error']) ? $escape($ml['error']) : $badge($ml['result']['disciplinary_level'] ?? null) ?></td>
        </tr>
        <tr><th>Raison</th><td><?= $field($details['reason'] ?? null) ?></td><td>—</td></tr>
        <tr><th>Sentiment</th><td><?= isset($details['stars']) ? $escape($details['stars']) . '/5' : 'Non renseigné' ?></td><td>—</td></tr>
        <tr><th>Score de sentiment</th><td><?= $field($percent($details['confidence'] ?? null)) ?></td><td>—</td></tr>
        <tr>
            <th>Probabilités de gravité</th><td>—</td>
            <td>
                <?php if ($severityProbabilities): ?>
                    <?php foreach ($severityProbabilities as $probability): ?><div><?= $escape($probability) ?></div><?php endforeach; ?>
                <?php else: ?>Non renseignées<?php endif; ?>
            </td>
        </tr>
        <tr><th>Type d’incident proposé</th><td>—</td><td><?= $field($type) ?><?= $typeScore === null ? '' : ' (' . $escape($typeScore) . ')' ?></td></tr>
    </tbody>
</table>
<p class="help">Ces résultats constituent des propositions d’aide à la décision. L’administration détermine la décision finale.</p>

<h2>Décision de l’administration</h2>
<table class="info">
    <tr>
        <td><span class="label">Gravité définitivement retenue</span><?= $badge($report['finalized_severity']) ?></td>
        <td><span class="label">Type d’incident validé</span><?= $field($report['finalized_type']) ?></td>
    </tr>
    <tr>
        <td><span class="label">Date de validation</span><?= $field($date($report['validated_at'])) ?></td>
        <?php if (!empty($report['reviewer_name'])): ?>
            <td><span class="label">Responsable de la validation</span><?= $escape($report['reviewer_name']) ?></td>
        <?php else: ?><td></td><?php endif; ?>
    </tr>
</table>

<?php if ($request !== null): ?>
    <h2>Demande de réexamen</h2>
    <table class="info">
        <tr>
            <td><span class="label">Date de la demande</span><?= $field($date($request['requested_at'])) ?></td>
            <td><span class="label">Statut de la demande</span><?= $field($statuses[$request['status']] ?? null) ?></td>
        </tr>
        <tr>
            <td><span class="label">Décision initiale</span><?= $badge($request['initial_severity']) ?> · <?= $field($request['initial_type']) ?></td>
            <?php if ($request['status'] === 'revised'): ?>
                <td><span class="label">Décision révisée</span><?= $badge($report['finalized_severity']) ?> · <?= $field($report['finalized_type']) ?></td>
            <?php else: ?><td></td><?php endif; ?>
        </tr>
    </table>
    <div class="request-text"><span class="label">Motif de l’élève</span><p class="text"><?= $field($request['reason']) ?></p></div>
    <?php if ($request['response'] !== null && $request['response'] !== ''): ?>
        <div class="request-text"><span class="label">Réponse de l’administration</span><p class="text"><?= $escape($request['response']) ?></p></div>
    <?php endif; ?>
<?php endif; ?>

<table class="signatures"><tr>
    <td><div class="signature signature-first">Signature de l’administration</div></td>
    <td><div class="signature">Cachet de l’établissement</div></td>
</tr></table>
</body>
</html>
    <?php
    return ob_get_clean();
};
