# NEXT REPS

NEXT REPS ist eine mobile-first Fitness-Webapp für Workout-Planung,
Trainingstracking, Aktivitätsziele und Fortschrittsanalyse.

- **Live:** [https://next-reps.de](https://next-reps.de)
- **Frontend:** React 19 und Vite
- **Backend:** Express 5 und Prisma
- **Datenbank:** MySQL/MariaDB
- **Deployment:** GitHub Actions auf Hetzner

## Schnellstart

### Voraussetzungen

- Node.js 22
- npm
- Docker mit Docker Compose

### Installation und Start

```bash
npm ci
npm start
```

`npm start` führt den vollständigen lokalen Start aus:

1. Erstellt bei Bedarf `workout-tracker/backend/.env` aus `.env.example`.
2. Startet die MySQL-Datenbank mit Docker Compose.
3. Wartet auf den Datenbank-Healthcheck.
4. Generiert den Prisma Client.
5. Wendet vorhandene Migrationen an.
6. Startet Backend und Frontend gemeinsam.

Danach ist die Anwendung erreichbar unter:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend/API: [http://localhost:3000/api](http://localhost:3000/api)

Mit `Ctrl+C` werden Frontend und Backend beendet. Die lokale Datenbank kann
anschließend mit folgendem Befehl gestoppt werden:

```bash
npm run db:stop
```

## Umgebungsvariablen

Die lokalen Beispielkonfigurationen liegen in
[`workout-tracker/backend/.env.example`](workout-tracker/backend/.env.example)
und
[`workout-tracker/frontend/.env.example`](workout-tracker/frontend/.env.example).
Beim ersten `npm start` wird daraus automatisch eine nicht versionierte
`backend/.env` erzeugt.

Die Beispielwerte sind ausschließlich für die lokale Docker-Datenbank gedacht.
Produktive Zugangsdaten, JWT-Secrets, SMTP-Passwörter und VAPID-Schlüssel
gehören niemals in Git. Optionale SMTP- und Push-Werte dürfen lokal leer
bleiben; Verifikationscodes werden dann ausschließlich im Entwicklungslog
ausgegeben und Push-Nachrichten deaktiviert.

### Backend

| Variable | Zweck | Lokal erforderlich |
| --- | --- | --- |
| `DATABASE_URL` | Prisma-Verbindung zu MySQL | ja |
| `SHADOW_DATABASE_URL` | optionale Prisma-Shadow-Datenbank für lokale Entwicklungsmigrationen | nein |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD` | optionale Overrides für einzelne Bestandteile von `DATABASE_URL` | nein |
| `JWT_SECRET` | Signatur der Authentifizierungs-Tokens | ja |
| `NODE_ENV` | Laufzeitmodus (`development` oder `production`) | nein, lokal `development` |
| `PORT` | Port des Express-Backends | nein, Standard `3000` |
| `APP_URL` | öffentliche Frontend-URL für E-Mails | ja |
| `TRUSTED_PROXY_IPS` | explizit vertrauenswürdige Reverse Proxies | nur Produktion |
| `SMTP_*`, `MAIL_FROM` | Versand von Verifikations-E-Mails | optional lokal |
| `VAPID_*` | Web-Push-Konfiguration | optional |
| `SEED_DEMO_PASSWORD`, `SEED_TEST_PASSWORD` | Passwörter für den ausdrücklich aufgerufenen Seed-Befehl | nur beim Seeding |
| `AUTH_*`, `RATE_LIMIT_WINDOW_MS` | API-Rate-Limits | nein, dokumentierte Standardwerte |
| `MYSQL_*` | Referenzwerte der lokalen Docker-MySQL-Instanz | nein |

### Frontend

| Variable | Zweck | Lokal erforderlich |
| --- | --- | --- |
| `VITE_API_BASE_URL` | optionale absolute API-Adresse für native Capacitor-Builds; im Browser wird standardmäßig `/api` verwendet | nein |

### GitHub Actions

Das Deployment benötigt die Repository-Secrets `HETZNER_SSH_HOST`,
`HETZNER_SSH_USER` und `HETZNER_SSH_KEY`. Der SSH-Key ist der vollständige
private Deploy-Key inklusive `BEGIN`-/`END`-Zeilen. Diese Werte werden nur in
GitHub gepflegt und gehören nicht in lokale `.env`-Dateien.

## Wichtige Befehle

```bash
npm start          # Datenbank, Migrationen, Backend und Frontend
npm run db:start   # nur die lokale MySQL-Datenbank
npm run db:stop    # lokale Docker-Services stoppen
npm run lint       # statische Codeprüfung
npm run test:backend # Vitest inklusive Docker/Prisma und Coverage
npm run test:e2e   # Cypress gegen den vollständigen lokalen Stack
npm test           # alle Backend- und E2E-Tests mit einem Befehl
npm run --workspace workout-tracker/frontend build
```

## Projektstruktur

```text
.
├── .github/workflows/       # automatisches Hetzner-Deployment
├── docker/mysql/init/       # Initialisierung der lokalen Datenbank
├── scripts/                 # projektweite Entwicklungswerkzeuge
└── workout-tracker/
    ├── frontend/            # React/Vite und Capacitor-iOS-App
    └── backend/
        ├── middleware/      # Authentifizierung und Rate Limits
        ├── modules/         # fachliche Module des modularen Monolithen
        └── prisma/          # Schema und Migrationen
```

## Deployment

Jeder Push auf `main` startet den Workflow
`.github/workflows/deploy.yml`. Der Workflow:

1. installiert und baut das Frontend,
2. kopiert den Build nach `backend/public`,
3. überträgt das Backend per SSH/rsync zu Hetzner,
4. installiert Produktionsabhängigkeiten,
5. führt Prisma-Migrationen aus und
6. startet die Anwendung kontrolliert neu.

Die notwendigen Zugangsdaten liegen als verschlüsselte GitHub Actions Secrets
vor und werden nicht im Repository gespeichert.

## Dokumentation

- [zentrale Abgabe- und Architekturdokumentation](DOKUMENTATION.md)
- [ausführliche Entwicklungs- und Lernprozessdokumentation](workout-tracker/frontend/README.md)

`DOKUMENTATION.md` ist die maßgebliche Beschreibung des aktuellen
Abgabestands. Die Frontend-README bleibt als ausführliches historisches
Arbeitsprotokoll erhalten.
