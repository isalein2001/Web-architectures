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
plans                 plan_exercises              workout_sessions           workout_logs
------------------    ------------------------    ----------------------     -------------------------
id                    id                          id                         id
name                  plan_id (FK -> plans.id)    date                       session_id (FK -> workout_sessions.id)
description           exercise_name               plan_id (FK -> plans.id)   exercise_name
                      target_sets                 notes                      set_number
                      target_reps                                            reps
                                                                             weight
                                                                             rest_seconds
```

### Beziehungen

- `plans` zu `plan_exercises`: 1:n  
  Ein Workout-Plan kann mehrere Übungen enthalten. Jede Plan-Übung gehört zu genau einem Plan. Wird ein Plan gelöscht, werden seine Plan-Übungen mitgelöscht (`ON DELETE CASCADE`).

- `plans` zu `workout_sessions`: 1:n, optional auf Session-Seite  
  Ein Workout-Plan kann in mehreren Trainingseinheiten verwendet werden. Eine Trainingseinheit kann aber auch ohne Plan existieren, z. B. als Freestyle-Workout. Wenn ein Plan gelöscht wird, bleibt die Session erhalten und `plan_id` wird auf `NULL` gesetzt (`ON DELETE SET NULL`).

- `workout_sessions` zu `workout_logs`: 1:n  
  Eine Trainingseinheit kann mehrere geloggte Sätze enthalten. Jeder Log-Eintrag gehört zu einer Session. Beim Löschen einer Session werden die zugehörigen Logs gelöscht.

- n:m-Beziehungen gibt es aktuell nicht. Falls später mehrere Nutzer eigene Pläne teilen oder gemeinsam verwenden sollen, könnte dafür eine Zwischentabelle ergänzt werden.

### Pflichtfelder

- `plans.name` darf nicht leer sein.
- `plan_exercises.exercise_name` darf nicht leer sein.
- `workout_sessions.date` darf nicht leer sein.
- `workout_logs.exercise_name` darf nicht leer sein.

### Optionale Felder

- `plans.description` ist optional.
- `plan_exercises.target_sets` und `plan_exercises.target_reps` sind optional, weil nicht jede Übung gleich viele Sätze oder Wiederholungen braucht.
- `workout_sessions.plan_id` ist optional, damit Freestyle-Workouts gespeichert werden können.
- `workout_sessions.notes` ist optional.
- `workout_logs.set_number`, `reps`, `weight` und `rest_seconds` sind optional bzw. können leer oder `0` sein, wenn der Nutzer beim Tracking nicht alles einträgt.

### Noch nicht in SQLite gespeichert

Einige Features werden aktuell bewusst im Frontend über `localStorage` gespeichert und sind noch nicht Teil des SQLite-Schemas:

- Kalenderplanung: `workoutSchedule`
- Trinkziel: `hydrationGoalLiters`
- BMI/Profileinstellungen: `profileGender`, `profileHeightCm`, `profileWeightKg`, `profileBmi`, `bmiTrackingEnabled`
- Alert-Einstellungen: `hydrationAlertsEnabled`, `workoutAlertsEnabled`

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
- `String?`, `Int?`, `Float?`: Das Feld ist optional und darf `NULL` sein.
- `@map("plan_id")`: Der Prisma-Feldname heißt z. B. `planId`, die echte Spalte in SQLite heißt aber `plan_id`.
- `@@map("plans")`: Der Prisma-Modelname heißt `Plan`, die echte Tabelle heißt `plans`.
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

### Calendar Entries, Hydration Goals, BMI Records

These features currently exist in the frontend and are stored in `localStorage`:

- calendar entries: `workoutSchedule`
- custom frontend workout cards: `customWorkoutPlans`
- hydration goal: `hydrationGoalLiters`
- BMI/profile data: `profileGender`, `profileHeightCm`, `profileWeightKg`, `profileBmi`, `bmiTrackingEnabled`

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
