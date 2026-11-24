// ---------- Lernspiel: Seiten und Navigation ----------

import { h, fuelle, toast, ampel, sparkline, datumText, AM_PC } from "./util.js";
import { K, ladeKatalog, faecher, docVon, wissenIn, levelListe, kurzAn, setzeKurz } from "./katalog.js";
import * as speicher from "./speicher.js";
import {
  S, ladeSpielstand, kann, kannBereich, sterneVon, laeufeVon, rang, serie, heuteXp, TAGESZIEL, FEST_AB_STUFE, ERFOLGE, tagKey,
  schwereListe, besserListe, levelStatistik, abBeherrscht, istFaellig, hierWeiter, naechsterSchritt, infoAn, setzeInfo,
  planLevel, planBoss, planMission, planSchwaechen, planBlitz, planEndlos, planArbeitsblatt
} from "./spiel.js";
import { spieleRunde } from "./runde.js";
import { spieleKlausur } from "./klausur.js";
import { pruefSeite } from "./pruefen.js";
import { M, ladeMeldungen, meldungsZeile, statusVon, STATUS, meldungenAlsAuftrag } from "./meldungen.js";
import { hatRechnen, rechnenKachel, rechnenUebersicht, rechnenUeben } from "./rechnen.js";

const app = document.getElementById("app");
let aufraeumen = null;

// ---------- Bausteine ----------

const prozentZahl = p => (p == null ? "–" : Math.round(p) + " %");
const AMPEL_TEXT = { gruen: "sitzt", gelb: "fast", rot: "üben", offen: "neu" };

function ampelMarke(p) {
  const a = ampel(p);
  return h("span", { class: "ampel " + a }, p == null ? "neu" : `${Math.round(p)} % · ${AMPEL_TEXT[a]}`);
}

function balken(p, cls = "") {
  return h("div", { class: "balken " + cls, role: "progressbar", "aria-valuenow": Math.round(p ?? 0), "aria-valuemin": 0, "aria-valuemax": 100 },
    h("span", { class: "fuell-" + ampel(p), style: `width:${p ?? 0}%` }));
}

function kopfleiste() {
  const r = rang();
  const heute = heuteXp();
  return h("header", { class: "kopfleiste" },
    h("a", { href: "#/", class: "marke" }, h("img", { src: "icon.svg", alt: "", width: 30, height: 30 }), h("span", {}, "Lernspiel")),
    h("div", { class: "kopf-werte" },
      h("a", { class: "kopf-wert", href: "#/fortschritt", title: `Tagesserie: ${serie()} Tage` }, "🔥 ", h("strong", {}, serie())),
      h("a", { class: "kopf-wert", href: "#/fortschritt", title: `Tagesziel: ${heute} von ${TAGESZIEL} XP` }, heute >= TAGESZIEL ? "🎯 " : "🎯 ", h("strong", {}, `${Math.min(heute, TAGESZIEL)}/${TAGESZIEL}`)),
      h("a", { class: "kopf-wert", href: "#/fortschritt", title: `Rang ${r.stufe}: ${r.name}` }, "⭐ ", h("strong", {}, S.xp), " XP"),
      h("button", {
        type: "button", class: "icon-knopf info-schalter" + (infoAn() ? " an" : ""), "aria-pressed": String(infoAn()),
        title: infoAn() ? "Infoblöcke sind an – klicken zum Ausschalten" : "Infoblöcke vor den Fragen einschalten",
        "aria-label": "Infoblöcke vor den Fragen", onclick: schalteInfo
      }, "📖"),
      h("a", { class: "icon-knopf", href: "#/statistik", title: "Level-Statistik", "aria-label": "Level-Statistik" }, "📈"),
      h("a", { class: "icon-knopf", href: "#/fortschritt", title: "Mein Fortschritt", "aria-label": "Mein Fortschritt" }, "📊"),
      h("a", { class: "icon-knopf", href: "#/einstellungen", title: "Einstellungen", "aria-label": "Einstellungen" }, "⚙️")));
}

