// ---------- Eine Spielrunde: Level, Boss, Mission, Blitzrunde, Endlos, Arbeitsblatt ----------
// Falsches kommt wenige Fragen später in einer anderen Form wieder, bis es sitzt.

import { h, fmt, fuelle, neueId } from "./util.js";
import { aufgabeKarte, beantwortet, punkteVon, SELBST } from "./aufgaben.js";
import { K } from "./katalog.js";
import { S, instanziere, waehleForm, merkeAntwort, merkeLauf, rang, erreichteErfolge, ERFOLGE, pfadVon, infoAn, INFO_MODI } from "./spiel.js";
import { meldeDialog, versteckt } from "./meldungen.js";

// ---------- Kleine Effekte ----------
function ton(art) {
  try {
    if (localStorage.getItem("ls-ton") !== "an") return;
    const ctx = (ton.ctx ??= new AudioContext());
    const folge = { gut: [523, 784], schlecht: [220, 165], sieg: [523, 659, 784, 1047] }[art];
    folge.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f;
      o.type = "triangle";
      g.gain.setValueAtTime(0.09, ctx.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.1);
      o.stop(ctx.currentTime + i * 0.1 + 0.2);
    });
  } catch { /* ohne Ton geht es auch */ }
}

export function konfetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const farben = ["#ffc53d", "#7c4dff", "#22c55e", "#f43f5e", "#38bdf8"];
  const box = h("div", { class: "konfetti", "aria-hidden": "true" });
  for (let i = 0; i < 70; i++) {
    const s = h("span", {});
    s.style.left = Math.random() * 100 + "%";
    s.style.background = farben[i % farben.length];
    s.style.animationDelay = Math.random() * 0.6 + "s";
    s.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
    box.append(s);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3800);
}

const sterneText = n => "★".repeat(n) + "☆".repeat(3 - n);

