# Lernspiel – Regeln für Claude Code

Lern-App im Spielstil: **nur Fragen und Aufgaben, keine Lerninhalte vorab**. Die Nutzerin spielt sich durch Level und Bosse und soll den Stoff auswendig können. **Die Aufgaben erzeugt Claude Code direkt hier**, nicht die App und keine API. Die App liest nur die JSON-Dateien in `daten/`. Oberfläche: Deutsch. Aufgaben: in der Sprache des Dokuments.

## Ordner

- `dokumente/<Fach>/` – Originaldateien. Dokumente im selben Unterordner gehören zu einem Fach und erscheinen als Vorlesungen.
- `daten/` – pro Vorlesung eine JSON-Datei, dazu `daten/index.json` (Liste aller Dateien).
- `meldungen/` – `gemeldet.json` (schreibt die App über den Server) und `antworten.json` (schreibt Claude Code), siehe unten.
- App: `index.html`, `app.js` (Seiten), `spiel.js` (Spiellogik), `runde.js` (Spielrunde), `klausur.js`, `aufgaben.js` (Aufgabentypen), `katalog.js`, `speicher.js`, `meldungen.js` (Fragen melden), `pruefen.js`, `util.js`, `style.css`, `sw.js`.
- Start: `App-starten.bat` (PowerShell-Server auf http://localhost:8093). Vorschau in Claude Code: launch-Konfiguration `lernspiel`.

## Auftrag „Verarbeite die neuen Dokumente“

Hängt die Nutzerin eine Datei an, die nicht in `dokumente/` liegt: erst dorthin kopieren.

1. **Finden:** `dokumente/` mit den `quelle`-Feldern in `daten/` vergleichen. Neu = keine Datei nennt diese Quelle.
2. **Vollständig lesen:** PDF mit `/mingw64/bin/pdftotext -enc UTF-8 -layout`, Arbeitskopien in den Scratchpad. Seiten ohne Text sind Bilder: Da `pdftoppm` fehlt und PDFs im Browser-Fenster als Download starten, die Bilder direkt aus der PDF holen (Bildobjekte per PowerShell entpacken) und ansehen. Word (.docx) und .odt sind ZIP-Dateien.
3. **Nur Klausurrelevantes aufnehmen.** Maßstab: Arbeitsblattfragen, Take-Home-Messages, Definitionen und Grundbegriffe, Vergleiche. Weglassen: Organisatorisches, Umfragen, Literatur- und Datenbanklisten, lange Aufzählungen wie Forschungsstellen mit Jahreszahlen, reine Bildfolien. Die Nutzerin danach kurz informieren, was weggelassen wurde.
4. **Gliedern, und zwar sehr kleinteilig:** Welten (große Themen) → Level → **Wissenspunkte** (genau ein Gedanke). Die Nutzerin will viele Level, damit sie alles genau lernt: ein Level hat meist nur 1–2 Wissenspunkte. Definitionen in ihre Teile zerlegen, Vergleiche bekommen eigene Level **nach** den Einzelteilen. Alle 5–10 Level ein **Mischlevel** mit `"mix": [Level-IDs derselben Welt]` und ohne `wissen`; die App stellt daraus gemischte, etwas schwerere Fragen zusammen. Die Arbeitsblattfragen müssen sich mit den Wissenspunkten beantworten lassen.
5. **Pro Wissenspunkt:**
   - `titel`: kurz. Wird erst gezeigt, wenn der Punkt schon einmal gefragt wurde.
   - `merke`: 1–2 Sätze, die den Kern enthalten. Erscheint **nach** jeder Aufgabe, nie vorher. Autor und Jahr nennen, falls vorhanden.
   - `aufgaben`: **mindestens 3, besser 4 oder mehr Formen**, mit verschiedenen Typen und aus allen drei Schweregraden (siehe unten). **Keine Karteikarten:** Die Nutzerin will sie weder zum Lernen noch zur Abfrage. Möglichst mit Antwort-Pools und `fragen`-Varianten, damit es nie zweimal dieselbe Frage ist.
6. **Arbeitsblatt:** Fragen **wörtlich** als `offen` mit `"ab": true` und `wissen`-Verweisen, Musterlösung aus dem Stoff. Musterantworten im Dokument übernehmen.
7. **Probeklausur:** eigener Pool (mindestens 16 Aufgaben, neue Formulierungen, möglichst alle Typen, jede mit `wissen`), `anzahl` = pro Durchgang gezogene Aufgaben, `bestehenProzent` (Standard 50). Die Zeit rechnet die App (1,2 Min. pro Punkt), außer `zeitMinuten` ist gesetzt. Bosse stellt die App selbst aus den Wissenspunkten zusammen.
8. **Nichts erfinden:** Inhalte, Zahlen, Namen und Zitate nur aus dem Dokument. Fallgeschichten dürfen konstruiert sein, die Lösung muss sich aber ganz aus dem Dokument ergeben. Markierungen wie „(ergänzt)“ behalten. Nicht eindeutig oder aus einer anderen Quelle als den angehängten Dateien → `"pruefen": true` und in `erklaerung` sagen, warum.
9. **Prüfen:** Jede Lösung Aufgabe für Aufgabe gegen das Dokument prüfen (Tabellenzeilen, Zuordnungen, Mehrfachauswahl). In `daten/index.json` eintragen, JSON validieren (`ConvertFrom-Json`), dann in der App **Einstellungen → Daten prüfen → Alle Aufgaben testen**.
10. **Übersicht an die Nutzerin:** Welten und Level, Anzahl Aufgaben je Typ, was weggelassen wurde, welche Aufgaben sie prüfen soll.

## Auftrag „Bearbeite die gemeldeten Fragen“

Jede Aufgabe hat oben rechts „⚑ Melden“. Gemeldete Aufgabenformen blendet die App sofort aus. Sie schickt alle Meldungen an den Server, der sie nach `meldungen/gemeldet.json` schreibt (die Datei schreibt nur die App, nie Claude Code).

1. `meldungen/gemeldet.json` lesen (oder den eingefügten JSON-Text aus dem Chat, siehe „GitHub und Handy“), dazu `meldungen/antworten.json`, falls vorhanden. Zu bearbeiten ist jede Meldung mit `"status": "ausgeblendet"`, deren `uid` noch nicht in `antworten.json` steht. Fehlt die Datei oder ist sie leer: Die App war seit dem Melden nicht gestartet oder der alte Server läuft noch (Nutzerin soll das schwarze Fenster schließen und `App-starten.bat` neu starten).
2. Pro Meldung: `form` (Aufgaben-ID), `datei` (Datei in `daten/`), `grund`, `notiz`, `frage` sowie `angezeigt` (die Aufgabe, wie sie zu sehen war) und `eingabe` (was die Nutzerin geantwortet hat) ansehen. **Gegen die Quelle prüfen** (die `quelle` des Dokuments, also das Skript). Gründe: `falsch`, `erkannt` (richtige Antwort nicht erkannt → `akzeptiert`-Varianten ergänzen), `unklar`, `skript`, `relevanz`, `form`, `sonst`.
3. Dann eins davon tun:
   - **Verbessern:** Die Aufgabe in `daten/…json` ändern, ID behalten, wenn es inhaltlich dieselbe Frage bleibt.
   - **Löschen:** Die Aufgabe aus der Datei nehmen. Ein Wissenspunkt braucht danach noch mindestens 3 Formen, sonst eine neue Form (neue ID) dazuschreiben.
   - **Unverändert lassen:** Nur wenn die Aufgabe nachweislich stimmt.
4. In `meldungen/antworten.json` für jede bearbeitete Meldung eintragen: `{ "antworten": { "<uid>": { "datum": "JJJJ-MM-TT", "text": "Was geändert wurde und warum (mit Folie), auf Deutsch, an die Nutzerin gerichtet", "wiederEinblenden": true } } }`. `wiederEinblenden: false` nur, wenn die Form ausgeblendet bleiben soll; besser ist dann Löschen. Vorhandene Einträge behalten.
5. JSON validieren, „Alle Aufgaben testen“, der Nutzerin kurz berichten.

Ausgeblendet ist eine Form nur, solange ihr Inhalt unverändert ist **und** keine Antwort mit `wiederEinblenden: true` vorliegt (`meldungen.js`, `statusVon()`, Fingerabdruck über die Aufgabe). Die Liste steht in der App unter ⚙️ → Gemeldete Fragen (`#/meldungen`).

## GitHub und Handy

Der Ordner `lernspiel` ist ein Git-Repository, das öffentlich auf GitHub liegt. GitHub Pages zeigt die App fürs Handy (Adresse in `ANLEITUNG.md`).

- **Vor jeder Arbeit:** `git pull`, denn Änderungen können auch vom Handy aus (Claude Code in der Cloud) gekommen sein.
- **Nach jeder Änderung an App oder `daten/`:** prüfen wie oben, dann ohne Nachfrage committen und auf `main` pushen. Das hat die Nutzerin am 17.11.2026 ausdrücklich so gewünscht, damit alles nach 1–2 Minuten auf dem Handy ist. Die Nutzerin danach daran erinnern, die App neu zu laden.
- **Nie hochladen:** `dokumente/` (Vorlesungsfolien, urheberrechtlich geschützt; steht in `.gitignore`) und `meldungen/gemeldet.json` (persönlich).
- **Commit-Autor:** nur die GitHub-noreply-Adresse aus der Repository-Konfiguration verwenden, nie die private E-Mail-Adresse.
- **In einer Cloud-Sitzung vom Handy aus** fehlen die Originale in `dokumente/`. Neue Dokumente hängt die Nutzerin dann im Chat an. Gemeldete Fragen fügt sie als Text ein: „Bearbeite die gemeldeten Fragen … ```json {…} ```“ im selben Format wie `meldungen/gemeldet.json`; die Quelle zum Prüfen sind die bestehenden Aufgaben, `merke`-Texte und, falls angehängt, die Folien. Wenn die Sitzung nicht direkt auf `main` pushen darf, die Nutzerin bitten, den Pull Request auf GitHub zu mergen.

## Fortschritt muss erhalten bleiben (IDs!)

Der Spielstand hängt an Aufgaben- und Wissenspunkt-IDs. Beim Neuverarbeiten: bestehende Datei zuerst lesen, IDs behalten, wenn der Inhalt gleich bleibt oder nur verbessert wird. Neue Inhalte bekommen neue IDs. Eine ID **nie** für etwas inhaltlich anderes verwenden. Gelöschtes einfach weglassen. Verschobene Aufgaben behalten ihre ID. Dateiname und Dokument-`id` nicht ändern.

Sterne hängen an Level-IDs. Wird ein Level geteilt, behält der erste Teil die alte ID, die weiteren heißen `krim-s1-A2b`, `krim-s1-A2c`.

Schema: Dokument `krim-s1` · Welt `krim-s1-A` · Level `krim-s1-A1` · Mischlevel `krim-s1-A-mix1` · Wissenspunkt `krim-s1-A1-w1` · Aufgabe `krim-s1-A1-w1-a1` · Arbeitsblatt `krim-s1-ab1` · Klausur `krim-s1-pk1`.

## JSON-Format (`format: 1`)

```json
{
  "format": 1, "id": "krim-s1", "fach": "Kriminologie", "titel": "…", "kurztitel": "Sitzung 1",
  "quelle": ["Kriminologie/Datei.pdf"], "verarbeitet": "JJJJ-MM-TT", "sprache": "de",
  "welten": [{ "id": "krim-s1-A", "titel": "…", "farbe": 262,
    "level": [{ "id": "krim-s1-A1", "titel": "…",
      "wissen": [{ "id": "krim-s1-A1-w1", "titel": "…", "merke": "…", "aufgaben": [ … ] }]
    }]
  }],
  "arbeitsblatt": { "titel": "…", "aufgaben": [ { "typ": "offen", "ab": true, "wissen": ["…"], … } ] },
  "probeklausur": { "titel": "…", "bestehenProzent": 50, "anzahl": 14, "aufgaben": [ { "wissen": ["…"], … } ] }
}
```

`farbe` ist der Farbton der Welt (0–360). In Texten sind `**fett**` und `*kursiv*` erlaubt. Keine geraden Anführungszeichen im Text, sondern „deutsche“.

### Felder jeder Aufgabe

`id`, `typ`, `frage` oder `fragen` (Liste, eine wird zufällig gewählt), optional `erklaerung`, `pruefen`, `punkte` (sonst rechnet die App), `schwere` (überschreibt die Stufe).

| typ | Felder | Schwere |
|---|---|---|
| `single` | `richtig[]`, `falsch[]`, optional `anzahlFalsch` (Standard 3) – oder feste `optionen[]`, `loesung` | 1 |
| `wasPasstNicht` | `gehoert[]` (3 werden gezogen), `ausreisser[]` (1 wird gezogen) | 1 |
| `zitat` | `zitat`, `richtig[]`, `falsch[]` | 1 |
| `richtigfalsch` | `aussagen[{text, richtig, begruendung}]`, optional `zeigen` (Standard 3). Bei falschen Aussagen sagt `begruendung`, warum. | 1 |
| `zuordnung` | `paare[{links, rechts}]`, optional `zeigen` (Standard 4) | 1 |
| `beispiel` | `kategorien[]`, `items[{text, kategorie}]`, optional `zeigen` | 1 |
| `lueckentext` | `text` mit `{}`, `luecken[[Antwort, Alternativen]]`, optional `gruppen`, `wortbank` (dann Schwere 1), `ablenker[]` | 2 |
| `multi` | `richtig[]`, `falsch[]`, `anzahlRichtig` (3), `anzahlFalsch` (2) | 2 |
| `reihenfolge` | `elemente[]` in richtiger Reihenfolge | 2 |
| `fehler` | `segmente[{text, fehler?, korrektur}]` | 2 |
| `begriff` | `akzeptiert[]`, `musterloesung` | 2 |
| `tabelle` | `kopf[]`, `zeilen[[Text oder {akzeptiert:[…]}]]`, `zeigen` = wie viele der Felder jedes Mal abgedeckt werden. Erster Eintrag in `akzeptiert` ist die Lösung. | 3 |
| `kurzfrage` | `akzeptiert[]`, `musterloesung` | 3 |
| `definition`, `offen` | `kernpunkte[]`, `musterloesung` | 3 |
| `fall` | `fall`, `frage`, `kernpunkte[]`, `musterloesung` | 3 |

Bei Texteingaben großzügige `akzeptiert`-Listen anlegen. Die Prüfung toleriert Groß-/Kleinschreibung, Umlaute und kleine Tippfehler; der erste Buchstabe muss aber stimmen, und eine längere Antwort zählt nur, wenn sie den Begriff als ganze Wörter enthält.

## Wie das Spiel entscheidet

Diese Logik steckt in `spiel.js` und muss zum Katalog passen:
- **Stufen pro Wissenspunkt (0–6):** Voll richtig = eine Stufe hoch (ab Stufe 2 nur, wenn der Punkt fällig war). Unter 50 % = zwei Stufen runter und sofort fällig. Abstände: 1, 2, 4, 8, 16, 32 Tage. Ab Stufe 4 „sitzt fest“.
- **Aufgabenwahl:** Stufe 0–1 → Schwere 1, Stufe 2–3 → Schwere 2, ab Stufe 4 → Schwere 3. Nach einem Fehler eine Schwere leichter und ein anderer Typ. Noch nie gezeigte Formen zuerst, die letzten vier Formen nicht.
- **Unter 67 % in einer Runde:** kommt 3–4 Fragen später wieder, höchstens dreimal.
- **Kann ich:** Schnitt der letzten drei Antworten eines Wissenspunkts. Ampel: grün ab 90, gelb ab 67, rot darunter, grau neu.
- **Sterne:** Quote beim ersten Versuch (★★★ ab 90 %, ★★ ab 67 %). Boss: Sterne = übrige Herzen.
- **Infoblöcke (Schalter 📖, `localStorage` `ls-info`):** Ist er an, zeigen Level, Mischlevel, Tagesmission, Schwächen-Jagd und Endlos-Training vor der ersten Frage zu einem Wissenspunkt dessen `titel` und `merke`. Darum muss jeder `merke` für sich allein verständlich sein. Antworten danach tragen `mitInfo: true`: voll richtig bringt dann keine höhere Stufe, der Punkt wird nach einem Tag wieder fällig.
- **Rückblick nach der Runde (`runde.js`, `rueckblick()`):** Die Ergebnisseite listet alle beantworteten Fragen der Runde (Antwort, Lösung, `merke`), standardmäßig nur die nicht voll richtigen. Die Karten nutzen `aufgabeKarte(…, { gesperrt: true, nurLesen: true })`: Nichts lässt sich dort mehr ändern, und gespeichert wird nichts.
- **Melden (`meldungen.js`):** „⚑ Melden“ steht in jeder Aufgabe (Runde, Rückblick, Probeklausur). In einer Runde wird die gemeldete Frage übersprungen und nicht gewertet; in der Probeklausur zählt sie nicht mit. `waehleForm`, Blitzrunde, Arbeitsblatt und Probeklausur lassen ausgeblendete Formen weg. Der Server nimmt dafür `POST /meldungen` an.
- **Level-Statistik (`#/statistik`):** Nur Lernlevel, keine Mischlevel und Bosse; Antworten aus allen Modi zählen. „Besser“ oder „schlechter“ = aktueller Kann-Wert mindestens 15 Punkte über oder unter dem Schnitt der ersten Runde, frühestens ab der zweiten Runde.

## Technik (nicht ohne Grund ändern)

Reines HTML/CSS/JS als ES-Module, kein Build, keine Abhängigkeiten, keine API. Gespeichert werden nur einzelne Antworten und Läufe (IndexedDB `lernspiel`) sowie gemeldete Fragen (Speicher `meldungen`, „Spielstand löschen“ lässt sie stehen); Stufen, XP und Serie werden beim Start daraus neu berechnet, darum zählt ein Import nichts doppelt. Service Worker lädt zuerst aus dem Netz. Neue App-Dateien in `APP_DATEIEN` in `sw.js` eintragen.
