// ---------- Die 16 Aufgabentypen: Anzeige und Bewertung ----------
// Jeder Typ hat ui(a, st, gesperrt, neu) -> Element und bruch(a, st) -> 0..1 (null = Selbstbewertung offen).
// st ist der Antwortzustand einer Aufgabe; gesperrt = Lösung wird angezeigt.

import { h, fmt, mische, passt, runde05, zahl, fuelle } from "./util.js";
import { istMathe, zeichenLeiste } from "./zeichen.js";

export const TYP_NAMEN = {
  single: "Single Choice",
  multi: "Multiple Choice",
  richtigfalsch: "Richtig oder falsch?",
  lueckentext: "Lückentext",
  zuordnung: "Zuordnung",
  reihenfolge: "Reihenfolge",
  kurzfrage: "Kurzfrage",
  begriff: "Begriff gesucht",
  wasPasstNicht: "Was passt nicht?",
  fehler: "Fehler finden",
  tabelle: "Tabelle ausfüllen",
  zitat: "Wer hat’s gesagt?",
  beispiel: "Beispiel zuordnen",
  definition: "Definition",
  offen: "Offene Frage",
  fall: "Fallgeschichte"
};

export const SELBST = new Set(["definition", "offen", "fall"]);
const NACHBESSERBAR = new Set(["kurzfrage", "begriff", "lueckentext", "tabelle"]);

// ---------- Auswahl mit einer richtigen Antwort ----------
function einzelwahl(a, st, gesperrt, neu) {
  st.reihe ??= a.mischen === false ? a.optionen.map((_, i) => i) : mische(a.optionen.map((_, i) => i));
  return h("div", { class: "optionen", role: "radiogroup" },
    st.reihe.map(i => {
      let cls = "option";
      if (st.wahl === i) cls += " gewaehlt";
      if (gesperrt && i === a.loesung) cls += " richtig";
      else if (gesperrt && st.wahl === i) cls += " falsch";
      return h("button", {
        type: "button", class: cls, role: "radio", "aria-checked": String(st.wahl === i), disabled: gesperrt,
        onclick: () => { st.wahl = i; neu(); }
      }, h("span", { class: "punkt" }), fmt(a.optionen[i]));
    }));
}
const einzelBruch = (a, st) => (st.wahl === a.loesung ? 1 : 0);

