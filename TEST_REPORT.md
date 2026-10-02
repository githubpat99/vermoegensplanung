# TEST_REPORT — Vermögenslabor (V1)

Erstellt: 2026-10-01
Umgebung: Windows, Node.js 20.18.0, npm 10.8.2, Vite 5.4, Vitest 2.1

## 1. Zusammenfassung

| Kennzahl | Wert |
|---|---|
| Anzahl Testdateien | 17 |
| Anzahl Unit Tests | **228** |
| Bestandene Tests | **228** |
| Fehlgeschlagene Tests | **0** |
| `npm test` | ✅ grün |
| `npm run build` | ✅ erfolgreich (`tsc --noEmit` + `vite build`) |
| Production-Bundle | `dist/` — JS ~225 kB (gzip ~69 kB), CSS ~31,6 kB (gzip ~6,8 kB) |
| Browserprüfung | ✅ 5 Viewports × 3 Bereiche, kein horizontales Überlaufen, Klicklogik `node scripts/visual-check.mjs` |

Alle Testgruppen A–K der Vorgabe sind implementiert. Die einzige inhaltlich
„offene“ Gruppe ist die Regression gegen die Excel-Werte (Gruppe J): Sie ist
vorhanden, wird aber bewusst als **Golden-Master- + dokumentierter
Abweichungsvergleich** geführt (siehe Abschnitt 4–5), weil die zugrunde
liegende Excel-Datei beim Aufbau nicht verfügbar war.

## 2. Testgruppen

