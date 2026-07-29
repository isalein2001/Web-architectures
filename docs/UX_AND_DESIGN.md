# UX und Designsprache

## Zielbild

NEXT REPS soll sich wie ein fokussiertes Trainingswerkzeug anfühlen und nicht
wie ein generisches Administrations-Dashboard. Die Oberfläche verbindet daher
eine dunkle, kontrastreiche Trainingsästhetik mit einer klaren Informations-
hierarchie. Die kräftige Lime-Akzentfarbe markiert Aktionen und Fortschritt,
während Inhalte überwiegend auf ruhigen schwarzen und anthrazitfarbenen
Flächen liegen.

## Eigene Designsprache

Die visuelle Sprache ist zentral in `src/styles/designTokens.css` definiert:

- Lime `#c5fe00` als wiederkehrende Produkt- und Aktionsfarbe
- Schwarz und abgestufte Anthrazitflächen als Grundpalette
- kompakte, große Headlines mit bewusst engem Zeilenabstand
- einheitliche Abstände, Radien, Schatten und Motion-Kurven
- eigene mobile Größen für Karten, Navigation, Buttons und Kennzahlen

Diese Tokens werden über Landingpage, Dashboard, Workout-Planung, Logger,
Analytics und Profil hinweg wiederverwendet. Dadurch entstehen konsistente
Interaktionsmuster statt unabhängig gestalteter Einzelseiten.

## Landingpage: Nutzen vor Feature

### Above the fold

Die Hero-Headline beschreibt direkt den Nutzen:

> Your gym notebook, calendar and analytics in one app.

Der Text darunter erklärt den verbundenen Workflow aus Planung, Logging und
Fortschrittsanalyse. Der primäre CTA führt neue Nutzer ohne Zwischenstufe zur
Registrierung; Login und Feature-Sprung sind als sekundäre Aktionen sichtbar.

### Produkt statt Stockfoto

Die Landingpage verwendet mehrere Formen echter Produktdarstellung:

- kurze Hero-Reels aus der Anwendung
- eine scrollgesteuerte Smartphone-Demo mit dem App-Video
- schrittweise eingeblendete Erklärungen für Planung, Logging und Analyse
- nachgebaute Produktvorschauen und Diagramme für weitere Funktionsbereiche

Die Animationen sind nicht nur dekorativ: Sie verbinden die beschriebenen
Vorteile mit dem tatsächlichen Bedienablauf der App.

### Reibungsarmer Einstieg

- nicht eingeloggte Nutzer gelangen über den primären CTA zur Registrierung
- bestehende Nutzer erreichen den Login direkt
- eingeloggte Nutzer sehen stattdessen einen direkten Dashboard-CTA
- die iOS-App überspringt die Web-Landingpage und führt in ihren eigenen
  First-Launch- bzw. Login-Flow

## Funktionale UX

- geschützte Routen leiten abhängig von Login-, Verifikations- und
  Onboardingstatus zum richtigen nächsten Schritt
- Desktop-Sidebar und mobile Bottom-Navigation nutzen dieselben Kernziele
- Formulare zeigen Validierungs- und Serverfehler im jeweiligen Kontext
- Lade-, Leer- und Fehlerzustände verhindern unkommentierte leere Ansichten
- wiederkehrende Schnellaktionen reduzieren Wege beim Workout-Logging
- Deutsch und Englisch sind über den zentralen Language Context verfügbar

## Responsive Verhalten und Zugänglichkeit

Die Hauptlayouts besitzen Breakpoints für Desktop, Tablet und kleine
Smartphones. Landingpage und App wechseln unterhalb ihrer Breakpoints von
mehrspaltigen zu vertikalen Layouts. Wichtige Bedienelemente verwenden
semantische Links oder Buttons; Navigationen und Dialoge besitzen ARIA-Labels,
dekorative Grafiken werden vor Screenreadern verborgen und Formularfelder sind
beschriftet.

## Bekannte Verbesserungsmöglichkeiten

- Die großen Landingpage-Videos und die 3D-Smartphone-Demo erzeugen noch eine
  Vite-Chunk-Size-Warnung. Lazy Loading begrenzt die Auswirkung, eine weitere
  Aufteilung und Medienkompression bleibt sinnvoll.
- Die verbleibenden ESLint-Hook-Warnungen sollten nach der Abgabe schrittweise
  refaktoriert werden.
- Ein automatisierter Accessibility-Test mit axe sowie ein vollständiger
  Tastatur- und Reduced-Motion-Test würden die manuelle Prüfung ergänzen.