function schalteInfo() {
  setzeInfo(!infoAn());
  toast(infoAn() ? "📖 Infoblöcke sind an: Vor neuen Fragen kommt kurz der Merksatz." : "Infoblöcke sind aus.");
  // Start- und Einstellungsseite zeigen den Stand selbst an, sonst reicht die Kopfleiste
  if (/^#?\/?(einstellungen)?$/.test(location.hash)) route();
  else document.querySelector(".kopfleiste")?.replaceWith(kopfleiste());
}

function seite(...inhalt) {
  fuelle(app, kopfleiste(), h("div", { class: "seite" }, inhalt));
}

function spielerKarte() {
  const r = rang();
  return h("section", { class: "spieler-karte" },
    h("div", { class: "rang-abzeichen", "aria-hidden": "true" }, r.stufe),
    h("div", { class: "spieler-text" },
      h("strong", {}, r.name),
      h("div", { class: "balken gold" }, h("span", { style: `width:${r.anteil * 100}%` })),
      h("small", {}, r.bis == null ? "Höchster Rang erreicht!" : `Noch ${r.bis - S.xp} XP bis zum nächsten Rang`)));
}

function modusKachel(icon, name, text, link, opts = {}) {
  return h("a", { class: "kachel" + (opts.leer ? " gedimmt" : ""), href: link, title: text },
    h("span", { class: "kachel-icon", "aria-hidden": "true" }, icon),
    h("span", { class: "kachel-text" }, h("strong", {}, name), h("small", {}, text)),
    opts.zahl ? h("span", { class: "kachel-zahl" }, opts.zahl) : null);
}

function modusKacheln(bereich) {
  const ids = wissenIn(bereich);
  const faellig = ids.filter(istFaellig).length;
  const schwach = schwereListe(ids).length;
  return h("div", { class: "kacheln" },
    modusKachel("🎯", "Tagesmission", "Was heute wieder fällig ist", `#/spiel/mission/${bereich}`, { zahl: faellig || null, leer: !faellig }),
    modusKachel("🏹", "Schwächen-Jagd", "Was noch nicht sitzt, in neuer Form", `#/spiel/schwaechen/${bereich}`, { zahl: schwach || null, leer: !schwach }),
    modusKachel("⚡", "Blitzrunde", "10 schnelle Fragen gegen die Uhr", `#/spiel/blitz/${bereich}`),
    modusKachel("♾️", "Endlos-Training", "Ohne Ende, jederzeit aufhören", `#/spiel/endlos/${bereich}`));
}

// ---------- Startseite ----------

function startSeite() {
  const schritt = naechsterSchritt();
  seite(
    h("div", { class: "start-held" },
      h("div", {},
        h("h1", {}, S.antworten ? "Weiter geht’s!" : "Bereit für Level 1?"),
        schritt ? h("p", {}, schritt.text) : h("p", {}, "Noch kein Lernstoff vorhanden."),
        infoAn() ? h("p", { class: "info-an" }, "📖 Infoblöcke sind an") : null),
      schritt ? h("a", { class: "knopf haupt gross", href: schritt.link, "data-haupt": "1" }, S.antworten ? "▶ Weiterspielen" : "▶ Spiel starten") : null),
    spielerKarte(),
    faecher().map(({ name, docs }) => fachBlock(name, docs)));
}

function fachBlock(name, docs) {
  const schluessel = "ls-ueben-" + name;
  let auswahl = "f:" + name;
  try { auswahl = localStorage.getItem(schluessel) || auswahl; } catch {}
  if (auswahl.startsWith("d:") && !docVon(auswahl.slice(2))) auswahl = "f:" + name;
  const kacheln = h("div", {}, modusKacheln(auswahl));
  return h("section", { class: "fach" },
    h("h2", {}, name),
    h("h3", {}, "Deine Vorlesungen"),
    h("div", { class: "vorlesungen" }, docs.map(vorlesungKarte)),
    h("div", { class: "ueben-kopf" },
      h("h3", {}, "Arcade"),
      h("label", {}, "Üben aus: ", h("select", {
        onchange: e => {
          try { localStorage.setItem(schluessel, e.target.value); } catch {}
          fuelle(kacheln, modusKacheln(e.target.value));
        }
      },
        h("option", { value: "f:" + name, selected: auswahl === "f:" + name }, "Alle Vorlesungen"),
        docs.map(d => h("option", { value: "d:" + d.id, selected: auswahl === "d:" + d.id }, d.kurztitel))))),
    kacheln,
    hatRechnen(name) ? [h("h3", {}, "Extra-Übungsaufgaben"), h("div", { class: "kacheln" }, rechnenKachel(name))] : null);
}

function vorlesungKarte(doc) {
  const ids = wissenIn("d:" + doc.id);
  const k = kannBereich(ids);
  const stationen = doc.welten.flatMap(w => levelListe(w, doc));
  const gespielt = stationen.filter(l => sterneVon(l.id) > 0).length;
  const sterne = stationen.reduce((s, l) => s + sterneVon(l.id), 0);
  return h("a", { class: "vorlesung", href: `#/karte/${doc.id}` },
    h("div", { class: "vorlesung-kopf" },
      h("strong", {}, doc.kurztitel, ": ", doc.titel),
      h("span", { class: "gross-prozent" }, Math.round(k.prozent) + " %")),
    balken(k.prozent),
    h("small", {}, `Kann ich · ${gespielt}/${stationen.length} Level gespielt · ${sterne} ★ · ${k.fest}/${ids.length} sitzen fest`
      + (k.schnitt != null ? ` · Schnitt in den geübten: ${Math.round(k.schnitt)} %` : "")));
}

// ---------- Die Spielkarte einer Vorlesung ----------

const ZEILE = 112;

function kartenSeite(docId) {
  const doc = docVon(docId);
  if (!doc) return startSeite();
  const ids = wissenIn("d:" + doc.id);
  const k = kannBereich(ids);
  const weiter = hierWeiter(doc);
  const ab = abBeherrscht(doc);

  const welten = doc.welten.map((welt, wi) => weltKarte(doc, welt, wi, weiter));
  const finale = h("section", { class: "welt finale" },
    h("div", { class: "welt-banner", style: "--welt:45" },
      h("span", { class: "welt-nr" }, "Finale"), h("h2", {}, "Die letzten Gegner"),
      h("p", {}, "Beantworte die Arbeitsblatt-Fragen und besiege die Probeklausur.")),
    h("div", { class: "finale-knoten" },
      doc.arbeitsblatt ? h("a", { class: "finale-kachel", href: `#/spiel/arbeitsblatt/${doc.id}` },
        h("span", { class: "knoten boss gross-knoten" + (ab.ok === ab.gesamt ? " gruen" : ab.ok ? " gelb" : "") }, "📝"),
        h("strong", {}, "Arbeitsblatt-Boss"),
        h("small", {}, `${ab.ok} von ${ab.gesamt} Fragen beherrscht`)) : null,
      doc.probeklausur ? h("a", { class: "finale-kachel", href: `#/klausur/${doc.id}` },
        h("span", { class: "knoten boss gross-knoten" + (laeufeVon(doc.id).some(l => l.geschafft) ? " gruen" : "") }, "🏆"),
        h("strong", {}, "Probeklausur"),
        h("small", {}, klausurText(doc))) : null));

  seite(
    h("a", { class: "zurueck", href: "#/" }, "← Übersicht"),
    h("div", { class: "karten-raster" },
      h("div", { class: "karten-spalte" }, welten, finale),
      h("aside", { class: "seitenleiste" },
        spielerKarte(),
        h("section", { class: "panel" },
          h("h3", {}, doc.kurztitel),
          h("div", { class: "kann-gross" }, h("strong", {}, Math.round(k.prozent) + " %"), h("span", {}, "kann ich")),
          balken(k.prozent),
          h("small", { class: "panel-info" }, `🧠 ${k.fest} von ${ids.length} Wissenspunkten sitzen fest`),
          h("a", { class: "knopf leise stat-knopf", href: "#/statistik" }, "📈 Level-Statistik")),
        h("section", { class: "panel" }, h("h3", {}, "Arcade"), modusKacheln("d:" + doc.id)),
        hatRechnen(doc.fach) ? h("section", { class: "panel" }, h("h3", {}, "Extra-Übungsaufgaben"), h("div", { class: "kacheln" }, rechnenKachel(doc.fach))) : null,
        schwerPanel(ids))));
  setTimeout(() => document.querySelector(".knoten-box.hier")?.scrollIntoView({ block: "center", behavior: "smooth" }), 80);
}

function klausurText(doc) {
  const l = laeufeVon(doc.id);
  if (!l.length) return "Noch nicht geschrieben";
  const b = l.reduce((m, x) => Math.max(m, x.quote || 0), 0);
  return `Bestes Ergebnis: ${Math.round(b * 100)} %`;
}

function schwerPanel(ids) {
  const schwer = schwereListe(ids).slice(0, 5);
  const besser = besserListe(ids).slice(0, 5);
  if (!schwer.length && !besser.length) return null;
  return h("section", { class: "panel" },
    schwer.length ? [h("h3", {}, "Fällt mir schwer"), wissensListe(schwer)] : null,
    besser.length ? [h("h3", {}, "Besser geworden"), h("ul", { class: "wissens-liste" }, besser.map(b => h("li", {}, K.wissen.get(b.id).w.titel, h("span", { class: "ampel gruen" }, `+${Math.round(b.jetzt - b.vorher)}`))))] : null);
}

const wissensListe = liste => h("ul", { class: "wissens-liste" }, liste.map(x => h("li", {}, K.wissen.get(x.id).w.titel, ampelMarke(x.k))));

function weltKarte(doc, welt, wi, weiter) {
  const stationen = [...levelListe(welt, doc).map(l => ({ art: "level", id: l.id, level: l })), { art: "boss", id: welt.id }];
  const hoehe = stationen.length * ZEILE + 20;
  // Zickzack: Prozent-Positionen für Knoten und Verbindungslinie
  const pos = stationen.map((_, i) => 50 + Math.sin(i * 1.15) * 24);
  const pfad = pos.map((x, i) => {
    const y = i * ZEILE + ZEILE / 2;
    if (!i) return `M ${x} ${y}`;
    const py = (i - 1) * ZEILE + ZEILE / 2;
    return `C ${pos[i - 1]} ${py + ZEILE / 2}, ${x} ${y - ZEILE / 2}, ${x} ${y}`;
  }).join(" ");
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "pfad-linie");
  svg.setAttribute("viewBox", `0 0 100 ${hoehe}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", pfad);
  p.setAttribute("vector-effect", "non-scaling-stroke");
  svg.append(p);

  const ids = wissenIn("w:" + welt.id);
  const k = kannBereich(ids);
  return h("section", { class: "welt", style: `--welt:${welt.farbe ?? 260}` },
    h("div", { class: "welt-banner" },
      h("span", { class: "welt-nr" }, `Welt ${wi + 1}`),
      h("h2", {}, welt.titel),
      h("div", { class: "welt-stand" }, balken(k.prozent, "hell"), h("small", {}, `${Math.round(k.prozent)} % kann ich`))),
    h("div", { class: "pfad", style: `height:${hoehe}px` }, svg,
      stationen.map((s, i) => knoten(doc, welt, s, i, pos[i], weiter))));
}

function knoten(doc, welt, s, i, x, weiter) {
  const istBoss = s.art === "boss";
  const ids = wissenIn((istBoss ? "w:" : "l:") + s.id);
  const k = kannBereich(ids);
  const sterne = sterneVon(s.id);
  const gespielt = k.gesehen > 0;
  const fest = ids.length && k.fest === ids.length;
  const faellig = !istBoss && k.faellig > 0;
  const hier = weiter?.id === s.id;
  const farbe = !gespielt ? "offen" : ampel(k.prozent);
  const labelLinks = x > 55;
  const istMix = !istBoss && !!s.level.mix;
  const istExtra = !istBoss && !!s.level.extra;
  const nummer = istBoss ? "🐉" : istMix ? "🔀" : istExtra ? "💪" : levelListe(welt, doc).filter(l => !l.mix && !l.extra).indexOf(s.level) + 1;
  return h("div", {
    class: "knoten-box" + (hier ? " hier" : "") + (labelLinks ? " label-links" : ""),
    style: `left:${x}%;top:${i * ZEILE + ZEILE / 2}px`
  },
    hier ? h("div", { class: "hier-marke" }, "Hier weiter") : null,
    h("button", {
      type: "button", class: `knoten ${farbe}${istBoss ? " boss" : ""}${istMix || istExtra ? " mix" : ""}${fest ? " gold" : ""}`,
      "aria-label": (istBoss ? "Boss: " + welt.titel : s.level.titel) + `, ${sterne} Sterne`,
      onclick: () => zeigeStation(doc, welt, s)
    }, nummer, faellig ? h("span", { class: "glocke", title: "Wieder fällig" }, "🔔") : null, fest ? h("span", { class: "krone", title: "Sitzt fest" }, "👑") : null),
    h("div", { class: "knoten-text" },
      h("span", { class: "knoten-titel" }, istBoss ? "Boss" : s.level.titel),
      h("span", { class: "knoten-sterne", "aria-hidden": "true" }, "★".repeat(sterne) + "☆".repeat(3 - sterne))));
}

function zeigeStation(doc, welt, s) {
  const istBoss = s.art === "boss";
  const ids = wissenIn((istBoss ? "w:" : "l:") + s.id);
  const k = kannBereich(ids);
  const laeufe = laeufeVon(s.id);
  const sterne = sterneVon(s.id);
  const istMix = !istBoss && !!s.level.mix;
  const dlg = h("dialog", { class: "station" },
    h("button", { type: "button", class: "dlg-zu", "aria-label": "Schließen", onclick: () => dlg.close() }, "✕"),
    h("h2", {}, istBoss ? `🐉 Boss: ${welt.titel}` : s.level.titel),
    h("div", { class: "grosse-sterne klein-sterne" }, "★".repeat(sterne) + "☆".repeat(3 - sterne)),
    istBoss ? h("p", {}, "Fragen aus der ganzen Welt, mit dem Schwersten zuerst. Du hast 3 Herzen.") : null,
    istMix ? h("p", {}, `Gemischte, etwas schwerere Fragen aus den letzten ${s.level.mix.length} Leveln.`) : null,
    s.level?.extra ? h("p", {}, "Hier landen alle Wissenspunkte dieser Welt, deren Ampel rot ist. Das Level verschwindet, sobald alles mindestens gelb ist.") : null,
    s.level?.teile?.length > 1 ? h("p", {}, `Fasst ${s.level.teile.length} kleine Level zusammen (Kurz-Modus).`) : null,
    h("div", { class: "station-werte" },
      h("span", {}, "Kann ich: ", h("strong", {}, Math.round(k.prozent) + " %")),
      laeufe.length > 1 ? sparkline(laeufe.map(l => (l.quote || 0) * 100)) : null,
      h("span", {}, `${laeufe.length}× gespielt`)),
    !istBoss && !istMix ? h("ul", { class: "wissens-liste" }, s.level.wissen.map(w => {
      const st = S.wissen.get(w.id);
      return h("li", {}, gesehenText(w, st), h("span", { class: "pips", title: "Stufe im Gedächtnis" }, stufenPips(st?.stufe || 0)));
    })) : null,
    h("a", { class: "knopf haupt gross", href: `#/spiel/${s.art}/${s.id}`, "data-haupt": "1", onclick: () => dlg.close() }, laeufe.length ? "Nochmal spielen" : "Spielen"));
  dlg.addEventListener("close", () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

// Vor dem ersten Spielen wird nichts vom Inhalt verraten
const gesehenText = (w, st) => (st?.n ? w.titel : "Noch unbekannt");
const stufenPips = n => Array.from({ length: 6 }, (_, i) => h("i", { class: i < n ? "an" : "" }));

// ---------- Mein Fortschritt ----------

function xpDiagramm() {
  const tage = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    tage.push({ d, xp: S.tageXp[tagKey(d.getTime())] || 0 });
  }
  const max = Math.max(TAGESZIEL, ...tage.map(t => t.xp));
  return h("figure", { class: "xp-chart" },
    h("figcaption", {}, "XP pro Tag, letzte 14 Tage"),
    h("div", { class: "xp-saeulen" }, tage.map((t, i) => {
      const text = `${t.d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}: ${t.xp} XP`;
      return h("div", { class: "xp-spalte", "data-tip": text, tabindex: 0, "aria-label": text },
        i === 13 || t.xp === max && t.xp ? h("span", { class: "xp-wert" }, t.xp) : null,
        h("span", { class: "xp-saeule", style: `height:${(t.xp / max) * 100}%` }));
    })),
    h("div", { class: "xp-achse" }, h("span", {}, tage[0].d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })), h("span", {}, "heute")));
}

