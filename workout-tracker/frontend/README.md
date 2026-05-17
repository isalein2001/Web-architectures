# Workout Tracker

React/Vite frontend with an Express.js + SQLite backend.

The project keeps frontend and backend separate:

- `frontend/`: React + Vite UI
- `backend/`: Express API with SQLite persistence
- `backend/database.sqlite`: local SQLite database
- `backend/database.js`: database initialization and schema creation
- `backend/server.js`: Express app setup and route mounting
- `backend/routes/`: resource-specific API route modules

## Datenmodell

Die Entwicklungsdatenbank ist eine lokale SQLite-Datenbank unter `backend/database.sqlite`. Das aktuelle Backend initialisiert das Schema in `backend/database.js`. Inhaltlich passt das Modell auch zu einer Umsetzung mit `better-sqlite3`; aktuell nutzt der Code noch das Paket `sqlite` mit `sqlite3` als Treiber.

Tabellen-Skizze:

```text
users                 plans                       plan_exercises              workout_sessions           workout_logs                 daily_activities
------------------    -----------------------     ------------------------    ----------------------     -------------------------    --------------------------
id                    id                          id                          id                         id                           id
email                 name                        plan_id (FK -> plans.id)    date                       session_id (FK -> sessions)   user_id (FK -> users.id)
password_hash         description                 exercise_name               plan_id (FK -> plans.id)   exercise_name                date
created_at            user_id (FK -> users.id)    target_sets                 user_id (FK -> users.id)   set_number                   steps
gender                                             target_reps                 notes                      reps                         step_goal
height_cm                                                                      calories_burned            weight                       water_intake_ml
weight_kg                                                                      duration_seconds           rest_seconds                 water_goal_ml
hydration_goal_liters                                                          intensity
onboarding_completed
```

### Beziehungen

- `plans` zu `plan_exercises`: 1:n  
  Ein Workout-Plan kann mehrere Übungen enthalten. Jede Plan-Übung gehört zu genau einem Plan. Wird ein Plan gelöscht, werden seine Plan-Übungen mitgelöscht (`ON DELETE CASCADE`).

- `users` zu `plans`: 1:n  
  Ein Nutzer kann mehrere Workout-Pläne besitzen. Jeder neu erstellte Plan wird über `user_id` dem eingeloggten Nutzer zugeordnet.

- `users` zu `workout_sessions`: 1:n  
  Ein Nutzer kann mehrere abgeschlossene Trainingseinheiten besitzen. Jede neu gespeicherte Session wird über `user_id` dem eingeloggten Nutzer zugeordnet.

- `plans` zu `workout_sessions`: 1:n, optional auf Session-Seite  
  Ein Workout-Plan kann in mehreren Trainingseinheiten verwendet werden. Eine Trainingseinheit kann aber auch ohne Plan existieren, z. B. als Freestyle-Workout. Wenn ein Plan gelöscht wird, bleibt die Session erhalten und `plan_id` wird auf `NULL` gesetzt (`ON DELETE SET NULL`).

- `workout_sessions` zu `workout_logs`: 1:n  
  Eine Trainingseinheit kann mehrere geloggte Sätze enthalten. Jeder Log-Eintrag gehört zu einer Session. Beim Löschen einer Session werden die zugehörigen Logs gelöscht.

- `users` zu `daily_activities`: 1:n
  Ein Nutzer kann pro Datum einen Activity-Datensatz besitzen. Darin werden Schritte, Schrittziel, Wasseraufnahme und Wasserziel für den jeweiligen Tag gespeichert. Die Kombination aus `user_id` und `date` ist eindeutig, damit pro Nutzer und Tag nur ein Datensatz existiert.

- n:m-Beziehungen gibt es aktuell nicht. Falls später mehrere Nutzer eigene Pläne teilen oder gemeinsam verwenden sollen, könnte dafür eine Zwischentabelle ergänzt werden.

### Pflichtfelder

- `plans.name` darf nicht leer sein.
- `users.email` darf nicht leer sein und muss eindeutig sein.
- `users.password_hash` darf nicht leer sein.
- `plan_exercises.exercise_name` darf nicht leer sein.
- `workout_sessions.date` darf nicht leer sein.
- `workout_logs.exercise_name` darf nicht leer sein.
- `daily_activities.user_id` und `daily_activities.date` dürfen nicht leer sein.

### Optionale Felder

- `plans.description` ist optional.
- `plan_exercises.target_sets` und `plan_exercises.target_reps` sind optional, weil nicht jede Übung gleich viele Sätze oder Wiederholungen braucht.
- `workout_sessions.plan_id` ist optional, damit Freestyle-Workouts gespeichert werden können.
- `workout_sessions.notes` ist optional.
- `workout_sessions.calories_burned`, `duration_seconds` und `intensity` sind optional, weil nicht jede gespeicherte Session zwingend Energie- oder Dauerwerte enthält.
- `workout_logs.set_number`, `reps`, `weight` und `rest_seconds` sind optional bzw. können leer oder `0` sein, wenn der Nutzer beim Tracking nicht alles einträgt.
- `daily_activities.steps`, `step_goal`, `water_intake_ml` und `water_goal_ml` besitzen Default-Werte und können über die API aktualisiert werden.

