// ---------- Extra-Übungsaufgaben: Rechnen nach Schema ----------
// Die Aufgaben werden mit Zufallszahlen erzeugt, damit man das Schema lernt und nicht die Zahlen.
// Jede Aufgabe: { text, tabelle?, schritte: [{ frage, wert, stellen, toleranz?, erklaerung } | { frage, optionen, loesung, erklaerung }] }
// Formeln und Schreibweisen stammen aus den Statistik-2-Sitzungen 1–4 (siehe daten/statistik2-sitzung-*.json).

import { h, fmt, fuelle, mische } from "./util.js";

// ---------- Zahlen ----------

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const wahl = arr => arr[Math.floor(Math.random() * arr.length)];
const runde = (x, s) => Math.round((x + Number.EPSILON) * 10 ** s) / 10 ** s;

// Deutsche Schreibweise, ohne überflüssige Nullen
export function zahl(x, stellen = 3) {
  const r = runde(x, stellen);
  return (Object.is(r, -0) ? 0 : r).toLocaleString("de-DE", { maximumFractionDigits: stellen, useGrouping: false }).replace("-", "−");
}

// Liest „0,25“, „0.25“, „−3“, „1/4“ und „6/30“
export function leseZahl(s) {
  const t = String(s ?? "").trim().replace(/[−–]/g, "-").replace(/\s+/g, "").replace(/,/g, ".");
  if (!t) return NaN;
  if (t.includes("/")) {
    const [a, b, ...rest] = t.split("/");
    if (rest.length) return NaN;
    const x = leseZahl(a), y = leseZahl(b);
    return y ? x / y : NaN;
  }
  return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
}

// Wahrscheinlichkeiten als Vielfache von 0,05, jede mindestens 0,05, Summe 1
function wkeiten(k, einheiten = 20) {
  const schnitte = mische(Array.from({ length: einheiten - 1 }, (_, i) => i + 1)).slice(0, k - 1).sort((a, b) => a - b);
  const grenzen = [0, ...schnitte, einheiten];
  return grenzen.slice(1).map((g, i) => (g - grenzen[i]) / einheiten);
}

function realisationen(k, von, bis) {
  return mische(Array.from({ length: bis - von + 1 }, (_, i) => von + i)).slice(0, k).sort((a, b) => a - b);
}

const p = x => zahl(x, 4);
const summe = arr => arr.reduce((s, x) => s + x, 0);
const minus = x => (x < 0 ? `(${zahl(x)})` : zahl(x));

// ---------- Themen ----------

