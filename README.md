# School Management System

Full-stack school platform with React/Vite, PHP MVC REST API, MySQL, JWT authentication, role-based access, and Docker Compose deployment.

## Run With Docker

```bash
docker compose up -d --build
docker compose ps
```

Open:

- Frontend: http://localhost:8080
- Backend API: http://localhost:8000/api
- phpMyAdmin: http://localhost:3000

Use `docker compose stop` to stop the project while keeping its containers and volumes.

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

### Exporter un rapport validé

Le schéma actuel conserve la date d’envoi du rapport. La date de l’incident ne figure pas dans le PDF, faute de champ dédié.

Depuis le compte administrateur, ouvrez **Rapports disciplinaires**. L’action **PDF** de la liste et le bouton **Télécharger le PDF** du détail sont disponibles pour les rapports validés. L’export utilise les résultats initiaux conservés dans MySQL et la décision en vigueur, avec le réexamen s’il existe.

### Tests navigateur et API

Avec Node.js et Microsoft Edge installés, depuis la racine du dépôt.

```powershell
$browserDeps = Join-Path $env:TEMP 'school-discipline-browser'
npm.cmd install --prefix $browserDeps --no-audit --no-fund playwright-core@1.56.1
$env:NODE_PATH = Join-Path $browserDeps 'node_modules'
node tests/discipline-demo.cjs
node tests/discipline-pdf.cjs
```

`node tests/discipline-pdf.cjs` utilise les comptes de démonstration et les deux modèles démarrés. Il crée deux rapports fictifs, vérifie les téléchargements et les permissions, puis retire ses rapports de MySQL. Les PDF restent dans `tests/artifacts/discipline-pdf/`.

`node tests/discipline-demo.cjs holdout` vérifie en plus le rendu de 20 rapports annotés réservés au test (deux par type) et de huit cas à vérifier.

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

Le fichier `school-ml/data/rapports_baseline.csv` conserve le corpus historique (72 rapports d’entraînement et 24 de test, annotés uniquement en gravité). La méthode historique BERT + mots-clés reste disponible dans l’application et dans la comparaison. Elle peut proposer « Grave » pour un rapport contenant « aucun coup », car les mots-clés priment sur le sentiment.

Le corpus `school-ml/data/rapports_fictifs.csv` réunit 936 formulations d’entraînement pour 234 scénarios, 57 rapports de test indépendants et huit textes fictifs ambigus ou hors catégorie réservés à la vérification. Le test compare les méthodes sur les mêmes 57 rapports. La validation croisée répartit les groupes de scénarios en cinq plis, avec stratification conjointe sur la gravité et le type. Les deux pipelines optimisent séparément le F1-macro.

Le volume `discipline_models` reçoit `gravite.joblib` et `type_incident.joblib`. Le service entraîne les deux modèles au démarrage si un fichier manque. Après une modification du corpus ou du réglage, reconstruisez l’image et relancez explicitement l’entraînement. Le cache `bert_cache` permet à Flask de charger BERT hors ligne après la première préparation.

```powershell
docker compose build ml frontend
docker compose run --rm --no-deps ml python -m ml.train
docker compose up -d --no-deps --force-recreate ml frontend
docker compose exec -T ml python -m ml.evaluate
```

L’évaluation produit l’accuracy, les métriques macro, les matrices de confusion et les identifiants des erreurs, qui correspondent à la colonne `scenario` du corpus. Les lignes des matrices correspondent aux annotations et les colonnes aux prédictions, dans l’ordre donné par `labels`. Les seuils d’incertitude utilisent la probabilité maximale, l’écart avec la deuxième classe et la couverture du vocabulaire. Lorsque le modèle signale une incertitude, l’interface demande une vérification humaine et laisse les champs de décision à saisir. Les analyses précédemment enregistrées restent consultables avec leurs résultats d’origine.

#### Résultats sur les 57 rapports fictifs indépendants

| Méthode | Cible | Accuracy | Précision macro | Rappel macro | F1-macro |
| --- | --- | ---: | ---: | ---: | ---: |
| TF-IDF historique | Gravité | 59,6 % | 58,8 % | 63,4 % | 59,7 % |
| TF-IDF optimisé | Gravité | 75,4 % | 75,6 % | 76,6 % | 76,0 % |
| BERT + mots-clés | Gravité | 36,8 % | 40,2 % | 37,7 % | 31,1 % |
| TF-IDF optimisé | Type | 93,0 % | 94,4 % | 93,5 % | 93,5 % |

Le modèle de gravité reconnaît 15 des 23 cas modérés, contre 7 pour le modèle historique, et 15 des 18 cas graves. Il sous-estime notamment des retards répétés (`test_04`) et une menace écrite confirmée (`test_47`). Le modèle de type confond entre autres une insulte isolée avec un harcèlement (`test_20`) et un retard décrit sans le nommer avec un non-respect des consignes (`test_05`). BERT + mots-clés propose « Grave » 43 fois sur 57, y compris pour une insulte avec la précision « ne se sont jamais frappés » (`test_56`).

Les seuils actuels demandent une vérification pour 51 des 57 rapports annotés et pour les huit cas ambigus ou hors catégorie. Les métriques du tableau mesurent la meilleure classe proposée avant application de ces seuils.

Les mesures concernent un petit échantillon fictif. Le fichier de résultats inclut les quatre matrices de confusion et tous les identifiants d’erreurs. [Résultats complets de l’évaluation Docker](school-ml/data/evaluation.json)

Le test Edge `holdout` a contrôlé l’affichage et la transmission de 28 nouveaux rapports. Les deux propositions et leurs distributions étaient présentes dans chacun des 28 brouillons MySQL. Un rapport de démonstration a été envoyé, relu et validé avec une gravité choisie par l’administrateur, puis affiché à l’élève concerné.

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
