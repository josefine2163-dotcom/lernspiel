// ---------- Fragen melden ----------
// Jede Aufgabe hat oben rechts „⚑ Melden“. Eine gemeldete Aufgabenform kommt sofort nicht mehr dran.
// Die Meldungen liegen im Browser (IndexedDB "meldungen") und werden zusätzlich an den Server geschickt,
// der sie als meldungen/gemeldet.json in den App-Ordner schreibt. Dort liest Claude Code sie,
// verbessert oder entfernt die Aufgabe in daten/*.json und schreibt seine Antwort nach
// meldungen/antworten.json. Danach kommt die Aufgabe (verbessert) wieder ins Spiel.

import { h, toast, neueId, AM_PC } from "./util.js";
import { K } from "./katalog.js";
import * as speicher from "./speicher.js";

export const GRUENDE = [
  ["falsch", "Die Lösung ist falsch"],
  ["erkannt", "Meine richtige Antwort wurde nicht erkannt"],
  ["unklar", "Die Frage ist unklar oder mehrdeutig"],
  ["skript", "Steht so nicht im Skript"],
  ["relevanz", "Nicht klausurrelevant"],
  ["form", "Tippfehler oder Darstellungsfehler"],
  ["sonst", "Etwas anderes"]
];
const GRUND_TEXT = Object.fromEntries(GRUENDE);

export const STATUS = {
  ausgeblendet: { text: "Ausgeblendet – wartet auf Claude Code", aktiv: true },
  ueberarbeitet: { text: "Überarbeitet – wieder im Spiel", aktiv: false },
  erledigt: { text: "Geprüft – wieder im Spiel", aktiv: false },
  bleibtWeg: { text: "Geprüft – bleibt ausgeblendet", aktiv: true },
  entfernt: { text: "Entfernt", aktiv: false },
  zurueckgenommen: { text: "Zurückgenommen – wieder im Spiel", aktiv: false }
};

export const M = { liste: [], antworten: {}, versteckt: new Set(), sync: null };

export const versteckt = formId => M.versteckt.has(formId);

// Fingerabdruck einer Aufgabenform: ändert Claude Code die Aufgabe, ändert er sich, und die Aufgabe kommt wieder.
export function fingerabdruck(form) {
  const s = JSON.stringify(form);
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193); }
  return (x >>> 0).toString(16).padStart(8, "0");
}

export function statusVon(m) {
  if (m.zurueckgenommen) return "zurueckgenommen";
  const eintrag = K.formen.get(m.form);
  if (!eintrag) return "entfernt";
  const antwort = M.antworten[m.uid];
  if (antwort) return antwort.wiederEinblenden === false ? "bleibtWeg" : "erledigt";
  if (fingerabdruck(eintrag.form) !== m.fingerabdruck) return "ueberarbeitet";
  return "ausgeblendet";
}

function neuBerechnen() {
  M.versteckt = new Set(M.liste.filter(m => STATUS[statusVon(m)].aktiv).map(m => m.form));
}

export async function ladeMeldungen() {
  M.liste = (await speicher.ladeMeldungen()).sort((a, b) => a.ts - b.ts);
  try {
    const r = await fetch("meldungen/antworten.json", { cache: "no-store" });
    M.antworten = r.ok ? (await r.json()).antworten || {} : {};
  } catch { M.antworten = {}; }
  neuBerechnen();
  if (M.liste.length) sende();
}

// Schreibt alle Meldungen über den Server nach meldungen/gemeldet.json (für Claude Code)
// Online (GitHub Pages) gibt es keinen Server: Dann kopiert die Nutzerin die Meldungen für Claude (meldungenAlsAuftrag).
export async function sende() {
  if (!AM_PC) { M.sync = null; return null; }
  const docDatei = new Map(K.docs.map(d => [d.id, d._datei]));
  const meldungen = M.liste.map(m => ({ ...m, status: statusVon(m), datei: docDatei.get(m.doc) || null }));
  try {
    const r = await fetch("meldungen", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app: "lernspiel", stand: new Date().toISOString(), meldungen }, null, 2)
    });
    M.sync = r.ok;
  } catch { M.sync = false; }
  return M.sync;
}

// Alle noch offenen Meldungen als fertiger Auftrag zum Einfügen bei Claude (für das Handy)
export function meldungenAlsAuftrag() {
  const docDatei = new Map(K.docs.map(d => [d.id, d._datei]));
  const offen = M.liste.filter(m => statusVon(m) === "ausgeblendet").map(m => ({ ...m, status: "ausgeblendet", datei: docDatei.get(m.doc) || null }));
  if (!offen.length) return null;
  const zaun = "`".repeat(3);
  return "Bearbeite die gemeldeten Fragen (Lernspiel, Regeln in CLAUDE.md). Hier sind die Meldungen von meinem Handy:\n\n"
    + zaun + "json\n" + JSON.stringify({ app: "lernspiel", stand: new Date().toISOString(), meldungen: offen }) + "\n" + zaun;
}