function fortschrittSeite() {
  const alleIds = [...K.wissen.keys()];
  const k = kannBereich(alleIds);
  const quote = S.antworten ? Math.round((S.volle / S.antworten) * 100) : 0;
  const stat = (wert, name) => h("div", { class: "wert" }, h("strong", {}, wert), h("span", {}, name));
  seite(
    h("h1", {}, "Mein Fortschritt"),
    h("a", { class: "knopf leise", href: "#/statistik" }, "📈 Zur Level-Statistik"),
    spielerKarte(),
    h("div", { class: "ergebnis-werte breit" },
      stat(Math.round(k.prozent) + " %", "Kann ich insgesamt"),
      stat(`${k.fest}/${alleIds.length}`, "Sitzen fest"),
      stat(S.antworten, "Antworten"),
      stat(quote + " %", "Voll richtig"),
      stat("🔥 " + serie(), "Tage in Folge"),
      stat("🔥 " + S.bestCombo, "Beste Serie")),
    h("section", { class: "panel" }, xpDiagramm()),
    h("section", { class: "panel" }, h("h2", {}, "Erfolge"),
      h("div", { class: "erfolge" }, ERFOLGE.map(e => {
        const ok = e.ok();
        return h("div", { class: "erfolg-kachel" + (ok ? " ok" : ""), title: e.text },
          h("span", { class: "erfolg-icon", "aria-hidden": "true" }, ok ? e.icon : "🔒"),
          h("strong", {}, e.name), h("small", {}, e.text));
      }))),
    h("div", { class: "zwei-spalten" },
      h("section", { class: "panel" }, h("h2", {}, "Fällt mir noch schwer"),
        schwereListe(alleIds).length ? wissensListe(schwereListe(alleIds).slice(0, 12)) : h("p", { class: "hinweis" }, "Noch nichts – sehr gut!")),
      h("section", { class: "panel" }, h("h2", {}, "Hier bin ich besser geworden"),
        besserListe(alleIds).length
          ? h("ul", { class: "wissens-liste" }, besserListe(alleIds).slice(0, 12).map(b => h("li", {}, K.wissen.get(b.id).w.titel, h("span", { class: "ampel gruen" }, `${Math.round(b.vorher)} → ${Math.round(b.jetzt)} %`))))
          : h("p", { class: "hinweis" }, "Taucht auf, sobald du dich um mindestens 15 Prozentpunkte verbessert hast."))),
    h("section", { class: "panel" }, h("h2", {}, "Alle Wissenspunkte"),
      h("p", { class: "hinweis" }, "Grün ab 90 %, gelb ab 67 %, rot darunter, grau noch nicht gespielt. Fahre über ein Feld für den Namen."),
      K.docs.map(d => d.welten.map(w => h("div", { class: "raster-welt" }, h("small", {}, w.titel),
        h("div", { class: "wissens-raster" }, wissenIn("w:" + w.id).map(id => {
          const p = kann(id);
          const titel = p == null ? "Noch unbekannt" : `${K.wissen.get(id).w.titel}: ${Math.round(p)} %`;
          return h("span", { class: "feld " + ampel(p) + (S.wissen.get(id)?.stufe >= FEST_AB_STUFE ? " fest" : ""), title: titel, "aria-label": titel });
        })))))),
    h("section", { class: "panel" }, h("h2", {}, "Letzte Runden"),
      S.laeufe.length ? h("ul", { class: "wissens-liste" }, [...S.laeufe].reverse().slice(0, 10).map(l => h("li", {},
        `${datumText(new Date(l.ts).toISOString())} · ${laufName(l)}`, ampelMarke((l.quote || 0) * 100))))
        : h("p", { class: "hinweis" }, "Noch keine Runde gespielt.")));
}

