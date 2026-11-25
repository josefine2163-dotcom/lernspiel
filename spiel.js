// ---------- Spiellogik: Wissensstand, Wiederholung, Aufgabenwahl, XP ----------
// Der Fortschritt hängt nicht an Fragen, sondern an Wissenspunkten. Jeder Wissenspunkt
// hat mehrere Aufgabenformen; die App sucht jedes Mal eine aus, die zuletzt nicht dran war.

import { K, wissenIn, levelListe } from "./katalog.js";
import { mische, neueId } from "./util.js";
import * as speicher from "./speicher.js";
import { versteckt } from "./meldungen.js";

const TAG = 86400000;
// Abstand bis zur nächsten Wiederholung je Stufe, in Tagen
const ABSTAND = [0, 1, 2, 4, 8, 16, 32];
export const FEST_AB_STUFE = 4;
export const TAGESZIEL = 50;
export const KURZ = new Set(["single", "wasPasstNicht", "zitat", "begriff", "kurzfrage", "richtigfalsch"]);

// Wie schwer eine Aufgabenform ist: 1 = wiedererkennen, 2 = mit Hilfe erinnern, 3 = frei erinnern
const SCHWERE = {
  single: 1, wasPasstNicht: 1, richtigfalsch: 1, zuordnung: 1, beispiel: 1, zitat: 1,
  multi: 2, lueckentext: 2, reihenfolge: 2, fehler: 2, begriff: 2,
  tabelle: 3, kurzfrage: 3, definition: 3, offen: 3, fall: 3
};
const schwereVon = f => f.schwere || (f.typ === "lueckentext" && f.wortbank ? 1 : SCHWERE[f.typ] || 2);

export const RAENGE = [
  [0, "Neuling", "🌱"], [100, "Ersti", "📘"], [200, "Entdecker:in", "🔍"], [400, "Kundschafter:in", "🧭"],
  [600, "Spurensucher:in", "🐾"], [1000, "Protokollant:in", "📝"], [1500, "Kenner:in", "🎓"], [2200, "Tüftler:in", "🧩"],
  [3000, "Profi", "💼"], [4500, "Ermittler:in", "🔎"], [6000, "Meister:in", "🏅"], [8000, "Gutachter:in", "⚖️"],
  [10000, "Großmeister:in", "👑"], [13000, "Forscher:in", "🔬"], [16000, "Legende", "🌟"], [20000, "Doktorand:in", "📜"],
  [25000, "Dozent:in", "🏛️"], [31000, "Professor:in", "🎖️"], [38000, "Weise:r", "🦉"], [46000, "Diamant", "💎"],
  [55000, "Überflieger:in", "🚀"], [65000, "Mythos", "🐉"], [76000, "Unaufhaltsam", "☄️"], [88000, "Titan:in", "🗿"],
  [100000, "Lernspiel-Ikone", "🏆"]
];

// ---------- Spielstand ----------
export const S = {
  wissen: new Map(), formen: new Map(), xp: 0, tageXp: {}, antworten: 0, volle: 0, laeufe: [], bestCombo: 0
};

export const tagKey = ts => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const neuerWissensstand = () => ({ stufe: 0, faellig: 0, quoten: [], verlauf: [], n: 0, letzteFormen: [], letzterTyp: null, zuletzt: 0 });

