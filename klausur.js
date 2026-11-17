// ---------- Probeklausur: der Endgegner ----------
// Timer mit automatischer Abgabe, freies Springen, Lösungen erst nach der Abgabe,
// offene Aufgaben werden vor dem Speichern selbst bewertet.

import { h, fuelle, neueId, zahl } from "./util.js";
import { aufgabeKarte, beantwortet, punkteVon, SELBST } from "./aufgaben.js";
import { klausurAufgaben, merkeAntwort, merkeLauf } from "./spiel.js";
import { konfetti } from "./runde.js";
import { meldeDialog } from "./meldungen.js";

export function spieleKlausur(wurzel, doc) {
  const pk = doc.probeklausur;
  const aufgaben = klausurAufgaben(doc);
  const zustaende = aufgaben.map(() => ({}));
  const raus = new Set(); // gemeldete Aufgaben zählen in dieser Klausur nicht mit
  const zaehlt = (_, i) => !raus.has(i);
  const gesamtPunkte = () => aufgaben.filter(zaehlt).reduce((s, a) => s + a.punkte, 0);
  const minuten = pk.zeitMinuten || Math.ceil(gesamtPunkte() * 1.2);
  const meldeOpts = (i, neu) => raus.has(i)
    ? { gemeldet: "⚑ gemeldet – zählt nicht" }
    : { melden: () => meldeDialog(aufgaben[i], zustaende[i], () => { raus.add(i); neu(); }) };
  const ende = Date.now() + minuten * 60000;
  const laufId = neueId();
  const zurueck = `#/karte/${doc.id}`;
  let aktiv = 0;
  let uhr = null;

  const restText = () => {
    const s = Math.max(0, Math.ceil((ende - Date.now()) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  function zeichne() {
    fuelle(wurzel, h("section", { class: "runde klausur" },
      h("div", { class: "runde-kopf" },
        h("a", { class: "schliessen", href: zurueck, title: "Klausur abbrechen (wird nicht gewertet)", "aria-label": "Klausur abbrechen" }, "✕"),
        h("div", { class: "klausur-titel" }, pk.titel || "Probeklausur"),
        h("div", { class: "uhr", id: "kl-uhr" }, restText())),
      h("nav", { class: "kl-nummern", "aria-label": "Aufgaben" }, aufgaben.map((a, i) => h("button", {
        type: "button",
        class: "kl-nr" + (i === aktiv ? " aktiv" : "") + (beantwortet(a, zustaende[i]) ? " erledigt" : "") + (raus.has(i) ? " gemeldet" : ""),
        onclick: () => { aktiv = i; zeichne(); }
      }, i + 1))),
      h("div", { class: "buehne" }, aufgabeKarte(aufgaben[aktiv], zustaende[aktiv], { nummer: `Aufgabe ${aktiv + 1}`, mitPunkten: true, ...meldeOpts(aktiv, zeichne) })),
      h("div", { class: "runde-fuss" },
        h("button", { type: "button", class: "knopf leise", disabled: aktiv === 0, onclick: () => { aktiv--; zeichne(); } }, "Zurück"),
        aktiv < aufgaben.length - 1
          ? h("button", { type: "button", class: "knopf haupt", onclick: () => { aktiv++; zeichne(); } }, "Nächste Aufgabe")
          : h("button", { type: "button", class: "knopf haupt", onclick: () => abgeben(false) }, "Abgeben"))));
  }

  function abgeben(zeitAbgelaufen) {
    clearInterval(uhr);
    uhr = null;
    const offen = aufgaben.filter((a, i) => zaehlt(a, i) && !beantwortet(a, zustaende[i])).length;
    if (!zeitAbgelaufen && offen && !confirm(`${offen} Aufgabe(n) sind noch offen. Trotzdem abgeben?`)) {
      starteUhr();
      return;
    }
    zeigeAuswertung(zeitAbgelaufen);
  }

  function zeigeAuswertung(zeitAbgelaufen) {
    const stand = h("div", { class: "kl-stand" });
    const speichern = h("button", { type: "button", class: "knopf haupt", onclick: speichere }, "Ergebnis speichern");
    const aktualisiere = () => {
      const offen = aufgaben.filter((a, i) => zaehlt(a, i) && SELBST.has(a.typ) && zustaende[i].selbst == null).length;
      fuelle(stand, offen ? `Bewerte noch ${offen} offene Aufgabe(n) selbst, dann kannst du speichern.` : "Alles bewertet.");
      speichern.disabled = offen > 0;
    };
    fuelle(wurzel, h("section", { class: "runde klausur" },
      h("h1", {}, zeitAbgelaufen ? "Zeit abgelaufen – automatisch abgegeben" : "Auswertung"),
      h("div", { class: "buehne kl-liste" }, aufgaben.map((a, i) => aufgabeKarte(a, zustaende[i], {
        gesperrt: true, nummer: `Aufgabe ${i + 1}`, mitPunkten: true, onAenderung: () => speichern.isConnected && aktualisiere(),
        ...meldeOpts(i, () => zeigeAuswertung(zeitAbgelaufen))
      }))),
      h("div", { class: "runde-fuss" }, stand, speichern)));
    aktualisiere();
    window.scrollTo(0, 0);
  }

  async function speichere() {
    let erreicht = 0;
    const gesamt = gesamtPunkte();
    for (let i = 0; i < aufgaben.length; i++) {
      if (raus.has(i)) continue;
      const p = punkteVon(aufgaben[i], zustaende[i]) ?? 0;
      erreicht += p;
      await merkeAntwort({ form: aufgaben[i].id, quote: Math.min(1, p / aufgaben[i].punkte), modus: "klausur", lauf: laufId, xp: 0 });
    }
    const prozent = gesamt ? (erreicht / gesamt) * 100 : 0;
    const geschafft = prozent >= (pk.bestehenProzent ?? 50);
    await merkeLauf({ art: "klausur", ziel: doc.id, sterne: prozent >= 90 ? 3 : prozent >= 67 ? 2 : geschafft ? 1 : 0, geschafft, xp: geschafft ? 100 : 20, quote: prozent / 100, punkte: erreicht, gesamt });
    if (geschafft) konfetti();
    fuelle(wurzel, h("section", { class: "ergebnis" },
      h("div", { class: "ergebnis-icon" }, geschafft ? "🏆" : "📚"),
      h("h1", {}, geschafft ? "Bestanden!" : "Noch nicht bestanden"),
      h("p", {}, `${zahl(erreicht)} von ${zahl(gesamt)} Punkten (${Math.round(prozent)} %). Bestehensgrenze: ${pk.bestehenProzent ?? 50} %.`),
      !geschafft ? h("p", {}, "Deine Fehler sind vorgemerkt. Die Tagesmission und die Schwächen-Jagd holen sie in anderer Form zurück.") : null,
      h("div", { class: "ergebnis-knoepfe" },
        h("a", { class: "knopf leise", href: zurueck }, "Zur Karte"),
        h("a", { class: "knopf haupt", href: `#/spiel/schwaechen/d:${doc.id}` }, "Schwächen jagen"))));
  }

  function starteUhr() {
    uhr = setInterval(() => {
      const e = document.getElementById("kl-uhr");
      if (e) e.textContent = restText();
      if (Date.now() >= ende) abgeben(true);
    }, 1000);
  }

  zeichne();
  starteUhr();
  return () => clearInterval(uhr);
}