| Gruppe | Datei | Tests | Inhalt |
|---|---|---|---|
| A – Daten | `src/tests/data.test.ts` | 6 | 15 Aktien-/Bondrenditen je Szenario, vollständige Quellen, synthetisch ≠ historisch, Backtest-Hinweis 1982–1996 |
| B – Startallokation | `src/tests/allocation.test.ts` | 3 | Reserveabzug, Aktien 808'240 / Bonds 202'060 (exakt) |
| C – Rendite | `src/tests/returns.test.ts` | 4 | 808'240 × 25.34 %, 202'060 × −0.82 %, keine vorzeitige Rundung |
| D – Rebalancing | `src/tests/rebalancing.test.ts` | 3 | 80/20-Gewicht nach jedem Rebalancing (Toleranz 1e-8), Reserve nicht im Nenner |
| E – Accounting Identity | `src/tests/accounting.test.ts` | 5 | Buckets = Gesamt; Start + Renditen − Bedarf = Ende (alle Strategien) |
| F – Jahrübergang | `src/tests/yearTransition.test.ts` | 3 | Ende(n) = Anfang(n+1) über alle Szenarien/Strategien |
| G – kein Look-ahead | `src/tests/lookahead.test.ts` | 48 | Änderung künftiger Aktien-/Bondrenditen verändert frühere Jahre nicht |
| H – Rebalancing-Erhaltung | `src/tests/rebalancing.test.ts` | 3 | Rebalancing erhält das Gesamtvermögen exakt |
| I – Extremfälle | `src/tests/edgeCases.test.ts` | 6 | Aktien −100 %, Reserve 0, Bonds 0, Bedarf 0, Bedarf > Vermögen → „Vermögen aufgebraucht“ |
| J – Referenzregression | `src/tests/regression.test.ts` | 4 | Golden Master + dokumentierte Excel-Abweichung + qualitative Muster |
| K – Oberfläche | `src/tests/ui.test.tsx` | 62 | Header und Navigation (Labor · Details · Einstellungen, Start = Labor), Laboraufbau und -reihenfolge, kompakte Ausgangslage, S4 nur mit den zwei Höchststand-Parametern (kein Regelauswahl-Dropdown), Matrixspalten, Vergleichsmatrix (6 Szenarien, Zeilenmaximum, Klickziel), Robustheits-Kennzahlen, Strategieraum, Live-Ergebnisleiste, Details (Kennzahlen, Verlauf, Jahresverlauf, Jahresfokus), Einstellungen (fünf Bereiche inkl. Quellen und Modellannahmen), S4-Erklärsatz, Strategiefarben, PWA/Manifest; **responsive Gruppe (K52–K61):** **Beträge exakt und in allen Ansichten identisch** (Matrixkarte = Details, Heatmap-Zelle = Auswahl-Panel, Kennzahlenkarte = Tabelle), mobile Karten für Vergleich und Kennzahlen, Desktop-Tabellen hinter `.desktop-only`, keine abgeschnittenen Titel, Info-Aufklapper, Touch-Ziele, keine doppelten Auslöser, Rasterspalten ohne Aufziehen durch breite Tabellen |
| L – Robustheit & Sensitivität | `src/tests/robustness.test.ts` | 9 | Median, Drawdown, Kennzahlen, Sensitivitätsraster |
| M – Liquiditätsreserve | `src/tests/reserve.test.ts` | 16 | Aufteilung 1/3 Geldmarkt / 2/3 Obli, Verzinsung, Entnahme zuerst aus der Reserve, Reservehöhe für alle Strategien, Wirkung je Marktphase, fixe vs. historische Bondrendite, Portfoliorendite, S4-Schwellenregel (≥), Zielreserve und Auffüllbeträge |
| N – Audit | `src/tests/audit.test.ts` | 14 | Reproduktion der gemeldeten Zahlen (5 Szenarien × S1–S4), Gleitkomma-Unabhängigkeit der Schwelle, Startgleichheit, Transferneutralität der Auffüllung, Entnahmelogik, Rebalancing, Accounting Identity, Look-ahead-Freiheit, unabhängige Nachrechnung, Audit-Trail der ersten fünf Jahre |
| O – Gestaffelte Auffüllregel | `src/tests/tiered.test.tsx` | 9 | Staffelgrenzen (0/5/5,1/10/10,1/15/15,1/20/20,1 %), Quote × fehlende Reserve, Deckelung auf die Zielreserve, volle Reserve ohne Auffüllung, Transferneutralität, kein Look-ahead, Konsistenz der angewandten Quote, S1–S3 unverändert, kompakte Staffel-Anzeige der S4-Karte |
| P – High-Water-Mark-Regel | `src/tests/highwater.test.tsx` | 15 | Fälle A–J der Vorgabe: unter/auf dem Hoch ohne Auffüllung, 100'000 über dem Hoch → 50'000, Zielreserve-Deckel, volle Reserve, Transferneutralität, Fortführung der Marke, kein zweites Abschöpfen desselben Gewinns, kein Look-ahead, Crash + Erholung unter dem alten Hoch, S1–S3 unverändert, S4-Karte mit Gewinnquote und Info-Text |
| Q – Szenario „Crash nach Reserveverbrauch“ | `src/tests/scenarioCrashAfterReserve.test.ts` | 7 | 15 vorgegebene Aktienrenditen, Modellszenario ohne historische Periode, gleiche Bond-/Modelllogik wie die übrigen Synthetics, sechs Szenarien insgesamt (bestehende unverändert), S1–S4 ohne NaN, Robustheit und Strategieraum über alle sechs Szenarien, Sequenzprüfung (Ansparen 1–4, Einbruch 5–8, Erholung 9–15) |
| R – Workflow | `src/tests/workflow.test.tsx` | 11 | Interaktiver Ablauf mit jsdom: Starttab Labor, Bereichswechsel, S4-Parameter (13 % → 50 %, Zielreserve 2 → 1) live ändern (Matrix und Kennzahlen rechnen sofort neu), Golden Master der S4-Spalte bei Standardparametern, Zellklick „Crash nach Reserveverbrauch × S4“ öffnet genau diese Kombination in den Details (Endvermögen = angeklickter Matrixwert), Zustandserhalt über die Bereiche, Jahresfokus, Einstellungen mit Quellen; **Klicklogik (R7–R9):** Strategieraum-Klick setzt Aktienquote 90 und Reserve 1, **bleibt im Labor**, zeigt die Bestätigung und rechnet den Vergleich neu; er wählt **weder Strategie noch Marktszenario** (Details zeigen weiter S2 · Schlechte Börsenjahre); nur ein Matrixwert öffnet die Details – mit erhaltener Ausgangslage 90/10 + 1 Jahresbedarf und dem angeklickten Endvermögen |
| **Total** | | **228** | |

Ergänzend zur automatisierten UI-Prüfung wurden die Screens im echten Browser
bei 390×844, 430×932, 768×1024, 1366×768 und 1920×1080 geprüft (Abschnitt 6).