function wende(e) {
  S.antworten++;
  if (e.quote >= 0.999) S.volle++;
  S.xp += e.xp || 0;
  const tag = tagKey(e.ts);
  S.tageXp[tag] = (S.tageXp[tag] || 0) + (e.xp || 0);
  if (e.combo > S.bestCombo) S.bestCombo = e.combo;

  const fs = S.formen.get(e.form) || { n: 0, letzte: 0, ts: 0 };
  fs.n++; fs.letzte = e.quote; fs.ts = e.ts;
  S.formen.set(e.form, fs);

  const eintrag = K.formen.get(e.form);
  const ids = eintrag?.wissen || e.wissen || [];
  for (const id of ids) {
    if (!S.wissen.has(id)) S.wissen.set(id, neuerWissensstand());
    const w = S.wissen.get(id);
    w.n++;
    w.quoten.push(e.quote);
    w.verlauf.push({ lauf: e.lauf || tag, quote: e.quote, ts: e.ts });
    w.zuletzt = e.ts;
    w.letzteFormen = [e.form, ...w.letzteFormen.filter(x => x !== e.form)].slice(0, 4);
    w.letzterTyp = eintrag?.form.typ || null;
    if (e.quote >= 0.999 && e.mitInfo) {
      // Die Antwort stand gerade im Infoblock: zählt, bringt aber keine höhere Stufe und kommt morgen ohne Hilfe wieder
      w.faellig = Math.max(w.faellig, e.ts + TAG);
    } else if (e.quote >= 0.999) {
      if (w.stufe < 2 || e.ts >= w.faellig) w.stufe = Math.min(ABSTAND.length - 1, w.stufe + 1);
      w.faellig = Math.max(w.faellig, e.ts + ABSTAND[w.stufe] * TAG);
    } else if (e.quote >= 0.5) {
      w.faellig = e.ts + TAG;
    } else {
      w.stufe = Math.max(0, w.stufe - 2);
      w.faellig = e.ts;
    }
  }
}

export async function ladeSpielstand() {
  Object.assign(S, { wissen: new Map(), formen: new Map(), xp: 0, tageXp: {}, antworten: 0, volle: 0, bestCombo: 0 });
  const antworten = await speicher.ladeAntworten();
  antworten.sort((a, b) => a.ts - b.ts).forEach(wende);
  S.laeufe = (await speicher.ladeLaeufe()).sort((a, b) => a.ts - b.ts);
  for (const l of S.laeufe) {
    if (!l.xp) continue;
    S.xp += l.xp;
    const tag = tagKey(l.ts);
    S.tageXp[tag] = (S.tageXp[tag] || 0) + l.xp;
  }
}

export async function merkeAntwort({ form, quote, modus, lauf, xp = 0, combo = 0, mitInfo = false }) {
  const e = { uid: neueId(), ts: Date.now(), form, quote, modus, lauf, xp, combo, wissen: K.formen.get(form)?.wissen || [] };
  if (mitInfo) e.mitInfo = true;
  wende(e);
  await speicher.speichereAntwort(e);
}

export async function merkeLauf(l) {
  const lauf = { uid: neueId(), ts: Date.now(), ...l };
  S.laeufe.push(lauf);
  if (l.xp) {
    S.xp += l.xp;
    const tag = tagKey(lauf.ts);
    S.tageXp[tag] = (S.tageXp[tag] || 0) + l.xp;
  }
  await speicher.speichereLauf(lauf);
  return lauf;
}

// ---------- Infoblöcke (Schalter für schlechte Tage) ----------
// Ist der Schalter an, kommt vor der ersten Frage zu einem Wissenspunkt sein Merksatz als kurzer Infoblock.
// Bosse, Blitzrunde, Arbeitsblatt-Boss und Probeklausur bleiben ohne Hilfe.
export const INFO_MODI = new Set(["level", "mission", "schwaechen", "endlos"]);
let infoOhneSpeicher = false;
export function infoAn() {
  try { return localStorage.getItem("ls-info") === "an"; } catch { return infoOhneSpeicher; }
}
export function setzeInfo(an) {
  infoOhneSpeicher = an;
  try { localStorage.setItem("ls-info", an ? "an" : "aus"); } catch {}
}

// ---------- Auswertung ----------

// „Kann ich“ eines Wissenspunkts: Schnitt der letzten drei Antworten (null = noch nie gefragt)
export function kann(id) {
  const w = S.wissen.get(id);
  if (!w?.n) return null;
  const letzte = w.quoten.slice(-3);
  return (letzte.reduce((a, b) => a + b, 0) / letzte.length) * 100;
}

// „Kann ich“ eines Bereichs: Nicht gefragte Wissenspunkte zählen als 0 %.
export function kannBereich(ids) {
  if (!ids.length) return { prozent: 0, gesehen: 0, gesamt: 0, fest: 0, faellig: 0, schnitt: null };
  let summe = 0, gesehen = 0, fest = 0, faellig = 0;
  const jetzt = Date.now();
  for (const id of ids) {
    const k = kann(id);
    if (k == null) continue;
    summe += k;
    gesehen++;
    const w = S.wissen.get(id);
    if (w.stufe >= FEST_AB_STUFE) fest++;
    if (w.faellig <= jetzt) faellig++;
  }
  return { prozent: summe / ids.length, gesehen, gesamt: ids.length, fest, faellig, schnitt: gesehen ? summe / gesehen : null };
}

