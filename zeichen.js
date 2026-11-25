// ---------- Zeichenleiste für Mathe-Fächer ----------
// Sonderzeichen, die nicht auf der Tastatur sind, per Klick ins zuletzt benutzte Textfeld einfügen.

import { h } from "./util.js";
import { K } from "./katalog.js";

export const MATHE_FAECHER = new Set(["Statistik 2"]);

const GRUPPEN = [
  [["Ω", "Ergebnismenge Omega"], ["ω", "Ergebnis omega"], ["∅", "leere Menge"], ["∩", "geschnitten (Schnittmenge)"],
   ["∪", "vereinigt (Vereinigungsmenge)"], ["⊂", "Teilmenge"], ["∈", "Element von"], ["∉", "kein Element von"]],
  [["≤", "kleiner gleich"], ["≥", "größer gleich"], ["≠", "ungleich"], ["≈", "ungefähr"]],
  [["·", "mal"], ["−", "minus"], ["²", "hoch 2"], ["√", "Wurzel"], ["Σ", "Summe"], ["∞", "unendlich"]],
  [["μ", "mü (Erwartungswert)"], ["σ", "sigma (Standardabweichung)"], ["σ²", "sigma Quadrat (Varianz)"]],
  [["₁", "tiefgestellt 1"], ["₂", "tiefgestellt 2"], ["ᵢ", "tiefgestellt i"], ["ₖ", "tiefgestellt k"], ["ₙ", "tiefgestellt n"]]
];

// Gehört die Aufgabe (auch Arbeitsblatt/Probeklausur) zu einem Mathe-Fach?
export function istMathe(formId) {
  const e = K.formen.get(formId);
  return (e?.wissen || []).some(w => MATHE_FAECHER.has(K.wissen.get(w)?.doc.fach));
}

// bereich: Element mit den Textfeldern. Die Leiste merkt sich das zuletzt fokussierte Feld.
export function zeichenLeiste(bereich) {
  let ziel = null;
  bereich.addEventListener("focusin", e => { if (e.target.matches("input[type=text], textarea")) ziel = e.target; });
  const setze = z => {
    const f = ziel && bereich.contains(ziel) && !ziel.disabled
      ? ziel : bereich.querySelector("input[type=text]:not(:disabled), textarea:not(:disabled)");
    if (!f) return;
    const von = f.selectionStart ?? f.value.length, bis = f.selectionEnd ?? von;
    f.setRangeText(z, von, bis, "end");
    f.dispatchEvent(new Event("input", { bubbles: true }));
    f.focus();
  };
  return h("div", { class: "zeichen-leiste", role: "group", "aria-label": "Sonderzeichen einfügen" },
    GRUPPEN.map(g => h("span", { class: "zeichen-gruppe" }, g.map(([z, name]) =>
      // pointerdown abfangen, damit das Textfeld den Fokus (und die Cursorposition) behält
      h("button", { type: "button", class: "zeichen", title: name, "aria-label": name,
        onpointerdown: e => e.preventDefault(), onclick: () => setze(z) }, z)))));
}