// Woher kommt die Aufgabe? (für die Liste und für Claude Code)
function herkunft(formId) {
  const e = K.formen.get(formId);
  const wid = e?.wissen?.[0];
  const info = wid ? K.wissen.get(wid) : null;
  const doc = info?.doc || K.docs.find(d => d.probeklausur?.aufgaben?.some(f => f.id === formId) || d.arbeitsblatt?.aufgaben?.some(f => f.id === formId));
  return { wissen: e?.wissen || [], level: info?.level.titel || null, thema: info?.w.titel || null, doc: doc?.id || null };
}

export const frageText = a => (a.typ === "zitat" ? `Wer hat’s gesagt? ${a.zitat}` : a.frage || a.fall || "").replace(/\*+/g, "");

function kopie(x) { try { return JSON.parse(JSON.stringify(x)); } catch { return null; } }

async function speichere(a, st, grund, notiz) {
  const eintrag = K.formen.get(a.id);
  const m = {
    uid: neueId(), ts: Date.now(), form: a.id, grund, notiz: notiz.trim(),
    fingerabdruck: eintrag ? fingerabdruck(eintrag.form) : null,
    frage: frageText(a), typ: a.typ, ...herkunft(a.id),
    angezeigt: kopie({ ...a, merke: undefined }), eingabe: kopie(st)
  };
  await speicher.speichereMeldung(m);
  M.liste.push(m);
  neuBerechnen();
  const ok = await sende();
  toast(ok ? "Gemeldet. Die Frage kommt erst wieder, wenn sie geprüft ist."
    : ok === null ? "Gemeldet und ausgeblendet. Unter ⚙️ → Gemeldete Fragen kopierst du die Meldungen für Claude."
    : "Gemeldet und ausgeblendet. Starte die App einmal neu, damit Claude Code die Meldung sieht.");
  return m;
}

export async function nimmZurueck(m) {
  m.zurueckgenommen = Date.now();
  await speicher.speichereMeldung(m);
  neuBerechnen();
  await sende();
}

// Der Dialog. nachher(m) wird nach dem Speichern aufgerufen.
export function meldeDialog(a, st, nachher) {
  let grund = null;
  const notiz = h("textarea", { rows: 3, id: "melde-notiz", placeholder: "z. B. „Laut Folie 12 ist es andersherum“" });
  const senden = h("button", { type: "submit", class: "knopf haupt", disabled: true }, "Melden und ausblenden");
  const dlg = h("dialog", { class: "station melde-dlg", "aria-labelledby": "melde-titel" },
    h("button", { type: "button", class: "dlg-zu", "aria-label": "Schließen", onclick: () => dlg.close() }, "✕"),
    h("form", { method: "dialog", onsubmit: async e => {
        e.preventDefault();
        if (!grund) return;
        senden.disabled = true;
        const m = await speichere(a, st, grund, notiz.value);
        dlg.close();
        nachher?.(m);
      } },
      h("h2", { id: "melde-titel" }, "⚑ Frage melden"),
      h("p", { class: "melde-frage" }, frageText(a)),
      h("fieldset", { class: "melde-gruende" },
        h("legend", {}, "Was stimmt nicht?"),
        GRUENDE.map(([id, text]) => h("label", { class: "melde-grund" },
          h("input", { type: "radio", name: "grund", value: id, onchange: () => { grund = id; senden.disabled = false; } }),
          h("span", {}, text)))),
      h("label", { for: "melde-notiz", class: "melde-notiz-label" }, "Genauer (freiwillig):"),
      notiz,
      h("p", { class: "hinweis" }, "Die Frage kommt ab sofort nicht mehr dran. Sag in Claude Code „Bearbeite die gemeldeten Fragen“: Dann wird sie gegen das Skript geprüft, verbessert oder gelöscht und kommt verbessert wieder."),
      h("div", { class: "melde-knoepfe" },
        h("button", { type: "button", class: "knopf leise", onclick: () => dlg.close() }, "Abbrechen"),
        senden)));
  dlg.addEventListener("close", () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

// Ein Eintrag für die Liste auf der Seite „Gemeldete Fragen“
export function meldungsZeile(m, neuZeichnen) {
  const st = statusVon(m);
  const antwort = M.antworten[m.uid];
  return h("li", { class: "meldung " + st },
    h("div", { class: "meldung-kopf" },
      h("span", { class: "etikett meldung-status" }, STATUS[st].text),
      h("span", { class: "meldung-datum" }, new Date(m.ts).toLocaleDateString("de-DE"))),
    h("p", { class: "meldung-frage" }, m.frage || m.form),
    h("p", { class: "meldung-info" }, [m.level, m.thema].filter(Boolean).join(" · ")),
    h("p", {}, h("strong", {}, "Grund: "), GRUND_TEXT[m.grund] || m.grund, m.notiz ? ` – „${m.notiz}“` : ""),
    antwort?.text ? h("p", { class: "meldung-antwort" }, h("strong", {}, "Claude Code: "), antwort.text) : null,
    st === "ausgeblendet" ? h("button", {
      type: "button", class: "knopf leise", onclick: async () => { await nimmZurueck(m); toast("Die Frage ist wieder im Spiel."); neuZeichnen(); }
    }, "Doch in Ordnung – wieder einblenden") : null);
}