### Noch nicht in SQLite gespeichert

Einige Features werden aktuell bewusst im Frontend über `localStorage` gespeichert und sind noch nicht Teil des SQLite-Schemas:

- Kalenderplanung: `workoutSchedule`
- BMI/Profileinstellungen: `profileGender`, `profileHeightCm`, `profileWeightKg`, `profileBmi`, `bmiTrackingEnabled`
- Alert-Einstellungen: `hydrationAlertsEnabled`, `workoutRemindersEnabled`
- Daily-Goal-Ergänzungen für Kalorien und Trainingsminuten: `dailyCalorieGoal`, `dailyTrainingMinutesGoal`

Diese Daten könnten später als eigene Tabellen ergänzt werden, zum Beispiel `calendar_entries`, `hydration_goals` oder `bmi_records`.

## Prisma ORM Setup

Prisma wurde im Express-Backend als ORM für SQLite eingerichtet. Die bestehenden API-Routen funktionieren weiterhin unter denselben Pfaden, verwenden intern aber Prisma Client statt manueller SQL-Abfragen.

Neue/angepasste Dateien im Backend:

- `backend/prisma/schema.prisma`: Prisma-Datenmodell
- `backend/prisma/migrations/0_init/migration.sql`: erste Baseline-Migration
- `backend/prisma.config.ts`: Prisma-Konfiguration mit `DATABASE_URL`
- `backend/.env`: SQLite-Verbindung zur bestehenden Datenbank
- `backend/prismaClient.js`: Prisma Client mit `@prisma/adapter-better-sqlite3`

Installierte Pakete:

- `prisma` als Dev-Dependency für CLI, Migrationen und Schema-Tools
- `@prisma/client` für Datenbankabfragen im Code
- `@prisma/adapter-better-sqlite3` als SQLite-Adapter
- `better-sqlite3` als SQLite-Treiber
- `dotenv` zum Laden von `DATABASE_URL`

Wichtige Befehle:

```bash
cd workout-tracker/backend
npx prisma validate
npx prisma generate
npx prisma migrate status
```

Die erste Migration wurde als Baseline markiert, weil die SQLite-Tabellen bereits vor Prisma existierten:

```bash
npx prisma migrate resolve --applied 0_init
```

### Prisma Schema kurz erklärt

- `@id`: markiert den Primärschlüssel einer Tabelle.
- `@default(autoincrement())`: SQLite vergibt die ID automatisch.
- `@unique`: der Wert darf in der Tabelle nur einmal vorkommen, z. B. bei `users.email`.
- `String?`, `Int?`, `Float?`: Das Feld ist optional und darf `NULL` sein.
- `@map("plan_id")`: Der Prisma-Feldname heißt z. B. `planId`, die echte Spalte in SQLite heißt aber `plan_id`.
- `@@map("plans")`: Der Prisma-Modelname heißt `Plan`, die echte Tabelle heißt `plans`.
- `@@index([userId])`: legt einen Index auf `user_id` an, damit Owner-Filter schneller abgefragt werden können.
- `@relation(fields: [planId], references: [id])`: beschreibt einen Foreign Key zwischen zwei Tabellen.
- `onDelete: Cascade`: Beim Löschen des Eltern-Datensatzes werden abhängige Datensätze mitgelöscht.
- `onDelete: SetNull`: Beim Löschen des Plans bleibt die Session erhalten, aber `planId` wird `NULL`.

## Prisma Route Refactor

Die Route-Dateien verwenden jetzt Prisma Client statt direkter SQL-Operationen. Die API-Antworten bleiben kompatibel mit dem bestehenden Frontend: Intern heißen Felder in Prisma z. B. `exerciseName`, nach außen werden sie weiterhin als `exercise_name` zurückgegeben.

Umgestellt wurden:

- `backend/routes/workouts.js`
  - `GET /api/plans`
  - `GET /api/plans/:id`
  - `POST /api/plans`
  - `PUT /api/plans/:id`
  - `DELETE /api/plans/:id`
  - nested `plan_exercises` routes
- `backend/routes/sessions.js`
  - `GET /api/sessions`
  - `POST /api/sessions`
  - `DELETE /api/sessions/:id`
- `backend/routes/progress.js`
  - `GET /api/progress/:exercise_name`
- `backend/routes/stats.js`
  - `GET /api/stats`

Beispiel vorher:

```js
const plans = await db.all('SELECT * FROM plans');
res.status(200).json(plans);
```

Beispiel nachher:

```js
const plans = await prisma.plan.findMany({
  include: { exercises: true },
  orderBy: { id: 'asc' },
});
res.status(200).json(plans.map(serializePlan));
```

### Dokumentierte Iterationen

Iteration 1:

- Ersten Handler auf Prisma umgestellt.
- Ziel: Direkte Datenbankabfrage durch `prisma.plan.findMany()` ersetzen.
- Ergebnis: Daten kamen aus SQLite über Prisma statt über manuelles SQL.