// Für den Kurz-Modus: Wissenspunkte mit roter Ampel kommen ins Extra-Level
K.istRot = id => { const k = kann(id); return k != null && k < 67; };

export const istFaellig = id => { const w = S.wissen.get(id); return !!w?.n && w.faellig <= Date.now(); };

export function sterneVon(ziel) {
  const eigene = S.laeufe.filter(l => l.ziel === ziel && l.geschafft !== false).reduce((m, l) => Math.max(m, l.sterne || 0), 0);
  // Großes Level im Kurz-Modus: bis es selbst gespielt wurde, zählen die kleinen Level darin
  const teile = K.level.get(ziel)?.level.teile;
  return !eigene && teile ? Math.min(...teile.map(sterneVon)) : eigene;
}
export const laeufeVon = ziel => S.laeufe.filter(l => l.ziel === ziel);

export function rang() {
  let i = 0;
  RAENGE.forEach(([xp], j) => { if (S.xp >= xp) i = j; });
  const [von, name, icon] = RAENGE[i];
  const bis = RAENGE[i + 1]?.[0] ?? null;
  return { stufe: i + 1, name, icon, von, bis, naechster: RAENGE[i + 1]?.[1] ?? null, anteil: bis == null ? 1 : (S.xp - von) / (bis - von) };
}

// Tagesserie: heute zählt mit, fehlt heute noch, zählt die Serie bis gestern weiter
export function serie() {
  const aktiv = t => (S.tageXp[tagKey(t)] || 0) > 0;
  let t = Date.now();
  if (!aktiv(t)) t -= TAG;
  let n = 0;
  while (aktiv(t)) { n++; t -= TAG; }
  return n;
}
export const heuteXp = () => S.tageXp[tagKey(Date.now())] || 0;

export function schwereListe(ids) {
  return ids.map(id => ({ id, k: kann(id) })).filter(x => x.k != null && x.k < 67).sort((a, b) => a.k - b.k);
}

// Besser geworden: frühe Antworten gegen die letzten drei, mindestens 15 Prozentpunkte
export function besserListe(ids) {
  const aus = [];
  for (const id of ids) {
    const w = S.wissen.get(id);
    if (!w || w.quoten.length < 4) continue;
    const frueh = w.quoten.slice(0, Math.min(2, w.quoten.length - 3));
    const vorher = (frueh.reduce((a, b) => a + b, 0) / frueh.length) * 100;
    const jetzt = kann(id);
    if (jetzt - vorher >= 15) aus.push({ id, vorher, jetzt });
  }
  return aus.sort((a, b) => b.jetzt - b.vorher - (a.jetzt - a.vorher));
}

// Statistik eines Lernlevels: Stand heute und Entwicklung seit der ersten Runde mit diesem Level.
// Antworten aus Bossen, Mischleveln und Arcade-Modi zählen mit, weil sie dieselben Wissenspunkte üben.
export function levelStatistik(level) {
  const ids = (level.wissen || []).map(w => w.id);
  const k = kannBereich(ids);
  const runden = new Map();
  let antworten = 0, volle = 0, zuletzt = 0;
  for (const id of ids) {
    for (const v of S.wissen.get(id)?.verlauf || []) {
      const r = runden.get(v.lauf) || { ts: v.ts, summe: 0, n: 0 };
      r.ts = Math.min(r.ts, v.ts);
      r.summe += v.quote;
      r.n++;
      runden.set(v.lauf, r);
      antworten++;
      if (v.quote >= 0.999) volle++;
      zuletzt = Math.max(zuletzt, v.ts);
    }
  }
  const verlauf = [...runden.values()].sort((a, b) => a.ts - b.ts).map(r => (r.summe / r.n) * 100);
  const anfang = verlauf.length >= 2 ? verlauf[0] : null;
  const differenz = anfang == null ? null : k.schnitt - anfang;
  const trend = differenz == null ? null : differenz >= 15 ? "besser" : differenz <= -15 ? "schlechter" : "gleich";
  return {
    ids, prozent: k.gesehen ? k.prozent : null, jetzt: k.schnitt, faellig: k.faellig, fest: k.fest,
    verlauf, anfang, differenz, trend, antworten, volle, zuletzt, sterne: sterneVon(level.id)
  };
}

