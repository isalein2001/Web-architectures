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

## Echtzeit-Bedarf und Technologieentscheidung

Vor der Auswahl einer Echtzeit-Technologie wurde geprüft, ob PROGYM produktiv wirklich Live-Kommunikation braucht.

| Frage | Antwort |
| --- | --- |
| Gibt es Daten in der App, die sich ändern können, während ein anderer Nutzer die Seite offen hat? | In der aktuellen Version nur sehr eingeschränkt. Workout-Pläne, Sessions, Daily Goals, Hydration und Analytics sind durch Authentifizierung und Owner-Checks nutzerspezifisch. Andere Nutzer können diese Daten nicht verändern. Relevant wäre höchstens derselbe Account in mehreren Browser-Tabs oder auf mehreren Geräten. |
| Müssen Änderungen sofort sichtbar sein oder reicht ein Reload? | Ein sofortiges Live-Update ist nicht zwingend nötig. Nach dem Speichern aktualisiert das Frontend die betroffenen Daten bereits über normale API-Requests. Wenn derselbe Account parallel auf einem zweiten Gerät offen ist, reicht für den aktuellen Projektstand ein Reload oder ein gelegentlicher Refetch aus. |
| Ist die Kommunikation einseitig oder bidirektional? | Die produktive Kommunikation ist aktuell klassisch request-basiert: Der Client sendet Aktionen an den Server, der Server antwortet. Es gibt keinen Chat, keine kollaborative Bearbeitung und kein Multiplayer-Szenario. Falls Live-Updates als Lernübung ergänzt werden, wäre die Richtung eher einseitig vom Server zum Client. |
| Wie viele Clients könnten gleichzeitig verbunden sein? | Für den aktuellen Projektkontext ist mit wenigen gleichzeitigen Clients zu rechnen, z. B. lokale Entwicklung, Demo und Testnutzer. Realistisch wären im jetzigen Setup eher 1 bis 20 gleichzeitige Verbindungen. Eine große Echtzeit-Infrastruktur ist dafür nicht notwendig. |

### Entscheidung

Für PROGYM ist aktuell **keine produktiv notwendige Echtzeit-Kommunikation** erforderlich. Die App ist primär ein persönlicher Workout-Tracker: Nutzer erstellen eigene Pläne, speichern eigene Sessions und sehen eigene Analytics. Da fremde Nutzer diese Daten nicht verändern dürfen, entsteht kein starker Bedarf für sofortige Live-Synchronisation.

Für den produktiven Stand reichen normale REST-Requests, ein Reload oder gezieltes Refetching nach erfolgreichen Änderungen aus. Ein Polling-Mechanismus wäre als Lernübung vertretbar, z. B. um Dashboard- oder Analytics-Daten alle 30 Sekunden neu abzufragen. Dieser Mechanismus wäre aber ausdrücklich **nicht produktiv notwendig**, sondern nur eine Übung, um periodische Aktualisierung kennenzulernen.

SSE wäre erst sinnvoll, wenn der Server echte einseitige Live-Ereignisse senden soll, zum Beispiel Benachrichtigungen, laufende Workout-Timer oder Fortschrittsupdates. WebSockets wären erst sinnvoll, wenn beide Seiten dauerhaft aktiv kommunizieren müssen, zum Beispiel bei Chat, gemeinsamem Bearbeiten von Workout-Plänen oder Live-Coaching. Diese Szenarien existieren im aktuellen Projektumfang noch nicht.

## SSE-Lernübung: Live-Update für Workout-Pläne

Obwohl PROGYM produktiv aktuell keine zwingende Echtzeit-Kommunikation braucht, wurde als Lernübung ein Server-Sent-Events-Mechanismus für Workout-Pläne eingebaut.

### Umsetzung

Backend:

- Neuer Endpoint: `GET /api/events`
- Der Endpoint öffnet einen dauerhaften `text/event-stream`.
- Die Route ist mit derselben JWT-Middleware geschützt wie die anderen privaten API-Routen.
- Verbundene Clients werden nach `userId` gruppiert, damit Events nur an Tabs desselben eingeloggten Nutzers gehen.
- Wenn ein Workout-Plan über `POST /api/plans` angelegt wird, sendet der Server ein Event:

```text
event: plans:changed
data: {"action":"created","id":123}
```

Zusätzlich werden auch `PUT /api/plans/:id` und `DELETE /api/plans/:id` broadcastet, damit geänderte oder gelöschte Pläne ebenfalls in anderen Tabs sichtbar werden.

Frontend:

- Die Workouts-Seite öffnet in einem `useEffect` einen `EventSource` auf `/api/events`.
- Bei `plans:changed` wird `api.getPlans()` erneut ausgeführt.
- Dadurch aktualisiert sich die Planliste in einem zweiten geöffneten Browser-Tab ohne kompletten Seiten-Reload.

Relevante Dateien:

- `backend/events.js`
- `backend/server.js`
- `backend/routes/workouts.js`
- `frontend/src/pages/Workouts.jsx`
- `frontend/src/api.js`

### Testfall

1. App in zwei Browser-Tabs öffnen.
2. In beiden Tabs mit demselben Account einloggen.
3. In Tab 1 auf der Workouts-Seite einen neuen eigenen Workout-Plan speichern.
4. Erwartung: Tab 2 empfängt `plans:changed`, lädt `/api/plans` neu und zeigt den neuen Plan ohne Seiten-Reload an.

Hinweis: Der Mechanismus ist für dieses Projekt als Lernübung markiert. Für den aktuellen produktiven Bedarf würden Reload oder gezieltes Refetching nach Aktionen weiterhin ausreichen.