function laufName(l) {
  if (l.art === "level") return "Level: " + (K.level.get(l.ziel)?.level.titel || "");
  if (l.art === "boss") return "Boss: " + (K.welten.get(l.ziel)?.welt.titel || "");
  return { mission: "Tagesmission", schwaechen: "Schwächen-Jagd", blitz: "Blitzrunde", endlos: "Endlos-Training", arbeitsblatt: "Arbeitsblatt-Boss", klausur: "Probeklausur" }[l.art] || l.art;
}

// ---------- Level-Statistik ----------

const STAT_GRUPPEN = [
  { id: "alle", name: "Alle Level", passt: () => true },
  { id: "rot", name: "Noch nicht gut", passt: z => ampel(z.st.prozent) === "rot" },
  { id: "gelb", name: "Fast", passt: z => ampel(z.st.prozent) === "gelb" },
  { id: "gruen", name: "Sitzt gut", passt: z => ampel(z.st.prozent) === "gruen" },
  { id: "besser", name: "Verbessert", passt: z => z.st.trend === "besser" },
  { id: "schlechter", name: "Verschlechtert", passt: z => z.st.trend === "schlechter" },
  { id: "offen", name: "Noch nicht gespielt", passt: z => z.st.prozent == null }
];
const STAT_SORTIERUNG = {
  reihe: { name: "Wie auf der Karte" },
  schwach: { name: "Schlechteste zuerst", vergleich: (a, b) => (a.st.prozent ?? 101) - (b.st.prozent ?? 101) },
  besser: { name: "Größte Verbesserung zuerst", vergleich: (a, b) => (b.st.differenz ?? -999) - (a.st.differenz ?? -999) },
  alt: { name: "Am längsten nicht geübt", vergleich: (a, b) => (a.st.zuletzt || 9e15) - (b.st.zuletzt || 9e15) }
};
let statGruppe = "alle", statSortierung = "reihe";

