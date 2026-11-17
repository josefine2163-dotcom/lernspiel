// ---------- Spielstand im Browser speichern (IndexedDB) ----------
// Zwei Speicher: "antworten" (jede einzelne Antwort, sofort gespeichert) und
// "laeufe" (abgeschlossene Level, Bosse, Klausuren). Alles andere – Stufen, XP,
// Serie – wird beim Start aus den Antworten neu berechnet. Darum kann ein Import
// nichts doppelt zählen: Gleiche uid = gleiche Antwort.

const DB_NAME = "lernspiel";
const DB_VERSION = 2;
const STORES = ["antworten", "laeufe", "meldungen"]; // "meldungen": gemeldete Fragen (siehe meldungen.js)
const SPIELSTAND = ["antworten", "laeufe"];
let dbPromise = null;
let ersatz = null; // falls IndexedDB nicht verfügbar ist (z. B. privates Fenster)

function oeffne() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in globalThis)) return reject(new Error("IndexedDB fehlt"));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: "uid" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function starteSpeicher() {
  try {
    await oeffne();
    return true;
  } catch (e) {
    console.warn("IndexedDB nicht verfügbar, Spielstand nur bis zum Schließen:", e);
    ersatz = { antworten: new Map(), laeufe: new Map(), meldungen: new Map() };
    return false;
  }
}

async function alle(name) {
  if (ersatz) return [...ersatz[name].values()];
  const db = await oeffne();
  return new Promise((resolve, reject) => {
    const req = db.transaction(name).objectStore(name).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function schreibe(name, objekte) {
  if (ersatz) { objekte.forEach(o => ersatz[name].set(o.uid, o)); return; }
  const db = await oeffne();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, "readwrite");
    objekte.forEach(o => tx.objectStore(name).put(o));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const ladeAntworten = () => alle("antworten");
export const ladeLaeufe = () => alle("laeufe");
export const speichereAntwort = a => schreibe("antworten", [a]);
export const speichereLauf = l => schreibe("laeufe", [l]);
export const ladeMeldungen = () => alle("meldungen");
export const speichereMeldung = m => schreibe("meldungen", [m]);

// Löscht Antworten und Runden. Gemeldete Fragen bleiben, damit Claude Code sie noch bearbeiten kann.
export async function loescheAlles(stores = SPIELSTAND) {
  if (ersatz) { stores.forEach(s => ersatz[s].clear()); return; }
  const db = await oeffne();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, "readwrite");
    stores.forEach(s => tx.objectStore(s).clear());
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Sicherung als Datei ----------

export async function exportiere() {
  const daten = { app: "lernspiel", format: 1, exportiert: new Date().toISOString(), antworten: await ladeAntworten(), laeufe: await ladeLaeufe(), meldungen: await ladeMeldungen() };
  const blob = new Blob([JSON.stringify(daten)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `lernspiel-spielstand-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return daten.antworten.length;
}

// Führt eine Sicherung mit dem vorhandenen Stand zusammen (nichts wird gelöscht).
export async function importiere(datei) {
  let daten;
  try {
    daten = JSON.parse(await datei.text());
  } catch {
    throw new Error("Die Datei ist keine gültige Sicherung.");
  }
  if (daten.app !== "lernspiel" || !Array.isArray(daten.antworten)) throw new Error("Die Datei ist keine Lernspiel-Sicherung.");
  const ergebnis = {};
  for (const name of STORES) {
    const vorhanden = new Set((await alle(name)).map(o => o.uid));
    const neu = (daten[name] || []).filter(o => o?.uid && !vorhanden.has(o.uid));
    await schreibe(name, neu);
    ergebnis[name] = neu.length;
  }
  return ergebnis;
}
