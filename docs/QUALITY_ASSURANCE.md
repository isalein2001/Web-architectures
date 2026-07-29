# Quality Assurance

Dieses Dokument bündelt die für die Abgabe relevanten Funktions- und
Qualitätsnachweise. Automatisierte Vitest- und Cypress-Ergebnisse werden nach
Einrichtung der Testinfrastruktur ergänzt.

## Kritische Nutzerpfade

Die folgenden Pfade gelten als kritisch, weil ein Fehler die Anmeldung,
Persistenz oder Hauptfunktion der App verhindert:

1. Registrierung mit Eingabevalidierung
2. E-Mail-Verifikation und Ablauf ungültiger Codes
3. Login, Auth-Cookie, Session-Wiederherstellung und Logout
4. Abschluss des persönlichen Onboardings
5. Workout-Plan mit Übungen anlegen und bearbeiten
6. Training protokollieren und als Session speichern
7. gespeicherte Trainingsdaten in Analytics abrufen
8. tägliche Aktivität und Wasseraufnahme aktualisieren
9. Profil- und Accountdaten sicher aktualisieren
10. Schutz fremder und nicht authentifizierter Ressourcen

## Core-Feature-Matrix

| Kernfunktion | Benutzeroberfläche | Backend/Persistenz | Nachweis |
| --- | --- | --- | --- |
| Registrierung und Login | Register-, Login- und Session-Weiterleitungen | Identity-Access-Modul, bcrypt, JWT und Auth-Cookie bzw. nativer Bearer-Token | lokal bestanden; nativer Produktions-Login nach CORS-/CSP-Korrektur bestätigt |
| E-Mail-Verifikation | Verifikationsansicht mit erneutem Versand | zeitlich begrenzter, versuchslimitierter und gehashter Code | ungültiger und gültiger Code lokal bestanden |
| Persönliches Onboarding | Größe, Gewicht, Ziel und weitere Profilwerte | validiertes User-Update über Prisma | ungültige und gültige Eingabe lokal bestanden |
| Workout-Pläne | Planübersicht, Erstellung und Bearbeitung von Übungen | Plan- und PlanExercise-Modelle mit Ownership-Prüfung | Plan inklusive Übung lokal gespeichert und wieder gelesen |
| Training protokollieren | Workout Logger für Sätze, Wiederholungen und Gewicht | WorkoutSession und WorkoutLog | Session inklusive Satz lokal gespeichert |
| Fortschritt und Analytics | Dashboard, Analytics und Übungsfortschritt | Stats-, Progress- und Coaching-Endpunkte | gespeicherte Session in Statistik berücksichtigt |
| Aktivität und Hydration | Tageswerte, Schritte und Wasseraufnahme | DailyActivity pro Nutzer und Tag | Wasser-Update lokal gespeichert und gelesen |
| Profil und Account | Profilansicht inklusive Profilbild und Accountänderungen | explizite Feldfreigabe, Re-Authentifizierung und E-Mail-Änderungsflow | API-Validierung und geschützte Route geprüft |
| Benachrichtigungen | In-App-, Web-Push- und native Reminder-Integration | PushSubscription, SSE und optionale VAPID-Konfiguration | statisch/buildseitig geprüft; Betriebssystemfreigabe wird manuell geprüft |
| Native iOS-App | Capacitor-App mit First-Launch-Flow und HealthKit-Anbindung | gleiche Produktions-API mit Bearer-Token | Build erfolgreich; produktive API-Verbindung und Login am 29. Juli 2026 bestätigt |

Alle fachlichen Nutzerdaten werden in MySQL/MariaDB gespeichert. Local Storage
wird nur für gerätespezifische UI-Zustände und den nativen Auth-Token genutzt,
nicht als Ersatz für die fachliche Serverpersistenz.

## Lokaler API-Smoke-Test vom 29. Juli 2026

Testumgebung:

- Start über den dokumentierten Befehl `npm start`
- MySQL 8.4 in Docker auf Port `3307`
- Express auf Port `3000`
- Vite auf Port `5173`
- frische, vollständig angewendete Prisma-Migrationen
- ausschließlich lokales und anschließend gelöschtes Testkonto