Wichtig: Die Kalenderplanung (`workoutSchedule`) liegt aktuell noch im `localStorage` und wird nicht über das Backend gespeichert. Deshalb kann der Server für Kalenderänderungen noch kein SSE-Event senden. Für diesen Sonderfall synchronisieren Dashboard und Analytics geöffnete Tabs über den Browser-`storage`-Event: Wenn ein Tab einen geplanten Workout-Termin in `localStorage` schreibt, liest der andere Tab den aktualisierten Kalenderzustand ein. Sobald Kalenderdaten später als eigene Backend-Ressource gespeichert werden, kann dieselbe SSE-Struktur auch für ein Event wie `schedule:changed` verwendet werden.

### Zwei Iterationen der Beschreibung

Iteration 1:

> Implementiere einen SSE-Endpoint `GET /api/events`. Wenn ein neuer Workout-Plan per `POST /api/plans` erstellt wird, soll der Server allen verbundenen Clients ein Event schicken. Das Frontend soll mit `EventSource` zuhören und die Planliste neu laden.

Problem an dieser Beschreibung: Sie war zu allgemein. „Allen verbundenen Clients“ wäre bei einer App mit privaten Nutzerdaten problematisch, weil andere Nutzer keine Events zu fremden Workout-Plänen erhalten dürfen.

Iteration 2:

> Implementiere einen authentifizierten SSE-Endpoint `GET /api/events`. Verbundene Clients werden pro `userId` gespeichert. Wenn ein eingeloggter Nutzer einen Workout-Plan erstellt, aktualisiert oder löscht, sendet der Server nur an die SSE-Verbindungen dieses Nutzers ein `plans:changed` Event. Die Workouts-Seite öffnet mit `EventSource` inklusive Cookies eine Verbindung und ruft bei diesem Event `api.getPlans()` auf.

Präzisierung im zweiten Versuch:

- Events werden nicht global, sondern nutzerbezogen verschickt.
- Der SSE-Endpoint ist durch JWT geschützt.
- Das Event heißt konkret `plans:changed`.
- Das Frontend reagiert nicht mit einem Seiten-Reload, sondern mit einem gezielten Refetch der Planliste.

## SSE vs. WebSockets - Direktvergleich

| Kriterium | SSE | WebSockets |
| --- | --- | --- |
| Richtung | Server -> Client | Bidirektional |
| Komplexität im Code | Gering. Ein Express-Endpoint mit `text/event-stream` und ein `EventSource` im Frontend reichen aus. | Mittel. Es braucht ein eigenes Verbindungsprotokoll, Event-Handling in beide Richtungen und meist zusätzliche Infrastruktur oder eine Bibliothek wie `socket.io`. |
| Reconnect bei Verbindungsabbruch | Automatisch durch den Browser. `EventSource` versucht die Verbindung nach einem Abbruch erneut aufzubauen. | Muss selbst implementiert werden oder wird von einer Bibliothek wie `socket.io` übernommen. |
| Geeignet für euer Projekt | ✅ Als Lernübung und für einseitige Hinweise wie `plans:changed`. Produktiv aber aktuell nicht zwingend nötig. | ❌ Aktuell nicht passend, weil PROGYM keinen Chat, kein kollaboratives Editing und keine bidirektionale Live-Interaktion braucht. |
| Warum? | Die App muss dem Client höchstens sagen: "Daten haben sich geändert, bitte neu laden." Genau dafür reicht Server -> Client aus. | WebSockets wären überdimensioniert, solange der Client nicht dauerhaft aktiv Nachrichten an andere Clients oder den Server streamen muss. |

### Verhalten bei Server-Neustart

Wenn der Express-Server neu startet, werden alle offenen SSE-Verbindungen beendet. Die im Server gespeicherte Liste verbundener Clients in `backend/events.js` geht dabei verloren, weil sie nur im Arbeitsspeicher liegt.

Im Browser merkt `EventSource`, dass die Verbindung abgebrochen ist, und versucht automatisch, `/api/events` erneut zu öffnen. Sobald der Server wieder erreichbar ist und der JWT-Cookie noch gültig ist, verbindet sich der Client wieder. Die App stürzt dadurch nicht ab; sie bekommt nur während der kurzen Unterbrechung keine Live-Events.

Wichtig: Events, die genau während des Server-Neustarts passieren, werden in der aktuellen Implementierung nicht nachträglich zugestellt. Es gibt keine Event-Historie und keine Queue. Das ist für die Lernübung okay, weil `plans:changed` nur ein Signal zum Refetch ist. Spätestens beim nächsten Fokuswechsel, Reload oder manuellen API-Refetch liest die App wieder den aktuellen Datenbankstand.

### Projektstruktur der Echtzeit-Übung

```text
backend/
├── server.js              # registriert GET /api/events
├── events.js              # SSE-Client-Verwaltung und Broadcast-Funktion
└── routes/
    └── workouts.js        # sendet plans:changed nach POST/PUT/DELETE

frontend/
├── src/api.js             # exportiert API_URL für EventSource
└── src/pages/
    ├── Workouts.jsx       # EventSource-Listener für plans:changed
    ├── Dashboard.jsx      # localStorage-sync für lokale Kalenderdaten
    └── Analytics.jsx      # localStorage-sync für lokale Kalenderdaten
```

Socket.io wurde bewusst nicht integriert, weil die Architekturentscheidung für diese Aufgabe auf SSE gefallen ist. WebSockets wären für den aktuellen Codeumfang überdimensioniert: Es gibt keinen Chat, kein kollaboratives Editing und keine bidirektionale Live-Interaktion. Falls die Aufgabenabgabe zwingend auch socket.io verlangt, müsste zusätzlich ein WebSocket-Server im Backend und ein `socket.io-client` im Frontend ergänzt werden; fachlich notwendig ist das für PROGYM aktuell nicht.