## 2a. Oberfläche (nach Bildvorlage)

Drei Bereiche über die Kopf-Tabs: **Labor | Details | Einstellungen** (Start: Labor). Alle Bereiche teilen einen gemeinsamen Zustand.

### Labor

| Element | Zeigt die Wirkung von |
|---|---|
| **Kompakte Ausgangslage** | Startvermögen, Kapitalbedarf, Aktien/Obligationen, Liquiditätsreserve (Startreserve aller Strategien), Rebalancing |
| **S4 · Neue Höchststände** | zwei Parameter (Anteil neuer Gewinne in Prozent, Zielreserve in Jahresbedarfen); Erklärung und Beispiel liegen hinter „ⓘ So funktioniert's“, der Kopf zeigt die Kurzbilanz „13 % der neuen Gewinne → Reserve“ |
| **Szenarien × Strategien** | Endvermögen je Szenario × Strategie; Zeilenmaximum hervorgehoben; **Klick auf einen Wert** öffnet die Details der Kombination. Mobil eine Karte je Marktphase mit S1–S4 nebeneinander, ab 900 px die vollständige Tabelle. **Beträge sind in allen Ansichten identisch und exakt** (kein Runden) |
| **Robustheit über 6 Szenarien** | Schlechtestes Ergebnis, Ø, Median, aufgebraucht (n/6), grösster Rückgang; **Klick auf eine Kennzahl** öffnet die Details zur Strategie. Mobil eine Karte je Strategie – dieselben exakten Beträge wie in der Tabelle |
| **Strategieraum** | Heatmap Aktienquote × Reserve, Ø über alle 6 Szenarien. **Klick = Ausgangslage setzen** (Aktienquote + Startreserve), das Labor bleibt stehen: Vergleich und Kennzahlen rechnen sofort neu, die Zelle ist als aktive Kombination markiert, dazu die Bestätigung „Als Ausgangslage übernommen …“ und ein sanfter Scroll zum Vergleich. Aufschlüsselung je Marktphase hinter „ⓘ Je Marktphase“. Wählt **keine** Strategie und **kein** Marktszenario |
| **Live-Ergebnisleiste** (fixiert, wenn der Vergleichsbereich ausserhalb des Viewports liegt) | Endvermögen aller sichtbaren Strategien bei jeder Parameteränderung |
| **Ohne Reserve (0 Jahresbedarfe)** | Hinweis, dass die Auffüllregeln nicht greifen können und S1–S4 deshalb identisch rechnen |

### Details und Einstellungen

| Element | Inhalt |
|---|---|
| Detailkopf | Dropdowns Strategie (S1–S4) und Marktszenario (6), aktive S4-Regel, Ausgangslage (Quote, Reserve, Jahresbedarf) |
| Kennzahlen | Endvermögen, Startvermögen, gesamte Entnahmen, maximaler Drawdown, Reserve am Ende, Jahr der Vermögenserschöpfung |
| Vermögensverlauf | bestehender Chart; Klick auf einen Punkt fokussiert das Jahr |
| Jahresverlauf | alle Werte pro Jahr inkl. Auffüllmechanik und (bei High-Water-Mark) Höchststand/neuer Gewinn/Abschöpfquote; Klick auf ein Jahr öffnet die Jahresanalyse |
| Strategie-Kacheln | Endvermögen und Veränderung je Strategie; dienen als Auswahl |
| Einstellungen | Modellannahmen, Marktdaten & Quellen (inkl. Backtest-Hinweise und Modellszenarien), Berechnungslogik mit Invarianten, Darstellung/weitere Einstellungen, Über das Vermögenslabor |

Auf Mobilgeräten schaltet ein Segment-Control zwischen **Szenarien** und
**Kennzahlen** um – beide erscheinen dort als Karten statt als breite Tabelle;
der Strategieraum hat eine eigene Kachel und ist dort immer sichtbar.
Es gibt **keine Bewertung „beste Strategie“**.

**Stabile Reihenfolge und Farben:** Die Strategien werden in allen Ansichten
immer in der Reihenfolge **S1–S4** geführt – nie nach Wert umsortiert. Jede
Strategie hat eine feste Farbe (`S1` navy, `S2` sky, `S3` violett, `S4` grün).