export function abBeherrscht(doc) {
  const liste = (doc.arbeitsblatt?.aufgaben || []).filter(f => !versteckt(f.id));
  const ok = liste.filter(f => {
    const s = S.formen.get(f.id);
    return s && s.letzte >= 0.67;
  }).length;
  return { ok, gesamt: liste.length };
}

export const ERFOLGE = [
  { id: "start", icon: "🎮", name: "Los geht’s", text: "Erstes Level geschafft", ok: () => S.laeufe.some(l => l.art === "level") },
  { id: "drei", icon: "⭐", name: "Volle Sterne", text: "Ein Level mit ★★★", ok: () => S.laeufe.some(l => l.art === "level" && l.sterne === 3) },
  { id: "combo10", icon: "🔥", name: "Heißer Lauf", text: "10 richtige in Folge", ok: () => S.bestCombo >= 10 },
  { id: "combo25", icon: "☄️", name: "Nicht zu stoppen", text: "25 richtige in Folge", ok: () => S.bestCombo >= 25 },
  { id: "boss", icon: "🐉", name: "Bossbezwinger:in", text: "Ersten Boss besiegt", ok: () => S.laeufe.some(l => l.art === "boss" && l.geschafft) },
  { id: "serie3", icon: "📅", name: "Dranbleiben", text: "3 Tage in Folge", ok: () => serie() >= 3 },
  { id: "serie7", icon: "🗓️", name: "Eine Woche", text: "7 Tage in Folge", ok: () => serie() >= 7 },
  { id: "hundert", icon: "💯", name: "Hundert", text: "100 Antworten gegeben", ok: () => S.antworten >= 100 },
  { id: "tausend", icon: "🏔️", name: "Tausend", text: "1000 Antworten gegeben", ok: () => S.antworten >= 1000 },
  { id: "fest10", icon: "🧠", name: "Sitzt!", text: "10 Wissenspunkte sitzen fest", ok: () => [...S.wissen.values()].filter(w => w.stufe >= FEST_AB_STUFE).length >= 10 },
  { id: "ab", icon: "📝", name: "Arbeitsblatt-Profi", text: "Alle Arbeitsblatt-Fragen beantwortet", ok: () => K.docs.some(d => { const a = abBeherrscht(d); return a.gesamt && a.ok === a.gesamt; }) },
  { id: "klausur", icon: "🏆", name: "Bestanden", text: "Probeklausur bestanden", ok: () => S.laeufe.some(l => l.art === "klausur" && l.geschafft) }
];
export const erreichteErfolge = () => new Set(ERFOLGE.filter(e => e.ok()).map(e => e.id));

// ---------- Eine Aufgabenform zur konkreten Aufgabe machen ----------
// Aus den Antwort-Pools wird jedes Mal neu gezogen, damit nie zweimal dieselbe Frage kommt.

const zieh = (liste, n) => mische(liste).slice(0, n);

export function instanziere(form, { kurz = false } = {}) {
  const a = { ...form };
  if (form.fragen?.length) a.frage = zieh(form.fragen, 1)[0];
  if (["single", "zitat"].includes(form.typ) && form.richtig) {
    a.optionen = [zieh(form.richtig, 1)[0], ...zieh(form.falsch, form.anzahlFalsch || 3)];
    a.loesung = 0;
  }
  if (form.typ === "multi" && form.richtig) {
    const r = zieh(form.richtig, Math.min(form.richtig.length, form.anzahlRichtig || 3));
    const f = zieh(form.falsch, Math.min(form.falsch.length, form.anzahlFalsch || 2));
    a.optionen = [...r, ...f];
    a.loesung = r.map((_, i) => i);
  }
  if (form.typ === "wasPasstNicht" && form.gehoert) {
    a.optionen = [zieh(form.ausreisser, 1)[0], ...zieh(form.gehoert, 3)];
    a.loesung = 0;
  }
  if (form.typ === "richtigfalsch") a.aussagen = zieh(form.aussagen, kurz ? 1 : form.zeigen || Math.min(3, form.aussagen.length));
  if (form.typ === "zuordnung") a.paare = zieh(form.paare, form.zeigen || Math.min(4, form.paare.length));
  if (form.typ === "beispiel") a.items = zieh(form.items, form.zeigen || Math.min(4, form.items.length));
  if (form.typ === "tabelle") {
    // Jedes Mal andere Zellen abdecken
    const kandidaten = [];
    form.zeilen.forEach((z, r) => z.forEach((c, k) => { if (c && typeof c === "object") kandidaten.push(r + "-" + k); }));
    const leer = new Set(zieh(kandidaten, form.zeigen || Math.min(3, kandidaten.length)));
    a.zeilen = form.zeilen.map((z, r) => z.map((c, k) => (c && typeof c === "object" ? (leer.has(r + "-" + k) ? c : c.akzeptiert[0]) : c)));
  }
  a.punkte = a.punkte || standardPunkte(a);
  if (!a.merke) a.merke = K.formen.get(form.id)?.merke;
  return a;
}