### Erfolgskriterien

| Kriterium | Status |
| --- | --- |
| Echtzeit-Bedarf begründet evaluiert und in README dokumentiert | ✅ Erledigt |
| SSE-Endpoint implementiert, Frontend reagiert ohne Reload auf Server-Events | ✅ Erledigt für Workout-Pläne über `plans:changed` |
| socket.io integriert, Events werden an alle verbundenen Clients gebroadcastet | ❌ Nicht umgesetzt, weil SSE als passende Technologie gewählt wurde und WebSockets fachlich nicht nötig sind |
| Zwei-Tab-Test: Änderung in Tab 1 erscheint live in Tab 2 | ✅ Für Backend-Workout-Pläne über SSE; Kalenderdaten werden wegen `localStorage` über den Browser-`storage`-Event synchronisiert |
| SSE vs. WebSockets Vergleich in README ausgefüllt und begründet | ✅ Erledigt |
| Zwei Prompt-Iterationen dokumentiert | ✅ Erledigt |
| Git-Commit vorhanden | ⬜ Noch lokal zu committen |
| Verbindungsabbruch getestet: Was passiert beim Server-Restart? | ✅ Verhalten dokumentiert |

Empfohlener Commit:

```bash
git add .
git commit -m "feat: add real-time updates via SSE"
```

## Agent als Architekt: Echtzeit-Einschätzung

Langfristig würden vor allem serverseitig gespeicherte, gemeinsam sichtbare Änderungen von Echtzeit-Kommunikation profitieren, zum Beispiel Workout-Pläne, wenn sie später geteilt werden, Live-Coaching, Benachrichtigungen oder ein laufender Workout-Timer, der auf mehreren Geräten synchron sichtbar sein soll. Für aktuelle persönliche Daten wie Analytics, Progress, Stats und Daily Activity ist Polling oder gezieltes Refetching ehrlicher, weil diese Daten aus bestehenden REST-Endpunkten wie `/api/sessions`, `/api/stats` und `/api/daily-activity/today` berechnet werden und keine echte Live-Interaktion zwischen Nutzern brauchen. Die Kalenderplanung liegt aktuell sogar noch in `localStorage`, deshalb ist dort ein Browser-`storage`-Event passender als SSE; erst wenn Kalenderdaten ins Backend wandern, wäre ein `schedule:changed` Event sinnvoll. Wir stimmen dieser Einschätzung zu, weil der konkrete Code eher nutzerspezifische CRUD- und Analysefunktionen enthält und WebSockets dafür unnötig komplex wären.

## Notification-Bedarf

PROGYM ist aktuell ein persönlicher Workout-Tracker. Es gibt keine Freunde, Teams, geteilten Pläne, Trainer-Accounts oder Kommentare. Deshalb betrifft fast keine Aktion direkt einen anderen fremden Nutzer. Potenziell betroffen ist höchstens derselbe Nutzer auf einem anderen Gerät oder in einem zweiten Browser-Tab. Für solche Fälle reichen meistens In-App-Updates, Reloads oder SSE-Events; externe Notifications wären schnell störend.

