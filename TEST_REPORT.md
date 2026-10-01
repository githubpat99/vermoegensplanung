# TEST_REPORT — Entnahme-Stresstest (V1)

Erstellt: 2026-10-01
Umgebung: Windows, Node.js 20.18.0, npm 10.8.2, Vite 5.4, Vitest 2.1

## 1. Zusammenfassung

| Kennzahl | Wert |
|---|---|
| Anzahl Testdateien | 12 |
| Anzahl Unit Tests | **150** |
| Bestandene Tests | **150** |
| Fehlgeschlagene Tests | **0** |
| `npm test` | ✅ grün |
| `npm run build` | ✅ erfolgreich (`tsc --noEmit` + `vite build`) |
| Production-Bundle | `dist/` — JS ~198 kB (gzip ~62 kB), CSS ~20 kB (gzip ~4.9 kB) |

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
| G – kein Look-ahead | `src/tests/lookahead.test.ts` | 40 | Änderung künftiger Aktien-/Bondrenditen verändert frühere Jahre nicht |
| H – Rebalancing-Erhaltung | `src/tests/rebalancing.test.ts` | 3 | Rebalancing erhält das Gesamtvermögen exakt |
| I – Extremfälle | `src/tests/edgeCases.test.ts` | 6 | Aktien −100 %, Reserve 0, Bonds 0, Bedarf 0, Bedarf > Vermögen → „Vermögen aufgebraucht“ |
| J – Referenzregression | `src/tests/regression.test.ts` | 4 | Golden Master + dokumentierte Excel-Abweichung + qualitative Muster |
| K – UI | `src/tests/ui.test.tsx` | 67 | Tabs, App-Header, Abschnitts-Kacheln (ohne Nummerierung, ohne Abschnitts-Navigation, standardmässig eingeklappt), Ergebnis-Kacheln, kompakte Live-Ergebnisleiste, kompakte S4-Karte mit Aktiv-Regel-Satz, Jahresdetail mit Auffüllmechanik, Grafiken, Bedienelemente, Szenariovergleich (Matrix/Robustheit/Strategieraum/Gewählte Strategie), PWA-Manifest, Reserve-Regler der Ausgangslage, Reserve-Aufteilung und Bond-Annahmen |
| L – Robustheit & Sensitivität | `src/tests/robustness.test.ts` | 9 | Median, Drawdown, Kennzahlen, Sensitivitätsraster |
| M – Liquiditätsreserve | `src/tests/reserve.test.ts` | 16 | Aufteilung 1/3 Geldmarkt / 2/3 Obli, Verzinsung, Entnahme zuerst aus der Reserve, Reservehöhe für alle Strategien, Wirkung je Marktphase, fixe vs. historische Bondrendite, Portfoliorendite, S4-Schwellenregel, Zielreserve und Auffüllbeträge |
| **Total** | | **169** | |

Ergänzend zur automatisierten UI-Prüfung wurden die Screens im echten Browser
bei 1920×1080, 1366×768 und 390×844 geprüft (Abschnitt 6).

## 2a. Oberfläche (nach Bildvorlage)

Drei Ansichten über die Kopf-Tabs: **Simulation | Szenariovergleich | Quellen**.

### Simulation

| Element | Zeigt die Wirkung von |
|---|---|
| **Strategie-Kacheln** (S1–S4, farbig) | Strategie: Endvermögen und Veränderung zum Startvermögen |
| **Vermögensverlauf** (Kennzahl umschaltbar) | Szenario und Strategie über die Jahre |
| **Endvermögen im Vergleich** (Balken) | Strategie |
| **Weitere Auswertungen** (aufklappbar) | Zusammensetzung über die Zeit und Wirkung des Marktszenarios |
| **Kompakte S4-Karte** (Abschnitt „Strategien“) | Auffüllschwelle in % Portfoliorendite und Zielreserve, plus Satz „Aktive Regel: …“ |
| **Live-Ergebnisleiste** (fixiert, nur wenn „Ergebnisse“ ausserhalb des Viewports) | Endvermögen aller sichtbaren Strategien bei jeder Parameteränderung |
| **Jahresdetails** | pro Jahr: Portfoliorendite, Reserve vor Auffüllung, Auffüllbetrag, Reserve danach |

### Szenariovergleich

