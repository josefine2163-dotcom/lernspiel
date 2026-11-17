// ---------- „Daten prüfen“: Fehler im Lernstoff finden und alle Aufgaben durchtesten ----------
// Der Test speichert nichts: Jede richtige Antwort muss volle Punkte geben, jede leere 0 Punkte.

import { h } from "./util.js";
import { K } from "./katalog.js";
import { TYP_NAMEN, punkteVon, musterAntwort } from "./aufgaben.js";
import { instanziere } from "./spiel.js";

// Pools werden zufällig gezogen, darum jede Aufgabe mehrfach testen
export function testeAlleAufgaben(durchgaenge = 25) {
  const fehler = [];
  let tests = 0;
  for (const [id, { form }] of K.formen) {
    for (let i = 0; i < durchgaenge; i++) {
      tests++;
      try {
        const a = instanziere(form);
        const voll = punkteVon(a, musterAntwort(a));
        if (voll !== a.punkte) fehler.push(`${id}: richtige Antwort gibt ${voll} statt ${a.punkte} Punkte`);
        const leer = punkteVon(a, {}) ?? 0;
        if (leer !== 0) fehler.push(`${id}: leere Antwort gibt ${leer} Punkte`);
      } catch (e) {
        fehler.push(`${id}: ${e.message}`);
      }
    }
  }
  return { tests, aufgaben: K.formen.size, fehler: [...new Set(fehler)] };
}

export function pruefSeite() {
  const zaehler = {};
  const zuPruefen = [];
  for (const [id, { form }] of K.formen) {
    zaehler[form.typ] = (zaehler[form.typ] || 0) + 1;
    if (form.pruefen) zuPruefen.push({ id, text: form.frage || form.fragen?.[0] || "" });
  }
  const testErgebnis = h("div", {});
  return h("div", { class: "pruef-seite" },
    h("h2", {}, "Datei-Prüfung"),
    K.fehler.length
      ? h("ul", { class: "fehlerliste" }, K.fehler.map(f => h("li", {}, f)))
      : h("p", { class: "gut" }, "✓ Alle Dateien sind vollständig und ohne Fehler."),
    h("p", {}, `${K.docs.length} Dokument(e), ${K.wissen.size} Wissenspunkte, ${K.formen.size} Aufgabenformen.`),
    h("h2", {}, "Aufgaben je Typ"),
    h("div", { class: "typ-raster" }, Object.keys(TYP_NAMEN).map(t => h("div", { class: "typ-zeile" }, h("span", {}, TYP_NAMEN[t]), h("strong", {}, zaehler[t] || 0)))),
    h("h2", {}, "Bitte prüfen"),
    zuPruefen.length
      ? h("ul", {}, zuPruefen.map(p => h("li", {}, h("code", {}, p.id), " – ", p.text)))
      : h("p", {}, "Keine Aufgabe ist zum Prüfen markiert."),
    h("h2", {}, "Testdurchlauf"),
    h("p", {}, "Spielt jede Aufgabe mehrfach mit richtigen und mit leeren Antworten durch. Wird nicht gespeichert."),
    h("button", {
      type: "button", class: "knopf", onclick: () => {
        const r = testeAlleAufgaben();
        testErgebnis.replaceChildren(r.fehler.length
          ? h("ul", { class: "fehlerliste" }, r.fehler.map(f => h("li", {}, f)))
          : h("p", { class: "gut" }, `✓ ${r.tests} Tests über ${r.aufgaben} Aufgaben: alles richtig gewertet.`));
      }
    }, "Alle Aufgaben testen"),
    testErgebnis);
}