| Event in der App | Notification sinnvoll? | Typ | Kanal | Begründung |
| --- | --- | --- | --- | --- |
| Nutzer registriert sich | Ja | Transactional | E-Mail | Die Registrierung erzeugt einen Account und braucht eine E-Mail-Verifikation. Der Code wird aktuell nur als Dev-Mail in der Konsole ausgegeben, produktiv müsste er per E-Mail kommen. |
| E-Mail-Adresse wird geändert | Ja | Transactional | E-Mail | Sicherheits- und Account-relevant. Die neue Adresse muss verifiziert werden; zusätzlich wäre eine Info an die alte Adresse sinnvoll, falls die Änderung nicht vom Nutzer stammt. |
| Passwort wird geändert | Ja | Transactional | E-Mail | Sicherheitsrelevant. Der Nutzer muss nachvollziehen können, dass sich der Zugang geändert hat. Eine Push-Nachricht ist nicht nötig, weil keine sofortige App-Aktion erwartet wird. |
| Verifikationscode wird erneut angefordert | Ja | Transactional | E-Mail | Ohne E-Mail-Kanal kann der Nutzer den Account nicht zuverlässig verifizieren. Der Inhalt ist kurzlebig, aber nicht marketingbezogen. |
| Login erfolgt | Nein, optional nur bei Risiko | Transactional | Keiner | Normale Logins würden zu viele Meldungen auslösen. Eine E-Mail wäre nur bei späterer Risikoerkennung sinnvoll, z. B. neues Gerät oder ungewohnter Standort. |
| Nutzer aktualisiert Profilwerte wie Größe, Gewicht, Gender oder Fitnessziel | Nein | Product | Keiner | Die Änderung betrifft nur die eigenen Auswertungen. Es entsteht kein Handlungsbedarf für andere Nutzer und kein Bedarf für E-Mail oder Push. |
| Onboarding wird abgeschlossen | Nein | Product | Keiner | Das Event verändert nur den eigenen Startzustand der App. Eine In-App-Bestätigung reicht aus. |
| Workout-Plan wird erstellt | Nein, aktuell nur In-App/SSE | Product | Keiner | Pläne gehören einem einzelnen Nutzer. Andere fremde Nutzer sind nicht betroffen. Der vorhandene SSE-Mechanismus informiert nur andere Tabs desselben Nutzers über `plans:changed`. |
| Workout-Plan wird bearbeitet | Nein, aktuell nur In-App/SSE | Product | Keiner | Wie beim Erstellen: relevant für Synchronisation innerhalb desselben Accounts, aber nicht für externe Notifications. |
| Workout-Plan wird gelöscht | Optional, aber aktuell nein | Product | Keiner | Löschen kann wichtig sein, betrifft aber nur eigene Daten. Eine Undo-Funktion oder In-App-Statusmeldung wäre passender als E-Mail oder Push. |
| Übung in einem Plan wird hinzugefügt, geändert oder gelöscht | Nein | Product | Keiner | Das ist Detailbearbeitung am eigenen Trainingsplan. Zu kleinteilig für Notifications. |
| Workout-Session wird gespeichert | Optional | Product | Keiner | Eine Bestätigung in der App reicht. Eine spätere Wochenzusammenfassung könnte diese Daten nutzen, aber das einzelne Speichern braucht keine Nachricht. |
| Workout-Session wird gelöscht | Nein | Product | Keiner | Betrifft nur den eigenen Verlauf. Bei Bedarf wäre ein In-App-Undo sinnvoller als eine externe Nachricht. |
| Wasseraufnahme wird geloggt | Nein | Product | Keiner | Sehr häufiges Alltags-Tracking. Eine Notification nach jedem Log wäre störend und hätte keinen Mehrwert. |
| Schritte werden geloggt | Nein | Product | Keiner | Häufiges Tracking-Event ohne fremde Betroffenheit. Kein externer Kanal nötig. |
| Hydration Reminder wird fällig | Ja, optional | Product | Push oder In-App, aktuell In-App | Der Nutzer soll zeitnah trinken, aber das Event ist nicht kritisch. Push wäre nur sinnvoll, wenn der Nutzer Reminder explizit aktiviert; aktuell gibt es lokale In-App-Toasts. |
| Workout Reminder wird fällig | Ja, optional | Product | Push oder In-App, aktuell In-App | Trainingserinnerungen sind zeitnah, aber nicht sicherheitskritisch. Push wäre sinnvoller als E-Mail, weil E-Mail zu spät gelesen werden kann. |
| Workout wird im Kalender geplant oder geändert | Optional | Product | Keiner | Aktuell liegt der Kalender in `localStorage` und betrifft nur den eigenen Account. Eine spätere Reminder-Notification kann daraus entstehen, aber die Planungsaktion selbst braucht keine Nachricht. |
| Wöchentliche Trainingszusammenfassung | Optional | Product | E-Mail | Kein Zeitdruck, aber längerer Inhalt mit Fortschritt, Sessions und Zielen. E-Mail passt besser als Push, weil der Nutzer die Zusammenfassung später lesen kann. |
| Support-Anfrage wird abgeschickt | Ja, falls serverseitig umgesetzt | Transactional | E-Mail | Der Nutzer sollte eine Eingangsbestätigung und später eine Antwort erhalten. Aktuell wirkt der Support-Bereich eher frontendseitig; produktiv wäre E-Mail sinnvoll. |
| Marketing-Angebote, Challenges oder Newsletter | Nur mit Opt-in | Marketing | E-Mail | Marketing braucht ein explizites Opt-in. Ohne Zustimmung darf dieser Kanal nicht genutzt werden. |

### Leitfragen

| Leitfrage | Antwort |
| --- | --- |
| Gibt es Events, bei denen der Nutzer sofort reagieren muss - oder reicht eine Mail, die er später liest? | Sofort reagieren muss der Nutzer nur bei zeitnahen Erinnerungen wie Hydration oder Workout Reminder. Dafür wäre Push oder ein In-App-Toast sinnvoller als E-Mail. Sicherheits- und Account-Events wie Passwortänderung, E-Mail-Änderung oder Verifikation müssen persistent nachvollziehbar sein; dafür reicht E-Mail, weil keine Sekundenreaktion nötig ist. |
| Habt ihr Marketing-Content geplant, der ein explizites Opt-in braucht? | Aktuell ist kein Marketing-Content produktiv geplant. Falls später Newsletter, Rabattaktionen, Challenges oder Partnerangebote ergänzt werden, brauchen sie ein klares Opt-in und eine Abmeldemöglichkeit. Produkt-Reminder wie Trink- oder Workout-Erinnerungen sind kein Marketing, sollten aber trotzdem vom Nutzer ein- und ausschaltbar sein. |
| Wie viele verschiedene Events würden pro Stunde realistisch Notifications auslösen? | Bei normaler Nutzung sehr wenige. Account-Events passieren selten, vermutlich 0 bis 1 pro Stunde. Tracking-Events wie Wasser, Schritte oder Sessions können zwar mehrfach pro Stunde passieren, sollen aber keine externen Notifications auslösen. Aktive Reminder könnten realistisch 0 bis 2 Push/In-App-Hinweise pro Stunde erzeugen, je nach Nutzereinstellung. |

### Kanalentscheidung

Für Account-Sicherheit verwenden wir **E-Mail**. Konkret gilt das für Registrierung/E-Mail-Verifikation, E-Mail-Änderung und Passwortänderung. Diese Events sind transactional, müssen nachvollziehbar bleiben und enthalten Informationen, die der Nutzer später wiederfinden können soll. Push wäre hier nicht zuverlässig genug als alleiniger Kanal und für normale Logins zu laut.

Für Hydration- und Workout-Reminder verwenden wir **keine E-Mail**, sondern höchstens **Push oder In-App-Notifications**. Diese Events sind zeitnah und produktbezogen: Der Nutzer soll jetzt trinken oder trainieren, nicht irgendwann später eine Mail lesen. Da die App aktuell keine native Push-Infrastruktur hat, bleibt die ehrliche Entscheidung im jetzigen Stand: In-App-Toasts und lokale Einstellungen reichen; echte Push-Notifications wären erst ein späterer Ausbau mit expliziter Aktivierung.