const TYPEN = {
  single: { ui: einzelwahl, bruch: einzelBruch },
  wasPasstNicht: { ui: einzelwahl, bruch: einzelBruch },
  zitat: {
    ui: (a, st, g, neu) => h("div", {}, fmt(a.zitat, "blockquote", "zitat"), einzelwahl(a, st, g, neu)),
    bruch: einzelBruch
  },

  // ---------- Mehrfachauswahl ----------
  multi: {
    ui(a, st, gesperrt, neu) {
      st.wahl ??= new Set();
      st.reihe ??= a.mischen === false ? a.optionen.map((_, i) => i) : mische(a.optionen.map((_, i) => i));
      const richtig = new Set(a.loesung);
      return h("div", {},
        h("p", { class: "hinweis" }, "Mehrere Antworten können richtig sein."),
        h("div", { class: "optionen" }, st.reihe.map(i => {
          const an = st.wahl.has(i);
          let cls = "option eckig" + (an ? " gewaehlt" : "");
          let notiz = null;
          if (gesperrt) {
            if (richtig.has(i)) { cls += " richtig"; if (!an) notiz = "übersehen"; }
            else if (an) cls += " falsch";
          }
          return h("button", {
            type: "button", class: cls, role: "checkbox", "aria-checked": String(an), disabled: gesperrt,
            onclick: () => { an ? st.wahl.delete(i) : st.wahl.add(i); neu(); }
          }, h("span", { class: "punkt" }), fmt(a.optionen[i]), notiz && h("em", { class: "notiz" }, notiz));
        })));
    },
    bruch(a, st) {
      const richtig = new Set(a.loesung);
      const wahl = [...(st.wahl || [])];
      const treffer = wahl.filter(i => richtig.has(i)).length;
      const daneben = wahl.length - treffer;
      return Math.max(0, (treffer - daneben) / richtig.size);
    }
  },

  // ---------- Richtig / Falsch mit Begründung ----------
  richtigfalsch: {
    ui(a, st, gesperrt, neu) {
      st.urteil ??= [];
      st.begr ??= [];
      return h("div", { class: "aussagen" }, a.aussagen.map((s, i) => {
        const u = st.urteil[i];
        const knopf = (wert, text) => {
          let cls = "rf-knopf" + (u === wert ? " gewaehlt" : "");
          if (gesperrt && s.richtig === wert) cls += " richtig";
          else if (gesperrt && u === wert) cls += " falsch";
          return h("button", { type: "button", class: cls, disabled: gesperrt, onclick: () => { st.urteil[i] = wert; neu(); } }, text);
        };
        const korrekt = u === s.richtig;
        return h("div", { class: "aussage" + (gesperrt ? (korrekt ? " ist-richtig" : " ist-falsch") : "") },
          fmt(s.text, "p", "aussage-text"),
          h("div", { class: "rf-knoepfe" }, knopf(true, "richtig"), knopf(false, "falsch")),
          gesperrt
            ? h("div", { class: "aussage-loesung" },
                h("strong", {}, s.richtig ? "Die Aussage ist richtig. " : "Die Aussage ist falsch. "),
                fmt(s.begruendung),
                st.begr[i] ? h("p", { class: "deine" }, "Deine Begründung: ", st.begr[i]) : null)
            : null);
      }));
    },
    bruch: (a, st) => a.aussagen.filter((s, i) => (st.urteil || [])[i] === s.richtig).length / a.aussagen.length
  },

  // ---------- Lückentext (tolerant) ----------
  lueckentext: {
    ui(a, st, gesperrt) {
      st.werte ??= [];
      const ok = gesperrt ? lueckenOk(a, st.werte) : [];
      const teile = a.text.split("{}");
      const felder = [];
      const absatz = h("p", { class: "lueckentext" });
      teile.forEach((t, i) => {
        absatz.append(fmt(t));
        if (i === teile.length - 1) return;
        const laenge = Math.max(6, ...a.luecken[i].map(x => x.length)) + 1;
        const feld = h("input", {
          type: "text", class: "luecke" + (gesperrt ? (ok[i] || st.override ? " richtig" : " falsch") : ""),
          size: Math.min(laenge, 28), value: st.werte[i] || "", disabled: gesperrt, autocomplete: "off",
          autocapitalize: "off", spellcheck: "false", "aria-label": `Lücke ${i + 1}`,
          oninput: e => (st.werte[i] = e.target.value), onfocus: () => (st.fokus = i)
        });
        felder.push(feld);
        absatz.append(feld);
        if (gesperrt && !ok[i] && !st.override) absatz.append(h("span", { class: "korrektur" }, "→ " + a.luecken[i][0]));
      });
      const teilen = [absatz];
      if (gesperrt && a.gruppen?.length) teilen.push(h("p", { class: "hinweis" }, "Bei zusammengehörigen Lücken ist die Reihenfolge egal."));
      if (a.wortbank && !gesperrt) {
        st.bank ??= mische([...a.luecken.map(l => l[0]), ...(a.ablenker || [])]);
        teilen.unshift(h("div", { class: "wortbank" }, h("span", { class: "hinweis" }, "Tippe ein Wort an, um es einzusetzen:"),
          st.bank.map(w => h("button", {
            type: "button", class: "chip", onclick: () => {
              let i = st.fokus;
              if (i == null || st.werte[i]) i = felder.findIndex((_, j) => !st.werte[j]);
              if (i < 0) i = st.fokus ?? 0;
              st.werte[i] = w;
              felder[i].value = w;
              const naechstes = felder.findIndex((_, j) => !st.werte[j]);
              st.fokus = naechstes >= 0 ? naechstes : i;
            }
          }, w))));
      }
      return h("div", {}, teilen);
    },
    bruch(a, st) {
      if (st.override) return 1;
      const ok = lueckenOk(a, st.werte || []);
      return ok.filter(Boolean).length / ok.length;
    }
  },

  // ---------- Zuordnung (Paare) ----------
  zuordnung: {
    // Erst links anklicken, dann rechts das Passende – wie ein Paare-Spiel
    ui(a, st, gesperrt, neu) {
      st.wahl ??= [];
      st.reihe ??= mische(a.paare.map((_, i) => i));
      st.optionen ??= mische([...new Set(a.paare.map(p => p.rechts))]);
      if (st.aktiv == null) st.aktiv = st.reihe.find(i => !st.wahl[i]) ?? null;
      if (gesperrt) {
        return h("div", { class: "zuordnung" }, st.reihe.map(i => {
          const p = a.paare[i];
          const korrekt = st.wahl[i] === p.rechts;
          return h("div", { class: "zuo-zeile fertig " + (korrekt ? "ist-richtig" : "ist-falsch") },
            fmt(p.links, "div", "zuo-links"),
            h("div", { class: "zuo-rechts" }, fmt(p.rechts)),
            !korrekt && st.wahl[i] ? h("div", { class: "korrektur" }, "Du hattest: " + st.wahl[i]) : null);
        }));
      }
      return h("div", { class: "paare" },
        h("div", { class: "paare-links" }, st.reihe.map(i => h("button", {
          type: "button", class: "paar-knopf" + (st.aktiv === i ? " aktiv" : "") + (st.wahl[i] ? " belegt" : ""),
          onclick: () => { st.aktiv = i; neu(); }
        }, fmt(a.paare[i].links, "span"), st.wahl[i] ? h("small", {}, "→ " + st.wahl[i]) : null))),
        h("div", { class: "paare-rechts" }, st.optionen.map(o => h("button", {
          type: "button", class: "paar-knopf ziel" + (st.wahl.includes(o) ? " benutzt" : ""),
          onclick: () => {
            if (st.aktiv == null) return;
            st.wahl[st.aktiv] = o;
            st.aktiv = st.reihe.find(i => !st.wahl[i]) ?? null;
            neu();
          }
        }, fmt(o)))));
    },
    bruch: (a, st) => a.paare.filter((p, i) => (st.wahl || [])[i] === p.rechts).length / a.paare.length
  },

  // ---------- Beispiel zuordnen (Kategorien) ----------
  beispiel: {
    ui(a, st, gesperrt, neu) {
      st.wahl ??= [];
      st.reihe ??= mische(a.items.map((_, i) => i));
      return h("div", { class: "beispiele" },
        h("p", { class: "hinweis" }, "Ordne jedes Beispiel einer Kategorie zu."),
        st.reihe.map(i => {
          const it = a.items[i];
          const korrekt = st.wahl[i] === it.kategorie;
          return h("div", { class: "bsp-zeile" + (gesperrt ? (korrekt ? " ist-richtig" : " ist-falsch") : "") },
            fmt(it.text, "div", "bsp-text"),
            h("div", { class: "bsp-kats" }, a.kategorien.map((k, j) => {
              let cls = "chip" + (st.wahl[i] === j ? " gewaehlt" : "");
              if (gesperrt && j === it.kategorie) cls += " richtig";
              else if (gesperrt && st.wahl[i] === j) cls += " falsch";
              return h("button", { type: "button", class: cls, disabled: gesperrt, onclick: () => { st.wahl[i] = j; neu(); } }, k);
            })),
            gesperrt && it.hinweis ? fmt(it.hinweis, "div", "hinweis") : null);
        }));
    },
    bruch: (a, st) => a.items.filter((it, i) => (st.wahl || [])[i] === it.kategorie).length / a.items.length
  },

  // ---------- Reihenfolge ----------
  reihenfolge: {
    ui(a, st, gesperrt, neu) {
      if (!st.ord) {
        const n = a.elemente.length;
        let ord;
        do ord = mische([...Array(n).keys()]); while (ord.every((v, i) => v === i));
        st.ord = ord;
      }
      const tausche = (i, j) => { [st.ord[i], st.ord[j]] = [st.ord[j], st.ord[i]]; st.bewegt = true; neu(); };
      return h("div", {},
        h("p", { class: "hinweis" }, gesperrt ? "Die Zahl rechts zeigt die richtige Position." : "Verschiebe die Einträge mit den Pfeilen."),
        h("ol", { class: "reihe" }, st.ord.map((el, pos) => {
          const korrekt = el === pos;
          return h("li", { class: "reihe-el" + (gesperrt ? (korrekt ? " ist-richtig" : " ist-falsch") : "") },
            h("span", { class: "reihe-nr" }, pos + 1),
            fmt(a.elemente[el], "span", "reihe-text"),
            gesperrt
              ? h("span", { class: "reihe-soll" }, korrekt ? "✓" : "→ " + (el + 1))
              : h("span", { class: "reihe-knoepfe" },
                  h("button", { type: "button", class: "mini", disabled: pos === 0, "aria-label": "nach oben", onclick: () => tausche(pos, pos - 1) }, "▲"),
                  h("button", { type: "button", class: "mini", disabled: pos === st.ord.length - 1, "aria-label": "nach unten", onclick: () => tausche(pos, pos + 1) }, "▼")));
        })),
        gesperrt ? h("details", { class: "loesungsliste" }, h("summary", {}, "Richtige Reihenfolge"),
          h("ol", {}, a.elemente.map(e => fmt(e, "li"))))
          : null);
    },
    bruch: (a, st) => (st.ord || []).filter((el, pos) => el === pos).length / a.elemente.length
  },

  // ---------- Kurzfrage / Begriff gesucht ----------
  kurzfrage: { ui: textEingabe, bruch: textBruch },
  begriff: { ui: textEingabe, bruch: textBruch },

  // ---------- Fehler finden ----------
  fehler: {
    ui(a, st, gesperrt, neu) {
      st.mark ??= new Set();
      const anzahl = a.segmente.filter(s => s.fehler).length;
      const text = h("p", { class: "fehlertext" }, a.segmente.map((s, i) => {
        const an = st.mark.has(i);
        let cls = "segment" + (an ? " markiert" : "");
        if (gesperrt) {
          if (s.fehler) cls += an ? " gefunden" : " uebersehen";
          else if (an) cls += " fehlalarm";
        }
        return [h("button", {
          type: "button", class: cls, disabled: gesperrt, "aria-pressed": String(an),
          onclick: () => { an ? st.mark.delete(i) : st.mark.add(i); neu(); }
        }, s.text), " "];
      }));
      const teile = [h("p", { class: "hinweis" }, `Tippe die ${anzahl === 1 ? "fehlerhafte Stelle" : anzahl + " fehlerhaften Stellen"} an.`), text];
      if (gesperrt) {
        teile.push(h("ul", { class: "korrekturen" }, a.segmente.map((s, i) => s.fehler
          ? h("li", {}, h("strong", {}, st.mark.has(i) ? "✓ gefunden: " : "✗ übersehen: "), "„" + s.text + "“ ", h("br"), "Richtig: ", fmt(s.korrektur))
          : st.mark.has(i) ? h("li", {}, h("strong", {}, "Kein Fehler: "), "„" + s.text + "“ stimmt so.") : null)));
      }
      return h("div", {}, teile);
    },
    bruch(a, st) {
      const mark = st.mark || new Set();
      const fehler = a.segmente.map((s, i) => (s.fehler ? i : -1)).filter(i => i >= 0);
      const treffer = fehler.filter(i => mark.has(i)).length;
      const daneben = mark.size - treffer;
      return Math.max(0, (treffer - daneben) / fehler.length);
    }
  },

  // ---------- Tabelle ausfüllen ----------
  tabelle: {
    ui(a, st, gesperrt) {
      st.werte ??= {};
      return h("div", { class: "tabelle-rahmen" }, h("table", { class: "tabelle" },
        a.kopf ? h("thead", {}, h("tr", {}, a.kopf.map(k => h("th", {}, k)))) : null,
        h("tbody", {}, a.zeilen.map((zeile, r) => h("tr", {}, zeile.map((zelle, c) => {
          const Tag = c === 0 ? "th" : "td";
          if (!zelle || typeof zelle !== "object") return h(Tag, {}, fmt(zelle ?? ""));
          const key = r + "-" + c;
          const ok = passt(st.werte[key], zelle.akzeptiert, { enthalten: true }) || st.override;
          return h(Tag, { class: "zelle-luecke" },
            h("input", {
              type: "text", class: "zelle-feld" + (gesperrt ? (ok ? " richtig" : " falsch") : ""), value: st.werte[key] || "",
              disabled: gesperrt, autocomplete: "off", spellcheck: "false", placeholder: "…", "aria-label": `Zeile ${r + 1}, Spalte ${c + 1}`,
              oninput: e => (st.werte[key] = e.target.value)
            }),
            gesperrt && !ok ? h("div", { class: "korrektur" }, "→ " + zelle.akzeptiert[0]) : null);
        }))))));
    },
    bruch(a, st) {
      if (st.override) return 1;
      let gesamt = 0, ok = 0;
      a.zeilen.forEach((zeile, r) => zeile.forEach((zelle, c) => {
        if (!zelle || typeof zelle !== "object") return;
        gesamt++;
        if (passt((st.werte || {})[r + "-" + c], zelle.akzeptiert, { enthalten: true })) ok++;
      }));
      return gesamt ? ok / gesamt : 0;
    }
  },

  // ---------- Offene Aufgaben (Selbstbewertung) ----------
  definition: { ui: offeneEingabe, bruch: selbstBruch },
  offen: { ui: offeneEingabe, bruch: selbstBruch },
  fall: { ui: offeneEingabe, bruch: selbstBruch }
};