function standardPunkte(a) {
  switch (a.typ) {
    case "multi": return 2;
    case "richtigfalsch": return a.aussagen.length * 0.5;
    case "lueckentext": return a.luecken.length * 0.5;
    case "zuordnung": return a.paare.length * 0.5;
    case "beispiel": return a.items.length * 0.5;
    case "fehler": return a.segmente.filter(s => s.fehler).length;
    case "tabelle": return a.zeilen.flat().filter(c => c && typeof c === "object").length * 0.5;
    case "definition": case "offen": case "fall": return Math.max(1, a.kernpunkte.length * 0.5);
    default: return 1;
  }
}

// ---------- Welche Form kommt als Nächstes? ----------

export function waehleForm(id, { nachFehler = false, nurKurz = false, schwerer = false, sperre = new Set() } = {}) {
  const w = S.wissen.get(id) || neuerWissensstand();
  const alle = K.wissen.get(id).w.aufgaben.filter(f => !versteckt(f.id)); // gemeldete Fragen kommen nicht dran
  let formen = alle.filter(f => !sperre.has(f.id));
  if (nurKurz) formen = formen.filter(f => KURZ.has(f.typ));
  if (!formen.length) formen = alle.filter(f => !nurKurz || KURZ.has(f.typ));
  if (!formen.length) return null;

  // Erst wiedererkennen, dann mit Hilfe erinnern, dann frei erinnern
  let ziel = w.stufe <= 1 ? 1 : w.stufe <= 3 ? 2 : 3;
  if (schwerer) ziel = Math.min(3, ziel + 1);
  if (nachFehler) ziel = Math.max(1, ziel - 1);

  let beste = null, bestWert = -Infinity;
  for (const f of formen) {
    const fs = S.formen.get(f.id);
    let wert = Math.random();
    if (!fs) wert += 3; else wert -= Math.min(2, fs.n * 0.4);
    const rueck = w.letzteFormen.indexOf(f.id);
    if (rueck >= 0) wert -= 8 - rueck * 2;
    if (f.typ === w.letzterTyp) wert -= nachFehler ? 5 : 2;
    // Zu schwer bremst stärker als zu leicht, damit es nach Fehlern wirklich einfacher wird
    const abstand = schwereVon(f) - ziel;
    wert -= abstand > 0 ? abstand * 3 : -abstand * 1.2;
    if (wert > bestWert) { bestWert = wert; beste = f; }
  }
  return beste;
}

// ---------- Themenzeile über Wiederholungsfragen ----------
// Sagt, woher eine Frage stammt (Fach · Sitzung · Welt), ohne die Lösung zu verraten:
// Teile, die ein Wort mit einer richtigen Antwort teilen, werden weggelassen.
const STOPP = new Set(("eine einer eines einem einen sind oder nach auch dass wird werden wurde sich nicht beim ueber unter sein "
  + "ihre ihrer kein keine alle mehr wenn eher zwei drei vier fuenf jahr jahre jahren sowie durch haben zwischen sitzung vorlesung "
  + "teil vergleich grundlagen begriff begriffe").split(" "));