**Startzustand:** Der Startbereich ist **Labor**; Ausgangslage und
Experimentierstrategie sind geöffnet, die Vergleichs- und Kennzahlenkacheln
folgen direkt darunter. In den **Einstellungen** sind alle Bereiche
zugeklappt. Beim Bearbeiten ausserhalb des Vergleichsbereichs zeigt eine
kompakte Live-Ergebnisleiste das Endvermögen aller sichtbaren Strategien und
führt per Klick in die Details.

## 3. Rechenkern – verifizierte Eigenschaften

- Werterhaltendes Rebalancing (`equity + bond` bleibt konstant).
- Accounting-Identität für **jedes** Jahr und **jede** Strategie.
- Lückenloser Jahrübergang ohne ausdrückliche externe Cashflows.
- Nachweislich **kein Look-ahead**: Gruppe G variiert für jedes künftige Jahr die
  Rendite und stellt sicher, dass alle früheren Jahre inkl. Entnahme- und
  Rebalancing-Entscheiden bit-identisch bleiben.
- Robustheit: keine `NaN`/`Infinity` in Extremfällen; kein unkontrolliert
  negatives Portfolio (Deckelung bei 0 + Status „Vermögen aufgebraucht“).

## 4. Regressionsergebnisse gegen Excel (Testgruppe J)

