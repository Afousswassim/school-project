# School Management System

Full-stack school platform with React/Vite, PHP MVC REST API, MySQL, JWT authentication, role-based access, and Docker Compose deployment.

## Run With Docker

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:8080
- Backend API: http://localhost:8000/api
- phpMyAdmin: http://localhost:3000

Seed login accounts use password `password`:

- Admin: `admin@school.test`
- Teacher: `teacher@school.test`
- Student: `student@school.test`

## Démo des rapports disciplinaires

### Charger le jeu scolaire prérempli

Depuis PowerShell, avec Docker Desktop ouvert et les deux modèles préparés, démarrez les services puis chargez la démo sur le volume MySQL courant.

```powershell
docker compose up -d --build --wait
docker compose exec -T backend php /var/www/html/demo/seed.php
```

Vous pouvez relancer la commande de seed. Elle réutilise les comptes de démo et n’ajoute que les données manquantes. Les mots de passe existants, les photos personnalisées disponibles et les décisions déjà enregistrées sont conservés. Les photos nouvelles sont stockées dans le volume `profile_uploads`. Si vous migrez un ancien conteneur PHP qui contient encore des photos dans son système de fichiers, copiez `backend:/var/www/html/uploads/profiles/.` avec `docker compose cp` avant de le recréer, puis restaurez ces fichiers dans le nouveau conteneur au même emplacement.

| Classe | Rôle | Compte | Mot de passe de démo |
| --- | --- | --- | --- |
| Grade 10 A | Enseignant | `teacher@school.test` | `password` |
| Grade 10 A | Élève | `student@school.test` | `password` |
| Grade 10 A | Élève | `mila.demo@school.test` | `password` |
| Grade 10 A | Élève | `yanis.demo@school.test` | `password` |
| Grade 10 A | Élève | `noa.demo@school.test` | `password` |
| Grade 10 B | Enseignant | `teacher.demo.b@school.test` | `password` |
| Grade 10 B | Élève | `student.demo.other@school.test` | `password` |
| Grade 10 B | Élève | `hana.demo@school.test` | `password` |
| Grade 10 B | Élève | `ilyes.demo@school.test` | `password` |
| Grade 10 B | Élève | `sara.demo@school.test` | `password` |
| | Admin existant | `admin@school.test` | Utiliser le mot de passe habituel |

Chaque élève a deux notes dans deux matières et quatre relevés de présence datés de janvier 2026. L’élève `student@school.test` peut consulter le rapport de retard et sa décision fictive. Les rapports de triche et d’insulte arrivent dans **Rapports à examiner**. Le seed enregistre les réponses réelles des deux routes Flask et la décision fictive est distincte des prédictions, sans attribution à un compte administrateur.

Textes à coller dans **Rapports disciplinaires** avec les comptes enseignants.

1. L’élève est arrivé en retard de dix minutes au début du cours.
2. Pendant le contrôle, l’élève a triché en recopiant les réponses de son voisin.
3. L’élève a insulté un camarade, mais n’a porté aucun coup et le cours a repris.

Pour rejouer les vérifications de ce jeu de données dans Edge, suivez l’installation de Playwright ci-dessous puis lancez `node tests/school-demo.cjs`. Le test utilise le mot de passe initial du projet pour l’administrateur. Si le mot de passe a changé, vous pouvez fournir la variable d’environnement `SCHOOL_DEMO_ADMIN_PASSWORD` au processus de test.

### Préparer les modèles lors de la première installation

Depuis le dossier de travail sur `feature/rapports-disciplinaires`, démarrez Docker Desktop en mode conteneurs Linux, puis exécutez les commandes suivantes dans PowerShell. Exécutez les deux commandes `docker compose run` lors de la première préparation des modèles.

```powershell
docker compose build ml
docker compose run --rm --no-deps ml python -m ml.train
docker compose run --rm --no-deps -e HF_HUB_OFFLINE=0 ml python -c 'from nlp.nlp_service import load_classifier; load_classifier()'
docker compose up -d --build --wait
docker compose ps
```

Ouvrez http://localhost:8080. Les comptes ci-dessous utilisent `password`.

