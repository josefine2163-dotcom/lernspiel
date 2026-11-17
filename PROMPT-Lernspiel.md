Baue mir eine Lern-App im Spielstil, die mich zu meinen Lerndokumenten abfragt. Ich bekomme **keine Lernkarten oder Informationen vor den Aufgaben** (außer ich schalte für schlechte Tage die Infoblöcke ein, siehe unten), sondern nur Fragen und Aufgaben, immer wieder, damit ich den Inhalt möglichst gut lerne. Nach jeder Antwort kommt die Erklärung. Die App ist wie ein Spiel aufgebaut, mit einzelnen Leveln, die ich „durchspiele“, und mit sichtbarem Fortschritt. Was ich nicht gut kann, kommt automatisch in anderer Form wieder, bis ich es auswendig kann. Die Fragen sind jedes Mal anders, damit ich mir den Inhalt merke und nicht die Frage. Das Wiederholen soll Spaß machen und es leicht machen, den Stoff zu behalten.

Die Aufgaben sollen NICHT über eine API erzeugt werden, sondern von dir (Claude Code) direkt hier: Ich lege Dokumente (PDF, Word oder Text, z. B. Vorlesungsfolien, Skripte oder Arbeitsblätter) in den Ordner dokumente/ oder hänge sie im Chat an, und du erstellst daraus den Aufgabenkatalog, den die App anzeigt. Die Oberfläche ist auf Deutsch, Aufgaben und Lösungen in der Sprache des Dokuments. Ich lerne hauptsächlich am Laptop.

## 1. Aufbau
- dokumente/ – hier liegen meine Dateien, in Unterordnern pro Fach (z. B. dokumente/Kriminologie/).
- daten/ – pro Dokument eine JSON-Datei mit Welten, Leveln, Wissenspunkten, Aufgaben, Arbeitsblatt und Probeklausur, die du erstellst, plus eine Liste aller Dateien (daten/index.json).
- Die App liest nur diese JSON-Dateien und braucht keine API und keinen Schlüssel. Zum Starten genügt ein Doppelklick auf eine Startdatei, die einen kleinen lokalen Webserver auf einem eigenen Port startet und den Browser öffnet. Läuft die App schon, kommt ein verständlicher Hinweis statt einer Fehlermeldung.
- Mehrere Dokumente liegen in derselben App: Dokumente im selben Unterordner gehören zu einem Fach und erscheinen dort als einzelne Vorlesungen, ein neuer Unterordner ergibt ein neues Fach.

## 2. Ein Dokument verarbeiten
Wenn ich sage „Verarbeite die neuen Dokumente“, gehst du so vor:
- Lies jedes neue oder geänderte Dokument vollständig. Seiten ohne Text sind Bilder: Sieh sie dir als Bilder an.
- **Nimm nur Inhalte, die für die Klausur relevant sind.** Maßstab: Arbeitsblattfragen, Take-Home-Messages, Definitionen und Grundbegriffe, Vergleiche. Lass Organisatorisches, Umfragen, Literatur- und Datenbanklisten, lange Aufzählungen und reine Bildfolien weg und sag mir danach kurz, was du weggelassen hast.
- Liegt ein Arbeitsblatt bei, muss ich seine Fragen nach dem Spielen beantworten können. Übernimm die Fragen wörtlich als offene Aufgaben mit Markierung [AB] und schreib Musterlösungen aus dem Stoff dazu. Stehen im Dokument schon Musterantworten, nimm diese.
- **Gliedere sehr kleinteilig:** Welten (große Themen) → Level → Wissenspunkte (genau ein Gedanke). Ich will viele Level, damit ich alles genau lerne: Ein Level hat meist nur 1–2 Wissenspunkte. Zerlege Definitionen in ihre Teile. Vergleiche bekommen eigene Level **nach** den Einzelteilen. Alle 5–10 Level kommt ein **Mischlevel** 🔀, das die letzten Level derselben Welt gemischt und etwas schwerer abfragt.
- Pro Wissenspunkt erstellst du:
  - einen kurzen Titel, den die App erst zeigt, wenn der Punkt schon einmal gefragt wurde,
  - einen Merksatz (1–2 Sätze mit dem Kern, mit Autor*in und Jahr, falls genannt), der **nach** jeder Aufgabe erscheint, nie vorher,
  - **mindestens 3, besser 4 oder mehr Aufgabenformen** mit verschiedenen Typen und aus allen drei Schweregraden: 1 = wiedererkennen, 2 = mit Hilfe erinnern, 3 = frei erinnern. Nutze möglichst Antwort-Pools (mehrere richtige und falsche Antworten, aus denen jedes Mal neu gezogen wird), mehrere Formulierungen derselben Frage und Tabellen, bei denen jedes Mal andere Felder abgedeckt werden, damit es nie zweimal genau dieselbe Frage ist.
  - **Keine Karteikarten**, weder zum Lernen noch zur Abfrage.