function levelZeilen() {
  const zeilen = [];
  for (const doc of K.docs) {
    doc.welten.forEach((welt, wi) => welt.level.filter(l => !l.mix).forEach((level, li) => {
      zeilen.push({ doc, welt, wi, nr: li + 1, level, st: levelStatistik(level) });
    }));
  }
  return zeilen;
}

const uebenLink = z => `#/spiel/level/${z.level.id}`;
const sterneText = n => "★".repeat(n) + "☆".repeat(3 - n);
const weltName = z => (K.docs.length > 1 ? `${z.doc.kurztitel} · ` : "") + `Welt ${z.wi + 1}: ${z.welt.titel}`;

function trendMarke(st) {
  if (st.trend == null) return st.prozent == null ? null : h("small", { class: "stat-erst" }, "erste Runde");
  const von = `Erste Runde ${Math.round(st.anfang)} %, jetzt ${Math.round(st.jetzt)} %`;
  const d = Math.round(st.differenz);
  if (st.trend === "besser") return h("span", { class: "ampel gruen", title: von }, `↑ +${d}`);
  if (st.trend === "schlechter") return h("span", { class: "ampel rot", title: von }, `↓ −${Math.abs(d)}`);
  return h("span", { class: "ampel offen", title: von }, "→ gleich");
}