Für Workout-Pläne, Sessions, Daily Activity und Analytics verwenden wir **keinen externen Notification-Kanal**. Diese Daten sind persönlich, häufig und nicht kollaborativ. Externe Benachrichtigungen würden mehr stören als helfen; gezieltes Refetching, lokale UI-Bestätigungen und der vorhandene SSE-Lernmechanismus für andere Tabs desselben Nutzers sind angemessener.

## Transactional E-Mail mit Resend und React Email

Für den ersten echten Mail-Use-Case wurde das Event **E-Mail-Verifikation** gewählt. Das ist ein klar transactional Event: Ohne Verifikationscode kann ein neuer Nutzer den Account nicht vollständig aktivieren. Dasselbe Event wird auch genutzt, wenn ein Nutzer seine E-Mail-Adresse ändert oder einen neuen Verifikationscode anfordert.

Ausnahme: Der Demo-Account `jonasarnold@gmail.com` bekommt bewusst keine transactional E-Mails. Dieser Account bleibt für Demos sofort verifiziert und onboarding-fertig. Für alle anderen Accounts wird der Verifikations-Mailflow angewendet.

Installierte Backend-Pakete:

```bash
cd workout-tracker/backend
npm install resend @react-email/render @react-email/components
```

### Umsetzung

Backend-Dateien:

- `backend/mail.js`: kapselt Resend, rendert das React-Email-Template und stellt `sendVerificationEmailLater()` bereit.
- `backend/emails/VerificationEmail.js`: React Email Template mit Begrüßung, Verifikationscode und Link zur Verifikationsseite.
- `backend/routes/auth.js`: triggert den Mailversand bei Registrierung, E-Mail-Änderung und erneutem Versand des Codes.
- `backend/.env.example`: dokumentiert die nötigen Umgebungsvariablen.

Benötigte `.env`-Werte:

```env
RESEND_API_KEY="re_..."
MAIL_FROM="PROGYM <onboarding@resend.dev>"
APP_URL="http://localhost:5173"
```

Der HTTP-Request wartet nicht auf den Mailversand. Die Auth-Route speichert zuerst den Nutzer bzw. den neuen Code und ruft danach `sendVerificationEmailLater()` auf. Diese Funktion nutzt `setImmediate()` und führt den Versand im Hintergrund aus. Fehler werden mit `try/catch` geloggt, ändern aber nicht mehr die bereits gesendete API-Antwort. Wenn `RESEND_API_KEY` lokal fehlt, wird der Code für normale Accounts weiterhin als Dev-Ausgabe in der Konsole angezeigt, damit die Entwicklung ohne echten Mailversand funktioniert. Für `jonasarnold@gmail.com` überspringt die Mail-Schicht den Versand immer.

Das Template enthält bewusst nicht nur einen generischen Text, sondern:

- den Vornamen des Nutzers
- den sechsstelligen Verifikationscode
- einen direkten Link zu `${APP_URL}/verify-email`
- einen Hinweis, dass die Mail ignoriert werden kann, wenn der Account nicht vom Empfänger erstellt oder geändert wurde

### Agent-Prompt

Verwendete Aufgabenbeschreibung für die Implementierung:

> Implementiere E-Mail-Benachrichtigungen für das Event "E-Mail-Verifikation nach Registrierung, E-Mail-Änderung und erneutem Code-Versand". Stack: Express-Backend, Resend als Mail-API, React Email für das Template. Anforderungen: Das Template soll den Vornamen des Nutzers, den sechsstelligen Verifikationscode und einen direkten Link zur Verifikationsseite enthalten. Der Mailversand darf den HTTP-Request nicht blockieren. Fehlerbehandlung mit try/catch. Der API-Key kommt aus der `.env`-Datei. Der Demo-Account `jonasarnold@gmail.com` ist ausgeschlossen; für alle anderen Accounts gilt der Mailflow.

### Zwei Iterationen

Iteration 1:

> Implementiere E-Mail-Benachrichtigungen für die Registrierung. Nutze Resend und React Email. Sende dem Nutzer den Verifikationscode per E-Mail.

Problem an dieser Beschreibung: Sie war zu ungenau. Es war nicht klar, ob auch der erneute Code-Versand und die E-Mail-Änderung abgedeckt werden sollen. Außerdem fehlten Vorgaben zum Deep Link, zur `.env`-Konfiguration und dazu, dass der HTTP-Request nicht durch den Mailversand blockiert werden darf.

Iteration 2:

> Implementiere E-Mail-Benachrichtigungen für das Event "E-Mail-Verifikation nach Registrierung, E-Mail-Änderung und erneutem Code-Versand". Stack: Express-Backend, Resend als Mail-API, React Email für das Template. Anforderungen: Das Template soll den Vornamen des Nutzers, den sechsstelligen Verifikationscode und einen direkten Link zu `/verify-email` über `APP_URL` enthalten. Der Mailversand darf den HTTP-Request nicht blockieren; nutze eine fire-and-forget-Funktion mit `try/catch`, damit Mailfehler geloggt werden, aber die API-Antwort nicht kaputtmachen. Der API-Key und der Absender kommen aus der `.env`-Datei. Schließe `jonasarnold@gmail.com` als Demo-Account explizit vom Mailversand aus; alle anderen Accounts bekommen die Verifikationsmail.

Präzisierung im zweiten Versuch:

- Der konkrete Event-Umfang wurde erweitert: Registrierung, E-Mail-Änderung und Resend-Code.
- Der Template-Inhalt wurde konkreter: Vorname, Code, direkter Link und Sicherheitshinweis.
- Der Deep Link wurde über `APP_URL` festgelegt.
- Der nicht-blockierende Versand wurde explizit gefordert.
- Die Fehlerbehandlung wurde konkret an die Mail-Schicht verlagert.
- Der Demo-Account `jonasarnold@gmail.com` wurde als explizite Ausnahme ergänzt.

## Web Push mit VAPID

Web Push wurde als **Lernübung** für das bestehende Event `plans:changed` umgesetzt. Produktiv ist Push für Workout-Plan-Änderungen aktuell nicht zwingend nötig, weil PROGYM keine geteilten Pläne oder fremde Nutzerinteraktion hat. Für die Aufgabe ist das Event aber gut testbar: Wenn Tab 1 einen Workout-Plan erstellt, bearbeitet oder löscht, kann derselbe eingeloggte Nutzer in Tab 2 eine Browser-Notification erhalten und direkt zur Workouts-Seite springen.

Installiertes Backend-Paket:

```bash
cd workout-tracker/backend
npm install web-push
```

Einmalige VAPID-Key-Generierung:

```bash
cd workout-tracker/backend
npx web-push generate-vapid-keys
```

Benötigte `.env`-Werte:

```env
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@example.com"
```

### Umsetzung

Backend:

- `backend/push.js`: konfiguriert `web-push`, speichert Subscriptions und verschickt Notifications.
- `backend/routes/push.js`: stellt `GET /api/push/public-key` und `POST /api/push/subscribe` bereit.
- `backend/routes/workouts.js`: triggert Push bei `POST`, `PUT` und `DELETE` von Workout-Plänen.
- `backend/prisma/schema.prisma`: enthält das Model `PushSubscription`.
- `backend/prisma/migrations/20260603104500_add_push_subscriptions/migration.sql`: legt die Tabelle `push_subscriptions` an.

Frontend:

- `frontend/public/sw.js`: Service Worker empfängt Push-Events, zeigt Notification mit `title`, `body` und Link und öffnet beim Klick die Zielseite.
- `frontend/src/api.js`: ergänzt `getPushPublicKey()` und `subscribeToPush()`.
- `frontend/src/App.jsx`: fragt nach Login bzw. nach abgeschlossenem Verification/Onboarding mit `Notification.requestPermission()` nach Push-Erlaubnis, registriert den Service Worker und sendet die Subscription per `POST /api/push/subscribe` ans Backend.

Die Subscription wird mit `endpoint`, `p256dh` und `auth` in SQLite gespeichert. Wenn der Push Service beim Versand `404` oder `410` zurückgibt, löscht `backend/push.js` die abgelaufene Subscription aus der DB.

Payload-Beispiel für `plans:changed`:

```json
{
  "title": "Workout plan created",
  "body": "Push Day was added to your PROGYM workouts.",
  "url": "/workouts"
}
```

### Testfall

1. Backend und Frontend starten.
2. App in zwei Browser-Tabs öffnen.
3. Mit demselben normalen Account einloggen. Der Demo-Account kann genutzt werden, aber Browser-Push muss im Browser erlaubt werden.
4. Push-Erlaubnis im Browser bestätigen.
5. In Tab 1 auf der Workouts-Seite einen Plan erstellen, bearbeiten oder löschen.
6. Erwartung: Der Service Worker empfängt das Push-Event und zeigt eine Notification. Beim Klick öffnet bzw. fokussiert sie `/workouts`.

Hinweis: Der vollständige Notification-Test hängt von Browser-Permissions, HTTPS bzw. `localhost` und Betriebssystem-Notification-Einstellungen ab. Per Shell wurde geprüft, dass Packages installiert sind, Prisma Client/Schema gültig sind und die Migration für `push_subscriptions` angewendet wurde. Der sichtbare Zwei-Tab-Notification-Test muss im Browser bestätigt werden.

## iOS-App mit Capacitor

Das Vite-Frontend wurde mit Capacitor als iOS-App vorbereitet. Capacitor verpackt den gebauten Web-Output aus `dist/` in ein natives Xcode-Projekt.

Installierte Frontend-Pakete:

```bash
cd workout-tracker/frontend
npm install @capacitor/core @capacitor/ios
npm install -D @capacitor/cli
```

Capacitor-Konfiguration:

- Datei: `frontend/capacitor.config.json`
- App-Name: `PROGYM`
- Bundle-ID: `com.progym.app`
- Web-Output: `dist`
- iOS-Projekt: `frontend/ios/App/App.xcodeproj`

Wichtige Befehle:

```bash
cd workout-tracker/frontend
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

Zusätzliche Scripts in `frontend/package.json`:

```bash
npm run cap:sync
npm run cap:sync:ios
npm run cap:open:ios
```

Für iOS ist die API-URL konfigurierbar. Im Browser nimmt die App weiterhin standardmäßig `http://<hostname>:3000/api`. Für Simulator oder echtes iPhone sollte vor dem Build eine feste Backend-URL gesetzt werden, weil `localhost` auf dem Gerät nicht automatisch der Mac mit dem Express-Backend ist:

```bash
VITE_API_URL="http://192.168.178.20:3000/api" npm run cap:sync:ios
```

Für den iOS Simulator kann je nach Setup auch `http://localhost:3000/api` funktionieren. Auf einem echten iPhone muss normalerweise die lokale Netzwerk-IP des Macs verwendet werden. Danach in Xcode `App.xcodeproj` öffnen, ein Team auswählen und die App im Simulator oder auf einem Gerät starten.

## Commit-Zusammenfassung: Notifications und iOS-App