const THEMEN = [
  {
    id: "mengen", sitzung: 1, icon: "🔵", titel: "Mengen: Schnitt, Vereinigung, Teilmengen",
    schema: [
      "**A ∩ B**: Elemente, die in **beiden** Mengen stehen.",
      "**A ∪ B**: alle Elemente aus **mindestens einer** Menge, gemeinsame nur einmal zählen.",
      "**Disjunkt**, wenn A ∩ B = { }.",
      "Eine Menge mit n Elementen hat **2ⁿ Teilmengen** (mit leerer Menge und der Menge selbst).",
      "Grenze: **n(A ∩ B) ≤ min(n(A), n(B))**."
    ],
    neu() {
      const disjunkt = Math.random() < 0.25;
      const pool = mische(Array.from({ length: 12 }, (_, i) => i + 1));
      const nA = rnd(3, 5), nB = rnd(2, 5);
      const A = pool.slice(0, nA).sort((a, b) => a - b);
      const B = disjunkt ? pool.slice(nA, nA + nB).sort((a, b) => a - b)
        : [...pool.slice(0, rnd(1, Math.min(2, nA))), ...pool.slice(nA, nA + nB - 1)].sort((a, b) => a - b);
      const schnitt = A.filter(x => B.includes(x));
      const verein = [...new Set([...A, ...B])].sort((a, b) => a - b);
      const menge = m => m.length ? `{${m.join(", ")}}` : "{ }";
      return {
        text: `Gegeben sind **A = ${menge(A)}** und **B = ${menge(B)}**.`,
        schritte: [
          { frage: "n(A ∩ B) = ?", wert: schnitt.length, stellen: 0, erklaerung: `A ∩ B = ${menge(schnitt)}, also n(A ∩ B) = ${schnitt.length}.` },
          { frage: "n(A ∪ B) = ?", wert: verein.length, stellen: 0, erklaerung: `A ∪ B = ${menge(verein)}, also n(A ∪ B) = ${verein.length}. Gemeinsame Elemente zählen nur einmal.` },
          { frage: "Sind A und B disjunkt?", optionen: ["ja", "nein"], loesung: schnitt.length ? "nein" : "ja", erklaerung: schnitt.length ? `Nein, beide enthalten ${schnitt.join(" und ")}.` : "Ja, sie haben kein gemeinsames Element: A ∩ B = { }." },
          { frage: "Wie viele Teilmengen hat A?", wert: 2 ** A.length, stellen: 0, erklaerung: `n(A) = ${A.length} → 2^${A.length} = ${2 ** A.length} Teilmengen.` },
          { frage: "Wie groß kann n(A ∩ B) höchstens sein, wenn man nur n(A) und n(B) kennt?", wert: Math.min(A.length, B.length), stellen: 0, erklaerung: `n(A ∩ B) ≤ min(n(A), n(B)) = min(${A.length}, ${B.length}) = ${Math.min(A.length, B.length)}.` }
        ]
      };
    }
  },
  {
    id: "axiome", sitzung: 2, icon: "📐", titel: "Kolmogorov-Axiome prüfen",
    schema: [
      "**1. Positivität:** Ist jeder zugeordnete Wert ≥ 0?",
      "**2. Normiertheit:** Ist P(Ω) = 1?",
      "**3. Additivität:** Für disjunkte Ereignisse Summe der Einzelwerte mit dem Wert der Vereinigung vergleichen.",
      "Dazu gehören auch Paare wie **{a} und {b, c}**, deren Vereinigung Ω ist.",
      "Zum **Widerlegen** reicht ein Gegenbeispiel.",
      "**Fazit:** Nur wenn **alle drei** erfüllt sind, ist es ein Wahrscheinlichkeitsmaß."
    ],
    neu() {
      const [n1, n2, n3] = mische([["Schoko", "Rosinen", "Haselnuss"], ["rot", "gelb", "blau"], ["Kartenspiel", "Würfel", "Murmel"], ["Kopf", "Zahl", "Rand"]])[0];
      const [a, b, c] = wkeiten(3);
      const werte = { [n1]: a, [n2]: b, [n3]: c, [`${n1}, ${n2}`]: a + b, [`${n1}, ${n3}`]: a + c, [`${n2}, ${n3}`]: b + c, [`${n1}, ${n2}, ${n3}`]: 1 };
      const fehler = wahl(["keiner", "additiv", "additiv", "normiert", "positiv"]);
      const paare = [[n1, n2], [n1, n3], [n2, n3]];
      const kaputt = wahl(paare);
      const kaputtKey = kaputt.join(", ");
      if (fehler === "additiv") werte[kaputtKey] = runde(werte[kaputtKey] + wahl([0.1, 0.15, 0.2]) * (werte[kaputtKey] > 0.5 ? -1 : 1), 2);
      if (fehler === "normiert") werte[`${n1}, ${n2}, ${n3}`] = wahl([0.9, 0.95, 1.1]);
      let neg = null;
      if (fehler === "positiv") { neg = wahl([n1, n2, n3]); werte[neg] = -werte[neg]; }
      const pruefPaar = fehler === "additiv" ? kaputt : wahl(paare);
      const pk = pruefPaar.join(", ");
      const s = werte[pruefPaar[0]] + werte[pruefPaar[1]];
      const posOk = fehler !== "positiv";
      const normOk = fehler !== "normiert";
      const addOk = fehler === "keiner";
      const omega = `${n1}, ${n2}, ${n3}`;
      const checks = [...paare.map(([x, y]) => [`{${x}}`, `{${y}}`, werte[x], werte[y], werte[`${x}, ${y}`]]),
        ...[n1, n2, n3].map(x => { const rest = [n1, n2, n3].filter(y => y !== x).join(", "); return [`{${x}}`, `{${rest}}`, werte[x], werte[rest], werte[omega]]; })]
        .map(([ta, tb, va, vb, vu]) => ({ ok: Math.abs(va + vb - vu) < 1e-9, text: `P(${ta}) + P(${tb}) = ${zahl(va, 2)} + ${minus(runde(vb, 2))} = ${zahl(va + vb, 2)} ${Math.abs(va + vb - vu) < 1e-9 ? "=" : "≠"} ${zahl(vu, 2)}` }));
      const schlecht = checks.filter(c => !c.ok);
      const zeilen = [["{ }", "0"], ...Object.entries(werte).map(([k, v]) => [`{${k}}`, zahl(v, 2)])];
      return {
        text: "Jemand ordnet den Zufallsereignissen diese Zahlen zu. Prüfe mit den Axiomen von Kolmogorov, ob es ein Wahrscheinlichkeitsmaß ist.",
        tabelle: { kopf: ["Zufallsereignis", "zugeordnete Zahl"], zeilen },
        schritte: [
          { frage: "Axiom 1, Positivität: erfüllt?", optionen: ["erfüllt", "verletzt"], loesung: posOk ? "erfüllt" : "verletzt", erklaerung: posOk ? "Alle Werte sind ≥ 0." : `Verletzt: {${neg}} bekommt ${zahl(werte[neg], 2)}, es gibt aber keine negativen Wahrscheinlichkeiten.` },
          { frage: "Axiom 2, Normiertheit: Welcher Wert steht bei Ω?", wert: werte[`${n1}, ${n2}, ${n3}`], stellen: 2, erklaerung: `P(Ω) = P({${n1}, ${n2}, ${n3}}) = ${zahl(werte[`${n1}, ${n2}, ${n3}`], 2)}.` },
          { frage: "Ist die Normiertheit erfüllt?", optionen: ["erfüllt", "verletzt"], loesung: normOk ? "erfüllt" : "verletzt", erklaerung: normOk ? "Ja, P(Ω) = 1." : "Verletzt: P(Ω) muss genau 1 sein." },
          { frage: `Axiom 3, Additivität: P({${pruefPaar[0]}}) + P({${pruefPaar[1]}}) = ?`, wert: s, stellen: 2, erklaerung: `${zahl(werte[pruefPaar[0]], 2)} + ${minus(runde(werte[pruefPaar[1]], 2))} = ${zahl(s, 2)}. Zugeordnet ist P({${pk}}) = ${zahl(werte[pk], 2)}.` },
          {
            frage: "Ist die Additivität für alle disjunkten Ereignisse erfüllt?", optionen: ["erfüllt", "verletzt"], loesung: addOk ? "erfüllt" : "verletzt",
            erklaerung: addOk ? "Erfüllt, alle disjunkten Paare passen: " + checks.map(c => c.text).join("; ") + "." : "Verletzt: " + schlecht.map(c => c.text).join("; ") + "."
          },
          { frage: "Fazit: Ist die Zuordnung ein Wahrscheinlichkeitsmaß?", optionen: ["ja", "nein"], loesung: fehler === "keiner" ? "ja" : "nein", erklaerung: fehler === "keiner" ? "Ja, alle drei Axiome sind erfüllt." : "Nein, mindestens ein Axiom ist verletzt; zwei von drei reichen nicht." }
        ].filter(st => !(fehler === "positiv" && st.frage.startsWith("Ist die Additivität")))
      };
    }
  },
  {
    id: "laplace", sitzung: 3, icon: "🎲", titel: "Laplace-Regel und Gegenwahrscheinlichkeit",
    schema: [
      "Gilt nur bei **gleichwahrscheinlichen** Elementarereignissen: jedes einzelne Stück (Kugel, Kaugummi) ist ein Elementarereignis.",
      "**n(Ω)** = Anzahl aller Stücke.",
      "**P(A) = n(A) / n(Ω)** – günstige durch mögliche Fälle.",
      "„oder“: günstige Fälle zusammenzählen.",
      "**P(nicht A) = 1 − P(A)**."
    ],
    neu() {
      const ding = wahl([["Im Kaugummiautomaten", "Kaugummis"], ["In der Urne", "Kugeln"], ["In der Tüte", "Bonbons"]]);
      const farben = mische(["rot", "blau", "gelb", "grün", "weiß"]).slice(0, 4);
      const anz = farben.map(() => rnd(2, 12));
      const N = summe(anz);
      const [i, j, k] = mische([0, 1, 2, 3]);
      const pA = anz[i] / N, pOder = (anz[i] + anz[j]) / N, pK = anz[k] / N;
      return {
        text: `${ding[0]} sind ${farben.map((f, x) => `**${anz[x]} ${f}e**`).join(", ")} ${ding[1]}. Eins wird zufällig gezogen.`,
        schritte: [
          { frage: "n(Ω) = ?", wert: N, stellen: 0, erklaerung: `${anz.join(" + ")} = ${N}. Jedes einzelne Stück ist ein Elementarereignis.` },
          { frage: `P(${farben[i]}) = ?`, wert: pA, stellen: 3, erklaerung: `n(A)/n(Ω) = ${anz[i]}/${N} ≈ ${zahl(pA)}.` },
          { frage: `P(${farben[i]} oder ${farben[j]}) = ?`, wert: pOder, stellen: 3, erklaerung: `(${anz[i]} + ${anz[j]})/${N} = ${anz[i] + anz[j]}/${N} ≈ ${zahl(pOder)}.` },
          { frage: `P(nicht ${farben[k]}) = ?`, wert: 1 - pK, stellen: 3, erklaerung: `1 − ${anz[k]}/${N} = ${N - anz[k]}/${N} ≈ ${zahl(1 - pK)}.` }
        ]
      };
    }
  },
  {
    id: "verteilung", sitzung: 3, icon: "📶", titel: "Verteilungsfunktion F(x) und Tabellen",
    schema: [
      "**Summe aller P(X = xᵢ) = 1** → fehlende Wahrscheinlichkeit = 1 − Summe der anderen.",
      "**F(xₖ) = F(xₖ₋₁) + P(X = xₖ)** – aufsummieren, beim größten Wert ist F = 1.",
      "Rückwärts: **P(X = xₖ) = F(xₖ) − F(xₖ₋₁)**.",
      "**P(X ≤ x) = F(x)**, **P(X > xₖ) = 1 − F(xₖ)**."
    ],
    neu() {
      const k = rnd(4, 5);
      const x = realisationen(k, -5, 20);
      const pw = wkeiten(k);
      const F = pw.map((_, i) => summe(pw.slice(0, i + 1)));
      const rueck = Math.random() < 0.4;
      const loch = rnd(0, k - 1);
      const zeilen = x.map((xi, i) => [zahl(xi), rueck ? "?" : i === loch ? "?" : zahl(pw[i], 2), rueck ? zahl(F[i], 2) : "?"]);
      const j = rnd(0, k - 2);
      const schritte = rueck
        ? [
            ...x.map((xi, i) => ({ frage: `P(X = ${zahl(xi)}) = ?`, wert: pw[i], stellen: 2, erklaerung: i ? `F(${zahl(xi)}) − F(${zahl(x[i - 1])}) = ${zahl(F[i], 2)} − ${zahl(F[i - 1], 2)} = ${zahl(pw[i], 2)}.` : `Beim kleinsten Wert ist P(X = ${zahl(xi)}) = F(${zahl(xi)}) = ${zahl(pw[0], 2)}.` })),
            { frage: `P(X > ${zahl(x[j])}) = ?`, wert: 1 - F[j], stellen: 2, erklaerung: `1 − F(${zahl(x[j])}) = 1 − ${zahl(F[j], 2)} = ${zahl(1 - F[j], 2)}.` }
          ]
        : [
            { frage: `Fehlende Wahrscheinlichkeit P(X = ${zahl(x[loch])}) = ?`, wert: pw[loch], stellen: 2, erklaerung: `1 − (${pw.filter((_, i) => i !== loch).map(v => zahl(v, 2)).join(" + ")}) = ${zahl(pw[loch], 2)}.` },
            ...x.map((xi, i) => ({ frage: `F(${zahl(xi)}) = P(X ≤ ${zahl(xi)}) = ?`, wert: F[i], stellen: 2, erklaerung: i ? `F(${zahl(x[i - 1])}) + P(X = ${zahl(xi)}) = ${zahl(F[i - 1], 2)} + ${zahl(pw[i], 2)} = ${zahl(F[i], 2)}.` : `F(${zahl(xi)}) = P(X = ${zahl(xi)}) = ${zahl(pw[0], 2)}.` })),
            { frage: `P(X > ${zahl(x[j])}) = ?`, wert: 1 - F[j], stellen: 2, erklaerung: `1 − F(${zahl(x[j])}) = 1 − ${zahl(F[j], 2)} = ${zahl(1 - F[j], 2)}.` }
          ];
      return {
        text: rueck ? "Gegeben ist die Verteilungsfunktion. Rechne die Wahrscheinlichkeiten zurück." : "Vervollständige die Tabelle: zuerst die fehlende Wahrscheinlichkeit, dann die Verteilungsfunktion.",
        tabelle: { kopf: ["x", "P(X = x)", "F(x)"], zeilen },
        schritte
      };
    }
  },
  {
    id: "erwartung", sitzung: 3, icon: "⚖️", titel: "Erwartungswert E(X)",
    schema: [
      "**(1)** Tabelle mit xᵢ und P(X = xᵢ) aufstellen (Summe = 1).",
      "**(2)** Für jede Zeile **pᵢ · xᵢ** bilden.",
      "**(3)** Alle Produkte addieren: **E(X) = Σ pᵢ · xᵢ**.",
      "Deutung: Wert, den man **auf lange Sicht im Mittel** erwartet (nur bei metrischen ZV sinnvoll)."
    ],
    neu() {
      const spiel = Math.random() < 0.5;
      const k = spiel ? 5 : rnd(4, 5);
      const x = spiel ? [-2, -1, 0, 1, 2] : realisationen(k, -3, 12);
      const pw = wkeiten(k);
      const prod = x.map((xi, i) => xi * pw[i]);
      const E = summe(prod);
      const schritte = [
        ...x.map((xi, i) => ({ frage: `p · x für x = ${zahl(xi)}`, wert: prod[i], stellen: 2, erklaerung: `${zahl(pw[i], 2)} · ${minus(xi)} = ${zahl(prod[i], 2)}` })),
        { frage: "E(X) = ?", wert: E, stellen: 2, toleranz: 0.011, erklaerung: `Summe der Produkte: ${prod.map(v => zahl(v, 2)).join(" + ")} = ${zahl(E, 2)}.` }
      ];
      if (spiel) schritte.push({
        frage: "Lohnt sich das Mitspielen auf lange Sicht?", optionen: ["ja", "nein", "weder noch"], loesung: E > 0 ? "ja" : E < 0 ? "nein" : "weder noch",
        erklaerung: E > 0 ? `Ja: Im Mittel gewinnt man ${zahl(E, 2)} Bonbons pro Runde.` : E < 0 ? `Nein: Im Mittel verliert man ${zahl(-E, 2)} Bonbons pro Runde.` : "Im Mittel gewinnt und verliert man nichts."
      });
      return {
        text: spiel ? "Glücksrad mit Bonbons: X = Anzahl gewonnener (+) bzw. abzugebender (−) Bonbons pro Runde." : "Gegeben ist die Wahrscheinlichkeitsverteilung einer metrischen Zufallsvariable X.",
        tabelle: { kopf: ["x", "P(X = x)"], zeilen: x.map((xi, i) => [zahl(xi), zahl(pw[i], 2)]) },
        schritte
      };
    }
  },
  {
    id: "varianz", sitzung: 3, icon: "📏", titel: "Varianz und Standardabweichung",
    schema: [
      "**(1)** Erst **μ = E(X) = Σ pᵢ · xᵢ** berechnen.",
      "**(2)** Abweichungen **(xᵢ − μ)**, **(3)** quadrieren, **(4)** mit **pᵢ** gewichten.",
      "**(5)** Addieren: **Var(X) = Σ pᵢ · (xᵢ − μ)²**.",
      "**σ = √Var(X)**."
    ],
    neu() {
      const k = rnd(3, 4);
      const x = realisationen(k, 0, 10);
      const pw = wkeiten(k, 10);
      const E = summe(x.map((xi, i) => xi * pw[i]));
      const terme = x.map((xi, i) => pw[i] * (xi - E) ** 2);
      const V = summe(terme);
      return {
        text: "Gegeben ist die Wahrscheinlichkeitsverteilung von X. Berechne Erwartungswert, Varianz und Standardabweichung.",
        tabelle: { kopf: ["x", "P(X = x)"], zeilen: x.map((xi, i) => [String(xi), zahl(pw[i], 1)]) },
        schritte: [
          { frage: "μ = E(X) = ?", wert: E, stellen: 2, erklaerung: `${x.map((xi, i) => `${zahl(pw[i], 1)} · ${zahl(xi)}`).join(" + ")} = ${zahl(E, 2)}` },
          ...x.map((xi, i) => ({ frage: `p · (x − μ)² für x = ${zahl(xi)}`, wert: terme[i], stellen: 3, toleranz: 0.006, erklaerung: `${zahl(pw[i], 1)} · (${zahl(xi)} − ${zahl(E, 2)})² = ${zahl(pw[i], 1)} · ${zahl((xi - E) ** 2, 4)} = ${zahl(terme[i], 4)}` })),
          { frage: "Var(X) = ?", wert: V, stellen: 3, toleranz: 0.015, erklaerung: `Summe: ${terme.map(v => zahl(v, 3)).join(" + ")} ≈ ${zahl(V, 3)}.` },
          { frage: "σ = ?", wert: Math.sqrt(V), stellen: 3, toleranz: 0.006, erklaerung: `σ = √${zahl(V, 3)} ≈ ${zahl(Math.sqrt(V), 3)}.` }
        ]
      };
    }
  },
  {
    id: "gleich", sitzung: 4, icon: "🟰", titel: "Gleichverteilung U(m)",
    schema: [
      "m mögliche Realisationen, alle mit **P(X = xᵢ) = 1/m** → **X ~ U(m)**.",
      "Nur wenn die Realisationen **genau 1, 2, …, m** sind: **E(X) = (m + 1)/2**, **Var(X) = (m² − 1)/12**.",
      "Andere Realisationen (z. B. 10, 20, …): über eine **Transformation** (E(b·X) = b·E(X), Var(b·X) = b²·Var(X)) oder die allgemeine Formel."
    ],
    neu() {
      const m = rnd(3, 12);
      const b = Math.random() < 0.3 ? wahl([2, 5, 10]) : 1;
      const E = b * (m + 1) / 2, V = b * b * (m * m - 1) / 12;
      const real = b === 1 ? `1, 2, …, ${m}` : `${b}, ${2 * b}, …, ${m * b}`;
      const schritte = [
        { frage: "m = ?", wert: m, stellen: 0, erklaerung: `Es gibt ${m} gleich wahrscheinliche Realisationen.` },
        { frage: "P(X = x) für jede Realisation = ?", wert: 1 / m, stellen: 3, erklaerung: `1/m = 1/${m} ≈ ${zahl(1 / m)}.` }
      ];
      if (b === 1) schritte.push(
        { frage: "E(X) = ?", wert: E, stellen: 2, erklaerung: `(m + 1)/2 = (${m} + 1)/2 = ${zahl(E, 2)}.` },
        { frage: "Var(X) = ?", wert: V, stellen: 3, erklaerung: `(m² − 1)/12 = (${m * m} − 1)/12 = ${m * m - 1}/12 ≈ ${zahl(V)}.` });
      else schritte.push(
        { frage: "Welcher Faktor b macht aus 1, 2, …, m diese Realisationen?", wert: b, stellen: 0, erklaerung: `X = ${b} · U mit U ~ U(${m}).` },
        { frage: "E(X) = ?", wert: E, stellen: 2, erklaerung: `E(U) = (${m} + 1)/2 = ${zahl((m + 1) / 2, 2)}; E(X) = ${b} · ${zahl((m + 1) / 2, 2)} = ${zahl(E, 2)}.` },
        { frage: "Var(X) = ?", wert: V, stellen: 3, toleranz: 0.02, erklaerung: `Var(U) = (${m * m} − 1)/12 ≈ ${zahl((m * m - 1) / 12)}; Var(X) = ${b}² · ${zahl((m * m - 1) / 12)} ≈ ${zahl(V)}.` });
      return {
        text: `Ein Glücksrad hat ${m} gleich große Felder mit den Zahlen **${real}**. X = gedrehte Zahl.`,
        schritte
      };
    }
  },
  {
    id: "bernoulli", sitzung: 4, icon: "🪙", titel: "Bernoulli-Verteilung Bin(1, p₁)",
    schema: [
      "**Zielereignis = 1**, alles andere = 0.",
      "**p₁ = P(X = 1)**, P(X = 0) = 1 − p₁ → **X ~ Bin(1, p₁)**.",
      "**E(X) = p₁**, **Var(X) = p₁ · (1 − p₁)**."
    ],
    neu() {
      let text, p1, erk;
      const art = rnd(0, 2);
      if (art === 0) {
        const N = wahl([20, 40, 50, 100, 200]), g = rnd(1, N / 2);
        p1 = g / N; text = `In einer Losbude sind **${g} Gewinne unter ${N} Losen**. X = 1 bei Gewinn, 0 sonst.`; erk = `${g}/${N} = ${zahl(p1, 4)}`;
      } else if (art === 1) {
        const t = rnd(2, 6);
        p1 = (7 - t) / 6; text = `Ein fairer Würfel wird geworfen. Zielereignis: **Augenzahl ${t} oder höher**.`; erk = `${7 - t} günstige von 6 Augenzahlen: ${7 - t}/6 ≈ ${zahl(p1, 4)}`;
      } else {
        const r = rnd(1, 9), n = rnd(1, 9);
        p1 = r / (r + n); text = `In einer Urne liegen **${r} rote und ${n} schwarze Kugeln**. Zielereignis: rot.`; erk = `${r}/${r + n} ≈ ${zahl(p1, 4)}`;
      }
      return {
        text,
        schritte: [
          { frage: "p₁ = ?", wert: p1, stellen: 3, erklaerung: erk + "." },
          { frage: "P(X = 0) = ?", wert: 1 - p1, stellen: 3, erklaerung: `1 − p₁ ≈ ${zahl(1 - p1)}.` },
          { frage: "E(X) = ?", wert: p1, stellen: 3, erklaerung: `E(X) = p₁ ≈ ${zahl(p1)}.` },
          { frage: "Var(X) = ?", wert: p1 * (1 - p1), stellen: 3, toleranz: 0.002, erklaerung: `p₁ · (1 − p₁) ≈ ${zahl(p1)} · ${zahl(1 - p1)} ≈ ${zahl(p1 * (1 - p1), 4)}.` }
        ]
      };
    }
  },
  {
    id: "transformation", sitzung: 4, icon: "↔️", titel: "Transformation: Addition und Multiplikation",
    schema: [
      "**Addition:** E(X + a) = E(X) + a, **Var(X + a) = Var(X)** (Abstände bleiben).",
      "**Multiplikation:** E(b·X) = b·E(X), **Var(b·X) = b²·Var(X)** – nicht b·Var!",
      "**Division:** wie Multiplikation mit 1/c: E(X/c) = E(X)/c, **Var(X/c) = Var(X)/c²**."
    ],
    neu() {
      const E = rnd(-20, 80) / 10, V = rnd(50, 900) / 100;
      const arten = mische(["plus", "minus", "mal", "durch"]).slice(0, 2);
      const schritte = arten.flatMap((art, n) => {
        const Y = `Y${n + 1}`;
        if (art === "plus") { const a = rnd(2, 25); return [
          { frage: `${Y} = X + ${a}: E(${Y}) = ?`, wert: E + a, stellen: 2, erklaerung: `E(X) + ${a} = ${zahl(E, 2)} + ${a} = ${zahl(E + a, 2)}.` },
          { frage: `Var(${Y}) = ?`, wert: V, stellen: 2, erklaerung: `Addition ändert die Varianz nicht: ${zahl(V, 2)}.` }]; }
        if (art === "minus") { const a = rnd(2, 15); return [
          { frage: `${Y} = X − ${a}: E(${Y}) = ?`, wert: E - a, stellen: 2, erklaerung: `${zahl(E, 2)} − ${a} = ${zahl(E - a, 2)}.` },
          { frage: `Var(${Y}) = ?`, wert: V, stellen: 2, erklaerung: `Subtraktion ändert die Varianz nicht: ${zahl(V, 2)}.` }]; }
        if (art === "mal") { const b = wahl([2, 3, 4, 5, 0.5, 1.5]); return [
          { frage: `${Y} = ${zahl(b)} · X: E(${Y}) = ?`, wert: b * E, stellen: 2, erklaerung: `${zahl(b)} · ${minus(E)} = ${zahl(b * E, 2)}.` },
          { frage: `Var(${Y}) = ?`, wert: b * b * V, stellen: 3, toleranz: 0.006, erklaerung: `${zahl(b)}² · ${zahl(V, 2)} = ${zahl(b * b)} · ${zahl(V, 2)} = ${zahl(b * b * V)}.` }]; }
        const c = wahl([2, 3, 4, 5, 10]); return [
          { frage: `${Y} = X / ${c}: E(${Y}) = ?`, wert: E / c, stellen: 3, erklaerung: `${zahl(E, 2)} / ${c} ≈ ${zahl(E / c)}.` },
          { frage: `Var(${Y}) = ?`, wert: V / (c * c), stellen: 3, toleranz: 0.002, erklaerung: `${zahl(V, 2)} / ${c}² = ${zahl(V, 2)} / ${c * c} ≈ ${zahl(V / (c * c))}.` }];
      });
      return { text: `Für X gilt **E(X) = ${zahl(E, 2)}** und **Var(X) = ${zahl(V, 2)}**.`, schritte };
    }
  },
  {
    id: "linear", sitzung: 4, icon: "🔁", titel: "Lineare Transformation b·X + a und b·(X + a)",
    schema: [
      "**Y = b·X + a:** E(Y) = b·E(X) + a, Var(Y) = b²·Var(X).",
      "**Y = b·(X + a):** E(Y) = b·E(X) + b·a, Var(Y) = b²·Var(X).",
      "**Rückwärts arbeiten:** die äußerste Operation zuerst auflösen.",
      "Die Addition ändert die Varianz nie."
    ],
    neu() {
      const kontext = Math.random() < 0.3;
      if (kontext) {
        const max = wahl([40, 50, 60, 80, 120]), E = rnd(Math.round(max * 0.4), Math.round(max * 0.8)), sd = rnd(3, 12);
        const b = 100 / max;
        return {
          text: `Punkte X in einer Klausur (Höchstpunktzahl ${max}): **E(X) = ${E}**, **Var(X) = ${sd * sd}**. Die Punkte werden in Prozent umgerechnet: **Y = X / ${max} · 100**.`,
          schritte: [
            { frage: "Mit welchem Faktor b wird X multipliziert?", wert: b, stellen: 3, erklaerung: `100 / ${max} ≈ ${zahl(b)}, also Y = ${zahl(b)} · X.` },
            { frage: "E(Y) = ?", wert: b * E, stellen: 2, toleranz: Math.max(0.02, 0.002 * b * E), erklaerung: `${zahl(b)} · ${E} ≈ ${zahl(b * E, 2)} %.` },
            { frage: "Var(Y) = ?", wert: b * b * sd * sd, stellen: 2, toleranz: Math.max(0.05, 0.004 * b * b * sd * sd), erklaerung: `${zahl(b)}² · ${sd * sd} ≈ ${zahl(b * b)} · ${sd * sd} ≈ ${zahl(b * b * sd * sd, 2)}.` }
          ]
        };
      }
      const E = rnd(10, 60) / 10, V = rnd(100, 600) / 100;
      const b = wahl([2, 3, 4, 0.5]), a = rnd(1, 12) * wahl([1, 1, -1]);
      const klammer = Math.random() < 0.5;
      const aT = a < 0 ? `− ${-a}` : `+ ${a}`;
      const formel = klammer ? `Y = ${zahl(b)} · (X ${aT})` : `Y = ${zahl(b)} · X ${aT}`;
      const EY = klammer ? b * (E + a) : b * E + a;
      return {
        text: `Für X gilt **E(X) = ${zahl(E, 2)}** und **Var(X) = ${zahl(V, 2)}**. Es wird transformiert: **${formel}**.`,
        schritte: [
          { frage: "Welche Operation wird beim Berechnen zuerst aufgelöst?", optionen: ["die Multiplikation", "die Addition/Subtraktion"], loesung: klammer ? "die Multiplikation" : "die Addition/Subtraktion", erklaerung: klammer ? "Äußerste Operation ist ·b: E(Y) = b · E(X + a)." : "Äußerste Operation ist ±a: E(Y) = E(b·X) + a." },
          { frage: "E(Y) = ?", wert: EY, stellen: 2, erklaerung: klammer ? `${zahl(b)} · (${zahl(E, 2)} ${aT}) = ${zahl(b)} · ${minus(E + a)} = ${zahl(EY, 2)}` : `${zahl(b)} · ${zahl(E, 2)} ${aT} = ${zahl(b * E, 2)} ${aT} = ${zahl(EY, 2)}` },
          { frage: "Var(Y) = ?", wert: b * b * V, stellen: 3, toleranz: 0.006, erklaerung: `b² · Var(X) = ${zahl(b * b)} · ${zahl(V, 2)} = ${zahl(b * b * V)}; die Addition ändert nichts.` }
        ]
      };
    }
  },
  {
    id: "z", sitzung: 4, icon: "🎯", titel: "z-Transformation",
    schema: [
      "**Z = (X − μ) / σ**: (1) Erwartungswert abziehen, (2) durch die Standardabweichung teilen.",
      "Erst **σ = √Var(X)** bestimmen, wenn nur die Varianz gegeben ist.",
      "Immer gilt **E(Z) = 0** und **Var(Z) = 1**."
    ],
    neu() {
      const sigma = wahl([1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12]);
      const mu = rnd(5, 60) + wahl([0, 0.5]);
      const xs = [mu + rnd(-25, 25) / 10 * sigma, mu + rnd(-25, 25) / 10 * sigma].map(x => runde(x, 1));
      const schritte = [
        { frage: "σ = ?", wert: sigma, stellen: 2, erklaerung: `σ = √${zahl(sigma * sigma, 2)} = ${zahl(sigma, 2)}.` },
        ...xs.map(x => ({ frage: `z-Wert für x = ${zahl(x, 1)}`, wert: (x - mu) / sigma, stellen: 3, toleranz: 0.006, erklaerung: `(${zahl(x, 1)} − ${zahl(mu, 1)}) / ${zahl(sigma, 2)} = ${zahl(x - mu, 2)} / ${zahl(sigma, 2)} ≈ ${zahl((x - mu) / sigma)}` })),
        wahl([
          { frage: "E(Z) = ?", wert: 0, stellen: 0, erklaerung: "Jede z-transformierte Variable hat E(Z) = 0." },
          { frage: "Var(Z) = ?", wert: 1, stellen: 0, erklaerung: "Jede z-transformierte Variable hat Var(Z) = 1." }
        ])
      ];
      return { text: `Für X gilt **E(X) = ${zahl(mu, 1)}** und **Var(X) = ${zahl(sigma * sigma, 2)}**. Berechne die z-Werte.`, schritte };
    }
  }
];