const normal = s => String(s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
const stamm = s => normal(s).split(/[^a-z0-9]+/).filter(x => x.length >= 4 && !STOPP.has(x)).map(x => x.slice(0, 6));

function antwortTexte(f) {
  const t = [];
  const neu = x => { if (x != null) t.push(String(x)); };
  (f.richtig || []).forEach(neu);
  (f.akzeptiert || []).forEach(neu);
  (f.ausreisser || []).forEach(neu);
  (f.luecken || []).flat().forEach(neu);
  if (f.optionen && f.loesung != null) [].concat(f.loesung).forEach(i => neu(f.optionen[i]));
  (f.zeilen || []).flat().forEach(c => c && typeof c === "object" && (c.akzeptiert || []).forEach(neu));
  return t;
}

export function themaVon(wissenId, form, bereich = "") {
  const e = K.wissen.get(wissenId);
  if (!e) return null;
  const verraten = new Set(antwortTexte(form).flatMap(stamm));
  const sicher = text => text && !stamm(text).some(w => verraten.has(w));
  // Was der Bereich der Runde schon festlegt (ein Fach, eine Sitzung), steht nicht noch einmal da
  const nurDoc = bereich.startsWith("d:"), nurFach = nurDoc || bereich === "f:" + e.doc.fach;
  const teile = [nurFach ? null : e.doc.fach, nurDoc ? null : e.doc.kurztitel, e.welt.titel].filter(sicher);
  return teile.length ? teile.join(" · ") : null;
}

// ---------- Rundenpläne ----------
// Ein Rundeneintrag ist { wissen, ... } (Form wird erst beim Drankommen gewählt) oder { form }.

const eintraege = ids => ids.map(wissen => ({ wissen }));

function fruehereWiederholungen(aktuelleIds, doc, n) {
  const ids = wissenIn("d:" + doc.id).filter(id => !aktuelleIds.includes(id) && S.wissen.get(id)?.n);
  const dran = ids.filter(id => istFaellig(id) || kann(id) < 67);
  return mische(dran).slice(0, n).map(wissen => ({ wissen, wiederholung: true }));
}

export function planLevel(levelId) {
  const { level, doc } = K.level.get(levelId);
  const ids = wissenIn("l:" + levelId);
  // Mischlevel: Fragen quer durch die letzten Level, gleich etwas schwerer
  if (level.mix) {
    const plan = mische(ids).slice(0, 10).map(wissen => ({ wissen, schwerer: true }));
    return { art: "level", ziel: levelId, titel: level.titel, plan, wiederholen: true };
  }
  const erste = eintraege(ids);
  // Jeder Wissenspunkt kommt zweimal: erst leichter, dann in anderer Form
  const zweite = mische(ids).map(wissen => ({ wissen, schwerer: true }));
  // Kleine Level bekommen weitere Runden, damit jedes Level mindestens 5 Fragen hat
  while (erste.length + zweite.length < 5) zweite.push({ wissen: ids[zweite.length % ids.length], schwerer: true });
  const plan = [...erste, ...fruehereWiederholungen(ids, doc, 2), ...zweite].slice(0, 12);
  return { art: "level", ziel: levelId, titel: level.titel, plan, wiederholen: true };
}

export function planBoss(weltId) {
  const { welt, doc } = K.welten.get(weltId);
  const ids = wissenIn("w:" + weltId);
  const sortiert = [...ids].sort((a, b) => (kann(a) ?? -1) - (kann(b) ?? -1) + (Math.random() - 0.5) * 30);
  const plan = sortiert.slice(0, 10).map(wissen => ({ wissen, schwerer: true }));
  plan.push(...fruehereWiederholungen(ids, doc, 2));
  return { art: "boss", ziel: weltId, titel: "Boss: " + welt.titel, plan: mische(plan), herzen: 3, wiederholen: false };
}

export function planMission(bereich) {
  const ids = wissenIn(bereich).filter(istFaellig).sort((a, b) => S.wissen.get(a).faellig - S.wissen.get(b).faellig);
  return { art: "mission", ziel: "mission:" + bereich, titel: "Tagesmission", plan: eintraege(ids.slice(0, 12)), wiederholen: true };
}

export function planSchwaechen(bereich) {
  const ids = schwereListe(wissenIn(bereich)).map(x => x.id);
  return { art: "schwaechen", ziel: "schwaechen:" + bereich, titel: "Schwächen-Jagd", plan: eintraege(mische(ids.slice(0, 12))), wiederholen: true };
}

const kurzDa = id => K.wissen.get(id).w.aufgaben.some(f => KURZ.has(f.typ) && !versteckt(f.id));

export function planBlitz(bereich) {
  const alle = mische(wissenIn(bereich)).filter(kurzDa);
  const plan = [];
  while (alle.length && plan.length < 10) plan.push(...alle.slice(0, 10 - plan.length).map(wissen => ({ wissen, nurKurz: true })));
  return { art: "blitz", ziel: "blitz:" + bereich, titel: "Blitzrunde", plan, wiederholen: false, kurz: true, stoppuhr: true };
}

export function planArbeitsblatt(docId) {
  const doc = K.docs.find(d => d.id === docId);
  return { art: "arbeitsblatt", ziel: "ab:" + docId, titel: "Arbeitsblatt", plan: doc.arbeitsblatt.aufgaben.filter(f => !versteckt(f.id)).map(form => ({ form })), wiederholen: false };
}

// Endlos: Schweres öfter, gerade Gestelltes nicht gleich wieder
export function planEndlos(bereich) {
  const ids = wissenIn(bereich);
  return {
    art: "endlos", ziel: "endlos:" + bereich, titel: "Endlos-Training", plan: [], wiederholen: true, endlos: true,
    nachschub(zuletzt) {
      const frei = ids.filter(id => !zuletzt.includes(id));
      const gewicht = id => {
        const k = kann(id);
        if (k == null) return 2;
        return (istFaellig(id) ? 3 : 1) + (100 - k) / 25;
      };
      const summe = frei.reduce((s, id) => s + gewicht(id), 0);
      let r = Math.random() * summe;
      for (const id of frei) {
        r -= gewicht(id);
        if (r <= 0) return { wissen: id, nurKurz: kurzDa(id) };
      }
      return { wissen: frei[0] || ids[0] };
    }
  };
}

// Die Probeklausur: jedes Mal eine neue Mischung aus dem Klausur-Pool
export function klausurAufgaben(doc) {
  const pool = doc.probeklausur.aufgaben.filter(f => !versteckt(f.id));
  const anzahl = doc.probeklausur.anzahl || Math.min(14, pool.length);
  const offen = mische(pool.filter(f => ["definition", "offen", "fall"].includes(f.typ))).slice(0, Math.ceil(anzahl / 3));
  const rest = mische(pool.filter(f => !offen.includes(f) && !["definition", "offen", "fall"].includes(f.typ))).slice(0, anzahl - offen.length);
  return [...mische(rest), ...offen].map(f => instanziere(f));
}

// ---------- Wo geht es weiter? ----------

export function pfadVon(doc) {
  const stationen = [];
  for (const welt of doc.welten) {
    for (const level of levelListe(welt, doc)) stationen.push({ art: "level", id: level.id, level, welt });
    stationen.push({ art: "boss", id: welt.id, welt });
  }
  return stationen;
}

// Erste Station ohne geschafften Durchgang: noch nie gespielt, abgebrochen oder Boss verloren.
// Durchgespielte Level bleiben auch mit nur einem Stern oder gelber Farbe nicht stehen.
export function hierWeiter(doc) {
  return pfadVon(doc).find(s => sterneVon(s.id) < 1) || null;
}

export function naechsterSchritt() {
  for (const doc of K.docs) {
    const faellig = wissenIn("d:" + doc.id).filter(istFaellig).length;
    if (faellig >= 5) return { text: `Tagesmission: ${faellig} Wissenspunkte auffrischen`, link: `#/spiel/mission/d:${doc.id}` };
    const s = hierWeiter(doc);
    if (s) return { text: s.art === "boss" ? `Boss: ${s.welt.titel}` : `Level: ${s.level.titel}`, link: `#/spiel/${s.art}/${s.id}` };
    const ab = abBeherrscht(doc);
    if (ab.gesamt && ab.ok < ab.gesamt) return { text: "Arbeitsblatt-Boss", link: `#/spiel/arbeitsblatt/${doc.id}` };
    if (doc.probeklausur && !S.laeufe.some(l => l.art === "klausur" && l.ziel === doc.id && l.geschafft)) return { text: "Probeklausur", link: `#/klausur/${doc.id}` };
  }
  const d = K.docs[0];
  return d ? { text: "Endlos-Training", link: `#/spiel/endlos/d:${d.id}` } : null;
}
