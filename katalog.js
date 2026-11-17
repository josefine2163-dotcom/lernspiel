// ---------- Lernstoff laden und nachschlagen ----------
// Liest daten/index.json und die Dokument-Dateien. Prüft nebenbei das Format,
// die Fehler zeigt die Seite „Daten prüfen“.

import { TYP_NAMEN } from "./aufgaben.js";
import { AM_PC } from "./util.js";

export const K = {
  docs: [],
  wissen: new Map(),   // Wissenspunkt-ID -> { w, level, welt, doc }
  formen: new Map(),   // Aufgaben-ID -> { form, wissen: [IDs] }
  level: new Map(),    // Level-ID -> { level, welt, doc }
  welten: new Map(),   // Welt-ID -> { welt, doc }
  fehler: []
};

const FELDER = {
  single: ["optionen|richtig"], multi: ["optionen|richtig"], wasPasstNicht: ["optionen|gehoert"], zitat: ["zitat", "optionen|richtig"],
  richtigfalsch: ["aussagen"], lueckentext: ["text", "luecken"], zuordnung: ["paare"], reihenfolge: ["elemente"],
  kurzfrage: ["akzeptiert"], begriff: ["akzeptiert"], fehler: ["segmente"], tabelle: ["zeilen"], beispiel: ["kategorien", "items"],
  definition: ["kernpunkte", "musterloesung"], offen: ["kernpunkte", "musterloesung"], fall: ["fall", "kernpunkte", "musterloesung"]
};

function pruefeForm(f, wo, datei) {
  const melde = t => K.fehler.push(`${datei} – ${f.id || wo}: ${t}`);
  if (!f.id) melde("keine ID");
  if (K.formen.has(f.id)) melde("ID doppelt vergeben");
  if (!TYP_NAMEN[f.typ]) return melde(`unbekannter Typ „${f.typ}“`);
  if (!f.frage && !f.fragen && f.typ !== "zitat") melde("keine Frage");
  for (const feld of FELDER[f.typ]) {
    if (!feld.split("|").some(x => f[x] != null)) melde(`Feld ${feld} fehlt`);
  }
  if (f.typ === "lueckentext" && f.text && f.luecken && f.text.split("{}").length - 1 !== f.luecken.length) melde("Anzahl der Lücken passt nicht zum Text");
  if (f.richtig && f.typ !== "richtigfalsch" && !f.falsch) melde("Pool ohne falsche Antworten");
  if (f.gehoert && !f.ausreisser) melde("Pool ohne Ausreißer");
}

const keinServer = () => Object.assign(
  new Error(AM_PC
    ? "Dein Lernstoff und dein Spielstand sind nicht weg. Doppelklicke im Ordner lernspiel auf App-starten.bat und lass das schwarze Fenster offen."
    : "Dein Lernstoff und dein Spielstand sind nicht weg. Prüfe deine Internetverbindung und lade die Seite neu."),
  { keinServer: true });

export async function ladeKatalog() {
  const antwort = await fetch("daten/index.json", { cache: "no-store" }).catch(() => { throw keinServer(); });
  if (!antwort.ok) throw new Error("daten/index.json wurde nicht gefunden.");
  const index = await antwort.json();
  K.docs = [];
  K.fehler = [];
  [K.wissen, K.formen, K.level, K.welten].forEach(m => m.clear());
  let verbindungWeg = false;

  for (const datei of index.dokumente || []) {
    let doc;
    try {
      const r = await fetch("daten/" + datei, { cache: "no-store" });
      if (!r.ok) throw new Error("nicht gefunden");
      doc = await r.json();
    } catch (e) {
      if (e instanceof TypeError) verbindungWeg = true;
      K.fehler.push(`${datei}: ${e.message}`);
      continue;
    }
    doc._datei = datei;
    K.docs.push(doc);
    for (const welt of doc.welten || []) {
      K.welten.set(welt.id, { welt, doc });
      for (const level of welt.level || []) {
        if (K.level.has(level.id)) K.fehler.push(`${datei} – ${level.id}: Level-ID doppelt`);
        K.level.set(level.id, { level, welt, doc });
        for (const id of level.mix || []) {
          if (!welt.level.some(l => l.id === id && !l.mix)) K.fehler.push(`${datei} – ${level.id}: Mischlevel verweist auf unbekanntes Level ${id}`);
        }
        for (const w of level.wissen || []) {
          if (K.wissen.has(w.id)) K.fehler.push(`${datei} – ${w.id}: Wissenspunkt-ID doppelt`);
          if (!w.merke) K.fehler.push(`${datei} – ${w.id}: „merke“ fehlt`);
          if ((w.aufgaben || []).length < 3) K.fehler.push(`${datei} – ${w.id}: weniger als 3 Aufgabenformen`);
          K.wissen.set(w.id, { w, level, welt, doc });
          for (const f of w.aufgaben || []) {
            pruefeForm(f, w.id, datei);
            K.formen.set(f.id, { form: f, wissen: [w.id], merke: w.merke });
          }
        }
      }
    }
    const zusatz = (liste, art) => {
      for (const f of liste || []) {
        pruefeForm(f, art, datei);
        for (const id of f.wissen || []) if (!K.wissen.has(id)) K.fehler.push(`${datei} – ${f.id}: unbekannter Wissenspunkt ${id}`);
        K.formen.set(f.id, { form: f, wissen: f.wissen || [] });
      }
    };
    zusatz(doc.arbeitsblatt?.aufgaben, "Arbeitsblatt");
    zusatz(doc.probeklausur?.aufgaben, "Probeklausur");
  }
  // Nichts geladen: Das ist ein Fehler und darf nicht wie „kein Lernstoff“ aussehen.
  if (!K.docs.length && K.fehler.length) throw verbindungWeg ? keinServer() : new Error(K.fehler.join(" · "));
}

export function faecher() {
  const m = new Map();
  for (const d of K.docs) {
    if (!m.has(d.fach)) m.set(d.fach, []);
    m.get(d.fach).push(d);
  }
  return [...m.entries()].map(([name, docs]) => ({ name, docs }));
}

export const docVon = id => K.docs.find(d => d.id === id);

// Alle Wissenspunkt-IDs eines Bereichs: "alles", "f:Fach", "d:Dokument", "w:Welt", "l:Level"
export function wissenIn(bereich) {
  const [art, wert] = bereich.includes(":") ? [bereich[0], bereich.slice(2)] : ["a", ""];
  const aus = e => {
    if (art === "a") return true;
    if (art === "f") return e.doc.fach === wert;
    if (art === "d") return e.doc.id === wert;
    if (art === "w") return e.welt.id === wert;
    return e.level.id === wert || !!K.level.get(wert)?.level.mix?.includes(e.level.id);
  };
  return [...K.wissen.entries()].filter(([, e]) => aus(e)).map(([id]) => id);
}

export function bereichName(bereich) {
  if (bereich.startsWith("f:")) return bereich.slice(2);
  if (bereich.startsWith("d:")) return docVon(bereich.slice(2))?.kurztitel || "";
  return "Alles";
}