export const RECHEN_FAECHER = { "Statistik 2": THEMEN };
export const hatRechnen = fach => !!RECHEN_FAECHER[fach];

// ---------- Kleiner Zähler pro Gerät ----------

const SCHLUESSEL = "ls-rechnen";
function stand() { try { return JSON.parse(localStorage.getItem(SCHLUESSEL)) || {}; } catch { return {}; } }
function merke(thema, richtig, schritte) {
  const s = stand();
  const t = s[thema] || { aufgaben: 0, richtig: 0, schritte: 0 };
  t.aufgaben++; t.richtig += richtig; t.schritte += schritte;
  s[thema] = t;
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(s)); } catch {}
}

// ---------- Seiten ----------

const link = (fach, thema) => `#/rechnen/${encodeURIComponent(fach)}` + (thema ? `/${thema}` : "");

export function rechnenKachel(fach) {
  const n = THEMEN_VON(fach).length;
  return h("a", { class: "kachel rechnen-kachel", href: link(fach), title: "Rechenaufgaben mit immer neuen Zahlen" },
    h("span", { class: "kachel-icon", "aria-hidden": "true" }, "🧮"),
    h("span", { class: "kachel-text" }, h("strong", {}, "Extra-Übungsaufgaben"), h("small", {}, `Rechnen nach Schema · ${n} Themen · Zahlen immer neu`)));
}