- Pro Dokument kommt ein Pool für die Probeklausur dazu (mindestens 16 Aufgaben, neue Formulierungen, möglichst alle Typen, jede mit Verweis auf ihre Wissenspunkte). Pro Durchgang zieht die App 14 davon, bestanden ist ab 50 %, die Zeit beträgt 1,2 Minuten pro Punkt.
- Aufgabentypen bunt gemischt, insgesamt 16: Single Choice, Multiple Choice, Richtig/Falsch mit Begründung, Lückentext, Zuordnung, Reihenfolge, Kurzfrage, Begriff gesucht, Was passt nicht?, Fehler finden, Tabelle ausfüllen, Wer hat’s gesagt?, Beispiel zuordnen, Definition, offene Frage, Fallgeschichte. Legt der Stoff Vergleiche nahe, übe genau diese Vergleiche. Baue genug kurze Aufgaben für die Blitzrunde ein.
- Inhalte, Zahlen, Namen und Zitate kommen nur aus dem Dokument. Nichts erfinden. Fallgeschichten dürfen eine konstruierte Situation haben, die Lösung muss sich aber ganz aus dem Dokument ergeben. Markierungen wie „(ergänzt)“ bleiben erhalten. Ist eine Lösung nicht eindeutig oder stammt sie nicht aus den angehängten Dateien (z. B. aus meiner Mitschrift), markiere die Aufgabe mit "pruefen": true und sag in der Erklärung, warum.
- Welten, Level, Wissenspunkte und Aufgaben bekommen feste IDs. Wird ein Dokument neu verarbeitet, bleiben die IDs bestehender Inhalte gleich, neue Inhalte bekommen neue IDs, und eine ID wird nie für etwas inhaltlich anderes verwendet. Wird ein Level geteilt, behält der erste Teil die alte ID, damit meine Sterne erhalten bleiben. Verschobene Aufgaben behalten ihre ID.
- Prüfe am Ende jede Lösung (Zuordnungen, Reihenfolgen, Multiple Choice, Tabellen) Aufgabe für Aufgabe gegen das Dokument. Prüfe bei Tabellen genau, welche Zelle zu welcher Zeile gehört.
- Gib mir danach eine kurze Übersicht: Welten und Level, Anzahl der Aufgaben je Typ, was weggelassen wurde und welche Aufgaben ich prüfen soll.
- Schreib diese Regeln und das JSON-Format in eine Datei CLAUDE.md im Projektordner, damit du sie bei jedem neuen Dokument wieder genauso anwendest, auch in einer neuen Sitzung.

## 3. Bewertung in der App
- Geschlossene Aufgaben bewertet die App automatisch, mit Teilpunkten, wo es sinnvoll ist. Bei Lückentexten, Tabellen und Kurzfragen toleriert sie Groß- und Kleinschreibung, Umlaut-Schreibweisen und kleine Tippfehler. Der erste Buchstabe muss aber stimmen, und eine längere Antwort zählt nur, wenn sie den gesuchten Begriff als ganzes Wort enthält (also „informell“ ist nicht „formell“). Meint meine getippte Antwort dasselbe, kann ich sie selbst als richtig werten.
- Offene Aufgaben: Ich schreibe meine Antwort, dann erscheint die Musterlösung mit den erwarteten Kernpunkten. Ich hake die Kernpunkte ab, daraus wird ein Punktevorschlag, und ich bewerte mich selbst in 0,5-Punkte-Schritten.
- Bei jeder Aufgabe gibt es einen Knopf „Weiß ich nicht“.
- Nach jeder Antwort kommen die Lösung mit Erklärung und der Merksatz des Wissenspunkts. Bei falschen Aussagen in Richtig/Falsch steht dabei, warum sie falsch sind.
- Tastatur: Enter heißt Prüfen oder Weiter, die Tasten 1–9 wählen eine Antwort.