Iteration 2:

- Fehlerbehandlung und Kompatibilität ergänzt.
- `try/catch` mit `500`-Status beibehalten.
- `404` für nicht vorhandene Datensätze ergänzt.
- Mapper-Funktionen ergänzt, damit das Frontend weiterhin die bisherigen Feldnamen wie `plan_id`, `exercise_name` und `rest_seconds` erhält.
- Relations über `include` ergänzt, damit Pläne ihre Übungen und Sessions ihre Logs enthalten.

## Persistenz-Test

Für den Persistenz-Test wurde die Hauptressource `plans` verwendet.

Testsequenz:

1. Backend-Server auf Port `3000` gestartet.
2. Neuen Workout-Plan per `POST /api/plans` angelegt.
3. Server mit `Ctrl+C` gestoppt.
4. Server neu gestartet.
5. Den angelegten Eintrag per `GET /api/plans/3` erneut abgefragt.

POST-Request:

```http
POST /api/plans
Content-Type: application/json

{
  "name": "PERSISTENCE TEST WORKOUT",
  "description": "Created for persistence test",
  "exercises": [
    {
      "exercise_name": "Persistence Squat",
      "target_sets": 3,
      "target_reps": "10"
    }
  ]
}
```

POST-Ergebnis:

```json
{
  "id": 3,
  "name": "PERSISTENCE TEST WORKOUT",
  "description": "Created for persistence test"
}
```

GET nach Server-Neustart:

```http
GET /api/plans/3
```

GET-Ergebnis:

```json
{
  "id": 3,
  "name": "PERSISTENCE TEST WORKOUT",
  "description": "Created for persistence test",
  "exercises": [
    {
      "id": 4,
      "plan_id": 3,
      "exercise_name": "Persistence Squat",
      "target_sets": 3,
      "target_reps": "10"
    }
  ]
}
```

Ergebnis: Der Eintrag war nach dem Stoppen und Neustarten des Servers weiterhin vorhanden. Die Daten werden also nicht nur im Arbeitsspeicher gehalten, sondern dauerhaft in SQLite gespeichert und über Prisma wieder ausgelesen.

## Architekturentscheidung: Persistenz, Redis und Object Storage

In der Datenbank sollten langfristig alle fachlichen Nutzerdaten liegen: Workout-Pläne, Übungen, geplante Kalendereinträge, abgeschlossene Sessions, geloggte Sätze, Profilwerte, BMI-Daten und Trinkziele. Diese Daten brauchen Beziehungen, Abfragen und dauerhafte Speicherung, deshalb passen sie gut in eine relationale Datenbank mit Prisma.

Redis wäre eher sinnvoll für kurzlebige Daten wie aktive Reminder, temporäre UI-Zustände, Rate-Limits oder Session-/Cache-Daten, weil diese Informationen schnell gelesen werden müssen, aber nicht zwingend dauerhaft historisiert werden. Ein Cloud Object Store wie S3 wäre sinnvoll für große Dateien wie hochgeladene Workout-Coverbilder, Profilbilder oder andere Medien, weil solche Binärdaten nicht ideal direkt in einer relationalen Datenbank gespeichert werden.

## Aktuelle Sicherheitslücken der API

Die API ist aktuell noch nicht durch Login, JWT oder eine User-Zuordnung geschützt. Dadurch kann ein anonymer Nutzer ohne Token direkt auf die Endpunkte zugreifen.

Konkrete Risiken:

1. Ein anonymer Nutzer kann alle Workout-Pläne lesen.  
   Beispiel: `GET /api/plans` gibt aktuell alle gespeicherten Pläne inklusive Übungen zurück. Es gibt keine Prüfung, ob der anfragende Nutzer diese Pläne überhaupt besitzen darf.

2. Ein anonymer Nutzer kann Trainingsdaten und Fortschritt anderer Nutzer lesen.  
   Beispiel: `GET /api/sessions`, `GET /api/stats` und `GET /api/progress/:exercise_name` geben abgeschlossene Sessions, Trainingsdaten und Fortschrittswerte zurück. Diese Daten können persönliche Fitness- und Leistungsinformationen enthalten.

3. Ein anonymer Nutzer kann Daten verändern oder löschen.  
   Beispiel: `DELETE /api/plans/:id`, `DELETE /api/sessions/:id` oder `DELETE /api/plans/:planId/exercises/:exerciseId` löschen aktuell Datensätze nur anhand der ID. Ohne Authentifizierung und `userId`-Filter könnte jeder Nutzer fremde Workouts oder Sessions löschen.

## JWT Authenticate Middleware

Für die geschützten API-Routen wurde eine Express-Middleware `authenticate` ergänzt:

- Datei: `backend/middleware/authenticate.js`
- Sie liest den JWT aus dem HttpOnly-Cookie `progym_token`.
- Optional akzeptiert sie auch einen `Authorization: Bearer <token>` Header.
- Sie prüft den Token mit `jwt.verify(token, process.env.JWT_SECRET)`.
- Bei Erfolg wird der entschlüsselte Payload in `req.user` gespeichert.
- Bei fehlendem oder ungültigem Token antwortet die API mit `401`.