const THEMEN_VON = fach => RECHEN_FAECHER[fach] || [];

export function rechnenUebersicht(fach) {
  const s = stand();
  const themen = THEMEN_VON(fach);
  const sitzungen = [...new Set(themen.map(t => t.sitzung))];
  return [
    h("a", { class: "zurueck", href: "#/" }, "← Übersicht"),
    h("h1", {}, "🧮 Extra-Übungsaufgaben ", h("small", { class: "klein" }, fach)),
    h("p", { class: "hinweis" }, "Hier rechnest du Schritt für Schritt nach dem Schema aus der Vorlesung. Die Zahlen sind bei jeder Aufgabe neu, damit du den Rechenweg lernst und nicht die Ergebnisse. Kommazahlen mit Komma oder Punkt, Brüche wie 6/30 gehen auch. Diese Übungen zählen nicht in „Kann ich“ und XP."),
    h("div", { class: "kacheln" }, h("a", { class: "kachel", href: link(fach, "mix") },
      h("span", { class: "kachel-icon", "aria-hidden": "true" }, "🔀"),
      h("span", { class: "kachel-text" }, h("strong", {}, "Gemischt"), h("small", {}, "Jede Aufgabe aus einem anderen Thema")))),
    sitzungen.map(nr => h("section", { class: "rechnen-gruppe" },
      h("h2", {}, `Sitzung ${nr}`),
      h("div", { class: "kacheln" }, themen.filter(t => t.sitzung === nr).map(t => {
        const st = s[t.id];
        const info = st ? `${st.aufgaben} gerechnet · ${Math.round((st.richtig / Math.max(1, st.schritte)) * 100)} % der Schritte richtig` : "Noch nicht geübt";
        return h("a", { class: "kachel", href: link(fach, t.id) },
          h("span", { class: "kachel-icon", "aria-hidden": "true" }, t.icon),
          h("span", { class: "kachel-text" }, h("strong", {}, t.titel), h("small", {}, info)));
      }))))
  ];
}

