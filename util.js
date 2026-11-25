// ---------- Kleine Helfer für DOM, Text und Vergleich ----------

export function h(tag, attrs = {}, ...kinder) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else if (k === "value") el.value = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kind of kinder.flat(Infinity)) {
    if (kind == null || kind === false) continue;
    el.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return el;
}

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);

// Text aus den JSON-Dateien: **fett** und *kursiv* erlaubt, sonst reiner Text
export function fmtHtml(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}
export const fmt = (s, tag = "span", cls) => h(tag, { class: cls, html: fmtHtml(s) });

export function mische(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Mathezeichen zählen beim Vergleich als Wort (sonst wäre „Ω“ leer); „∅“ = „leere Menge“ usw.
const ZEICHEN_WORT = {
  "Ω": "omega", "ω": "omega", "∅": "leeremenge", "∩": "schnitt", "∪": "vereinigung", "⊂": "teilmenge", "⊆": "teilmenge",
  "∈": "element", "∉": "keinelement", "≤": "kleinergleich", "≥": "groessergleich", "≠": "ungleich", "≈": "ungefaehr",
  "μ": "mu", "µ": "mu", "σ": "sigma", "Σ": "summe", "√": "wurzel", "∞": "unendlich"
};
const ZEICHEN_RE = new RegExp("[" + Object.keys(ZEICHEN_WORT).join("") + "]", "g");

// Vergleichsform: klein, ohne Umlaute/Akzente, ohne Leer- und Satzzeichen; ² → 2, p₁ → p1
export function norm(s) {
  return String(s ?? "")
    .replace(ZEICHEN_RE, z => ZEICHEN_WORT[z])
    .toLowerCase()
    .replace(/ß/g, "ss").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Wörter einzeln normalisiert, damit „informell“ nicht als „formell“ durchgeht
const woerter = s => " " + String(s ?? "").split(/[\s,;:.!?()/„“"'–-]+/).map(norm).filter(Boolean).join(" ") + " ";

// Toleranter Vergleich: Groß/klein egal, kleine Tippfehler erlaubt.
// Der erste Buchstabe muss stimmen (sonst wäre „extern“ ein Tippfehler von „intern“).
// enthalten: Antwort darf länger sein, wenn sie den gesuchten Begriff als ganze Wörter enthält.
export function passt(antwort, akzeptiert, { enthalten = false } = {}) {
  const a = norm(antwort);
  if (!a) return false;
  return (akzeptiert || []).some(x => {
    const n = norm(x);
    if (!n) return false;
    if (a === n) return true;
    const toleranz = n.length <= 4 ? 0 : n.length <= 8 ? 1 : 2;
    if (a[0] === n[0] && levenshtein(a, n) <= toleranz) return true;
    return enthalten && n.length >= 4 && woerter(antwort).includes(woerter(x));
  });
}

export const runde05 = x => Math.round(x * 2) / 2;
export const zahl = x => String(x).replace(".", ",");
export const prozentText = p => (p == null ? "–" : Math.round(p) + " %");

export function datumText(iso, mitZeit = true) {
  const d = new Date(iso);
  const opt = { day: "2-digit", month: "2-digit", year: "numeric" };
  if (mitZeit) Object.assign(opt, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleString("de-DE", opt);
}

export function neueId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function toast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.add("sichtbar");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("sichtbar"), 2600);
}

export function ampel(prozent) {
  if (prozent == null) return "offen";
  return prozent >= 90 ? "gruen" : prozent >= 67 ? "gelb" : "rot";
}

export function sparkline(werte, breite = 72, hoehe = 22) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${breite} ${hoehe}`);
  svg.setAttribute("width", breite);
  svg.setAttribute("height", hoehe);
  svg.setAttribute("class", "spark");
  svg.setAttribute("aria-hidden", "true");
  const w = werte.slice(-8);
  if (!w.length) return svg;
  const y = v => hoehe - 3 - (v / 100) * (hoehe - 6);
  const x = i => (w.length === 1 ? breite / 2 : 3 + (i * (breite - 6)) / (w.length - 1));
  if (w.length > 1) {
    const linie = document.createElementNS(ns, "polyline");
    linie.setAttribute("points", w.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" "));
    svg.append(linie);
  }
  const p = document.createElementNS(ns, "circle");
  p.setAttribute("cx", x(w.length - 1));
  p.setAttribute("cy", y(w[w.length - 1]));
  p.setAttribute("r", 2.6);
  svg.append(p);
  return svg;
}

// replaceChildren ohne „null“-Texte: leere Teile werden übersprungen
export function fuelle(el, ...kinder) {
  el.replaceChildren(...kinder.flat(Infinity).filter(k => k != null && k !== false));
}

// Läuft die App am PC über App-starten.bat (lokaler Server) oder online, z. B. über GitHub Pages auf dem Handy?
export const AM_PC = ["localhost", "127.0.0.1", "[::1]", ""].includes(location.hostname);