Referenzfall der Vorgabe: Startvermögen 1'228'300, Jahresbedarf 72'500,
Dauer 15 Jahre, 80/20, Reservehöhe 2 Jahresbedarfe (145'000) für **alle**
Strategien. Verglichen wird die **Verwendung** der Reserve:

- S1 „Nur verbrauchen“ ⟷ Excel „1-Jahres-Puffer“ (wird verbraucht, nicht ersetzt)
- S2 „Jährlich auffüllen“ ⟷ kein Excel-Gegenstück
- S3 „Nach guten Jahren“ ⟷ Excel „3-Jahres-Puffer“
- S4 „Benutzerdefiniert“ (Portfoliorendite ≥ 7 % oder gestaffelt nach Rendite) ⟷ kein Excel-Gegenstück

**Endvermögen in CHF**

| Szenario | Strategie | Excel (Ziel) | Engine (sauber) | Δ (Engine − Excel) |
|---|---|---:|---:|---:|
| Schlechte Börsenjahre | S1 Nur verbrauchen | 205'939 | 845'972 | **+640'033** |
| Schlechte Börsenjahre | S2 Jährlich auffüllen | 240'820 | 841'508 | +600'688 |
| Schlechte Börsenjahre | S3 Nach guten Jahren | 612'138 | 854'380 | +242'242 |
| Gute Börsenjahre | S1 Nur verbrauchen | 5'383'833 | 6'662'004 | **+1'278'171** |
| Gute Börsenjahre | S2 Jährlich auffüllen | 5'431'017 | 6'283'257 | +852'240 |
| Gute Börsenjahre | S3 Nach guten Jahren | 6'798'107 | 6'303'604 | −494'503 |
| Zickzack | S1 Nur verbrauchen | −186'188 | 184'096 | **+370'284** |
| Zickzack | S2 Jährlich auffüllen | −56'531 | 234'767 | +291'298 |
| Zickzack | S3 Nach guten Jahren | 39'698 | 265'268 | +225'570 |

**Qualitative Muster, die die saubere Engine reproduziert:**

- Fallende/sequenzgestresste Märkte: **Auffüllen im Abschwung erzwingt Verkäufe**,
  deshalb S3 ≥ S4 (Schwellenregel) > S1 (nie) > S2 (jährlich). Im historischen
  Stressszenario greifen bei S4 exakt dieselben Auffülljahre wie bei S3
  (Portfoliorendite ≥ 7 % ⟺ Aktienrendite ≥ 0), die Pfade sind daher identisch.
- Stark steigende Märkte: die Reserve kostet Aktienengagement, und die
  Schwellenregel füllt seltener auf als S2/S3: S1 > S4 > S3 > S2.
- Im Seitwärtsmarkt hilft eine aktive Auffüllung deutlich: S3 = S4 > S2 > S1.

### Reserve-Modell (Revision nach Review)

**Modell-Historie (jede Stufe vom Nutzer abgenommen):**

1. **Unverzinstes Cash-Polster**: Die Reserve wurde vor der Aktienquote vom
   Gesamtvermögen abgezogen und nicht verzinst. Jede Puffer-Strategie verlor
   systematisch (Cash-Drag + reduzierte Aktienquote).
2. **Voller Bond-Sleeve**: Die Reserve wurde vollständig mit der Bondrendite
   verzinst und zuerst verbraucht. Damit war sie in fallenden Märkten
   kostenlos schützend – jedoch war die Verzinsung einer reinen Cash-Reserve
   unrealistisch hoch.
3. **Aktuelles Modell (Vorgabe des Nutzers)**: Die Reserve ist **immer 1/3
   Geldmarkt und 2/3 Obligationen**.

| Topf | Anteil der Reserve | Verzinsung |
|---|---|---|
| Geldmarkt | 1/3 | Geldmarktzins (Standard 0 %, orientiert am aktuellen Leitzins) |
| Obligationen | 2/3 | Bondrendite des Jahres (historisch **oder** fester Satz) |

Dazu kommt: Die Reserve wird **zuerst** für den Kapitalbedarf verbraucht, danach
wird sie gemäss der Strategie-Verwendungsregel wieder aufgefüllt.

**Wichtige Klarstellung:** Die wörtliche Variante „Reserve ersetzt Obligationen
(gleiche Aktienquote) und wird wie Obligationen verzinst“ führt mathematisch
dazu, dass **alle Strategien exakt identisch** sind – das jährliche Rebalancing
hebt die Wirkung des Puffers vollständig auf. Nachgewiesen mit sieben
Modellvarianten. Der Nutzer hat deshalb die Variante **„Reserve zusätzlich zum
80/20-Portfolio“** gewählt.

**Ehrliches Resultat des neuen Modells:** Weil ein Drittel der Reserve nur zum
Geldmarktzins (0 %) verzinst wird, kostet die Reserve in den meisten Szenarien
Ertrag; deutlich schützend wirkt sie nur im Seitwärtsmarkt. Die vollständige
Tabelle steht im `README.md` (Abschnitt „Liquiditätsreserve“). Die Werte wurden
**nicht** geglättet oder an eine Erwartung angepasst.

### Reserve-Regler der Ausgangslage (Fehlerkorrektur nach Review)

Der Regler „Liquiditätsreserve“ in Sektion 1 „Ausgangslage“ hatte zunächst
**keine** Wirkung auf die Berechnung: Die Engine las die Reserve ausschliesslich
aus der jeweiligen Strategie, `input.liquidityReserve` wurde im Simulationspfad
nicht verwendet. Nachgewiesen im Browser (Reserve 3 → 6 Jahre ergab
bit-identische Kachelwerte). Korrektur:

- Die Reservehöhe der Ausgangslage gilt jetzt für **alle vier Strategien**
  (`buildStrategies(equityWeight, { reserveYears })`).
- Damit die vier Strategien nicht identisch sind, unterscheiden sie sich neu in
  der **Verwendung** der Reserve (Auffüllregel) statt in ihrer Höhe –
  S1 nie / S2 jährlich / S3 nach positivem Aktienjahr / S4 frei
  (Standard: Portfoliorendite des Jahres ≥ 7 %, Zielreserve frei wählbar).
- Der frühere zweite Reserve-Slider im Bereich „Strategien“ wurde entfernt
  (keine Doppelsteuerung); S4 hat in der kompakten Karte nur noch Schwelle und
  Zielreserve. Die Startreserve kommt für alle Strategien aus der Ausgangslage.
- Konsistenznachweis: S3 bei Reserve n liefert **exakt** dasselbe Endvermögen
  wie die parametrisierte Reserve-Strategie mit derselben Höhe (Gruppe M11).

Abgesichert durch Gruppe M1–M16 (Engine) und K46–K52c (UI).

## 5. Bekannte Abweichungen und Ursachen

| # | Beobachtung | Ursache / Einordnung |
|---|---|---|
| 1 | Excel-Datei/Formeln lagen nicht vor | Workspace war leer; Strategie-Semantik musste sauber neu definiert werden. Abweichungen sind daher erwartet, nicht Fehler. |
| 2 | Excel-„Puffer“-Strategien sind in guten Jahren **besser** als voll investiertes 80/20 | Mit einer unverzinsten Cash-Reserve nicht darstellbar. Deutet darauf hin, dass in Excel die „Reserve“ investiert ist oder eine andere Mechanik verwendet wird. |
| 3 | Excel-S1 wird im Zickzack **negativ** (−186'188) | Excel lässt das Portfolio offenbar ins Minus laufen. Die neue Engine deckelt bei 0 und meldet „Vermögen aufgebraucht“ (Vorgabe Kapitel 9/I) — bewusste, spec-konforme Abweichung. |
| 4 | Reserve 3 Jahre = 217'500 vs. 218'000 im Referenztext | Der Referenztext rundet 3 × 72'500 auf 218'000. Testgruppe B prüft die exakte Allokation daher über `allocateInitial(1'228'300, 218'000, 0.8)`. |
| 5 | Die Excel-Strategie-IDs sind nicht mehr 1:1 übertragbar | Die Strategien vergleichen neu die **Verwendung** der Reserve, nicht ihre Höhe. Die Zuordnung zu den Excel-Puffern ist daher nur noch sinngemäss (siehe Abschnitt 4). |
| 6 | Strategienamen ohne „80/20“, ohne „Puffer“ und ohne Jahresbedarfszahl | Verteilung und Reservehöhe liegen in der Ausgangslage; die Namen beschreiben nur noch die Verwendungsregel. |
| 7 | Ein Drittel der Reserve wird mit 0 % (Geldmarktzins) verzinst | Vorgabe des Nutzers („orientiert am aktuellen Leitzins“). Folge: Die Reserve kostet in vier von fünf Szenarien Ertrag – bewusst nicht geglättet. Der Satz ist in den Einstellungen änderbar. |
| 8 | S4-Standardregel neu: „Portfoliorendite des Jahres ≥ 7 %“ statt „über Startwert“ | Anforderung des Nutzers (kompakte S4-Karte mit Schwelle und Zielreserve). Der Golden Master in Gruppe J1 wurde entsprechend neu eingefroren; die Excel-Abweichungen der Strategien S1–S3 sind unverändert. |
| 9 | Bei Reserve 0 sind die Kennzahlen aller vier Strategien identisch | Kein Rechenfehler: Ohne Reserve gibt es nichts aufzufüllen, die Auffüllregeln sind wirkungslos (nachgerechnet für 0/1,5/2 Jahresbedarfe × 80/20 und 100/0). Die Oberfläche weist im Vergleich explizit darauf hin. |
| 10 | **Behoben:** Gleitkomma entschied die S4-Schwelle (Ergebnis sprang um bis zu 10 %) | `simulation.ts` berechnete die Portfoliorendite als `(Startwert × Rendite) / Startwert`; dieser Rückweg ist in IEEE-754 nicht exakt. Ein Jahr mit exakt 12,00 % füllte dadurch je nach Kontostand auf oder nicht: Startvermögen 1'241'350 → 238'165, 1'241'352 → 215'203 (Δ 22'962 CHF). Korrektur: gewichtete Rendite aus den gegebenen Renditen plus „≥“-Vergleich mit 1e-9-Toleranz (Gruppe N, Tests N1b/N1c). |
| 11 | High-Water-Mark-Regel: in Seitwärtsmärkten wird die Reserve nie wieder aufgebaut | Fachlich beabsichtigt, nicht Fehlerhaft: Ohne neuen Allzeithöchststand (der nach laufenden Entnahmen erst wieder erwirtschaftet werden muss) gibt es keinen abschöpfbaren Gewinn. In „Zickzack“ und „Crash früh“ verhält sich S4 damit exakt wie S1 (keine Auffüllung). Messpunkt und Fortführung der Marke sind in `simulation.ts` und Gruppe P dokumentiert. |
| 13 | S4 im Labor auf die Höchststand-Regel vereinfacht (Produkt-/UI-Struktur) | Das Regelauswahl-Dropdown im Labor entfällt; S4 ist jetzt „Gewinne bei neuen Höchstständen sichern“ mit zwei Parametern (Anteil neuer Gewinne, Zielreserve). Die übrigen Auffüllregeln bleiben in der Engine erhalten (Test O9 prüft alle sieben Regeln) und sind weiterhin über `buildStrategies(...)` nutzbar. Engine, High-Water-Mark, Reserve, Accounting, Rebalancing, S1–S3, Szenarien und Kennzahlen sind unverändert; die S4-Ergebnisse bei identischen Parametern sind als Golden Master in Test R2b festgehalten. |
| 12 | Neues Modellszenario „Crash nach Reserveverbrauch“ (6. Szenario) | Reine Daten-/Auswertungsergänzung (Gruppe Q): 15 vorgegebene Aktienrenditen, gleiche Bondlogik wie die übrigen Synthetics, kein Eingriff in Engine, S1–S4 oder Reserve-/Rebalancing-/High-Water-Mark-Logik. Alle Auswertungen (Matrix, Robustheit, Strategieraum, Szenario-Vergleich) laufen automatisch über sechs Szenarien. |
| 14 | **Behoben:** Die Detailansicht war auf **jeder** Bildschirmbreite überbreit (Panel „Konkrete Analyse“ 2'876 px statt 390 px) | `.details-view` war ein Raster ohne Spaltenangabe; die implizite `auto`-Spalte übernahm die Min-Content-Breite der Jahresverlaufstabelle (`min-width: 1440px`) und zog alle Nachbarn mit. Weil `body { overflow-x: hidden }` den Überstand verbarg, fiel es nur als abgeschnittene Dropdowns und einspaltige Kacheln auf. Korrektur: `grid-template-columns: minmax(0, 1fr)` für `.details-view`, `.settings-view` und `.sensitivity-layout`, `min-width: 0` für `.panel`, Auswahlfelder mit `width/min-width: 100%` und Beschriftung über dem Feld. Nachgewiesen mit `scripts/visual-check.mjs` (vorher 1'424–2'498 px Überlauf, jetzt 0 px in allen 15 Kombinationen). Reine Darstellungskorrektur – keine Rechenlogik berührt. |
| 15 | **Korrigiert: Klicklogik des Strategieraums.** Ein Klick auf eine Heatmap-Zelle sprang direkt nach DETAILS und wirkte dort wie eine Strategie-/Szenario-Auswahl | Semantisch falsch: Der Strategieraum wählt eine **Ausgangslage**, keine Strategie und kein Marktszenario. Neu: `applyCombination` setzt nur Aktienquote (Zeile) und Startreserve (Spalte) und schaltet **nicht** mehr auf DETAILS um; der Bereich bleibt im Labor, Vergleich und Kennzahlen rechnen sofort neu, die Zelle ist als aktive Kombination markiert (abgeleitet aus der aktuellen Ausgangslage, nicht aus dem letzten Klick), ein sanfter Scroll führt zum Vergleich und eine Statuszeile bestätigt „Als Ausgangslage übernommen: 90/10 · Reserve 1 Jahresbedarf“. Nur ein Klick auf einen **Ergebniswert der Matrix** öffnet weiterhin die Details. Keine Änderung an Engine oder Berechnungslogik – nur State-, Navigations- und Interaktionslogik. Abgesichert durch R7–R9 sowie die Interaktionsprüfung in `scripts/visual-check.mjs` (Tab bleibt Labor, Aktienquote 90, Reserve 1, Vergleich neu gerechnet, Bestätigung sichtbar, Vergleich im Bild). |

Keine stillen Zahlenmanipulationen, keine Dummy-Werte, keine TODO-Platzhalter
in der produktiven Simulation.

## 6. Screenshots und Browserprüfung

Die Darstellung wird **automatisch im echten Browser** geprüft (Playwright/
Chromium, gebauter Stand via `npm run preview`):

```bash
npm run build
npm run preview                                  # http://localhost:4173
node scripts/visual-check.mjs http://localhost:4173/
```

Das Skript misst in **allen drei Bereichen** (Labor, Details, Einstellungen) bei
**390×844, 430×932, 768×1024, 1366×768 und 1920×1080**:

1. `documentElement.scrollWidth − clientWidth` (horizontales Überlaufen),
2. Elemente, die den Viewport seitlich verlassen (ohne Scroll-Container),
3. abgeschnittene Texte (`scrollWidth > clientWidth` in Titeln, Zellen, Werten),
4. Bedienelemente unter 24 px Höhe/Breite,
5. ob der Strategieraum mit exakten Beträgen ohne seitliches Wischen passt,

und legt Screenshots unter `tmp/visual/` ab.

| Viewport | Überlauf | Entkommene Elemente | Abgeschnitten | < 24 px | Strategieraum |
|---|---:|---:|---:|---:|---|
| 390 × 844 (Handy) | 0 px | 0 | 0 | 0 | passt |
| 430 × 932 (Handy gross) | 0 px | 0 | 0 | 0 | passt |
| 768 × 1024 (Tablet) | 0 px | 0 | 0 | 0 | passt |
| 1366 × 768 (Laptop) | 0 px | 0 | 0 | 0 | passt |
| 1920 × 1080 (Desktop) | 0 px | 0 | 0 | 0 | passt |

Zusätzlich prüft das Skript die **Klicklogik** in echten Browsern: Klick auf
„90/10 × 1 Jahresbedarf“ im Strategieraum → aktiver Tab bleibt **Labor**,
Aktienquote 90, Reserve 1 Jahr, Matrix neu gerechnet, Bestätigung sichtbar,
Vergleich nach dem Scroll im Bild. Ergebnis bei allen fünf Viewports: **bestanden**.

Gemessen wurde je Viewport in allen drei Bereichen (15 Messungen). Zusätzlich
gilt: alle primären Touch-Ziele sind auf dem Handy ≥ 44 px hoch (Karten,
Aufklapper, Schalter, Segment-Schalter); die beiden Schieberegler sind mobil
44 px hoch und in der Desktop-Zeile der Ausgangslage bewusst 24 px
(WCAG-2.5.8-Minimum), damit die vier Feldbeschriftungen auf einer Linie bleiben.

Auf Mobilgeräten sind breite Tabellen (Jahresdetail, Heatmap) in `.table-scroll`
gekapselt und lokal scrollbar; die Seite selbst scrollt nie horizontal. Der
**Strategieraum passt auch auf 390 px vollständig in die Karte** (exakte Beträge
wie `1'790'419`), weil Zeilenkopf und Zellen dort kompakter gesetzt sind; nur
das **Jahresdetail** (15 Wertespalten) bleibt bewusst lokal scrollbar.

## 7. Offene fachliche Fragen

1. **Excel-Referenz:** Können die Original-Excel bzw. die exakten Formeln der
   fünf Strategien bereitgestellt werden? Damit lässt sich die saubere Engine
   gegen die tatsächliche Referenzlogik abgleichen.
2. **Reserve-Verzinsung:** Ist die „Reserve“ in der Referenzlogik unverzinst
   (aktuell: 0 %) oder investiert (z. B. in Obligationen)? Punkt 5/#2 oben
   deutet auf investiert hin.
3. **Negatives Portfolio:** Soll die Engine wie Excel ein negatives Portfolio
   zulassen, oder bleibt die spec-konforme Deckelung bei 0 mit Status
   „Vermögen aufgebraucht“ bestehen?
4. **Reserve-Konzept:** Sollen die Strategien ihre eigene Reservehöhe festlegen
   (aktuell: gemeinsame **Startreserve** aus der „Ausgangslage“; nur S4 darf
   zusätzlich eine abweichende **Zielreserve** und die Auffüllschwelle setzen)
   oder soll auch die Zielreserve für alle gleich sein?
5. **Bond-Szenario bei Modellläufen:** Bestätigung des Defaults (historische
   Bondsequenz 1999–2013) sowie ob Option „konstante Modellrendite“ in V1
   relevant ist.
6. **Inflations-/Steuer-/Kostenmodell:** Fachliche Vorgaben für die bereits
   vorbereiteten, in V1 auf 0 % gesetzten Parameter.

## 8. Reproduzierbarkeit

```bash
npm install
npm test          # 228 Tests, alle grün
npm run build     # Production-Build nach dist/
```

Hinweis: In der Build-Umgebung war kein Node vorinstalliert; die Ausführung
erfolgte mit einer portablen Node.js 20.18.0. Das Projekt selbst ist
versionneutral und läuft mit Node ≥ 18.