function lueckenOk(a, werte) {
  const ok = a.luecken.map((akz, i) => passt(werte[i], akz));
  for (const gruppe of a.gruppen || []) {
    const frei = [...gruppe];
    for (const i of gruppe) {
      ok[i] = false;
      const j = frei.find(j => passt(werte[i], a.luecken[j]));
      if (j !== undefined) {
        ok[i] = true;
        frei.splice(frei.indexOf(j), 1);
      }
    }
  }
  return ok;
}

function textEingabe(a, st, gesperrt) {
  const ok = textBruch(a, st) === 1;
  const feld = h("input", {
    type: "text", class: "text-feld" + (gesperrt ? (ok ? " richtig" : " falsch") : ""), value: st.text || "",
    disabled: gesperrt, placeholder: "Deine Antwort", autocomplete: "off", spellcheck: "false",
    oninput: e => (st.text = e.target.value)
  });
  return h("div", {}, feld, gesperrt
    ? h("div", { class: "musterloesung" }, h("strong", {}, "Lösung: "), fmt(a.musterloesung || a.akzeptiert[0]))
    : null);
}
function textBruch(a, st) {
  if (st.override) return 1;
  return passt(st.text, a.akzeptiert, { enthalten: true }) ? 1 : 0;
}

function offeneEingabe(a, st, gesperrt) {
  if (gesperrt) {
    return h("div", { class: "deine-antwort" }, h("div", { class: "klein" }, "Deine Antwort"),
      st.text?.trim() ? h("p", {}, st.text) : h("p", { class: "leer" }, "(keine Antwort geschrieben)"));
  }
  return h("textarea", {
    class: "text-gross", rows: a.typ === "definition" ? 4 : 6, placeholder: "Schreib deine Antwort hier …",
    oninput: e => (st.text = e.target.value)
  }, st.text || "");
}
function selbstBruch(a, st) {
  return st.selbst == null ? null : st.selbst / a.punkte;
}