Aktuell geschützt sind:

- `GET/POST/PUT/DELETE /api/plans`
- `GET/POST/PUT/DELETE /api/workouts`
- `GET/POST/DELETE /api/sessions`
- `GET /api/progress/:exercise_name`
- `GET /api/stats`
- `GET/PATCH /api/daily-activity/today`
- `GET /api/auth/me`

Öffentlich bleiben nur die Auth-Routen, die ohne Login erreichbar sein müssen:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Was passiert bei manipuliertem JWT-Payload?

Wenn jemand den JWT-Payload manuell verändert, zum Beispiel `userId` von `1` auf `2`, passt die digitale Signatur des Tokens nicht mehr zum Inhalt. `jwt.verify()` berechnet die Signatur mit dem geheimen `JWT_SECRET` erneut und vergleicht sie mit der Signatur im Token.

Da ein Angreifer das Secret nicht kennt, kann er nach der Änderung keine gültige neue Signatur erzeugen. Der Token wird deshalb als ungültig erkannt und die Middleware antwortet mit `401 Nicht autorisiert.`

## Ownership-Checks in den DB-Queries

Authentifizierung allein reicht nicht aus: Die API muss zusätzlich prüfen, ob ein eingeloggter Nutzer wirklich Eigentümer der angefragten Ressource ist. Deshalb verwenden die geschützten Prisma-Queries jetzt die `userId` aus `req.user`.

Beispiele:

```js
const plans = await prisma.plan.findMany({
  where: { userId: req.user.userId },
});
```

```js
const plan = await prisma.plan.findFirst({
  where: { id: planId, userId: req.user.userId },
});
```

Dadurch kann ein Nutzer fremde Ressourcen nicht lesen, ändern oder löschen. Wenn eine Ressource zwar existiert, aber einem anderen Nutzer gehört, antwortet die API bewusst mit `404`, damit nicht verraten wird, dass dieser Datensatz überhaupt existiert.

Umgesetzt wurde der Owner-Check für:

- Workout-Pläne: `GET`, `POST`, `PUT`, `DELETE /api/plans`
- Alias-Routen: `GET`, `POST`, `PUT`, `DELETE /api/workouts`
- Nested Exercises über den zugehörigen Plan: `/api/plans/:planId/exercises`
- Workout-Sessions: `GET`, `POST`, `DELETE /api/sessions`
- Progress: `GET /api/progress/:exercise_name`
- Stats: `GET /api/stats`

Bei `POST /api/sessions` wird außerdem geprüft, ob `plan_id` zu einem Plan des eingeloggten Nutzers gehört. Ein Nutzer kann also keine Session auf Basis eines fremden Workout-Plans speichern.

### Frontend authFetch

Im Frontend gibt es jetzt eine zentrale Hilfsfunktion `authFetch(url, options)` in `frontend/src/api.js`.

Sie macht drei Dinge:

- Sie sendet bei jedem API-Request automatisch Cookies mit (`credentials: 'include'`).
- Sie setzt bei JSON-Bodies automatisch den `Content-Type`.
- Wenn der Server `401` zurückgibt, ruft sie `/api/auth/logout` auf und leitet den Nutzer zur Login-Seite weiter.

Login, Registrierung und `GET /api/auth/me` nutzen dieselbe Hilfsfunktion, deaktivieren aber die automatische Weiterleitung bei `401`, damit Login-Fehler normal im Formular angezeigt werden können.

### Ownership-Test

Manueller Test mit zwei Testnutzern:

1. Nutzer A registriert sich.
2. Nutzer B registriert sich.
3. Nutzer A erstellt per `POST /api/plans` einen Workout-Plan.
4. Nutzer A kann den Plan per `GET /api/plans/:id` lesen: `200`.
5. Nutzer B versucht denselben Plan zu lesen: `404`.
6. Nutzer B versucht denselben Plan zu löschen: `404`.
7. Nutzer B versucht eine Session mit der fremden `plan_id` zu speichern: `404`.

Ergebnis: Der Zugriff ist nicht mehr nur authentifiziert, sondern auch an den Eigentümer der Ressource gebunden.

Folge: Als nächster Schritt braucht das Backend echte Authentifizierung mit bcrypt-Passwort-Hashing, JWT-Login und eine Autorisierung pro Query, z. B. `where: { id, userId: req.user.id }`.

## Authentifizierung mit bcrypt und JWT

Das Backend hat neue Auth-Routen unter `/api/auth`:

| Method | Endpoint | Beschreibung | Erfolg |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Neuen Nutzer mit E-Mail und Passwort registrieren | `201` |
| `POST` | `/api/auth/login` | Nutzer einloggen und JWT-Cookie setzen | `200` |
| `GET` | `/api/auth/me` | Aktuellen Nutzer über HttpOnly Cookie prüfen | `200` |
| `POST` | `/api/auth/logout` | Auth-Cookie löschen | `204` |

Sicherheitsmechanismen:

- Passwörter werden mit `bcrypt` gehasht gespeichert und nie im Klartext persistiert.
- Der JWT enthält `userId` und `email` im Payload.
- Der Token läuft nach `24h` ab.
- Der JWT wird als `HttpOnly` Cookie gespeichert, damit JavaScript im Browser den Token nicht direkt auslesen kann.
- Das Secret kommt aus `JWT_SECRET` in `backend/.env`.
- Bei bereits vergebener E-Mail antwortet `POST /api/auth/register` mit `409`.
- Bei falscher E-Mail oder falschem Passwort antwortet `POST /api/auth/login` immer mit `401` und derselben Meldung: `E-Mail oder Passwort ungültig.`

Frontend:

- Neue Seite `/login`
- Neue Seite `/register`
- Nicht eingeloggte Nutzer werden auf `/login` umgeleitet.
- Nach erfolgreichem Login oder Register wird der Nutzer auf `/dashboard` weitergeleitet.
- Frontend-Requests senden Cookies mit `credentials: 'include'`.

Hinweis: Die Authentifizierung ist jetzt vorhanden. Der nächste Security-Schritt ist die Autorisierung auf Datensatzebene, also z. B. `userId` an Workout-Plänen und Sessions und Prisma-Queries mit `where: { userId: req.user.id }`.

## API Architecture

The backend uses a small REST-style API under `/api`. Existing frontend behavior is preserved: the frontend still calls the established `/api/plans`, `/api/sessions`, `/api/progress/:exercise_name`, and `/api/stats` paths.

Workout plans are the main persisted workout resource. The route implementation lives in `backend/routes/workouts.js` and is mounted at both:

- `/api/plans` for backward compatibility with the existing frontend
- `/api/workouts` as a clearer resource alias

SQLite persistence is unchanged. The schema still uses:

- `plans`
- `plan_exercises`
- `workout_sessions`
- `workout_logs`

Foreign key enforcement is enabled with `PRAGMA foreign_keys = ON`, so cascade behavior defined in the schema is respected by SQLite.

## Resources

### Workouts / Plans

Persisted in `plans` and `plan_exercises`.

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/plans` | List all workout plans with exercises | `200` |
| `GET` | `/api/plans/:id` | Get one workout plan with exercises | `200` |
| `POST` | `/api/plans` | Create a workout plan | `201` |
| `PUT` | `/api/plans/:id` | Fully replace/update a workout plan | `200` |
| `DELETE` | `/api/plans/:id` | Delete a workout plan | `204` |
| `GET` | `/api/workouts` | Alias for listing workout plans | `200` |
| `GET` | `/api/workouts/:id` | Alias for one workout plan | `200` |
| `POST` | `/api/workouts` | Alias for creating a workout plan | `201` |
| `PUT` | `/api/workouts/:id` | Alias for fully replacing/updating a workout plan | `200` |
| `DELETE` | `/api/workouts/:id` | Alias for deleting a workout plan | `204` |

Validation:

- Missing `name` returns `400`
- Invalid `exercises` payload returns `400`
- Unknown workout/plan id returns `404`

### Nested Resource: Plan Exercises

Exercises are the second API resource and are nested under their parent workout plan. This mirrors the database relationship: every row in `plan_exercises` belongs to one row in `plans`.

The same nested routes are available through the `/api/workouts/:workoutId/exercises` alias because `/api/workouts` and `/api/plans` use the same router.

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/plans/:planId/exercises` | List exercises for one workout plan | `200` |
| `GET` | `/api/plans/:planId/exercises/:exerciseId` | Get one exercise inside one workout plan | `200` |
| `POST` | `/api/plans/:planId/exercises` | Create an exercise inside one workout plan | `201` |
| `PUT` | `/api/plans/:planId/exercises/:exerciseId` | Fully replace/update one nested exercise | `200` |
| `DELETE` | `/api/plans/:planId/exercises/:exerciseId` | Delete one nested exercise | `204` |

Validation:

- Missing `exercise_name` returns `400`
- Invalid `target_sets` returns `400`
- Unknown parent workout/plan id returns `404`
- Unknown nested exercise id returns `404`

### Sessions

Persisted in `workout_sessions` and `workout_logs`.

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/sessions` | List recent workout sessions with logs | `200` |
| `POST` | `/api/sessions` | Log a workout session | `201` |
| `DELETE` | `/api/sessions/:id` | Delete a logged workout session | `204` |

Validation:

- Missing `date` returns `400`
- Invalid `logs` payload returns `400`
- Unknown session id returns `404`
- Optional `calories_burned` must be an integer between `0` and `3000`
- Optional `duration_seconds` must be an integer between `0` and `86400`
- Optional `intensity` must be one of `light`, `moderate`, `intense` or `hiit`

`GET /api/sessions` now returns up to `500` recent sessions so analytics can calculate longer-term yearly trends and personal-record history instead of only seeing the last few workouts.

### Progress

Computed from logged workout sets.

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/progress/:exercise_name` | Get logged progress for one exercise | `200` |

### Stats