- `teacher@school.test` ouvre **Rapports disciplinaires**, choisit **Grade 10 A** puis **Student User**, analyse un texte fictif et clique sur **Envoyer pour examen**.
- `admin@school.test` ouvre **Rapports à examiner** depuis le tableau de bord, consulte le rapport, renseigne la décision et clique sur **Valider le rapport**.
- `student@school.test` consulte la date, le type et la gravité retenus dans **Mes rapports disciplinaires**.
- `student.demo.other@school.test` sert à vérifier l’isolation entre élèves. Le jeu scolaire l’affecte à **Grade 10 B**.

### Tests navigateur et API

Avec Node.js et Microsoft Edge installés, depuis la racine du dépôt.

```powershell
$browserDeps = Join-Path $env:TEMP 'school-discipline-browser'
npm.cmd install --prefix $browserDeps --no-audit --no-fund playwright-core@1.56.1
$env:NODE_PATH = Join-Path $browserDeps 'node_modules'
node tests/discipline-demo.cjs
```

Pour vérifier le rendu quand TF-IDF échoue, mettez temporairement son fichier de côté dans le volume de démo. La commande remet le modèle en place après le test.

```powershell
docker compose exec -T ml sh -c 'test ! -e artifacts/gravite.demo-backup && mv artifacts/gravite.joblib artifacts/gravite.demo-backup'
if ($LASTEXITCODE -ne 0) { throw 'Impossible d’isoler le modèle de démo.' }
try {
    node tests/discipline-demo.cjs ml
    if ($LASTEXITCODE -ne 0) { throw 'Le test du résultat partiel a échoué.' }
} finally {
    docker compose exec -T ml mv artifacts/gravite.demo-backup artifacts/gravite.joblib
}
```

Arrêtez et relancez la démo avec les mêmes données et modèles.

```powershell
docker compose down
docker compose up -d --wait
```

### Données et modèles

PHP contrôle l’affectation via `students.class_id → classes.teacher_id → teachers.user_id`, puis transmet uniquement `report_text` aux deux méthodes Flask sur le réseau Compose. La référence d’analyse est liée à l’enseignant, à l’élève, à la classe et à l’empreinte du texte. Elle est utilisable pendant 24 heures. L’envoi enregistre le texte d’origine et fait passer le rapport à **À examiner**. La validation renseigne une décision distincte des propositions et ne déclenche aucune sanction.

Le conteneur PHP applique la migration `school-backend/migrations/discipline-reports.php` à chaque démarrage, après l’initialisation de MySQL. Elle peut aussi être relancée avec `docker compose exec -T backend php /var/www/html/migrations/discipline-reports.php`. Les données de paiement historiques restent dans MySQL.

Les fichiers d’entraînement de `school-ml` proviennent de `feature/ml-gravite` au commit `b2f22975c03ec3d5fb7f561549d5eaeb8c18f3af`. La logique BERT correspond à celle de `reference/bert-mots-cles` au commit `9281127cdf70032b8ee2aaa6e1d20fa24086a335`. Elle peut proposer « Grave » pour un rapport contenant « aucun coup », car les mots-clés priment sur le sentiment.

Les dépendances principales sont épinglées dans `school-ml`. Le volume `bert_cache` conserve la révision BERT téléchargée lors de la préparation, puis Flask utilise ce cache hors ligne pour les analyses. Le volume `discipline_models` conserve `gravite.joblib`, entraîné sur 72 rapports fictifs. La branche Python fournit uniquement un modèle de gravité. Un pipeline de type compatible et de confiance placé dans `/app/artifacts/type.joblib` peut fournir un libellé via `predict`. En son absence, la carte affiche « Type indisponible ».

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

Rapports disciplinaires :

- Enseignant : `GET /api/discipline-reports/classes`, `GET /api/discipline-reports/students`, `POST /api/discipline-reports/analyze`, `POST /api/discipline-reports/submit`
- Administration : `GET /api/discipline-reports/review`, `GET /api/discipline-reports/review/{id}`, `POST /api/discipline-reports/review/{id}`
- Étudiant : `GET /api/discipline-reports/mine`

Auth:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