// ---------- Öffentliche Funktionen ----------

export function punkteVon(a, st) {
  if (SELBST.has(a.typ)) return st.selbst ?? null;
  return runde05(TYPEN[a.typ].bruch(a, st) * a.punkte);
}

export function beantwortet(a, st) {
  switch (a.typ) {
    case "multi": return st.wahl?.size > 0;
    case "fehler": return st.mark?.size > 0;
    case "reihenfolge": return !!st.bewegt;
    case "richtigfalsch": return (st.urteil || []).some(u => u != null);
    case "lueckentext": return (st.werte || []).some(v => v?.trim());
    case "tabelle": return Object.values(st.werte || {}).some(v => v?.trim());
    case "zuordnung":
    case "beispiel": return (st.wahl || []).some(v => v != null && v !== "");
    case "kurzfrage": case "begriff": case "definition": case "offen": case "fall": return !!st.text?.trim();
    default: return st.wahl != null;
  }
}

// Antwortzustand, der jede Aufgabe voll richtig löst (für den Testdurchlauf unter „Daten prüfen“)
export function musterAntwort(a) {
  switch (a.typ) {
    case "single": case "wasPasstNicht": case "zitat": return { wahl: a.loesung };
    case "multi": return { wahl: new Set(a.loesung) };
    case "richtigfalsch": return { urteil: a.aussagen.map(s => s.richtig) };
    case "lueckentext": return { werte: a.luecken.map(l => l[0]) };
    case "zuordnung": return { wahl: a.paare.map(p => p.rechts) };
    case "beispiel": return { wahl: a.items.map(it => it.kategorie) };
    case "reihenfolge": return { ord: a.elemente.map((_, i) => i), bewegt: true };
    case "kurzfrage": case "begriff": return { text: a.akzeptiert[0] };
    case "fehler": return { mark: new Set(a.segmente.flatMap((s, i) => (s.fehler ? [i] : []))) };
    case "tabelle": {
      const werte = {};
      a.zeilen.forEach((z, r) => z.forEach((c, k) => { if (c && typeof c === "object") werte[r + "-" + k] = c.akzeptiert[0]; }));
      return { werte };
    }
    default: return { selbst: a.punkte, text: "Test" };
  }
}