Seit dem letzten Commit `924c348 feat: globale Suche, Quick-Log-Button und Favicon ergänzen` wurden mehrere zusammenhängende App-Erweiterungen umgesetzt.

### Fachliche Änderungen

- Notification-Bedarf der App analysiert und in der README dokumentiert.
- Transactional E-Mail für die E-Mail-Verifikation umgesetzt.
- Resend als Mail-Provider vorbereitet.
- React Email Template für den Verifikationscode erstellt.
- Demo-Account `jonasarnold@gmail.com` explizit vom Mailversand ausgeschlossen.
- Web Push als Lernübung für Workout-Plan-Änderungen (`plans:changed`) ergänzt.
- Push-Subscriptions in SQLite/Prisma gespeichert.
- Abgelaufene Push-Subscriptions werden bei `404` oder `410` aus der DB gelöscht.
- Service Worker unter `frontend/public/sw.js` ergänzt.
- iOS-App mit Capacitor erstellt.
- Xcode-Projekt unter `frontend/ios/App/App.xcodeproj` erzeugt.
- API-URL über `VITE_API_URL` konfigurierbar gemacht, damit iPhone/Simulator das Backend auf dem Mac erreichen können.

### Technische Dateien

- Backend: `backend/mail.js`, `backend/emails/VerificationEmail.js`, `backend/push.js`, `backend/routes/push.js`
- Backend-Routen: `backend/routes/auth.js`, `backend/routes/workouts.js`, `backend/server.js`
- Prisma: `backend/prisma/schema.prisma`, Migration `20260603104500_add_push_subscriptions`
- Frontend: `frontend/src/App.jsx`, `frontend/src/api.js`, `frontend/public/sw.js`
- Capacitor: `frontend/capacitor.config.json`, `frontend/ios/`
- Paketdateien: `package-lock.json`, `frontend/package.json`, `backend/package.json`

### Verifikation

Ausgeführt wurden:

```bash
npx prisma generate
npx prisma validate
npx prisma migrate deploy
node --check mail.js
node --check push.js
node --check routes/push.js
node --check routes/workouts.js
node --check server.js
npm run build
npm run cap:sync:ios
```

Hinweis: `backend/database.sqlite` ist geändert, weil lokal die Push-Subscription-Migration angewendet wurde und der Account `isabelprieb@gmail.com` testweise wieder auf Registrierungsstatus gesetzt wurde.

## Global Search

Das Search-Feld in der oberen Navigation ist jetzt funktional und dient als globale Suche innerhalb der App.

Die Suche findet aktuell:

- feste App-Seiten wie Dashboard, Workouts, Analytics, Settings, Profile, Support und About Us
- direkte Aktionen wie `Start Workout`, `Log Water` und `Log Steps`
- Analytics-Themen wie `Progressive Overload Score`, `Average Session Duration` und `Exercise Diversity`
- gespeicherte Workout-Pläne aus dem Backend über `GET /api/plans`
- Übungen aus gespeicherten Workout-Plänen

Die Implementierung liegt in `frontend/src/App.jsx`. Beim Laden der App und beim Fokuswechsel werden die Backend-Pläne für die Suche aktualisiert. Die Ergebnisse werden clientseitig gefiltert und auf maximal fünf Treffer begrenzt, damit das Search-Feld ruhig bleibt und wie eine klassische Suche wirkt. Mit `Enter` wird der erste Treffer geöffnet, mit `Escape` wird die Suche geschlossen. Auf Mobile expandiert das Lupen-Icon zu einem nutzbaren Suchfeld.

Das Styling liegt in `frontend/src/App.css`. Die erste Version war stärker wie eine Command-Palette mit vielen großen Ergebnisblöcken aufgebaut. Danach wurde das Design bewusst reduziert: keine großen Karten, keine Typ-Badges, keine breite Quick-Access-Ansicht, sondern eine schmale Ergebnisliste direkt unter dem Suchfeld.

## Folgeiteration: Search-Polish, Quick Log CTA und Favicon

Nach der ersten Global-Search-Umsetzung wurden weitere UI-Details verfeinert, damit die App klarer und markennäher wirkt.

### Search-Polish

Das Search-Feld wurde bewusst weiter reduziert. Statt vieler großer Ergebnisblöcke erscheint jetzt eine kompakte, klassische Ergebnisliste direkt unter dem Suchfeld. Dadurch wirkt die Suche eher wie ein vertrautes App-Search-Pattern und weniger wie ein separates Dashboard-Panel.

Angepasst wurden:

- reduzierte Ergebnisanzahl
- schmaleres Dropdown passend zur Suchleiste
- ruhigere Hover-Zustände
- Mobile-Search über das Lupen-Icon
- keine überladenen Quick-Access-Blöcke mehr

### Dashboard Quick Log

Der bisherige `+LOG`-Button im Dashboard war funktional, aber visuell nicht eindeutig genug. Er wurde deshalb zu einem größeren Quick-Log-CTA umgebaut:

- Plus-Icon als klarer visueller Hinweis zum Tracken
- Text `QUICK LOG` als primäre Aktion
- Zusatz `WATER & STEPS`, damit direkt klar ist, was geloggt wird
- größerer Klickbereich
- grüner Glow und Hover-Zustand im PROGYM-Stil
- neue Übersetzungen in `LanguageContext.jsx`

Damit ist der Button deutlicher als Tracking-Aktion erkennbar, ohne den Dashboard-Hero zu überladen.

### Favicon

Das alte lila Standard-Favicon wurde ersetzt. Das neue Favicon nutzt den dunklen PROGYM-Look mit neon-grünem Pulse-Symbol und passt damit besser zur restlichen Oberfläche.