Computed from workout sessions.

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/stats` | Get total sessions and session dates | `200` |

### Daily Activity

Persisted in `daily_activities`.

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/daily-activity/today` | Get today's activity for the current user | `200` |
| `PATCH` | `/api/daily-activity/today` | Update today's steps, step goal, water intake or water goal | `200` |

The route is authenticated and scoped to `req.user.userId`. It uses the current calendar date on the backend and upserts the row for that user and day.

### Calendar Entries, Hydration Goals, BMI Records

These features currently exist in the frontend and are stored in `localStorage`:

- calendar entries: `workoutSchedule`
- custom frontend workout cards: `customWorkoutPlans`
- hydration goal preference: `hydrationGoalLiters`
- BMI/profile data: `profileGender`, `profileHeightCm`, `profileWeightKg`, `profileBmi`, `bmiTrackingEnabled`
- daily calorie and training-minute goals: `dailyCalorieGoal`, `dailyTrainingMinutesGoal`

They are not currently persisted through the Express/SQLite API. This was intentionally left unchanged to avoid breaking existing frontend behavior.

## HTTP Status Codes

The API follows these status conventions:

- `200`: successful `GET`
- `201`: successful create
- `204`: successful delete without response body
- `400`: invalid or missing input
- `404`: requested resource was not found
- `500`: unexpected server/database error

## Refactor Notes

The backend was refactored minimally:

- Route handlers were moved out of `server.js`.
- Workout/plan handlers now live in `backend/routes/workouts.js`.
- Session handlers now live in `backend/routes/sessions.js`.
- Progress handlers now live in `backend/routes/progress.js`.
- Stats handlers now live in `backend/routes/stats.js`.
- Existing frontend API paths were preserved.
- SQLite persistence and schema were preserved.
- Input validation was added where missing.
- `PUT` endpoints fully replace existing workout plans and their exercises.
- `DELETE` endpoints were added for workout plans and sessions.
- Nested exercise endpoints were added under workout plans as a second REST resource.

No frontend architecture was replaced, and no existing database functionality was removed.

## Prompt Iterations

### Iteration 1: Backend REST Refactor

The first backend prompt focused on preserving the existing app while improving API structure:

- Analyze the existing backend before changing code.
- Preserve the React/Vite frontend and Express/SQLite backend architecture.
- Keep existing frontend behavior and existing API paths working.
- Move route handlers out of `server.js` into separate route files.
- Preserve SQLite persistence and the existing database flow.
- Document resources, CRUD endpoints, architecture decisions and status codes.

### Iteration 2: Missing Update Endpoint

The second backend prompt added the missing update operation for the main resource:

- Add `PUT /api/plans/:id`.
- Add `PUT /api/workouts/:id` as an alias.
- Return `200` with the updated plan.
- Return `400` for invalid input and `404` for missing plans.
- Keep existing frontend API paths unchanged.
- Verify valid and invalid requests manually.

### Iteration 3: Nested Second Resource

The third backend prompt completed the bonus REST requirement:

- Add nested `plan_exercises` endpoints under `/api/plans/:planId/exercises`.
- Keep the `/api/workouts/:workoutId/exercises` alias available through the same router.
- Test nested create, read, update and delete behavior.
- Keep the frontend unchanged.

## OWASP Security Audit

| OWASP point | Status | Code-Stellen | Ergebnis / Fix |
| --- | --- | --- | --- |
| A01 Broken Access Control | Abgedeckt | `backend/server.js`, `backend/middleware/authenticate.js`, `backend/routes/workouts.js`, `backend/routes/sessions.js`, `backend/routes/progress.js`, `backend/routes/stats.js` | Fachliche Routen sind mit `authenticate` geschützt. Nutzerbezogene Queries filtern über `req.user.userId`; fremde Ressourcen liefern `404`. |
| A02 Cryptographic Failures | Abgedeckt | `backend/routes/auth.js`, `backend/server.js`, `backend/.env` | Passwörter werden mit `bcrypt.hash(..., 12)` gespeichert. JWT läuft nach 24h ab. `JWT_SECRET` kommt aus `.env` und wird beim Serverstart erzwungen. |
| A03 Injection / XSS | Verbesserungswürdig, gefixt | `backend/routes/*.js`, `backend/routes/auth.js` | DB-Zugriffe laufen über Prisma statt SQL-String-Konkatenation. React escaped Textausgaben. Profilbilder werden jetzt nur noch als `png`, `jpg`, `jpeg` oder `webp` Data-URL bis ca. 10 MB akzeptiert, keine allgemeinen `data:image/*` Werte mehr. |
| A07 Authentication Failures | Verbesserungswürdig, gefixt | `backend/routes/auth.js` | Login-Fehler sind einheitlich: `E-Mail oder Passwort ungültig.` gegen User Enumeration. Neue echte Accounts brauchen jetzt starke Passwörter mit mindestens 8 Zeichen, Buchstaben und Zahlen. Der Demo-Account `jonasarnold@gmail.com` bleibt als bewusst dokumentierte Ausnahme mit Passwort `123` bestehen. Verification-Codes werden mit `crypto.randomInt` erzeugt. |