## 4. So funktioniert das Spiel
- **Startseite:** ein großer Knopf „Weiterspielen“, der mir den nächsten sinnvollen Schritt vorschlägt: die Tagesmission, wenn mindestens 5 Wissenspunkte fällig sind, sonst das nächste offene Level, danach Arbeitsblatt-Boss, Probeklausur und Endlos-Training. Darunter meine Fächer und Vorlesungen.
- **Karte pro Vorlesung:** Jede Welt hat ein farbiges Banner und einen Zickzack-Pfad mit einem runden Knoten pro Level, gefärbt nach meinem Stand, mit Sternen darunter. Mischlevel haben ein 🔀, am Ende jeder Welt wartet ein Boss 🐉. Am Ende der Karte kommt das Finale mit Arbeitsblatt-Boss und Probeklausur. Nichts ist gesperrt, ich kann überall einsteigen. 🔔 zeigt, dass etwas wieder fällig ist, 👑, dass ein Level fest sitzt.
- **„Hier weiter“** steht immer beim ersten Level oder Boss, den ich noch nicht geschafft habe: noch nie gespielt, mittendrin abgebrochen oder Boss verloren. Ein durchgespieltes Level mit nur einem Stern oder gelber Farbe wird übersprungen.
- **Ein Knoten antippen** öffnet ein Fenster mit Sternen, „Kann ich“-Wert, kleinem Verlauf, wie oft gespielt, und den Wissenspunkten mit ihrer Stufe im Gedächtnis. Noch nie gefragte Wissenspunkte heißen dort „Noch unbekannt“, damit nichts vom Inhalt verraten wird.
- **Level:** mindestens 5 Fragen. Erst kommt jeder Wissenspunkt einmal dran, dann noch einmal in einer schwereren Form. Was unter 67 % lag, kommt 3–4 Fragen später in anderer Form wieder, höchstens dreimal. Am Ende gibt es Sterne nach der Quote beim ersten Versuch (★★★ ab 90 %, ★★ ab 67 %, sonst ★) und einen Knopf „Nächstes Level“.
- **Mischlevel:** 10 gemischte, etwas schwerere Fragen aus den zugehörigen Leveln.
- **Boss:** 10 Wissenspunkte der Welt, die schwächsten zuerst, plus 2 Wiederholungen aus früheren Welten. Ich habe 3 Herzen und verliere eins bei unter 50 % in einer Aufgabe. Der Boss hat einen Lebensbalken. Sterne = übrige Herzen.
- **Arbeitsblatt-Boss:** alle [AB]-Fragen. Er gilt als beherrscht, wenn ich jede Frage zuletzt mit mindestens 67 % beantwortet habe.
- **Probeklausur:** jedes Mal eine neue Mischung aus dem Pool, mit Timer und automatischer Abgabe bei Zeitablauf, freiem Springen zwischen den Aufgaben, Lösungen erst nach Abgabe, Selbstbewertung der offenen Aufgaben, Anzeige bestanden/nicht bestanden.
- **Arcade-Modi** (für ein ganzes Fach oder eine einzelne Vorlesung):
  - 🎯 Tagesmission: alles, was heute wieder fällig ist (bis zu 12 Wissenspunkte).
  - 🏹 Schwächen-Jagd: alles unter 67 %, in neuer Form.
  - ⚡ Blitzrunde: 10 kurze Fragen mit Stoppuhr.
  - ♾️ Endlos-Training: ohne Ende, Schweres und Neues kommt öfter, gerade Gestelltes nicht gleich wieder, jede Antwort wird sofort gespeichert.