function statZeile(z, mitWelt) {
  const { st, level } = z;
  const angaben = st.prozent == null ? "Noch nicht gespielt" : [
    `${st.verlauf.length} ${st.verlauf.length === 1 ? "Runde" : "Runden"}`,
    `${st.volle} von ${st.antworten} Antworten voll richtig`,
    `Sterne ${sterneText(st.sterne)}`,
    `zuletzt ${datumText(new Date(st.zuletzt).toISOString(), false)}`,
    st.faellig ? "🔔 wieder fällig" : null
  ].filter(Boolean).join(" · ");
  return h("details", { class: "stat-level" },
    h("summary", { class: "stat-zeile" },
      h("span", { class: "stat-titel" }, `${z.nr}. ${level.titel}`, mitWelt ? h("small", {}, weltName(z)) : null),
      balken(st.prozent, "stat-balken"),
      h("strong", { class: "stat-prozent" }, prozentZahl(st.prozent)),
      h("span", { class: "stat-trend" }, trendMarke(st)),
      h("span", { class: "stat-spark" }, st.verlauf.length > 1 ? sparkline(st.verlauf) : null),
      h("span", { class: "stat-sterne", "aria-hidden": "true" }, sterneText(st.sterne))),
    h("div", { class: "stat-details" },
      h("p", { class: "hinweis" }, angaben),
      st.anfang != null ? h("p", { class: "hinweis" }, `In der ersten Runde: ${Math.round(st.anfang)} % · Jetzt: ${Math.round(st.jetzt)} %`) : null,
      h("ul", { class: "wissens-liste" }, level.wissen.map(w => {
        const w2 = S.wissen.get(w.id);
        return h("li", {}, gesehenText(w, w2), h("span", { class: "stat-punkt" }, ampelMarke(kann(w.id)), h("span", { class: "pips", title: "Stufe im Gedächtnis" }, stufenPips(w2?.stufe || 0))));
      })),
      h("a", { class: "knopf haupt", href: uebenLink(z) }, st.prozent == null ? "Spielen" : "Jetzt üben")));
}

function statListe(zeilen) {
  const gruppe = STAT_GRUPPEN.find(g => g.id === statGruppe);
  const sortierung = STAT_SORTIERUNG[statSortierung];
  const treffer = zeilen.filter(gruppe.passt);
  if (!treffer.length) return h("p", { class: "hinweis" }, "In dieser Gruppe ist gerade kein Level.");
  if (sortierung.vergleich) return [...treffer].sort(sortierung.vergleich).map(z => statZeile(z, true));
  const welten = new Map();
  for (const z of treffer) {
    if (!welten.has(z.welt.id)) welten.set(z.welt.id, []);
    welten.get(z.welt.id).push(z);
  }
  return [...welten.values()].map(liste => h("div", { class: "stat-welt" }, h("h3", {}, weltName(liste[0])), liste.map(z => statZeile(z, false))));
}

function statistikSeite() {
  const zeilen = levelZeilen();
  const gespielt = zeilen.filter(z => z.st.prozent != null);
  const schwach = gespielt.filter(z => z.st.prozent < 90).sort(STAT_SORTIERUNG.schwach.vergleich).slice(0, 5);
  const besser = zeilen.filter(z => z.st.trend === "besser").sort(STAT_SORTIERUNG.besser.vergleich).slice(0, 5);
  const gruppen = h("div", { class: "stat-gruppen" });
  const liste = h("div", { class: "stat-liste" });
  const zeichne = () => {
    fuelle(gruppen, STAT_GRUPPEN.map(g => h("button", {
      type: "button", class: `stat-gruppe ${g.id}`, "aria-pressed": String(g.id === statGruppe),
      onclick: () => { statGruppe = g.id; zeichne(); }
    }, h("strong", {}, zeilen.filter(g.passt).length), h("span", {}, g.name))));
    fuelle(liste, statListe(zeilen));
  };
  zeichne();
  seite(
    h("h1", {}, "Level-Statistik"),
    h("p", { class: "hinweis" }, "„Kann ich“ ist der Schnitt deiner letzten drei Antworten pro Wissenspunkt, auch aus Bossen und Arcade-Runden. „Verbessert“ heißt: mindestens 15 Prozentpunkte besser als in deiner ersten Runde. Mischlevel und Bosse fragen dieselben Inhalte ab und stehen deshalb nicht einzeln in der Liste."),
    gruppen,
    gespielt.length ? h("div", { class: "zwei-spalten" },
      h("section", { class: "panel" }, h("h2", {}, "Das kann ich am wenigsten"),
        schwach.length
          ? h("ul", { class: "wissens-liste" }, schwach.map(z => h("li", {}, h("a", { class: "stat-link", href: uebenLink(z), title: "Jetzt üben" }, z.level.titel), ampelMarke(z.st.prozent))))
          : h("p", { class: "hinweis" }, "Alle gespielten Level sitzen gut.")),
      h("section", { class: "panel" }, h("h2", {}, "Hier bin ich besser geworden"),
        besser.length
          ? h("ul", { class: "wissens-liste" }, besser.map(z => h("li", {}, h("a", { class: "stat-link", href: uebenLink(z), title: "Jetzt üben" }, z.level.titel), h("span", { class: "ampel gruen" }, `${Math.round(z.st.anfang)} → ${Math.round(z.st.jetzt)} %`))))
          : h("p", { class: "hinweis" }, "Erscheint, sobald du ein Level mehrmals geübt hast und mindestens 15 Prozentpunkte besser bist.")))
      : h("section", { class: "panel" }, h("p", { class: "hinweis" }, "Spiel dein erstes Level, dann siehst du hier, wie gut du es kannst.")),
    h("section", { class: "panel" },
      h("div", { class: "stat-kopf" },
        h("h2", {}, "Alle Level"),
        h("label", {}, "Sortieren: ", h("select", {
          onchange: e => { statSortierung = e.target.value; zeichne(); }
        }, Object.entries(STAT_SORTIERUNG).map(([id, s]) => h("option", { value: id, selected: id === statSortierung }, s.name))))),
      liste));
}