| Element | Inhalt |
|---|---|
| Ausgangslage (gleicher Kopf wie in der Simulation) | Startvermögen, Kapitalbedarf, Verteilung, Rebalancing, Liquiditätsreserve |
| Szenario- × Strategie-Matrix | Endvermögen (CHF), bestes Ergebnis je Zeile hervorgehoben |
| Robustheits-Kennzahlen | Schlechtestes Ergebnis, Ø, Median, aufgebraucht (n/5), grösster Rückgang |
| Strategieraum | Heatmap Aktienquote × **Reserve in Jahresbedarfen**; jede Zelle ist eine benannte Strategie (z. B. „Strategie 80/20 · 2 Jahresbedarfe“), Ø über alle Szenarien, grün = höher. **Ein Klick** übernimmt die Kombination und springt direkt zum Ergebnis in der Simulation (Kachel „Ergebnisse“ wird geöffnet) |
| Gewählte Strategie | Zuletzt gewählte Kombination + Durchschnitt + Aufschlüsselung; Button „in Simulation anzeigen“ |

Auf Mobilgeräten schaltet ein Segment-Control zwischen Tabelle und Kennzahlen
um; der Strategieraum hat eine eigene Kachel und ist dort immer sichtbar.
Es gibt **keine Bewertung „beste Strategie“**.

**Stabile Reihenfolge und Farben:** Die Strategien werden in allen Ansichten
immer in der Reihenfolge **S1–S4** geführt – nie nach Wert umsortiert. Jede
Strategie hat eine feste Farbe (`S1` navy, `S2` sky, `S3` violett, `S4` grün).

**Startzustand:** Alle Kacheln sind eingeklappt und ohne Nummerierung; die
Szenario-Zeilen im Marktszenario sind ebenfalls zugeklappt. Eine
Abschnitts-Navigation unter dem Header gibt es nicht – die Kacheln sind der
Einstieg, „Ergebnisse“ steht im Dokument immer direkt nach dem Marktszenario.
Beim Bearbeiten ausserhalb des Ergebnisbereichs zeigt eine kompakte
Live-Ergebnisleiste das Endvermögen aller sichtbaren Strategien.

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
- S4 „Benutzerdefiniert“ (Portfoliorendite > 7 %) ⟷ kein Excel-Gegenstück

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
  (Portfoliorendite > 7 % ⟺ Aktienrendite ≥ 0), die Pfade sind daher identisch.
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
Geldmarktzins (0 %) verzinst wird, kostet die Reserve in vier der fünf Szenarien
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
  (Standard: Portfoliorendite des Jahres > 7 %, Zielreserve frei wählbar).
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
| 8 | S4-Standardregel neu: „Portfoliorendite des Jahres > 7 %“ statt „über Startwert“ | Anforderung des Nutzers (kompakte S4-Karte mit Schwelle und Zielreserve). Der Golden Master in Gruppe J1 wurde entsprechend neu eingefroren; die Excel-Abweichungen der Strategien S1–S3 sind unverändert. |

Keine stillen Zahlenmanipulationen, keine Dummy-Werte, keine TODO-Platzhalter
in der produktiven Simulation.

## 6. Screenshots

Erzeugt mit dem echten Browser (Vite Dev Server), whole-page:

| Viewport | Datei | Horizontales Scrollen |
|---|---|---|
| Desktop 1440 px | `screenshots/cmp-desktop.png` (Szenariovergleich), `design-desktop-full.png` (Simulation) | nein |
| Laptop 1366 × 768 | `screenshots/design-laptop-full.png` | nein |
| Mobile 390 × 844 | `screenshots/cmp-mobile-table.png`, `cmp-mobile-heatmap.png`, `cmp-mobile-metrics.png`, `design-mobile-full.png` | nein |

Auf Mobilgeräten sind breite Tabellen (Matrix, Heatmap) in `.table-scroll`
gekapselt und lokal scrollbar; die Seite selbst scrollt nie horizontal.

Aufklapp-Layout (Startzustand kompakt): `screenshots/v3-top-collapsed.png`,
`screenshots/v3-ausgangslage.png`, `screenshots/v3-mobile-collapsed.png`.

Automatisch geprüft: `documentElement.scrollWidth == clientWidth` bei allen drei
Grössen (kein horizontales Scrollen der Seite). Breite Tabellen (Jahresdetail)
sind in `.table-scroll` gekapselt und scrollen lokal; Beträge sind mit
`font-variant-numeric: tabular-nums` gesetzt, Diagramme als responsives SVG mit
`viewBox`. Historische und synthetische Szenarien sind über die Badges
„Historisch“ (grün) vs. „Modell / theoretisch“ (gelb) klar unterscheidbar.

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
npm test          # 110 Tests, alle grün
npm run build     # Production-Build nach dist/
```

Hinweis: In der Build-Umgebung war kein Node vorinstalliert; die Ausführung
erfolgte mit einer portablen Node.js 20.18.0. Das Projekt selbst ist
versionneutral und läuft mit Node ≥ 18.
