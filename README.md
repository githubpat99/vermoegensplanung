# Vermögenslabor

[![Deploy auf GitHub Pages](https://github.com/githubpat99/vermoegensplanung/actions/workflows/deploy.yml/badge.svg)](https://github.com/githubpat99/vermoegensplanung/actions/workflows/deploy.yml)

Eigenständige, responsive Web-App zum Simulieren und Vergleichen von Anlage-,
Reserve- und Entnahmestrategien für dein Vermögen in unterschiedlichen
Marktphasen.

**Leitfrage:** „Teste, wie dein Vermögen durch unterschiedliche Marktphasen kommt.“

**Live-Demo:** <https://githubpat99.github.io/vermoegensplanung/>

> **Keine Anlageempfehlung.** Das Vermögenslabor simuliert transparent, wie
> unterschiedliche Anlage-, Reserve- und Entnahmestrategien unter verschiedenen
> Marktverläufen gewirkt hätten – nicht „Welche Strategie ist die beste?“.

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

Darstellung im echten Browser prüfen (Playwright/Chromium, 5 Viewports ×
3 Bereiche: Überlauf, abgeschnittene Texte, Touch-Ziele, Screenshots):

```bash
npm run build
npm run preview                                  # http://localhost:4173
node scripts/visual-check.mjs http://localhost:4173/
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

Drei Bereiche über die Tabs im Kopfbereich – mit **einem gemeinsamen Zustand**:
Eine Änderung im Labor wirkt sofort in den Details und umgekehrt.

| Tab | Inhalt |
|---|---|
| **Labor** | ausprobieren und vergleichen: kompakte Ausgangslage, S4-Strategie, Szenarien × Strategien, Robustheits-Kennzahlen, Strategieraum |
| **Details** | verstehen: eine Kombination aus Strategie und Marktszenario Jahr für Jahr |
| **Einstellungen** | Grundlagen und Methodik: Modellannahmen, Marktdaten & Quellen, Berechnungslogik, Darstellung/weitere Einstellungen, Über das Vermögenslabor |

Startbereich ist das **Labor**.

### Darstellungsprinzip

**Zeigen und bedienen – erklären bei Bedarf.** Sichtbar sind immer nur
Ergebnisse und Bedienelemente; Erklärungen, Beispiele und Methodik liegen hinter
einem Aufklapper („ⓘ …“). Auf dem Handy erscheinen breite Auswertungen als
Karten statt als Tabelle. **Beträge werden nie gerundet:** jede Ansicht zeigt
denselben exakten Wert (z. B. `866'697`) – die Matrixkarte, die Heatmap-Zelle,
die Kennzahlenkarte und die Detailansicht stimmen zeichengenau überein.
Abschnittsköpfe nennen nur Titel und eine Kurzbilanz; es gibt keine
abgeschnittenen Überschriften. Geprüft wird das automatisch (siehe „Befehle“
und `TEST_REPORT.md`, Abschnitt 6).

### Labor

Mobile-first, kartenbasiert, ohne Excel-Look. Aufbau:

1. **App-Header** – App-Icon, Produktname „Vermögenslabor“, Leitfrage, Tabs und
   Info-Button. Unter dem Header gibt es bewusst keine Abschnitts-Navigation.
2. **Ausgangslage (kompakt)** – in einer Zeile: Startvermögen, jährlicher
   Kapitalbedarf, Aktien/Obligationen und Liquiditätsreserve in Jahresbedarfen,
   darunter der Rebalancing-Schalter und die Zeile
   „Reserve: 2 Jahresbedarfe · CHF 145'000 · ⅓ Geldmarkt · ⅔ Obligationen“.
   Die ausführliche Reserve-Einstellung (Einheit Jahre/CHF, Regler, Aufteilung)
   liegt hinter **„Reserve im Detail“**. Alle Zahlenfelder lassen sich **frei
   tippen** (jeder gültige Zwischenstand wird sofort übernommen, beim Verlassen
   des Feldes auf das übliche Format normalisiert).
3. **S4 · Neue Höchststände** – Kopfzeile mit der Kurzbilanz
   „13 % der neuen Gewinne → Reserve“. Genau **zwei** Parameter, kein
   Regelauswahl-Dropdown:
   - **Von neuen Gewinnen in Reserve** (Prozent, Standard 13 %),
   - **Reserve auffüllen bis** (Jahresbedarfe, Standard = Reservehöhe der
     Ausgangslage).

   Erklärung und Beispiel liegen hinter **„ⓘ So funktioniert's“**: der Satz
   „Erreicht das Portfolio einen neuen Höchststand, werden 13 % des Betrags über
   dem bisherigen Höchststand in die Reserve verschoben. Kein neues Hoch → keine
   Auffüllung.“ und das Rechenbeispiel (1'000'000 → 1'100'000 → neuer Gewinn
   100'000 → 13 % = 13'000 in die Reserve, höchstens bis zur Zielreserve).

   Die drei Referenzstrategien S1–S3 decken die einfachen Auffüllregeln ab; die
   übrigen Regeln (Schwellenwert, Staffel, „nie“, „jährlich“, „nach guten
   Jahren“, „über Startwert“) bleiben in der Engine für Tests und spätere
   Experimente erhalten, sind im Labor aber **nicht mehr auswählbar**.
4. **Szenarien × Strategien** – Endvermögen (CHF) je Szenario (Zeile) und
   Strategie (Spalte) über alle **6 Szenarien**. Dunkelgrün markiert das
   **höchste Endvermögen innerhalb dieses Marktszenarios** – ausdrücklich keine
   Empfehlung und keine „beste“ Strategie (auch als Tooltip/Info).
   **Klick auf einen Wert** öffnet die Details genau dieser Kombination.
   Auf schmalen Bildschirmen steht pro Marktphase eine Karte mit S1–S4
   nebeneinander (Umschalter **Szenarien | Kennzahlen**); ab 900 px erscheint
   die vollständige Tabelle. Die Karte zeigt denselben exakten Betrag, den der
   Klick in den Details öffnet (z. B. S4 in „Schlechte Börsenjahre“: 866'697).
5. **Robustheit über 6 Szenarien** – schlechtestes Ergebnis, Ø Endvermögen,
   Median, „Vermögen aufgebraucht“ (Anzahl von 6) und grösster Rückgang
   (Peak→Tief). **Klick auf eine Kennzahl** öffnet die Details zur Strategie;
   mobil als Karte je Strategie.
6. **Strategieraum** – Heatmap des durchschnittlichen Endvermögens über alle
   6 Szenarien. Jede Zelle ist eine mögliche **Ausgangslage**: Zeile =
   Aktienquote (100/0 … 60/40), Spalte = **Reserve in Jahresbedarfen**.
   **Ein Klick setzt genau diese Ausgangslage** (Aktienquote + Startreserve) und
   **bleibt im Labor**: Der Vergleich und die Kennzahlen rechnen sofort neu, S1–S4
   und alle Marktszenarien bleiben gleichzeitig sichtbar, und die Zelle ist als
   aktive Kombination markiert. Kurz darauf folgt ein sanfter Scroll zum
   Vergleich, dazu die Bestätigung „Als Ausgangslage übernommen: 90/10 ·
   Reserve 1 Jahresbedarf“ – ohne Modalbox und ohne Bestätigungsbutton.
   Die Aufschlüsselung je Marktphase liegt hinter „ⓘ Je Marktphase“.
   Ausdrücklich ein **Explorationswerkzeug**, keine Anlageempfehlung.
7. **Live-Ergebnisleiste** – solange der Vergleichsbereich ausserhalb des
   sichtbaren Bereichs liegt, zeigt sie das Endvermögen aller sichtbaren
   Strategien und führt per Klick in die Details.

**Klicklogik (fachliche Navigation):**

```
Strategieraum            „Welche Ausgangslage möchte ich untersuchen?“
      ↓  Klick auf eine Zelle → Ausgangslage setzen, im Labor bleiben
Szenarien × Strategien   „Wie verhält sich diese Ausgangslage mit S1–S4
      ↓                    in den verschiedenen Marktszenarien?“
      ↓  Klick auf einen Ergebniswert → Details dieser Kombination
Details                  „Warum entsteht genau dieses Ergebnis?“
```

Der Strategieraum wählt also **keine** Strategie und **kein** Marktszenario –
nur ein Klick auf einen konkreten Ergebniswert der Matrix öffnet die DETAILS.

**Immer live:** Jede Änderung eines simulationsrelevanten Parameters rechnet
alle Strategien sofort neu – es gibt keinen „Berechnen“-, „Speichern“- oder
„Übernehmen“-Button.

### Details

„Warum ist dieses Ergebnis entstanden?“ – eine konkrete Kombination:

- **Kopf** – Dropdowns für **Strategie** (S1–S4) und **Marktszenario** (6),
  darunter `S4 · <aktive Regel>`, Szenario, `80/20 · Reserve 2 Jahresbedarfe` und
  der Jahresbedarf.
- **Kennzahlen** – Endvermögen, Startvermögen, gesamte Entnahmen, maximaler
  Drawdown, Reserve am Ende und (falls zutreffend) das Jahr der
  Vermögenserschöpfung. Die **Strategie-Kacheln** dienen zugleich als Auswahl.
- **Vermögensverlauf über 15 Jahre** – bestehender Chart; ein Klick auf einen
  Punkt fokussiert das Jahr.
- **Jahresverlauf** – alle Werte pro Jahr (inkl. beider Reserve-Töpfe und der
  Auffüllmechanik: Portfoliorendite, Reserve vor der Auffüllung, fehlende
  Reserve, angewandte Auffüllquote, Auffüllbetrag, Reserve danach). Bei der
  High-Water-Mark-Regel zusätzlich **Höchststand bisher, Portfolio nach Rendite,
  neuer Gewinn, Abschöpfquote und Höchststand neu**. **Klick auf ein Jahr**
  (Tabelle oder Chart) öffnet die kompakte Jahresanalyse.
- **Weitere Auswertungen** – Zusammensetzung über die Zeit und Wirkung des
  Marktszenarios.

### Einstellungen

- **Modellannahmen** – Inflation, Steuern, Kosten/TER (je 0 % in V1),
  Geldmarktverzinsung, Reserveaufteilung ⅓/⅔, Liquiditätsreserve,
  Simulationsdauer und Bondannahmen – transparent dargestellt, unverändert.
- **Marktdaten & Quellen** – historische Reihen (1999–2013, 1982–1996) mit
  Backtest-Hinweisen und die vier Modellszenarien („Modellszenario – keine
  historische Periode“) inklusive Quellentabelle.
- **Berechnungslogik** – Jahresablauf, Invarianten (Reserve ist Bestandteil des
  Gesamtvermögens, Auffüllung als interner Transfer, Rebalancing neutral, kein
  Look-ahead, volle Genauigkeit) und die vier Strategien.
- **Darstellung & weitere Einstellungen** – Startjahr, Dauer, Bond-Annahmen,
  Bondsequenz für Modellszenarien und die Sichtbarkeit der Strategien.
- **Über das Vermögenslabor** – Zweck, Grenzen und Datengrundlage.

Reihenfolge (**S1–S4**) und Farben der Strategien bleiben in allen Ansichten
stabil. Es gibt bewusst **keine Bewertung „beste Strategie“** – nur Zahlen und
Kennzahlen. Beim Wechsel des Bereichs wird nach oben gescrollt.

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

*(Die Tabelle zeigt die ursprünglichen fünf Szenarien; seither ist das
Modellszenario „Crash nach Reserveverbrauch“ dazugekommen.)*

Ehrliches Resultat des Modells: Weil ein Drittel der Reserve nur zum
Geldmarktzins (0 %) verzinst wird, **kostet** die Reserve in den meisten
Szenarien Ertrag – sie reduziert das Aktienengagement dauerhaft. Deutlich
gewinnen tut sie im Seitwärtsmarkt (Zickzack) und in Sequenzen, in denen der
Einbruch erst nach dem Verbrauch der Anfangsreserve kommt („Crash nach
Reserveverbrauch“), wo ein grosser Teil der Entnahmen sonst in schwachen Jahren
verkauft werden müsste. Die Reserve ist also primär eine **Versicherung**, keine
Renditequelle.

## Strategien (V1)

Vergleichsmassstab ist die **Verwendung** der Reserve, nicht ihre Höhe: Die
Höhe wird einmal in der „Ausgangslage“ gewählt und gilt für alle Strategien.

| ID | Name | Verwendung der Reserve |
|----|------|------------------------|
| S1 | Reserve verbrauchen | wird nur verbraucht, **nie** aufgefüllt |
| S2 | Jährlich auffüllen | wird **jedes Jahr** auf den Zielwert aufgefüllt |
| S3 | Nach guten Jahren | wird nur nach einem **positiven Aktienjahr** aufgefüllt |
| S4 | Neue Höchststände | nur **Gewinne oberhalb des bisherigen Portfolio-Höchststands** werden teilweise in die Reserve verschoben |

S1–S3 sind die **Referenzstrategien** mit den einfachen Auffüllregeln. **S4** ist
die **Experimentierstrategie**: Sie füllt die Reserve nicht schon deshalb auf,
weil ein Jahr gut gelaufen ist, sondern nur aus *neuen* Portfolio-Höchstständen.
Im Labor sind dafür genau zwei Werte einstellbar: **Von neuen Gewinnen in
Reserve** (Standard 13 %) und **Reserve auffüllen bis** (Jahresbedarfe). Die
**Startreserve** kommt weiterhin aus der „Ausgangslage“ und gilt für alle
Strategien. Der Erklärsatz unter den Feldern zeigt die Wirkung mit den aktuellen
Werten; die Jahresdetails zeigen Jahr für Jahr, ob und wie viel tatsächlich
aufgefüllt wurde.

Die übrigen Auffüllregeln – „nie“, „jährlich“, „nach guten Jahren“,
„über Startwert“, Renditeschwelle (≥, Standard 7 %) und die gestaffelte
Renditeregel – bleiben in der Engine **erhalten** (Tests, Vergleiche, spätere
Experimente), sind im Vermögenslabor aber nicht mehr auswählbar.

**Gestaffelt nach Rendite auffüllen (Engine, nicht im Labor auswählbar).**
Statt die Reserve nach einem Verbrauch sofort wieder ganz aufzufüllen, füllt
diese Regel nur einen Teil der **fehlenden** Reserve auf – abhängig von der
bereits realisierten Portfoliorendite des laufenden Jahres:

| Portfoliorendite | Anteil der fehlenden Reserve |
|---|---|
| ≤ 5 % | 0 % |
| > 5 % bis 10 % | 25 % |
| > 10 % bis 15 % | 50 % |
| > 15 % bis 20 % | 75 % |
| > 20 % | 100 % |

Beispiel: Zielreserve 65'000, Reserve vor Auffüllung 10'000 → fehlend 55'000;
bei +12 % Rendite sind das 50 % → 27'500 Auffüllung → Reserve 37'500. Die
Reserve wird dabei **nie** über die Zielreserve hinaus erhöht, und die
Auffüllung bleibt eine reine Umschichtung (Anlagevermögen −X, Reserve +X,
Gesamtvermögen unverändert).

**S4: Gewinne bei neuen Höchstständen sichern.** Diese Regel füllt die Reserve
**nicht** schon deshalb auf, weil ein einzelnes Jahr gut gelaufen ist, sondern
nur, wenn das **investierte Portfolio** einen neuen historischen Höchststand
erreicht. In die Reserve verschoben wird der eingestellte Anteil (Standard 13 %)
des Betrags, der über dem bisherigen Höchststand liegt – maximal bis zur
Zielreserve.

| | |
|---|---|
| Messpunkt | investiertes Portfolio (Aktien + Bonds) **nach** der Jahresrendite, **vor** Entnahme und Auffüllung |
| Startwert der Marke | investiertes Vermögen zu Beginn (Startvermögen − Startreserve) |
| Fortführung | `Marke = max(Marke, Portfolio nach Rendite)` – die Marke wird **nie** gesenkt, auch nicht durch Entnahmen oder die Auffüllung selbst |
| Wirkung | derselbe Gewinn kann im Folgejahr nicht erneut abgeschöpft werden; in einer Erholungsphase unterhalb des alten Hochs wird **kein** Kapital aus dem Portfolio genommen |

Die Jahresdetails zeigen für diese Regel zusätzlich **Höchststand bisher**,
**Portfolio nach Rendite**, **neuen Gewinn**, **Abschöpfquote** und
**Höchststand neu** – damit ist nachvollziehbar, warum in einem Jahr aufgefüllt
wurde oder nicht.

> **Schwellenvergleich ist exakt.** Die Portfoliorendite wird als gewichtete
> Rendite aus den *gegebenen* Jahresrenditen berechnet (Gewichte aus den
> Startbeständen), nicht als „Ertrag / Startwert“. Der Vergleich lautet „≥“
> mit einer Toleranz von 1e-9. Damit zählt ein Jahr mit exakt 12,00 % die
> Schwelle unabhängig vom Kontostand als erreicht – vorher entschied der
> Gleitkomma-Rundungsfehler, was Ergebnisse um bis zu 10 % verschieben konnte.

Die **Reservehöhe** und die **Aktien-/Obligationen-Verteilung** werden auf dem
Screen „Ausgangslage“ eingestellt (100/0, 90/10, 80/20, 70/30 oder frei) und
gelten für alle Strategien — daher enthält kein Strategiename mehr „80/20“ oder
eine Jahresbedarfszahl. Reihenfolge (S1–S4) und Farben bleiben in allen Ansichten
stabil.

> **Reserve-Regler der Ausgangslage wirkt auf alle Strategien.** Er steuert die
> Startreserve, die für S1–S4 identisch ist; der Wert ist im Untertitel der
> Sektion, in den Kachel-Badges und in den Spaltentiteln des Vergleichs
> ablesbar. S4 darf zusätzlich eine abweichende Zielreserve und die
> Auffüllschwelle setzen. Die vier Strategien unterscheiden sich ansonsten
> ausschliesslich in der Verwendungsregel.

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