Zusätzlicher Hinweis: In Development wird der Verification-Code sichtbar ausgegeben, damit der Flow ohne echten Mailprovider getestet werden kann. Für Produktion müsste diese Dev-Ausgabe entfernt und durch einen echten Mailservice ersetzt werden.

## Aktuelle Entwicklungsiteration: Daily Goals, Mobile UX und Analytics Intelligence

Seit dem letzten Commit wurde die Anwendung fachlich von einem reinen Workout-Tracker stärker in Richtung persönliches Performance-Dashboard erweitert. Die Änderungen betreffen Backend-Persistenz, Onboarding, Dashboard, Profil/Settings, Workout-Logging, mobile Bedienbarkeit und Analytics.

### Backend: Session-Energiedaten und Daily Activity

Die Session-Ressource wurde erweitert, damit abgeschlossene Workouts nicht nur Sätze, Wiederholungen und Gewicht enthalten, sondern auch Energie- und Dauerwerte.

Neue optionale Felder auf `workout_sessions`:

- `calories_burned`
- `duration_seconds`
- `intensity`

Diese Werte werden beim Speichern einer Session validiert und in den API-Antworten wieder ausgeliefert. Dadurch können Dashboard und Analytics echte Kalorien- und Trainingsminutenwerte aus abgeschlossenen Workouts ableiten.

Zusätzlich wurde `daily_activities` eingeführt. Diese Tabelle speichert pro Nutzer und Datum:

- aktuelle Schritte
- Schrittziel
- Wasseraufnahme
- Wasserziel

Die neue Route `backend/routes/dailyActivity.js` ist unter `/api/daily-activity` eingebunden. Sie stellt `GET /today` und `PATCH /today` bereit und verwendet einen Upsert-Ansatz, damit der Tagesdatensatz bei Bedarf automatisch angelegt wird.

### Onboarding: zweistufiger Registrierungsabschluss

Das Onboarding wurde in zwei fachliche Schritte geteilt:

1. Profil- und Basisdaten
   - Geschlecht
   - Größe
   - Gewicht
   - tägliches Wasserziel
   - Trainingsfokus

2. Daily Goals
   - tägliche Schritte
   - Workout-Kalorienziel
   - Trainingsminuten

Der Nutzer kann erst ins Dashboard wechseln, wenn beide Schritte vollständig ausgefüllt sind. Fehlende Felder werden direkt rot markiert. Für Daily Goals gibt es bewusst kleine Vorschläge, damit neue Nutzer nicht selbst wissen müssen, welche Werte realistisch sind.

Die Daily-Goal-Werte werden nutzerspezifisch in `localStorage` gespeichert. Das Schrittziel wird zusätzlich mit `daily_activities.step_goal` synchronisiert.

### Dashboard: echte Tagesziel-Logik

Das Daily-Goal-Widget im Dashboard berechnet den Fortschritt jetzt aus drei Komponenten:

- Schritte im Verhältnis zum Schrittziel
- Kalorien im Verhältnis zum Kalorienziel
- Trainingsminuten im Verhältnis zum Minutenziel

Die Gesamtprozentzahl ist der Durchschnitt dieser drei Fortschritte. Das frühere statische Quote-of-the-day wurde entfernt, damit die Fläche für echte Tagesdaten genutzt wird.

Zusätzlich wurden die Goal-Werte direkt editierbar gemacht. Das Dashboard speichert Änderungen in den nutzerspezifischen Storage-Keys und synchronisiert das Schrittziel mit dem Backend. Änderungen aus den Settings werden per `daily-goals-change` Event übernommen.

### Profil und Settings: Daily Goals nachträglich bearbeiten

In der Profil-/Settings-Seite wurde ein neuer kompakter Daily-Goals-Block ergänzt. Dort kann der Nutzer nach dem Onboarding weiterhin ändern:

- Schritte
- Kalorien
- Trainingsminuten

Beim Speichern werden dieselben Storage-Keys genutzt wie im Dashboard. Dadurch bleiben Onboarding, Dashboard und Settings fachlich konsistent.

Außerdem wurden die Account-, Privacy- und Apple-Watch-Bereiche kompakter gemacht, besonders für Mobile. Hydration Goal wurde wieder prominent oben platziert, während Alerts als sekundäre Einstellung weiter unten stehen. Das Advanced-Data-Encryption-Widget wurde mehrfach angepasst, bis Größe und Inhalt zum Layout passten.

### Workout Logger: Session-Zusammenfassung als Datenbasis

Der Workout Logger speichert neben den geloggten Sets jetzt auch zusätzliche Session-Metadaten:

- Kalorienverbrauch
- Dauer in Sekunden
- Intensität

Diese Felder sind wichtig, weil Dashboard und Analytics daraus Tagesfortschritt, Kalorientrends und Trainingsminuten berechnen können.

### Analytics: datengetriebene Strength- und Performance-Auswertung

Die Analytics-Seite wurde von statischen Mock-Werten auf echte Session-Daten umgestellt.

#### Strength Progress

Der Strength-Progress-Chart berechnet jetzt für jedes geloggte Set einen geschätzten Kraftwert:

```text
estimated 1RM = weight * (1 + reps / 30)
```

Aus diesen Werten werden echte Zeitreihen für `1W`, `1M` und `1Y` gebildet. Die Prozentzahl oben im Widget beschreibt den Fortschritt zwischen erstem und letztem relevanten Wert im Zeitraum.

#### Dynamische Top-Exercise-Widgets

Die drei unteren Strength-Widgets sind nicht mehr fest auf Bench Press, Deadlift und Squat gebunden. Stattdessen erkennt die App automatisch die drei häufigsten geloggten Übungen des Nutzers.

Sortierung:

1. Anzahl unterschiedlicher Sessions mit dieser Übung
2. Anzahl geloggter Sets
3. bester geschätzter Kraftwert

Der angezeigte Wert ist der beste geschätzte 1RM dieser Übung in Kilogramm. Dadurch bleiben die Widgets sinnvoll, auch wenn ein Nutzer andere Übungen macht.

#### Performance Intelligence

Neu hinzugefügt wurde eine Performance-Intelligence-Zone mit vier Widgets:

- `Training Volume`: Summe aus `weight * reps` der letzten 30 Tage mit Vergleich zu den 30 Tagen davor.
- `Consistency Score`: Trainingstage dieser Woche im Verhältnis zu einem Zielrhythmus von vier Trainingstagen.
- `Muscle Focus`: grobe Kategorisierung der geloggten Übungen in Push, Pull, Legs, Core, Cardio oder Other.
- `PR Timeline`: erkennt neue persönliche Rekorde anhand des geschätzten 1RM pro Übung.

Alle vier Widgets sind klickbar. Beim Klick öffnet sich ein Info-Modal im Stil der bestehenden BMI-/Hydration-Infoblöcke. Der Dialog erklärt:

- was die Kennzahl bedeutet
- wie sie berechnet wird
- warum sie für Training und Fortschritt relevant ist

Die Info-Modals unterstützen Klick außerhalb, Escape-Taste und Close-Button.

### Mobile UX und Navigation

Die mobile Version wurde über mehrere Iterationen stärker wie eine App gestaltet:

- kompaktere Topbar mit sauber ausgerichteten Icons
- Bottom Navigation mit Dashboard, Workouts, Start, Analytics und Settings
- Start-Button als hervorgehobener mittlerer Button
- reduzierte Größen für Account-, BMI-, Privacy- und Alert-Elemente
- bessere mobile Layouts für Dashboard-, Analytics- und Settings-Widgets
- About Us und Support bleiben auf Desktop in der linken Sidebar, sind mobil aber in den Footer/Settings-Kontext integriert

Ziel war, dass die mobile Version nicht nur responsive ist, sondern als eigenständige, intuitive App-Oberfläche funktioniert.

### Internationalisierung

Die Sprachumschaltung wurde erweitert. Neue UI-Texte für Daily Goals, Analytics Intelligence, Info-Modals, Profileinstellungen und Dashboard-Ziele wurden in `LanguageContext.jsx` für Englisch und Deutsch ergänzt.

Zusätzlich wurde die Kalenderdarstellung lokalisiert, sodass Monatsnamen und Wochentage bei deutscher Spracheinstellung ebenfalls deutsch angezeigt werden.

### Verifikation dieser Iteration

Frontend:

```bash
cd workout-tracker/frontend
npm run build
```

Der Build läuft erfolgreich durch. Vite meldet weiterhin nur die bekannte Chunk-Size-Warnung.

Backend:

```bash
cd workout-tracker/backend
npm test
```

Der Backend-Testbefehl ist aktuell nur der Standardplatzhalter aus `package.json` und bricht mit `Error: no test specified` ab. Das ist kein neuer fachlicher Fehler, sondern bedeutet, dass noch keine automatisierten Backend-Tests eingerichtet wurden.

## Verification

Backend checks:

- `node --check server.js`
- `node --check routes/workouts.js`
- `node --check routes/sessions.js`
- `node --check routes/progress.js`
- local Express startup on test port `3100`
- `GET /api/plans` -> `200`
- `GET /api/stats` -> `200`
- invalid `POST /api/plans` -> `400`
- missing `GET /api/plans/:id` -> `404`
- valid `POST /api/plans` -> `201`
- valid `PUT /api/plans/:id` -> `200`
- invalid `PUT /api/plans/:id` -> `400`
- valid `PUT /api/workouts/:id` -> `200`
- valid `POST /api/plans/:planId/exercises` -> `201`
- valid `GET /api/plans/:planId/exercises` -> `200`
- valid `PUT /api/plans/:planId/exercises/:exerciseId` -> `200`
- invalid `POST /api/plans/:planId/exercises` -> `400`
- missing `GET /api/plans/:planId/exercises/:exerciseId` -> `404`
- valid `DELETE /api/plans/:planId/exercises/:exerciseId` -> `204`
- `DELETE /api/plans/:id` -> `204`

Frontend check:

- `npm run build`

The frontend still uses the same API client paths in `frontend/src/api.js`.

## Frontend Development

This frontend is based on React + Vite and supports HMR during development.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