Technisch wurde zusätzlich in `frontend/index.html` ein Cache-Busting-Parameter gesetzt:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />
```

Falls im Browser noch das alte Icon erscheint, liegt das meist am Favicon-Cache. Ein Hard Refresh oder ein neuer Browser-Tab mit geleertem Cache zeigt das neue Icon.

### Verifikation dieser Folgeiteration

Frontend:

```bash
cd workout-tracker/frontend
npm run build
```

Der Build läuft erfolgreich durch. Vite meldet weiterhin nur die bekannte Chunk-Size-Warnung.

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

- `Average Session Duration`: durchschnittliche Dauer abgeschlossener Sessions der letzten 30 Tage mit Vergleich zum vorherigen Zeitraum.
- `Progressive Overload Score`: vergleicht aktuelle Bestwerte pro Übung mit dem vorherigen Trainingszeitraum.
- `Exercise Diversity`: zählt unterschiedliche Übungen der letzten 30 Tage.
- `Most Trained Exercise`: erkennt die Übung, die in den meisten Sessions vorkommt, mit Satzanzahl als zweitem Sortierkriterium.

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

## Folgeiteration: Analytics Demo-Daten, Exercise Diversity und Login-Stabilität

Seit der letzten Dokumentation wurde die Analytics-Seite weiter verfeinert. Der Schwerpunkt lag auf aussagekräftigeren Demo-Daten für den Jonas-Account, echter Datenbindung für normale Nutzer und einer besseren Darstellung der `Exercise Diversity`.

### Jonas-Demo-Daten

Für den Demo-Account `jonasarnold@gmail.com` werden jetzt demonstrative Trainingsdaten verwendet, damit Dashboard und Analytics nicht leer wirken. Diese Demo-Daten füllen unter anderem:

- Strength-Progress-Chart
- Top-Exercise-Karten
- Average Session Duration
- Progressive Overload Score
- Exercise Diversity
- Most Trained Exercise
- Dashboard-Werte für Schritte, Kalorien, Minuten und Trainingstage

Die Demo-Werte sind bewusst nur für Jonas aktiv. Andere Accounts sollen nicht automatisch mit Beispieldaten gefüllt werden.

### Exercise Diversity mit echten Nutzerdaten

`Exercise Diversity` ist jetzt an echte geloggte Workout-Daten gebunden. Die Auswertung nutzt die abgeschlossenen Sessions und deren Logs der letzten 30 Tage:

- Jede Bubble steht für eine unterschiedliche Übung.
- Die Größe der Bubble richtet sich nach der Häufigkeit der Übung in den geloggten Sets.
- Die Übungsliste im Infoblock zeigt Sets und Wiederholungen.
- Bei Accounts ohne geloggte Workouts bleibt der Zustand leer, statt Demo-Bubbles zu zeigen.

Damit ist die Kennzahl nicht mehr nur visuell, sondern fachlich an gespeicherte Trainingsdaten gekoppelt.

### Exercise-Diversity-Widget

Das Widget wurde visuell mehrfach iteriert:

- 22 mögliche Exercise-Bubbles für den Demo-Account
- organischer Bubble-Cluster statt starrem Raster
- Hover-Zustand, bei dem sich Bubbles weich auseinanderbewegen und beim Mouse-out zurückkehren
- kleinere Typografie für kleine Bubbles, damit Übungsnamen besser lesbar bleiben
- transparente grüne Bubble-Flächen statt stark glänzender Effekte

Das Widget bleibt im dunklen PROGYM-Stil und nutzt Grün nur als Akzent.

### Exercise-Diversity-Infoblock

Der Infoblock wurde neu strukturiert und stärker am `Stay Hydrated`-Infoblock orientiert:

- dunkle Kartenflächen statt großer grüner Flächen
- dezente grüne Akzente und ein kleiner Corner-Glow
- Kennzahl-Karten mit Icons
- Erklärung, wie die Bubble-Größe zu lesen ist
- klare Exercise-Liste mit Sets und Reps
- kein horizontales Überlaufen mehr durch robuste `minmax(0, ...)` Grid-Definitionen

Die Bubble-Grafik wurde im Infoblock bewusst entfernt, weil die Liste dort informativer und ruhiger ist. Die Bubble-Erklärung bleibt erhalten, damit das Widget auf der Analytics-Seite verständlich bleibt.

### Login- und Prisma-DB-Stabilität

Beim Login wurde ein Entwicklungsproblem gefunden: Wenn das Backend aus dem falschen Arbeitsverzeichnis gestartet wurde, konnte `DATABASE_URL="file:./database.sqlite"` auf eine leere SQLite-Datei im Repo-Root zeigen. Dadurch fand Prisma keine `users`-Tabelle und Logins schlugen fehl.

`backend/prismaClient.js` löst die SQLite-Datei jetzt relativ zum Backend-Ordner auf. Dadurch verwendet Prisma zuverlässig:

```text
workout-tracker/backend/database.sqlite
```

statt versehentlich:

```text
database.sqlite
```

Der Jonas-Login wurde lokal gegen `/api/auth/login` geprüft und antwortete erfolgreich mit `200 OK`.

### Verifikation dieser Folgeiteration

Frontend:

```bash
cd workout-tracker/frontend
npm run build
```

Ergebnis: Der Build läuft erfolgreich durch. Vite meldet weiterhin nur die bekannte Chunk-Size-Warnung.

Backend:

```bash
cd workout-tracker/backend
npm start
```

Der Backend-Server muss für Login und API-Requests auf Port `3000` laufen. Der Login-Endpunkt wurde mit dem Jonas-Demo-Account getestet:

```text
jonasarnold@gmail.com / 123
```

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