// Baut die komplette Aufgabenkarte. opts: { gesperrt, nurLesen, onAenderung, kapitelTitel, nummer }
// nurLesen: Rückblick nach der Runde – Lösung zeigen, aber nichts mehr ändern lassen
export function aufgabeKarte(a, st, opts = {}) {
  const karte = h("article", { class: "aufgabe", "data-typ": a.typ });
  // Enter in einem Textfeld = „Prüfen“ (die Runde hört auf das Ereignis „enter“)
  karte.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.matches("input[type=text]")) {
      e.preventDefault();
      karte.dispatchEvent(new CustomEvent("enter", { bubbles: true }));
    }
  });
  // Mathe-Fächer: Leiste mit Sonderzeichen unter den Textfeldern
  const leiste = istMathe(a.id) ? zeichenLeiste(karte) : null;
  const zeichne = () => {
    const ui = TYPEN[a.typ].ui(a, st, !!opts.gesperrt, zeichne);
    const hatText = ui?.matches?.("input[type=text], textarea") || ui?.querySelector?.("input[type=text], textarea");
    fuelle(karte,
      kopf(a, opts),
      opts.thema ? h("div", { class: "aufgabe-thema", title: "Aus diesem Thema stammt die Frage" }, "📍 ", opts.thema) : null,
      a.typ === "fall" ? h("div", { class: "fall-box" }, h("div", { class: "klein" }, "Fall"), fmt(a.fall, "p")) : null,
      fmt(a.frage || (a.typ === "zitat" ? "Wer hat’s gesagt?" : ""), "h3", "frage"),
      ui,
      leiste && hatText && !opts.gesperrt ? leiste : null,
      opts.gesperrt ? loesungsTeil(a, st, zeichne, !!opts.nurLesen) : null
    );
    opts.onAenderung?.();
  };
  zeichne();
  return karte;
}

