# Neue Inhalte über eine andere Claude-Seite hinzufügen

Damit kannst du neue Vorlesungen ins Lernspiel bringen, ohne am Laptop zu sitzen, zum Beispiel am Handy oder auf claude.ai im Browser. Alle Regeln (wie Level gebaut werden, nur Fragen, keine Karteikarten, nur Klausurrelevantes, IDs, Format) stehen in `CLAUDE.md` in deinem GitHub-Projekt. Die Prompts unten verweisen nur darauf.

- GitHub-Projekt: https://github.com/josefine2163-dotcom/lernspiel
- Handy-App: https://josefine2163-dotcom.github.io/lernspiel/

---

## Weg A (empfohlen): Claude Code auf claude.ai

Claude erledigt hier alles selbst, auch das Hochladen.

1. Öffne **claude.ai/code** im Browser oder in der Claude-App den Bereich **Code**.
2. Beim ersten Mal: GitHub verbinden und das Projekt **josefine2163-dotcom/lernspiel** auswählen.
3. Hänge die Vorlesung an (PDF, Word oder Foto der Folien).
4. Füge diesen Prompt ein:

```text
Verarbeite die neuen Dokumente für mein Lernspiel.

Die angehängte Datei ist die Vorlesung „[NAME, z. B. 3_Kriminalitätstheorien.pdf]“ im Fach [Kriminologie]. Speichere sie als Sitzung [3].

Halte dich genau an CLAUDE.md in diesem Projekt, besonders an:
- „Auftrag ‚Verarbeite die neuen Dokumente‘“,
- „Fortschritt muss erhalten bleiben (IDs!)“ und das JSON-Format,
- „GitHub und Handy“ (die Datei selbst NICHT hochladen, nur daten/ ändern; ohne Browser prüfen wie dort beschrieben).

Nimm nur das Skript als Quelle und erfinde nichts dazu. Trag die neue Datei in daten/index.json ein, prüfe alles, committe und pushe auf main. Wenn du nicht auf main pushen darfst, erstelle einen Pull Request und sag mir, wo ich auf „Merge“ tippen muss.

Gib mir am Ende eine kurze Übersicht auf Deutsch: Welten und Level, Anzahl Aufgaben, was du weggelassen hast und was ich prüfen soll.
```

5. Wenn Claude fertig ist: Falls ein **Pull Request** entstanden ist, öffne ihn auf GitHub und tippe auf **Merge pull request** → **Confirm merge**.
6. Warte 1–2 Minuten und lade die Handy-App neu. Am Laptop holt Claude Code sich die Änderung beim nächsten Mal selbst (`git pull`).

**Bestehende Sitzung ergänzen** (z. B. das Arbeitsblatt kommt später): denselben Prompt nehmen und den ersten Absatz ersetzen durch:

```text
Die angehängte Datei gehört zu Sitzung [2] (daten/kriminologie-sitzung-2.json). Ergänze die Sitzung damit, ohne vorhandene IDs zu ändern.
```

**Gemeldete Fragen:** In der App unter ⚙️ → Gemeldete Fragen → „📋 Auftrag für Claude kopieren“ tippen und den Text hier in Claude Code einfügen. Er enthält den Auftrag schon.

---

## Weg B: normaler Claude-Chat (ohne Claude Code)

Nimm diesen Weg nur, wenn Claude Code nicht geht. Claude erstellt hier nur die Datei; hochladen musst du sie selbst.

1. Öffne einen neuen Chat auf claude.ai und hänge die Vorlesung an.
2. Füge diesen Prompt ein:

```text
Du erstellst Lernstoff für meine Lern-App „Lernspiel“. Die Regeln stehen hier – lies sie vollständig, bevor du anfängst:
https://raw.githubusercontent.com/josefine2163-dotcom/lernspiel/main/CLAUDE.md

Zum Vergleich ein fertiges Beispiel im richtigen Format (Aufbau, IDs, Aufgabentypen):
https://raw.githubusercontent.com/josefine2163-dotcom/lernspiel/main/daten/kriminologie-sitzung-2.json

Falls du die Links nicht öffnen kannst, sag es mir sofort. Dann lade ich dir die beiden Dateien hoch.

Aufgabe: Mach aus der angehängten Vorlesung „[NAME]“ (Fach [Kriminologie]) die Sitzung [3]. Dateiname: kriminologie-sitzung-[3].json, Dokument-ID krim-s[3], alle IDs nach dem Schema in CLAUDE.md. Halte dich an alle Regeln dort: nur Fragen mit Erklärung danach, sehr kleinteilige Level, Mischlevel, mindestens 3 Aufgabenformen pro Wissenspunkt aus allen Schweregraden, keine Karteikarten, nur Klausurrelevantes, nur das Skript als Quelle, Probeklausur mit mindestens 16 Aufgaben.

Gib mir das Ergebnis als EINE vollständige JSON-Datei zum Herunterladen (kein gekürzter Text, keine Auslassungen mit „…“). Prüfe vorher selbst, dass das JSON gültig ist und jede Lösung zum Skript passt. Danach eine kurze Übersicht auf Deutsch: Welten und Level, Anzahl Aufgaben, was weggelassen wurde.
```

3. Lade die JSON-Datei herunter.
4. Auf GitHub (geht auch am Handy im Browser):
   - Öffne https://github.com/josefine2163-dotcom/lernspiel/tree/main/daten → **Add file** → **Upload files** → Datei auswählen → **Commit changes**.
   - Öffne `daten/index.json` → Stift-Symbol (Bearbeiten) → den neuen Dateinamen in die Liste schreiben, z. B. `["kriminologie-sitzung-1.json", "kriminologie-sitzung-2.json", "kriminologie-sitzung-3.json"]` → **Commit changes**.
5. Nach 1–2 Minuten die App neu laden. Tipp danach in der App einmal ⚙️ → Daten prüfen → **Alle Aufgaben testen**. Zeigt sie Fehler, schick sie Claude im selben Chat.