// Baut die Runde auf. Gibt eine Aufräumfunktion zurück (für den Seitenwechsel).
export function spieleRunde(wurzel, def) {
  const laufId = neueId();
  const start = Date.now();
  const warteschlange = [...def.plan];
  const warteliste = [];        // { item, in }: kommt erst nach „in“ weiteren Fragen
  const ersteQuoten = [];
  const benutzt = new Map();    // Wissenspunkt -> schon benutzte Formen in dieser Runde
  const nachgelegt = new Map(); // Wissenspunkt -> wie oft schon wiederholt
  const zuletzt = [];
  const rangVorher = rang().stufe;
  const erfolgeVorher = erreichteErfolge();
  let erledigt = 0, combo = 0, bestCombo = 0, xp = 0, volle = 0;
  let herzen = def.herzen || 0, herzVerlust = false;
  const bossHp = def.art === "boss" ? def.plan.length : 0;
  let schaden = 0;
  let aktuell = null;
  let beendet = false;
  let uhr = null;
  const mitInfo = INFO_MODI.has(def.art) && infoAn();
  const infoGezeigt = new Set(); // Wissenspunkte, deren Infoblock in dieser Runde schon kam
  const verlauf = [];            // alle beantworteten Fragen der Runde, für den Rückblick am Ende

  const kopf = h("div", { class: "runde-kopf" });
  const buehne = h("div", { class: "buehne" });
  const fuss = h("div", { class: "runde-fuss" });
  const rahmen = h("section", { class: "runde" + (def.art === "boss" ? " ist-boss" : "") }, kopf, buehne, fuss);
  fuelle(wurzel, rahmen);

  if (!def.endlos && !warteschlange.length) return leer();

  function leer() {
    fuelle(wurzel, h("section", { class: "ergebnis" },
      h("div", { class: "ergebnis-icon" }, "🌤️"),
      h("h1", {}, def.art === "schwaechen" ? "Keine Schwächen gefunden" : "Gerade ist nichts dran"),
      h("p", {}, def.art === "schwaechen"
        ? "Alles, was du schon gespielt hast, liegt über 67 %. Spiel neue Level oder trainiere im Endlos-Modus."
        : "Heute ist nichts fällig. Wenn etwas wieder dran ist, wartet es hier auf dich."),
      h("a", { class: "knopf", href: "#/" }, "Zur Übersicht")));
    return () => {};
  }

  function zeichneKopf() {
    const rest = warteschlange.length + warteliste.length + (aktuell ? 1 : 0);
    const anteil = def.endlos ? null : erledigt / Math.max(1, erledigt + rest);
    fuelle(kopf,
      h("a", { class: "schliessen", href: def.zurueck || "#/", title: "Runde verlassen – deine Antworten sind gespeichert", "aria-label": "Runde verlassen", onclick: verlassen }, "✕"),
      anteil == null
        ? h("div", { class: "zaehler" }, `${erledigt} Fragen · ${xp} XP`)
        : h("div", { class: "balken", role: "progressbar", "aria-valuenow": Math.round(anteil * 100), "aria-valuemin": 0, "aria-valuemax": 100 },
            h("span", { style: `width:${anteil * 100}%` })),
      def.stoppuhr ? h("div", { class: "uhr", id: "stoppuhr" }, zeitText()) : null,
      combo >= 2 ? h("div", { class: "combo", title: "Richtige in Folge" }, "🔥 " + combo) : null,
      def.art === "boss"
        ? h("div", { class: "herzen" + (herzVerlust ? " wackelt" : ""), "aria-label": `${herzen} Herzen übrig` }, "❤️".repeat(herzen) + "🖤".repeat(def.herzen - herzen))
        : null);
    herzVerlust = false;
  }
  const zeitText = () => {
    const s = Math.floor((Date.now() - start) / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  if (def.stoppuhr) uhr = setInterval(() => { const e = document.getElementById("stoppuhr"); if (e) e.textContent = zeitText(); }, 1000);

  function holeNaechstes() {
    for (const w of warteliste) w.in--;
    const i = warteliste.findIndex(w => w.in <= 0);
    if (i >= 0) return warteliste.splice(i, 1)[0].item;
    if (warteschlange.length) return warteschlange.shift();
    if (def.endlos) return def.nachschub(zuletzt);
    if (warteliste.length) return warteliste.shift().item;
    return null;
  }

  function naechste() {
    const item = holeNaechstes();
    if (!item) return ende(true);
    if (item.form && versteckt(item.form.id)) return naechste();
    const sperre = benutzt.get(item.wissen) || new Set();
    const form = item.form || waehleForm(item.wissen, { ...item, sperre });
    if (!form) return naechste();
    if (item.wissen) {
      sperre.add(form.id);
      benutzt.set(item.wissen, sperre);
      zuletzt.unshift(item.wissen);
      zuletzt.length = Math.min(zuletzt.length, 3);
    }
    aktuell = { item, form, a: instanziere(form, { kurz: def.kurz }), st: {}, gesperrt: false, wissenDa: false };
    if (mitInfo && item.wissen && !infoGezeigt.has(item.wissen)) {
      infoGezeigt.add(item.wissen);
      aktuell.info = true;
      return zeigeInfo();
    }
    zeigeAufgabe();
  }

  // Infoblock vor der ersten Frage zu einem Wissenspunkt (nur wenn der Schalter an ist)
  function zeigeInfo() {
    zeichneKopf();
    const { w, level } = K.wissen.get(aktuell.item.wissen);
    fuelle(buehne, h("article", { class: "aufgabe infoblock" },
      h("div", { class: "aufgabe-kopf" }, h("span", { class: "typ" }, "📖 Kurz auffrischen"), h("span", {}, level.titel)),
      h("h2", {}, w.titel),
      h("p", { class: "info-text" }, fmt(w.merke)),
      h("p", { class: "hinweis" }, "Lies es in Ruhe durch. Danach kommt eine Frage dazu.")));
    fuelle(fuss,
      h("span", { class: "fuss-hinweis" }),
      h("button", { type: "button", class: "knopf haupt", "data-haupt": "1", onclick: () => { aktuell.info = false; zeigeAufgabe(); } }, "Verstanden – zur Frage"));
    window.scrollTo(0, 0);
  }

  function zeigeAufgabe() {
    zeichneKopf();
    const { a, st, gesperrt, item } = aktuell;
    const bossTeil = def.art === "boss" ? h("div", { class: "boss-leiste" },
      h("span", { class: "boss-figur" + (schaden ? " getroffen" : ""), "aria-hidden": "true" }, "🐉"),
      h("div", { class: "balken boss-hp", title: "Leben des Bosses" }, h("span", { style: `width:${Math.max(0, 100 - (schaden / bossHp) * 100)}%` }))) : null;
    const karte = aufgabeKarte(a, st, {
      gesperrt, wiederholung: item.wiederholung || item.nachFehler, onAenderung: () => zeichneFuss(),
      melden: () => meldeDialog(a, st, ueberspringe)
    });
    fuelle(buehne, bossTeil, karte);
    zeichneFuss();
    if (!gesperrt) buehne.querySelector("input[type=text], textarea")?.focus();
    window.scrollTo(0, 0);
  }

  function zeichneFuss() {
    if (!aktuell) return;
    const { a, st, gesperrt } = aktuell;
    if (!gesperrt) {
      fuelle(fuss,
        h("button", { type: "button", class: "knopf leise", onclick: () => pruefe(true) }, "Weiß ich nicht"),
        h("button", { type: "button", class: "knopf haupt", "data-haupt": "1", onclick: () => pruefe(false) }, "Prüfen"));
    } else {
      const fertig = !SELBST.has(a.typ) || st.selbst != null;
      fuelle(fuss,
        fertig ? h("span", { class: "fuss-hinweis" }) : h("span", { class: "fuss-hinweis" }, "Bewerte dich oben, dann geht’s weiter."),
        h("button", { type: "button", class: "knopf haupt", "data-haupt": "1", disabled: !fertig, onclick: weiter }, "Weiter"));
    }
  }

  function pruefe(weissNicht) {
    const { a, st } = aktuell;
    if (!weissNicht && !beantwortet(a, st)) {
      buehne.querySelector(".aufgabe")?.classList.add("wackeln");
      setTimeout(() => buehne.querySelector(".aufgabe")?.classList.remove("wackeln"), 400);
      return;
    }
    if (weissNicht && SELBST.has(a.typ)) st.selbst = 0;
    aktuell.gesperrt = true;
    if (!SELBST.has(a.typ)) ton(punkteVon(a, st) >= a.punkte ? "gut" : "schlecht");
    zeigeAufgabe();
  }

  // Gemeldete Frage: zählt nicht und wird übersprungen
  function ueberspringe() {
    if (!aktuell || beendet) return;
    aktuell = null;
    naechste();
  }

  async function weiter() {
    const { a, st, form, item } = aktuell;
    const quote = Math.min(1, (punkteVon(a, st) ?? 0) / a.punkte);
    verlauf.push({ a, st, quote, wissen: item.wissen, wdh: !!(item.wiederholung || item.nachFehler) });
    let gewinn = 0;
    if (quote >= 0.999) {
      combo++;
      volle++;
      gewinn = (item.nachFehler ? 5 : 10) + Math.min(combo, 5) * 2;
    } else {
      combo = 0;
      if (quote >= 0.5) gewinn = 4;
    }
    bestCombo = Math.max(bestCombo, combo);
    xp += gewinn;
    erledigt++;
    if (!item.nachFehler) ersteQuoten.push(quote);
    if (gewinn) xpPopup(gewinn);
    await merkeAntwort({ form: form.id, quote, modus: def.art, lauf: laufId, xp: gewinn, combo, mitInfo: infoGezeigt.has(item.wissen) });

    if (def.art === "boss") {
      if (quote < 0.5) { herzen--; herzVerlust = true; } else schaden += quote;
      if (herzen <= 0) { aktuell = null; return ende(false); }
    }
    if (def.wiederholen && quote < 0.67 && item.wissen) {
      const n = nachgelegt.get(item.wissen) || 0;
      if (n < 3) {
        nachgelegt.set(item.wissen, n + 1);
        warteliste.push({ in: 3 + Math.floor(Math.random() * 2), item: { wissen: item.wissen, nachFehler: true, nurKurz: item.nurKurz } });
      }
    }
    aktuell = null;
    naechste();
  }

  function xpPopup(n) {
    const p = h("div", { class: "xp-popup" }, "+" + n + " XP");
    rahmen.append(p);
    setTimeout(() => p.remove(), 900);
  }

  function verlassen() {
    if (def.endlos && erledigt) merkeLauf({ art: "endlos", ziel: def.ziel, anzahl: erledigt, xp: 0, quote: volle / erledigt, bestCombo });
  }

  async function ende(durch) {
    beendet = true;
    clearInterval(uhr);
    aktuell = null;
    const schnitt = ersteQuoten.length ? ersteQuoten.reduce((a, b) => a + b, 0) / ersteQuoten.length : 0;
    const geschafft = def.art === "boss" ? durch : true;
    let sterne = schnitt >= 0.9 ? 3 : schnitt >= 0.67 ? 2 : 1;
    if (def.art === "boss") sterne = geschafft ? herzen : 0;
    const dauer = Date.now() - start;
    const bonus = { level: sterne * 10, boss: geschafft ? 50 : 0, mission: 20, schwaechen: 20, blitz: volle * 2, arbeitsblatt: 30 }[def.art] || 0;
    const vorherBeste = def.art === "blitz" ? beste(def.ziel) : null;
    await merkeLauf({ art: def.art, ziel: def.ziel, sterne, geschafft, xp: bonus, quote: schnitt, dauer, anzahl: erledigt, volle });
    zeigeErgebnis({ sterne, geschafft, bonus, schnitt, dauer, vorherBeste });
  }

  const beste = ziel => S.laeufe.filter(l => l.ziel === ziel).reduce((m, l) => Math.max(m, l.volle || 0), 0);

  function naechsteStation() {
    const eintrag = def.art === "level" ? K.level.get(def.ziel) : def.art === "boss" ? K.welten.get(def.ziel) : null;
    if (!eintrag) return null;
    const pfad = pfadVon(eintrag.doc);
    const i = pfad.findIndex(s => s.id === def.ziel);
    const s = pfad[i + 1];
    if (s) return { text: s.art === "boss" ? "Zum Boss" : "Nächstes Level", link: `#/spiel/${s.art}/${s.id}` };
    if (eintrag.doc.arbeitsblatt?.aufgaben?.length) return { text: "Zum Arbeitsblatt-Boss", link: `#/spiel/arbeitsblatt/${eintrag.doc.id}` };
    return eintrag.doc.probeklausur ? { text: "Zur Probeklausur", link: `#/klausur/${eintrag.doc.id}` } : null;
  }

  function zeigeErgebnis({ sterne, geschafft, bonus, schnitt, dauer, vorherBeste }) {
    const zurueck = def.zurueck || "#/";
    const naechste = geschafft ? naechsteStation() : null;
    const sek = Math.round(dauer / 1000);
    const neuRang = rang();
    const neueErfolge = ERFOLGE.filter(e => e.ok() && !erfolgeVorher.has(e.id));
    const titel = def.art === "boss"
      ? (geschafft ? "Boss besiegt!" : "Der Boss ist entkommen")
      : def.art === "level" ? (sterne === 3 ? "Perfekt!" : sterne === 2 ? "Gut gemacht!" : "Geschafft – das wird noch!")
      : "Runde geschafft!";
    const schoen = (def.art === "boss" && geschafft) || sterne === 3;
    fuelle(wurzel, h("section", { class: "ergebnis" },
      h("div", { class: "ergebnis-icon" }, def.art === "boss" ? (geschafft ? "🏆" : "🐉") : def.art === "blitz" ? "⚡" : "🎉"),
      h("h1", {}, titel),
      def.art === "level" || def.art === "boss" ? h("div", { class: "grosse-sterne", "aria-label": `${sterne} von 3 Sternen` }, sterneText(sterne)) : null,
      !geschafft ? h("p", {}, "Kein Problem: Was falsch war, ist vorgemerkt und kommt in anderer Form wieder. Probier’s nochmal!") : null,
      h("div", { class: "ergebnis-werte" },
        wert("XP", "+" + (xp + bonus)),
        wert("Beim ersten Versuch", Math.round(schnitt * 100) + " %"),
        wert("Beste Serie", "🔥 " + bestCombo),
        def.stoppuhr ? wert("Zeit", `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, "0")}`) : null,
        def.art === "blitz" ? wert("Rekord", Math.max(vorherBeste, volle) + " / 10") : null),
      neuRang.stufe > rangVorher ? h("div", { class: "aufstieg" }, `⬆️ Neuer Rang: ${neuRang.name}`) : null,
      neueErfolge.map(e => h("div", { class: "aufstieg erfolg" }, `${e.icon} Neuer Erfolg: ${e.name}`)),
      h("div", { class: "ergebnis-knoepfe" },
        h("a", { class: "knopf leise", href: zurueck }, "Zur Karte"),
        h("button", { type: "button", class: "knopf" + (naechste ? " leise" : " haupt"), onclick: () => dispatchEvent(new HashChangeEvent("hashchange")) }, "Nochmal spielen"),
        naechste ? h("a", { class: "knopf haupt", href: naechste.link, "data-haupt": "1" }, naechste.text) : null),
      rueckblick()));
    if (schoen) { konfetti(); ton("sieg"); }
  }
  const wert = (t, v) => h("div", { class: "wert" }, h("strong", {}, v), h("span", {}, t));

  // ---------- Rückblick: alle Fragen der Runde mit Antwort, Lösung und Merke zum Nachlesen ----------
  function rueckblick() {
    if (!verlauf.length) return null;
    const falsch = verlauf.filter(v => v.quote < 0.999);
    let nurFalsch = falsch.length > 0;
    const filter = h("div", { class: "rueck-filter", role: "group", "aria-label": "Welche Fragen zeigen" });
    const liste = h("div", { class: "rueck-liste" });
    const knopf = (an, text, onclick, aus) => h("button", {
      type: "button", class: "chip" + (an ? " gewaehlt" : ""), "aria-pressed": String(an), disabled: aus, onclick
    }, text);
    const zeichne = () => {
      fuelle(filter,
        knopf(nurFalsch, `Nicht ganz richtig (${falsch.length})`, () => { nurFalsch = true; zeichne(); }, !falsch.length),
        knopf(!nurFalsch, `Alle Fragen (${verlauf.length})`, () => { nurFalsch = false; zeichne(); }));
      fuelle(liste, (nurFalsch ? falsch : verlauf).map(eintrag));
    };
    zeichne();
    return h("section", { class: "rueckblick" },
      h("h2", {}, "Deine Fragen zum Nachlesen"),
      h("p", { class: "hinweis" }, falsch.length
        ? "Hier siehst du jede Frage mit deiner Antwort, der Lösung und dem Merksatz. Was nicht ganz richtig war, ist aufgeklappt."
        : "Alles richtig! Du kannst die Fragen trotzdem noch einmal nachlesen."),
      filter, liste);
  }

  function eintrag(v) {
    const art = v.quote >= 0.999 ? "voll" : v.quote >= 0.5 ? "teil" : "null";
    const info = K.wissen.get(v.wissen);
    const frage = v.a.typ === "zitat" ? `Wer hat’s gesagt? ${v.a.zitat}` : v.a.frage || "";
    const melden = () => meldeDialog(v.a, v.st, () => karte.replaceWith(eintrag(v)));
    const karte = h("details", { class: "rueck-eintrag " + art, open: art !== "voll" },
      h("summary", {},
        h("span", { class: "rueck-symbol", "aria-hidden": "true" }, { voll: "✓", teil: "◐", null: "✗" }[art]),
        h("span", { class: "nur-vorlesen" }, { voll:"Richtig: ", teil: "Teilweise richtig: ", null: "Falsch: " }[art]),
        h("span", { class: "rueck-text" },
          h("span", { class: "rueck-frage" }, frage.replace(/\*+/g, "")),
          info ? h("span", { class: "rueck-thema" }, info.w.titel) : null)),
      aufgabeKarte(v.a, v.st, { gesperrt: true, nurLesen: true, wiederholung: v.wdh, gemeldet: versteckt(v.a.id), melden }));
    return karte;
  }

  // ---------- Tastatur am Laptop: Enter = Prüfen/Weiter, 1–9 = Antwort wählen ----------
  function tasten(e) {
    if (document.querySelector("dialog[open]")) return; // z. B. der Melden-Dialog
    if (beendet && e.key !== "Enter") return;
    const ziel = e.target;
    const tippt = ziel.matches?.("input, textarea, select");
    if (e.key === "Enter") {
      if (ziel.matches?.("textarea") && !e.ctrlKey) return;
      if (ziel.matches?.("button, a")) return;
      e.preventDefault();
      document.querySelector("[data-haupt]:not([disabled])")?.click();
      return;
    }
    if (tippt || e.ctrlKey || e.metaKey || e.altKey) return;
    const zahlTaste = Number(e.key);
    if (zahlTaste >= 1 && zahlTaste <= 9 && aktuell && !aktuell.gesperrt && !aktuell.info) {
      buehne.querySelectorAll(".option, .paar-knopf:not(.belegt)")[zahlTaste - 1]?.click();
    }
  }
  document.addEventListener("keydown", tasten);

  naechste();
  return () => {
    document.removeEventListener("keydown", tasten);
    clearInterval(uhr);
  };
}

