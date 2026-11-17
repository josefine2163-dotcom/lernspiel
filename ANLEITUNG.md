# Lernspiel – Anleitung

## 1. Spiel starten

1. Öffne den Ordner `lernspiel`.
2. Doppelklicke auf **App-starten.bat**. Es öffnet sich ein schwarzes Fenster und danach dein Browser.
3. Lass das schwarze Fenster offen, solange du spielst. Zum Beenden schließt du es einfach.

Läuft die App schon, steht im schwarzen Fenster ein Hinweis. Dann kannst du einfach im Browser unter http://localhost:8093 weiterspielen.

## 1b. Auf dem Handy spielen

Das Lernspiel liegt auf GitHub und ist als Internetseite erreichbar:

**https://josefine2163-dotcom.github.io/lernspiel/**

1. Öffne die Adresse auf dem Handy (iPhone: Safari, Android: Chrome).
2. Leg sie als App auf den Startbildschirm: iPhone: Teilen-Symbol → **Zum Home-Bildschirm**. Android: ⋮ → **Zum Startbildschirm hinzufügen** bzw. **App installieren**.
3. Danach startest du das Lernspiel wie eine App. Es geht auch ohne Internet, sobald du es einmal geöffnet hast.

**Spielstand:** Jedes Gerät hat seinen eigenen Spielstand. Zum Mitnehmen: am PC ⚙️ → **Spielstand speichern**, die Datei aufs Handy schicken (z. B. per Mail oder Cloud), am Handy ⚙️ → **Spielstand einspielen**. In die andere Richtung genauso. Es wird zusammengeführt, nichts doppelt gezählt.

**Neue Inhalte:** Claude Code lädt jede Änderung selbst auf GitHub hoch. Nach 1–2 Minuten ist sie auf dem Handy; lade die App dafür einmal neu.

**Fragen melden am Handy:** Melden geht genauso. Damit Claude die Meldungen sieht: ⚙️ → **Gemeldete Fragen** → **📋 Auftrag für Claude kopieren**, dann in der Claude-App **Claude Code** mit dem GitHub-Projekt `lernspiel` öffnen und den Text einfügen. Oder du spielst den Spielstand am PC ein (die Meldungen sind darin enthalten) und sagst dort „Bearbeite die gemeldeten Fragen“.

## 2. So funktioniert das Spiel

- **Karte:** Jede Vorlesung ist eine Karte mit Welten und Leveln. Am Ende jeder Welt wartet ein Boss, ganz am Ende der Arbeitsblatt-Boss und die Probeklausur. Du kannst überall einsteigen, „Hier weiter“ zeigt dir den nächsten Schritt.
- **Viele kleine Level:** Jedes Level übt nur ein oder zwei kleine Wissenspunkte. Die 🔀-Level mischen zwischendurch die letzten Level, damit du alles auch durcheinander kannst.
- **Nur Fragen:** Es gibt nichts zu lesen, bevor du antwortest. Die Erklärung kommt immer direkt nach deiner Antwort. Am Anfang sind die Aufgaben leicht zu erkennen, später musst du mehr selbst wissen.
- **Fehler kommen wieder:** Was du falsch hattest, kommt wenige Fragen später in einer anderen Form zurück. Was du kannst, kommt nach 1, 2, 4, 8, 16 und 32 Tagen wieder, damit es im Langzeitgedächtnis bleibt.
- **Immer anders:** Die App wechselt die Aufgabentypen und zieht Antworten und Tabellenlücken jedes Mal neu.
- **Nachlesen nach der Runde:** Unter dem Ergebnis stehen unter „Deine Fragen zum Nachlesen“ alle Fragen der Runde mit deiner Antwort, der Lösung und dem Merksatz. Zuerst siehst du nur die Fragen, die nicht ganz richtig waren; mit „Alle Fragen“ siehst du auch die richtigen. Ein Klick auf eine Frage klappt sie auf oder zu. Das gilt für Level, Bosse und Arcade-Runden; im Endlos-Training gibt es kein Rundenende und darum keinen Rückblick.
- **Frage melden:** Stimmt bei einer Frage etwas nicht, tippe oben rechts in der Frage auf **⚑ Melden**, wähle den Grund und schreib auf Wunsch kurz dazu, was falsch ist. Die Frage verschwindet sofort aus dem Spiel und zählt nicht. Das geht auch im Rückblick und in der Probeklausur. Unter ⚙️ → **Gemeldete Fragen** siehst du alle Meldungen; dort kannst du eine Meldung auch zurücknehmen.
- **Gemeldete Fragen verbessern lassen:** Sag zu Claude Code im Ordner `lernspiel`: **„Bearbeite die gemeldeten Fragen“**. Claude Code prüft jede gemeldete Frage gegen das Skript und verbessert oder löscht sie. Lade danach die App neu: Verbesserte Fragen sind wieder im Spiel, und unter „Gemeldete Fragen“ steht, was geändert wurde.
- **Tastatur:** `Enter` heißt Prüfen oder Weiter, die Tasten `1`–`9` wählen eine Antwort.