export function rechnenUeben(ziel, fach, themaId) {
  const themen = THEMEN_VON(fach);
  const mix = themaId === "mix";
  if (!themen.length || (!mix && !themen.some(t => t.id === themaId))) return false;
  const bilanz = { aufgaben: 0, richtig: 0, schritte: 0 };
  let letztes = null;

  const kopf = h("div", { class: "rechnen-kopf" });
  const buehne = h("div", {});
  fuelle(ziel, h("a", { class: "zurueck", href: link(fach) }, "← Alle Themen"), kopf, buehne);

  function zeichneKopf(thema) {
    fuelle(kopf,
      h("h1", {}, thema.icon, " ", thema.titel),
      h("p", { class: "hinweis" }, mix ? "Gemischt · " : "", `Sitzung ${thema.sitzung}`,
        bilanz.aufgaben ? ` · In dieser Runde: ${bilanz.aufgaben} Aufgaben, ${bilanz.richtig} von ${bilanz.schritte} Schritten richtig` : ""));
  }

  function neueAufgabe() {
    const thema = mix ? wahl(themen.filter(t => t !== letztes)) : themen.find(t => t.id === themaId);
    letztes = thema;
    zeichneKopf(thema);
    const a = thema.neu();
    let i = 0, richtig = 0;
    const liste = h("ol", { class: "rechen-schritte" });
    const fuss = h("div", { class: "rechen-fuss" });

    function zeigeSchritt() {
      const st = a.schritte[i];
      const zeile = h("li", { class: "rechen-schritt aktiv" });
      const ergebnis = h("div", { class: "rechen-ergebnis" });
      const gerundet = st.wert != null && Math.abs(st.wert - runde(st.wert, st.stellen)) > 1e-9;
      const frage = h("div", { class: "rechen-frage" }, fmt(st.frage), gerundet ? h("small", { class: "hinweis" }, ` (auf ${st.stellen} Nachkommastellen runden)`) : null);

      const fertig = (ok, deine) => {
        zeile.classList.remove("aktiv");
        zeile.classList.add(ok ? "ok" : "nok");
        if (ok) richtig++;
        fuelle(ergebnis,
          h("strong", { class: ok ? "gut" : "fehlerliste" }, ok ? "✓ Richtig" : `✗ Lösung: ${st.optionen ? st.loesung : zahl(st.wert, st.stellen)}`),
          !ok && deine != null ? h("span", { class: "hinweis" }, ` (deine Antwort: ${deine})`) : null,
          fmt(st.erklaerung, "div", "rechen-weg"));
        i++;
        if (i < a.schritte.length) zeigeSchritt();
        else abschliessen();
      };

      if (st.optionen) {
        const knoepfe = st.optionen.map(o => h("button", {
          type: "button", class: "chip", onclick: () => {
            knoepfe.forEach(k => { k.disabled = true; if (k.textContent === st.loesung) k.classList.add("richtig"); });
            if (o !== st.loesung) knoepfe.find(k => k.textContent === o).classList.add("falsch");
            fertig(o === st.loesung);
          }
        }, o));
        zeile.append(frage, h("div", { class: "rechen-wahl" }, knoepfe), ergebnis);
        liste.append(zeile);
        knoepfe[0].focus({ preventScroll: true });
      } else {
        const feld = h("input", { type: "text", inputmode: "decimal", autocomplete: "off", class: "text-feld rechen-feld", "aria-label": st.frage, placeholder: "Ergebnis" });
        const pruefen = () => {
          const v = leseZahl(feld.value);
          if (Number.isNaN(v)) { fuelle(ergebnis, h("span", { class: "hinweis" }, "Bitte eine Zahl eingeben, z. B. 0,35 oder 7/20.")); feld.focus(); return; }
          const tol = st.toleranz ?? (0.5 * 10 ** -st.stellen + 1e-9);
          const ok = Math.abs(v - st.wert) <= tol;
          feld.disabled = true; knopf.disabled = true;
          feld.classList.add(ok ? "richtig" : "falsch");
          fertig(ok, feld.value.trim());
        };
        const knopf = h("button", { type: "button", class: "knopf haupt", onclick: pruefen }, "Prüfen");
        feld.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); pruefen(); } });
        zeile.append(frage, h("div", { class: "rechen-eingabe" }, feld, knopf), ergebnis);
        liste.append(zeile);
        feld.focus({ preventScroll: true });
      }
      zeile.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    function abschliessen() {
      bilanz.aufgaben++; bilanz.richtig += richtig; bilanz.schritte += a.schritte.length;
      merke(thema.id, richtig, a.schritte.length);
      zeichneKopf(thema);
      const weiter = h("button", { type: "button", class: "knopf haupt gross", onclick: neueAufgabe }, "Nächste Aufgabe ▶");
      fuelle(fuss,
        h("div", { class: "ergebnis-zeile " + (richtig === a.schritte.length ? "voll" : richtig ? "teil" : "null") },
          `${richtig} von ${a.schritte.length} Schritten richtig`),
        weiter);
      weiter.focus({ preventScroll: true });
      fuss.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    fuelle(buehne,
      h("section", { class: "panel rechen-aufgabe" },
        fmt(a.text, "p", "rechen-text"),
        a.tabelle ? h("div", { class: "tabelle-rahmen" }, h("table", { class: "tabelle rechen-tabelle" },
          h("thead", {}, h("tr", {}, a.tabelle.kopf.map(k => h("th", {}, k)))),
          h("tbody", {}, a.tabelle.zeilen.map(z => h("tr", {}, z.map(c => h("td", {}, c))))))) : null,
        h("details", { class: "rechen-schema" }, h("summary", {}, "📋 Schema anzeigen"),
          h("ol", {}, thema.schema.map(s => fmt(s, "li")))),
        liste, fuss));
    zeigeSchritt();
    window.scrollTo(0, 0);
  }

  neueAufgabe();
  return true;
}

// Für den Selbsttest: jede Aufgabe muss erzeugbar sein und stimmige Schritte haben
export function testeRechnen(durchlaeufe = 200) {
  const fehler = [];
  for (const [fach, themen] of Object.entries(RECHEN_FAECHER)) for (const t of themen) for (let n = 0; n < durchlaeufe; n++) {
    try {
      const a = t.neu();
      if (!a.text || !a.schritte?.length) throw new Error("leer");
      for (const st of a.schritte) {
        if (st.optionen ? !st.optionen.includes(st.loesung) : !Number.isFinite(st.wert)) throw new Error("Schritt kaputt: " + st.frage);
        if (!st.erklaerung || /NaN|undefined|Infinity/.test(st.erklaerung + st.frage + a.text)) throw new Error("Text kaputt: " + st.frage + " / " + st.erklaerung);
      }
    } catch (e) { fehler.push(`${fach}/${t.id}: ${e.message}`); if (fehler.length > 20) return fehler; }
  }
  return fehler;
}
