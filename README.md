# Entnahme-Stresstest

[![Deploy auf GitHub Pages](https://github.com/githubpat99/vermoegensplanung/actions/workflows/deploy.yml/badge.svg)](https://github.com/githubpat99/vermoegensplanung/actions/workflows/deploy.yml)

Eigenständige, responsive Web-App zur Simulation und zum Vergleich von
Entnahmestrategien während der Pensionierungsphase.

**Live-Demo:** <https://githubpat99.github.io/vermoegensplanung/>

> **Keine Anlageempfehlung.** Die App simuliert Strategien transparent und
> vergleichbar und beantwortet die Frage: „Was wäre mit meinem Vermögen
> passiert?“ – nicht „Welche Strategie ist die beste?“.

## Technologie

- React 18 + TypeScript
- Vite (statischer Build, GitHub-Pages-kompatibel via `base: './'`)
- Vitest für die Tests
- Keine Backend-Abhängigkeit, keine Laufzeit-Abhängigkeit vom „Ruhestands-Check“

## Schnellstart (Windows, Doppelklick)

Einfach **`start.cmd`** doppelklicken. Das Skript:

1. sucht Node.js (echtes Node im PATH **oder** die portable Version unter
   `%LOCALAPPDATA%\nodejs-portable\node-v*-win-x64`),
2. führt bei Bedarf `npm install` aus,
3. startet den Dev-Server und öffnet automatisch <http://localhost:5173>.

Beenden: Fenster schliessen oder `Strg+C`.

## Befehle

```bash
npm install      # Abhängigkeiten installieren
npm run dev      # Entwicklungsserver (http://localhost:5173)
npm test         # Testsuite ausführen (Vitest)
npm run build    # Produktionsbuild (tsc --noEmit && vite build) -> dist/
npm run preview  # Build lokal prüfen
npm run typecheck
```

Voraussetzung: Node.js ≥ 18 (getestet mit Node 20).

## Deployment

Jeder Push auf `main` baut die App automatisch und veröffentlicht sie auf GitHub
Pages (`.github/workflows/deploy.yml`):

1. `npm ci` – Abhängigkeiten installieren
2. `npm test` – Testsuite muss grün sein
3. `npm run build` – Produktionsbuild nach `dist/`
4. Deployment von `dist/` auf <https://githubpat99.github.io/vermoegensplanung/>

Der Build verwendet relative Asset-Pfade (`base: './'`), damit er unter dem
Unterpfad der Projekt-Seite funktioniert. Manuell auslösbar über
**Actions → „Deploy auf GitHub Pages“ → Run workflow**.

> **Einmalige Einrichtung:** Unter *Settings → Pages → Build and deployment* muss
> als **Source** die Option **„GitHub Actions“** gewählt sein. Der `GITHUB_TOKEN`
> darf die Pages-Site nicht selbst anlegen – ohne diese Einstellung bricht der
> Schritt „Pages konfigurieren“ mit `Resource not accessible by integration` ab.

> **`index.html` kann nicht per Doppelklick geöffnet werden.** Sie ist das
> Vite-Template und lädt `/src/main.tsx` (TypeScript/JSX), das erst kompiliert
> werden muss. Auch der fertige Build in `dist/` benötigt einen Webserver,
> weil ES-Module (`type="module"`) unter `file://` vom Browser aus
> Sicherheitsgründen blockiert werden. Deshalb immer `start.cmd`,
> `npm run dev` oder `npm run preview` verwenden.


## App-Installation (Manifest & Start-Icon)

Die App ist als installierbare Web-App (PWA-Manifest) konfiguriert. In
`public/` liegen das Manifest und die aus `Vermögens_Icon.png` (1254×1254)
erzeugten Grössen:

```
public/
  manifest.webmanifest       # Name, Farben, Icons, start_url/scope = "./"
  Vermögens_Icon.png         # Original
  favicon-16.png
  favicon-32.png
  icons/
    apple-touch-icon.png     # 180×180
    icon-192.png             # 192×192
    icon-384.png             # 384×384
    icon-512.png             # 512×512 (any + maskable)
```

`index.html` verlinkt Manifest, Favicons, Apple-Touch-Icon und `theme-color`.

Zum Installieren im Browser die App öffnen (`start.cmd`) und dort „App
installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen – das
Vermögens-Icon wird dann als Start-Icon verwendet.

> Hinweis: Für eine echte PWA-Installation (Service Worker, Offline) müsste
> zusätzlich ein Service Worker registriert werden. Für V1 liefert das Manifest
> Icon, Name und Installierbarkeit im Standalone-Modus.

## Oberfläche

Drei Ansichten über die Tabs im Kopfbereich:

| Tab | Inhalt |
|---|---|
| **Simulation** | Ein Szenario im Detail: Ausgangslage, Marktszenario, Ergebnis-Kacheln, Vermögensverlauf, Vergleich, weitere Auswertungen, Weitere Einstellungen, Jahresdetails |
| **Szenariovergleich** | Alle Szenarien × alle Strategien auf einmal, Robustheits-Kennzahlen und Sensitivitätsanalyse |
| **Quellen** | Datengrundlage & Quellen |

### Simulation

Mobile-first, kartenbasiert, ohne Excel-Look. Aufbau:

1. **App-Header** – App-Icon, Produktname, Kernfrage, Tabs und Info-Button.
2. **1. Ausgangslage** – Startvermögen, jährlicher Kapitalbedarf (mit CHF-Präfix),
   Aktien/Obligationen-Slider, Rebalancing-Schalter und Liquiditätsreserve
   (Angabe der Aufteilung 1/3 Geldmarkt / 2/3 Obligationen in CHF).
3. **2. Marktszenario** – historische und synthetische Szenarien als auswählbare
   Zeilen mit Untertitel.
4. **Ergebnisse** (immer sichtbar, Badge „Live aktualisiert“):
   - farbige **Strategie-Kacheln** (Verwendungsregel der Reserve, Endvermögen und
     Veränderung zum Startvermögen),
   - **Vermögensverlauf** (Kennzahl umschaltbar: Gesamt-/investiertes Vermögen),
   - **Endvermögen im Vergleich** (Balken in Strategiefarbe),
   - aufklappbare **Weitere Auswertungen** (Zusammensetzung über die Zeit und
     Wirkung des Marktszenarios).
5. **Weitere Einstellungen** – Startjahr, Dauer, **Bond-Annahmen** (historisch
   oder fester Satz), Geldmarktzins, Strategien.
6. **Jahresdetails** – alle Werte pro Jahr, inklusive der beiden Reserve-Töpfe.

### Szenariovergleich

- **Ausgangslage** (immer sichtbar, für alle Tests identisch) – Startvermögen,
  Kapitalbedarf, Aktien/Obligationen, Rebalancing. **Ohne** Reserve-Eingabe,
  denn Reservehöhe und Verwendung sind Teil der Strategie.
- **Szenario- und Strategievergleich** – Endvermögen (CHF) je Szenario (Zeile)
  und Strategie (Spalte). Das beste Ergebnis je Zeile ist hervorgehoben;
  Klick auf eine Zeile wählt das Szenario.
- **Robustheits-Kennzahlen** je Strategie: schlechtestes Ergebnis, Ø Endvermögen,
  Median, „Vermögen aufgebraucht“ (Anzahl von 5) und grösster Rückgang
  (Peak→Tief, in %).
- **Sensitivitätsanalyse** – Heatmap des durchschnittlichen Endvermögens über
  alle Szenarien für jede Kombination aus Aktienquote (100/0 … 60/40) und
  Liquiditätsreserve (0–3 Jahresbedarfe); grün = höher, rot = niedriger.
  Klick auf eine Zelle öffnet die Detailwerte aller 5 Szenarien.
- **Ausgewähltes Feld** – zeigt die gewählte Kombination, den Durchschnitt und
  die Aufschlüsselung je Szenario. Mit **„Diese Kombination in Simulation
  anzeigen“** werden Aktienquote und Reserve übernommen und zur Simulation
  gewechselt.
- Auf Mobilgeräten schaltet ein Segment-Control zwischen **Tabelle**, **Heatmap**
  und **Kennzahlen** um.

Die Sektionen sind aufklappbar; Ausgangslage und Marktszenario sind offen, die
übrigen eingeklappt. Die Navigation öffnet das gewählte Ziel automatisch.
Reihenfolge (**S1–S4**) und Farben der Strategien bleiben in allen Ansichten stabil.
Es gibt bewusst **keine Bewertung „beste Strategie“** – nur Zahlen und Kennzahlen.

## Architektur

```
src/
  engine/            Reine, UI-freie Berechnungsengine
    types.ts         Datenmodell inkl. SimulationInput (Integrationsschnittstelle)
    rebalance.ts     Entnahme / Rebalancing (werterhaltend, NaN-sicher)
    strategies.ts    Strategien S1–S4 als Strategy-Objekte
    simulation.ts    Jahres-Schleife (siehe Rechenreihenfolge)
    metrics.ts       Kennzahlen-Aggregation
    robustness.ts    Robustheits-Kennzahlen (Min/Ø/Median/Erschöpfung/Drawdown)
    sensitivity.ts   Sensitivitätsanalyse (Aktienquote × Reserve)
  data/
    historicalScenarios.ts   MSCI World / Bloomberg US Agg (mit Quellen)
    syntheticScenarios.ts    Modellszenarien + Bond-Overlay
    sources.ts               Quellen-Metadaten
    scenarios.ts             Gesamtliste + Referenzfall
  components/        UI (React, ohne Berechnungslogik)
  tests/             Testgruppen A–K
```

**Rechenreihenfolge pro Jahr (kein Look-ahead):**

1. Vermögen Jahresanfang
2. Jahresrendite anwenden – Aktien mit der Aktienrendite, Obligationen mit der
   Bondrendite (historisch aus dem Szenario **oder** fester Satz), Reserve
   aufgeteilt in **1/3 Geldmarkt** (Geldmarktzins) und **2/3 Obligationen**
   (Bondrendite)
3. Kapitalbedarf bestimmen
4. Entnahme: **zuerst aus der Reserve**, danach proportional aus dem investierten Portfolio
5. Reserve gemäss Verwendungsregel auffüllen (nie / jährlich / nach positivem
   Aktienjahr / nur über dem Startwert)
6. Rebalancing des investierten Portfolios auf die Ziel-Aktienquote
7. Vermögen Jahresende → Anfangswert des Folgejahres

Alle Geldbeträge werden intern mit voller Genauigkeit gehalten; gerundet wird
nur bei der Darstellung. Prozente sind intern Dezimalwerte (25.34 % = 0.2534).

### Liquiditätsreserve

Die Reserve ist **immer 1/3 Geldmarkt und 2/3 Obligationen**:

| Topf | Anteil | Verzinsung |
|---|---|---|
| Geldmarkt | 1/3 | Geldmarktzins (Standard 0 %, orientiert am aktuellen Leitzins) |
| Obligationen | 2/3 | Bondrendite des Jahres (historisch oder fix, siehe „Bond-Annahmen“) |

Beispiel bei 3 Jahresbedarfen (217'500): 1 Jahresbedarf (72'500) Geldmarkt +
2 Jahresbedarfe (145'000) Obligationen. Die Reserve wird **vor** dem investierten
Portfolio für den Kapitalbedarf verbraucht und danach gemäss der Strategie
wieder aufgefüllt.

**Wirkung der Reservehöhe** (Ø über die jeweils gleiche Strategie, hier „nach
guten Jahren auffüllen“, 80/20):

| Szenario | 0 Jahre | 1 Jahr | 2 Jahre | 3 Jahre |
|---|---:|---:|---:|---:|
| Schlechte Börsenjahre (1999–2013) | **876'565** | 864'062 | 854'380 | 863'421 |
| Gute Börsenjahre (1982–1996) | **6'682'906** | 6'504'641 | 6'303'604 | 6'102'567 |
| Crash früh (theoretisch) | **477'214** | 389'663 | 365'130 | 395'195 |
| Crash spät (theoretisch) | **2'172'885** | 2'061'826 | 1'976'084 | 1'904'542 |
| Zickzack (theoretisch) | 165'548 | 231'765 | 265'268 | **298'753** |

Ehrliches Resultat des Modells: Weil ein Drittel der Reserve nur zum
Geldmarktzins (0 %) verzinst wird, **kostet** die Reserve in vier der fünf
Szenarien Ertrag – sie reduziert das Aktienengagement dauerhaft. Deutlich
gewinnen tut sie nur im Seitwärtsmarkt (Zickzack), wo ein grosser Teil der
Entnahmen sonst in schwachen Jahren verkauft werden müsste. Die Reserve ist
also primär eine **Versicherung**, keine Renditequelle.

## Strategien (V1)

Vergleichsmassstab ist die **Verwendung** der Reserve, nicht ihre Höhe: Die
Höhe wird einmal in der „Ausgangslage“ gewählt und gilt für alle Strategien.

| ID | Name | Verwendung der Reserve |
|----|------|------------------------|
| S1 | Nur verbrauchen | wird nur verbraucht, **nie** aufgefüllt |
| S2 | Jährlich auffüllen | wird **jedes Jahr** auf den Zielwert aufgefüllt |
| S3 | Nach guten Jahren | wird nur nach einem **positiven Aktienjahr** aufgefüllt |
| S4 | Benutzerdefiniert | frei wählbar (Standard: nur auffüllen, solange das Gesamtvermögen **über dem Startwert** liegt) |

Die **Reservehöhe** und die **Aktien-/Obligationen-Verteilung** werden auf dem
Screen „Ausgangslage“ eingestellt (100/0, 90/10, 80/20, 70/30 oder frei) und
gelten für alle Strategien — daher enthält kein Strategiename mehr „80/20“ oder
eine Jahresbedarfszahl. Reihenfolge (S1–S4) und Farben bleiben in allen Ansichten
stabil.

> **Reserve-Regler der Ausgangslage wirkt auf alle Strategien.** Er steuert die
> Reservehöhe, die für S1–S4 identisch ist; der Wert ist im Untertitel der
> Sektion, in den Kachel-Badges und in den Spaltentiteln des Vergleichs
> ablesbar. Die vier Strategien unterscheiden sich ausschliesslich in der
> Verwendungsregel.

> Die exakte Excel-Referenzlogik des ursprünglichen Prototyps lag beim Aufbau
> nicht vor. Die Semantik oben ist eine saubere, dokumentierte Neu-Spezifikation.
> Details und Abweichungen: siehe `TEST_REPORT.md`.

## Spätere Integration

Die Engine ist UI-frei und kann direkt eingebettet werden:

```ts
import { runSimulation, buildStrategies } from './engine';
import type { SimulationInput } from './engine';

const input: SimulationInput = { /* vom Ruhestands-Check geliefert */ };
const [strategy] = buildStrategies(input.equityAllocation);
const result = runSimulation(input, scenario, strategy);
```

## Datenquellen

- MSCI World Index, Gross Return, USD
  <https://www.msci.com/indexes/index/990100/msci-world-index>
  (Werte vor dem Launch am 31.03.1986 sind gemäss MSCI back-tested.)
- Bloomberg U.S. Aggregate Bond Index, Total Return, USD

Alle Reihen sind im Bereich „Datengrundlage & Quellen“ mit Index, Return Type,
Währung, Zeitraum, Quelle und Abrufhinweis dokumentiert.