### Die Farben

Grün heißt ab 90 %, gelb 67–89 %, rot unter 67 %, grau noch nicht gespielt. 👑 heißt: Dieses Level sitzt fest. 🔔 heißt: Hier ist etwas wieder fällig.

### Die Arcade-Modi

| Modus | Was passiert |
|---|---|
| 🎯 Tagesmission | Alles, was heute wieder fällig ist |
| 🏹 Schwächen-Jagd | Alles unter 67 %, in neuer Form |
| ⚡ Blitzrunde | 10 schnelle Fragen gegen die Uhr |
| ♾️ Endlos-Training | Läuft ohne Ende, jede Antwort wird sofort gespeichert |

Dein Fortschritt mit Rang, XP, Erfolgen und allen Wissenspunkten steckt hinter dem 📊-Symbol oben rechts.

### Infoblöcke für schlechte Tage

Mit dem 📖-Symbol oben rechts schaltest du **Infoblöcke** an und aus. Sind sie an, kommt vor der ersten Frage zu jedem Wissenspunkt ein kurzer Block mit dem Merksatz zum Auffrischen. Richtige Antworten direkt danach zählen, die nächste Wiederholung kommt aber schon am nächsten Tag, weil du die Antwort gerade gelesen hast. Bosse, Blitzrunde, Arbeitsblatt-Boss und Probeklausur bleiben ohne Infoblöcke. Die Einstellung bleibt, bis du sie wieder umschaltest.

Hinter dem 📈-Symbol findest du die **Level-Statistik**: Dort siehst du für jedes Level, wie gut du es kannst und ob du besser oder schlechter geworden bist. Klicke auf eine Gruppe wie „Noch nicht gut“, um nur diese Level zu sehen. Ein Klick auf ein Level zeigt die einzelnen Wissenspunkte und den Knopf zum Üben.

## 3. Neue Dokumente hinzufügen

1. Hänge die Datei im Chat mit Claude Code an oder lege sie in `dokumente/<Fach>/`, z. B. `dokumente/Kriminologie/`. Ein neuer Unterordner ergibt ein neues Fach.
2. Sag zu Claude Code im Ordner `lernspiel`: **„Verarbeite die neuen Dokumente“**.
3. Lade danach die App im Browser neu. Dein Fortschritt bleibt erhalten.

## 4. Spielstand sichern

Dein Spielstand liegt nur in diesem Browser. Sichere ihn deshalb ab und zu:

- **Sichern:** ⚙️ → **Spielstand speichern**. Die Datei landet in deinem Download-Ordner.
- **Zurückholen oder auf einen anderen Computer übertragen:** ⚙️ → **Spielstand einspielen**. Vorhandenes bleibt erhalten, und nichts wird doppelt gezählt.

Wichtig: Wenn du die Browserdaten löschst, ist ein nicht gesicherter Spielstand weg.