| Testfall | Erwartung | Ergebnis |
| --- | --- | --- |
| geschützte Pläne ohne Login abrufen | `401` | bestanden |
| Registrierung mit schwachem Passwort | `400` | bestanden |
| gültige Registrierung | `201`, Auth-Cookie, unverifizierter Nutzer | bestanden |
| `/api/auth/me` mit Auth-Cookie | `200`, richtiger Nutzer | bestanden |
| falscher Verifikationscode | `400` | bestanden |
| gültiger Verifikationscode | `200`, E-Mail verifiziert | bestanden |
| Onboarding mit ungültiger Größe | `400` | bestanden |
| gültiges Onboarding | `200`, als abgeschlossen gespeichert | bestanden |
| Workout-Plan ohne Namen | `400` | bestanden |
| Plan mit Übung anlegen | `201`, Plan und Übung gespeichert | bestanden |
| Workout-Session mit Satz speichern | `201`, Session und Log gespeichert | bestanden |
| Wasseraufnahme aktualisieren | `200`, Tageswert aktualisiert | bestanden |
| Analytics-Statistik abrufen | `200`, gespeicherte Session berücksichtigt | bestanden |
| Logout | `204`, Cookie entfernt | bestanden |
| geschützte Pläne nach Logout | `401` | bestanden |

Zusätzliche statische Prüfungen:

- Frontend-Produktionsbuild: bestanden
- Frontend-ESLint: **0 Fehler**, verbleibende React-Hook-Hinweise werden als
  sichtbare Refactoring-Warnungen geführt
- Backend-Syntaxprüfung: **25 Dateien bestanden**
- Backend-Modulgrenzen: bestanden
- `git diff --check`: bestanden

## Bugfreiheits-Audit

Stand: 29. Juli 2026

| Prüfung | Ergebnis |
| --- | --- |
| projektweiter Befehl `npm run lint` | bestanden |
| Frontend-Produktionsbuild | bestanden |
| Backend-Syntax und Modulgrenzen | bestanden |
| produktive Landingpage `https://next-reps.de/` | `200` |
| produktive Authentifizierungsroute ohne Session | erwartetes `401` mit JSON statt Serverfehler |
| lokaler End-to-End-API-Smoke-Test der Kernfunktionen | bestanden |
| iOS-Build | bestanden |
| iOS-Verbindung zur produktiven API | nach gezielter CORS- und CSP-Korrektur bestanden |

Während der Prüfung wurden keine bekannten blockierenden Fehler in den
Kernfunktionen offengelassen. Die verbleibenden 28 ESLint-Meldungen sind
Warnungen zu Hook-Abhängigkeiten und möglichen Render-Optimierungen. Sie
verhindern weder Lint-Abschluss noch Produktionsbuild, bleiben aber als
technische Refactoring-Aufgabe sichtbar. Eine belastbarere Regressionserkennung
wird im nächsten Qualitätsschritt durch Vitest und Cypress ergänzt.

## Gefundener und behobener Fehler

Beim ersten Durchlauf konnten Prisma-Migrationen über `DATABASE_URL`
erfolgreich ausgeführt werden, während die laufende Anwendung wegen fehlender
separater `DATABASE_USER`-, `DATABASE_PASSWORD`- und `DATABASE_NAME`-Variablen
keine Verbindung erhielt.

Der MariaDB-Adapter liest diese Werte nun standardmäßig direkt aus der
vollständigen `DATABASE_URL`. Einzelne `DATABASE_*`-Variablen bleiben optionale
Overrides. Damit benötigt eine bestehende lokale `.env` keine
undokumentierten Zusatzwerte.

## Noch ausstehend

- Vitest-Backendtests mit mindestens 80 Prozent Coverage
- Cypress-E2E-Tests für die oben definierten Browserpfade
- reproduzierbarer Coverage-Report im Abgabeartefakt
- abschließender visueller Desktop- und Mobile-Smoke-Test