function kopf(a, opts) {
  return h("div", { class: "aufgabe-kopf" },
    opts.nummer ? h("span", { class: "nr" }, opts.nummer) : null,
    h("span", { class: "typ" }, TYP_NAMEN[a.typ]),
    a.ab ? h("span", { class: "etikett ab", title: "Frage aus dem Arbeitsblatt" }, "[AB]") : null,
    opts.wiederholung ? h("span", { class: "etikett wdh", title: "Kommt wieder, weil es noch nicht saß oder wieder fällig ist" }, "↺ Wiederholung") : null,
    a.pruefen ? h("span", { class: "etikett pruefen", title: "Lösung nicht eindeutig – bitte gegen das Dokument prüfen" }, "⚠ prüfen") : null,
    opts.mitPunkten ? h("span", { class: "pkt" }, zahl(a.punkte) + " P.") : null,
    opts.gemeldet
      ? h("span", { class: "etikett gemeldet" }, opts.gemeldet === true ? "⚑ gemeldet" : opts.gemeldet)
      : opts.melden ? h("button", { type: "button", class: "melden-knopf", title: "Stimmt etwas mit dieser Frage nicht? Melde sie, dann wird sie ausgeblendet und geprüft.", onclick: opts.melden }, "⚑ Melden") : null);
}