// ---------- Einstellungen ----------

function einstellungenSeite() {
  const tonAn = (() => { try { return localStorage.getItem("ls-ton") === "an"; } catch { return false; } })();
  const dunkel = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  const datei = h("input", {
    type: "file", accept: ".json,application/json", class: "unsichtbar", onchange: async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const r = await speicher.importiere(f);
        await ladeSpielstand();
        await ladeMeldungen();
        toast(`Zusammengeführt: ${r.antworten} neue Antworten, ${r.laeufe} neue Runden.`);
        route();
      } catch (err) { toast(err.message); }
    }
  });
  seite(
    h("h1", {}, "Einstellungen"),
    h("section", { class: "panel einstell" },
      h("h2", {}, "Darstellung"),
      h("button", {
        type: "button", class: "knopf leise", onclick: () => {
          const t = dunkel() ? "light" : "dark";
          document.documentElement.dataset.theme = t;
          try { localStorage.setItem("ls-theme", t); } catch {}
          route();
        }
      }, dunkel() ? "☀️ Hell" : "🌙 Dunkel"),
      h("button", {
        type: "button", class: "knopf leise", onclick: () => {
          try { localStorage.setItem("ls-ton", tonAn ? "aus" : "an"); } catch {}
          route();
        }
      }, tonAn ? "🔊 Ton ist an" : "🔇 Ton ist aus")),
    h("section", { class: "panel einstell" },
      h("h2", {}, "Infoblöcke für schlechte Tage"),
      h("p", {}, "Ist das an, kommt vor der ersten Frage zu jedem Wissenspunkt ein kurzer Infoblock mit dem Merksatz. Richtige Antworten direkt danach zählen, schieben die nächste Wiederholung aber nicht weiter hinaus, weil du die Antwort gerade gelesen hast. Bosse, Blitzrunde, Arbeitsblatt-Boss und Probeklausur bleiben ohne Infoblöcke. Du kannst es auch oben mit 📖 umschalten."),
      h("button", { type: "button", class: "knopf" + (infoAn() ? " haupt" : " leise"), "aria-pressed": String(infoAn()), onclick: schalteInfo },
        infoAn() ? "📖 Infoblöcke sind an" : "📕 Infoblöcke sind aus")),
    h("section", { class: "panel einstell" },
      h("h2", {}, "Kurz-Modus"),
      h("p", {}, "Ist das an, fasst die Karte bei Kriminologie und JuJ mehrere kleine Level zu größeren zusammen (höchstens 5 Wissenspunkte je Level), und die Mischlevel fallen weg. Am Ende jeder Welt erscheint ein 💪 Extra-Level nur dann, wenn dort Wissenspunkte mit roter Ampel sind. Alle Aufgaben und dein Fortschritt bleiben erhalten; der Schalter gilt nur auf diesem Gerät. Statistik 2 bleibt wie es ist."),
      h("button", {
        type: "button", class: "knopf" + (kurzAn() ? " haupt" : " leise"), "aria-pressed": String(kurzAn()),
        onclick: () => { setzeKurz(!kurzAn()); toast(kurzAn() ? "✂️ Kurz-Modus ist an." : "Kurz-Modus ist aus: alle kleinen Level."); route(); }
      }, kurzAn() ? "✂️ Kurz-Modus ist an" : "📚 Kurz-Modus ist aus")),
    meldungenPanel(),
    h("section", { class: "panel einstell" },
      h("h2", {}, "Spielstand sichern"),
      h("p", {}, "Dein Spielstand liegt nur in diesem Browser. Sichere ihn ab und zu als Datei. Beim Einspielen wird zusammengeführt und nichts doppelt gezählt."),
      h("button", { type: "button", class: "knopf", onclick: async () => toast(`${await speicher.exportiere()} Antworten gesichert.`) }, "💾 Spielstand speichern"),
      h("button", { type: "button", class: "knopf leise", onclick: () => datei.click() }, "📂 Spielstand einspielen"),
      datei,
      h("button", {
        type: "button", class: "knopf leise warn", onclick: async () => {
          if (!confirm("Wirklich den gesamten Spielstand löschen? Das geht nicht rückgängig.")) return;
          await speicher.loescheAlles();
          await ladeSpielstand();
          toast("Spielstand gelöscht.");
          route();
        }
      }, "Spielstand löschen")),
    h("section", { class: "panel" }, h("h1", {}, "Daten prüfen"), pruefSeite()));
}

// ---------- Gemeldete Fragen ----------

function meldungenPanel() {
  const offen = M.liste.filter(m => STATUS[statusVon(m)].aktiv).length;
  return h("section", { class: "panel einstell" },
    h("h2", {}, "Gemeldete Fragen"),
    h("p", {}, M.liste.length
      ? `Du hast ${M.liste.length} Frage(n) gemeldet, ${offen} davon sind gerade ausgeblendet.`
      : "Stimmt bei einer Frage etwas nicht, tippe oben in der Frage auf „⚑ Melden“. Sie wird dann ausgeblendet und von Claude Code geprüft."),
    h("a", { class: "knopf leise", href: "#/meldungen" }, "⚑ Gemeldete Fragen ansehen"));
}