- **Infoblöcke für schlechte Tage:** Ein Schalter 📖 oben rechts (und in den Einstellungen), den ich an- und ausschalten kann. Ist er an, kommt in Leveln, Mischleveln, Tagesmission, Schwächen-Jagd und Endlos-Training vor der ersten Frage zu jedem Wissenspunkt ein kurzer Infoblock mit Titel und Merksatz und einem Knopf „Verstanden – zur Frage“. Bosse, Blitzrunde, Arbeitsblatt-Boss und Probeklausur bleiben ohne Hilfe. Richtige Antworten direkt nach einem Infoblock zählen, bringen aber keine höhere Stufe, und der Wissenspunkt kommt am nächsten Tag ohne Hilfe wieder.
- **Wiederholung in Abständen:** Jeder Wissenspunkt hat eine Stufe von 0 bis 6. Voll richtig = eine Stufe hoch (ab Stufe 2 nur, wenn er fällig war). Unter 50 % = zwei Stufen runter und sofort fällig. Abstände bis zur nächsten Wiederholung: 1, 2, 4, 8, 16 und 32 Tage. Ab Stufe 4 „sitzt fest“.
- **Welche Aufgabe kommt:** Stufe 0–1 → Schweregrad 1, Stufe 2–3 → Schweregrad 2, ab Stufe 4 → Schweregrad 3. Nach einem Fehler kommt eine leichtere Form und ein anderer Aufgabentyp. Noch nie gezeigte Formen zuerst, die letzten vier Formen eines Wissenspunkts nicht.
- **Spielelemente:** XP für jede Antwort (voll richtig 10 XP plus Combo-Bonus für Richtige in Folge, ab 50 % noch 4 XP) und Bonus-XP für Sterne, besiegte Bosse und bestandene Klausuren. Combo-Anzeige 🔥, Ränge von „Neuling“ bis „Legende“ (nicht zu schnell erreichbar), Tagesserie, Tagesziel von 50 XP, Erfolge zum Freischalten, Konfetti bei ★★★ und besiegtem Boss, Ton zum Einschalten.

## 5. Fortschritt
- Speichere jede einzelne Antwort und jede gespielte Runde mit Datum lokal im Browser (IndexedDB). Stufen, XP und Serie berechnest du beim Start daraus neu. Biete Export und Import als Datei an, damit nichts verloren geht. Der Import führt zusammen, ohne doppelt zu zählen.
- Der Fortschritt hängt an den Wissenspunkten, nicht an einzelnen Fragen. Der „Kann ich“-Wert eines Wissenspunkts ist der Schnitt seiner letzten drei Antworten, egal aus welchem Modus. Bei Leveln, Welten und Vorlesungen zählen noch nicht gespielte Wissenspunkte als 0 %.
- Ampelfarben überall gleich: grün ab 90 %, gelb 67–89 %, rot unter 67 %, grau noch nicht gespielt.
- Startseite: pro Vorlesung „Kann ich“ mit Balken, wie viele Level gespielt, Sterne und wie viele Wissenspunkte fest sitzen. Mit einer Auswahl „Üben aus: Alle Vorlesungen / einzelne Vorlesung“ (pro Fach gemerkt) beziehen sich die Arcade-Kacheln auf das ganze Fach oder eine Vorlesung.
- Neben der Karte: „Kann ich“ der Vorlesung, die Arcade-Modi und die Listen „Fällt mir schwer“ und „Besser geworden“.
- Seite **Mein Fortschritt** 📊: Rang mit Balken bis zum nächsten Rang, Kennzahlen (Kann ich insgesamt, sitzen fest, Antworten, Anteil voll richtig, Tagesserie, beste Combo), XP pro Tag der letzten 14 Tage als Säulen, Erfolge, „Fällt mir noch schwer“ und „Hier bin ich besser geworden“ (mindestens 15 Prozentpunkte besser), ein Raster aller Wissenspunkte in Ampelfarben und die letzten Runden.
- **Rückblick nach jeder Runde:** Unter dem Ergebnis stehen alle Fragen der Runde zum Nachlesen, mit meiner Antwort, der Lösung und dem Merksatz. Zuerst nur die, die nicht ganz richtig waren; ein Knopf zeigt alle.
- **Fragen melden:** In jeder Frage gibt es „⚑ Melden“ mit Grund und optionaler Notiz. Die Frage wird sofort ausgeblendet und nicht gewertet. Die Meldungen landen als Datei im App-Ordner; auf „Bearbeite die gemeldeten Fragen“ prüft Claude Code sie gegen das Skript, verbessert oder löscht sie, und verbesserte Fragen kommen von selbst zurück.
- Seite **Level-Statistik** 📈: für jedes Lernlevel, wie gut ich es kann und ob ich besser oder schlechter geworden bin.
  - Oben anklickbare Gruppen mit Anzahl: Alle Level, Noch nicht gut, Fast, Sitzt gut, Verbessert, Verschlechtert, Noch nicht gespielt.
  - Zwei Kästen: „Das kann ich am wenigsten“ (die 5 schwächsten gespielten Level) und „Hier bin ich besser geworden“ (die 5 größten Verbesserungen, z. B. „25 → 100 %“). Ein Klick auf ein Level startet das Üben.
  - Darunter alle Level nach Welten: Balken, Prozent, Trend (↑ +23 / ↓ −12 / → gleich), Verlaufslinie über die Runden, Sterne. Sortierbar nach Karte, Schlechteste zuerst, Größte Verbesserung zuerst und Am längsten nicht geübt.
  - Ein Klick auf ein Level klappt Details auf: Anzahl Runden, wie viele Antworten voll richtig waren, wann zuletzt geübt, ob fällig, erste Runde gegen jetzt, die einzelnen Wissenspunkte mit Ampel und Stufe, ein Knopf „Jetzt üben“.
  - Verbessert oder verschlechtert heißt: der heutige Stand liegt mindestens 15 Prozentpunkte über oder unter dem Schnitt meiner ersten Runde mit diesem Level, frühestens ab der zweiten Runde. Antworten aus Bossen, Mischleveln und Arcade-Runden zählen beim passenden Level mit. Mischlevel und Bosse stehen nicht einzeln in der Liste.