function loesungsTeil(a, st, zeichne, nurLesen = false) {
  const teile = [];
  if (SELBST.has(a.typ)) {
    teile.push(h("div", { class: "musterloesung" }, h("strong", {}, "Musterlösung: "), fmt(a.musterloesung)));
    st.kp ??= new Set();
    teile.push(h("div", { class: "kernpunkte" },
      h("div", { class: "klein" }, nurLesen ? "Erwartete Kernpunkte (abgehakt = hattest du drin):" : "Erwartete Kernpunkte – hake ab, was du drin hattest:"),
      a.kernpunkte.map((k, i) => h("label", { class: "kp" },
        h("input", {
          type: "checkbox", checked: st.kp.has(i), disabled: nurLesen, onchange: e => {
            e.target.checked ? st.kp.add(i) : st.kp.delete(i);
            st.selbst = runde05((a.punkte * st.kp.size) / a.kernpunkte.length);
            zeichne();
          }
        }), fmt(k)))));
    const stufen = [];
    for (let p = 0; p <= a.punkte + 1e-9; p += 0.5) stufen.push(p);
    teile.push(h("div", { class: "selbst" },
      h("div", { class: "klein" }, "Deine Selbstbewertung:"),
      h("div", { class: "stufen" }, stufen.map(p => h("button", {
        type: "button", class: "stufe" + (st.selbst === p ? " gewaehlt" : ""), disabled: nurLesen,
        onclick: () => { st.selbst = p; zeichne(); }
      }, zahl(p)))),
      h("div", { class: "selbst-stand" }, st.selbst == null ? "Noch nicht bewertet" : `${zahl(st.selbst)} von ${zahl(a.punkte)} Punkten`)));
  } else {
    const p = punkteVon(a, st);
    const cls = p >= a.punkte ? "voll" : p > 0 ? "teil" : "null";
    teile.push(h("div", { class: "ergebnis-zeile " + cls },
      p >= a.punkte ? "✓ Richtig! " : p > 0 ? "◐ Teilweise richtig. " : "✗ Leider nicht richtig. ",
      h("strong", {}, `${zahl(p)} / ${zahl(a.punkte)} P.`)));
    if (NACHBESSERBAR.has(a.typ) && p < a.punkte && !st.override && !nurLesen) {
      teile.push(h("button", {
        type: "button", class: "link-knopf", onclick: () => { st.override = true; zeichne(); }
      }, "Meine Antwort meint dasselbe – als richtig werten"));
    }
  }
  if (a.erklaerung) teile.push(h("div", { class: "erklaerung" }, h("strong", {}, "Begründung: "), fmt(a.erklaerung)));
  // Immer dabei: der Kern des Wissenspunkts, damit man auch aus richtigen Antworten lernt
  if (a.merke) teile.push(h("div", { class: "merke" }, h("strong", {}, "💡 Merke: "), fmt(a.merke)));
  return h("div", { class: "loesung" }, teile);
}