async function kopiereAuftrag() {
  const text = meldungenAlsAuftrag();
  if (!text) return toast("Es gibt keine offenen Meldungen.");
  try {
    await navigator.clipboard.writeText(text);
    toast("Kopiert. Füge den Text jetzt bei Claude Code ein.");
  } catch {
    // Ohne Zwischenablage: Text zum Markieren anzeigen
    const feld = h("textarea", { rows: 8, readonly: true, class: "auftrag-text", "aria-label": "Auftrag für Claude" }, text);
    document.querySelector(".melde-schritte")?.after(feld);
    feld.select();
    toast("Markiere den Text und kopiere ihn.");
  }
}

function meldungenSeite() {
  const liste = h("ul", { class: "meldungen-liste" });
  const zeichne = () => fuelle(liste, [...M.liste].reverse().map(m => meldungsZeile(m, zeichne)));
  zeichne();
  const offen = M.liste.filter(m => statusVon(m) === "ausgeblendet").length;
  seite(
    h("h1", {}, "⚑ Gemeldete Fragen"),
    h("section", { class: "panel" },
      h("h2", {}, "So werden sie verbessert"),
      AM_PC
        ? h("ol", { class: "melde-schritte" },
            h("li", {}, "Öffne Claude Code im Ordner ", h("code", {}, "lernspiel"), "."),
            h("li", {}, "Sag: ", h("strong", {}, "„Bearbeite die gemeldeten Fragen“"), "."),
            h("li", {}, "Lade die App danach neu. Verbesserte Fragen sind wieder im Spiel, hier steht dann, was geändert wurde."))
        : h("ol", { class: "melde-schritte" },
            h("li", {}, "Tippe unten auf ", h("strong", {}, "„Auftrag für Claude kopieren“"), "."),
            h("li", {}, "Öffne in der Claude-App ", h("strong", {}, "Claude Code"), " mit deinem GitHub-Projekt ", h("code", {}, "lernspiel"), " und füge den Text ein."),
            h("li", {}, "Wenn Claude fertig ist und die Änderung auf GitHub übernommen ist, lade die App nach 1–2 Minuten neu.")),
      !AM_PC && offen ? h("button", { type: "button", class: "knopf haupt", onclick: kopiereAuftrag }, "📋 Auftrag für Claude kopieren") : null,
      offen ? h("p", { class: "hinweis" }, `${offen} Meldung(en) warten noch auf Claude Code.`) : null,
      M.sync === false ? h("p", { class: "hinweis warnung" }, "Die Meldungen konnten noch nicht an Claude Code übergeben werden. Schließe das schwarze Fenster und starte die App mit App-starten.bat neu.") : null),
    h("section", { class: "panel" },
      M.liste.length ? liste : h("p", { class: "hinweis" }, "Noch keine Fragen gemeldet. Tippe in einer Frage oben rechts auf „⚑ Melden“, wenn etwas nicht stimmt.")),
    h("a", { class: "knopf leise", href: "#/einstellungen" }, "Zurück zu den Einstellungen"));
}

// ---------- Navigation ----------

const PLAENE = { level: planLevel, boss: planBoss, mission: planMission, schwaechen: planSchwaechen, blitz: planBlitz, endlos: planEndlos, arbeitsblatt: planArbeitsblatt };

function zurueckFuer(art, ziel) {
  if (art === "level") return `#/karte/${K.level.get(ziel)?.doc.id}`;
  if (art === "boss") return `#/karte/${K.welten.get(ziel)?.doc.id}`;
  if (art === "arbeitsblatt") return `#/karte/${ziel}`;
  if (ziel.startsWith("d:")) return `#/karte/${ziel.slice(2)}`;
  return "#/";
}

function route() {
  aufraeumen?.();
  aufraeumen = null;
  document.querySelectorAll("dialog").forEach(d => d.remove());
  const teile = decodeURIComponent(location.hash.replace(/^#\/?/, "")).split("/");
  const [was, a, ...rest] = teile;
  const b = rest.join("/");
  if (was === "spiel" && PLAENE[a] && b) {
    let def;
    try {
      def = PLAENE[a](b);
    } catch (e) {
      console.warn("Unbekanntes Spielziel:", b, e);
      return startSeite();
    }
    def.zurueck = zurueckFuer(a, b);
    def.link = location.hash;
    fuelle(app);
    aufraeumen = spieleRunde(app, def);
  } else if (was === "klausur" && docVon(a)?.probeklausur) {
    fuelle(app);
    aufraeumen = spieleKlausur(app, docVon(a));
  } else if (was === "rechnen" && hatRechnen(a)) {
    if (!b) seite(rechnenUebersicht(a));
    else {
      fuelle(app, kopfleiste(), h("div", { class: "seite" }));
      if (!rechnenUeben(app.querySelector(".seite"), a, b)) seite(rechnenUebersicht(a));
    }
  } else if (was === "karte") kartenSeite(a);
  else if (was === "statistik") statistikSeite();
  else if (was === "fortschritt") fortschrittSeite();
  else if (was === "einstellungen") einstellungenSeite();
  else if (was === "meldungen") meldungenSeite();
  else startSeite();
  if (was !== "karte") window.scrollTo(0, 0);
}

async function start() {
  try {
    await speicher.starteSpeicher();
    await ladeKatalog();
    await ladeSpielstand();
    await ladeMeldungen();
  } catch (e) {
    fuelle(app, h("div", { class: "seite" }, h("h1", {}, e.keinServer ? (AM_PC ? "Die App ist gerade nicht gestartet" : "Keine Verbindung") : "Der Lernstoff konnte nicht geladen werden"), h("p", {}, e.message)));
    return;
  }
  addEventListener("hashchange", route);
  route();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}

start();