- Wenn ein Dokument neu verarbeitet oder ein Level aufgeteilt wird, bleibt mein bisheriger Fortschritt erhalten.
- Eine Seite „Daten prüfen“ in den Einstellungen zeigt Fehler in den JSON-Dateien (fehlende Felder, doppelte IDs, Wissenspunkte mit weniger als 3 Formen, unbekannte Verweise), die Anzahl der Aufgaben je Typ und die zu prüfenden Aufgaben, und erlaubt einen Testdurchlauf aller Aufgaben, der nicht gespeichert wird.
- In den Einstellungen außerdem: Hell/Dunkel, Ton an/aus, Spielstand speichern, einspielen und löschen (mit Rückfrage).

## 6. Technik und Bedienung
- Eine Web-App für den Browser, vor allem für den Laptop, die aber auch schmal ohne seitliches Scrollen funktioniert. Hell- und Dunkelmodus, große Klickflächen.
- Als PWA, die neue Lernstoffe sofort lädt (immer zuerst aus dem Netz) und den Lernstoff mitspeichert. Ist der lokale Server gerade nicht gestartet, bleiben die Level sichtbar. Geht gar nichts, steht dort klar „Die App ist gerade nicht gestartet“ mit dem Hinweis, wie ich sie starte, und nie „kein Lernstoff vorhanden“.
- Halte die Technik so einfach wie möglich: reines HTML, CSS und JavaScript, kein Build-Schritt, keine Abhängigkeiten. Ich bin keine Programmiererin: Erklär mir am Ende in einfachen Schritten und schreib es auch in eine Datei ANLEITUNG.md,
  1. wie ich die App starte,
  2. wie das Spiel funktioniert (Karte, Level, Farben, Arcade-Modi, Statistik),
  3. was ich tun muss, wenn ich ein neues Dokument hinzufüge,
  4. wie ich meinen Spielstand sichere und auf einen anderen Computer übertrage.
- Teste vor der Abgabe selbst mit einem meiner Dokumente, ob alle Aufgabentypen und Modi funktionieren und die Lösungen zum Dokument passen: Jede richtige Antwort muss volle Punkte geben, jede leere Antwort 0 Punkte. Spiel jedes Level und jeden Boss einmal automatisch durch. Lösche Testdaten danach wieder.

Zeig mir zuerst kurz deinen Plan, dann bau die App. Wenn schon Dokumente in dokumente/ liegen, verarbeite sie direkt mit.
