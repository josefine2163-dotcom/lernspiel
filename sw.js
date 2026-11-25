// ---------- Service Worker: macht die App offline nutzbar ----------
// Immer zuerst aus dem Netz laden (damit neue Lernstoffe sofort ankommen),
// ohne Netz die zuletzt gespeicherte Fassung nehmen.

const SPEICHER = "lernspiel-v12";
const APP_DATEIEN = [
  "./", "index.html", "style.css", "manifest.webmanifest", "icon.svg",
  "app.js", "util.js", "speicher.js", "katalog.js", "aufgaben.js", "spiel.js", "runde.js", "klausur.js", "pruefen.js", "meldungen.js", "rechnen.js", "zeichen.js",
  "daten/index.json"
];

// Auch die Lernstoff-Dateien gleich mitspeichern, damit die Level ohne laufenden Server sichtbar bleiben.
async function speichereAlles() {
  const c = await caches.open(SPEICHER);
  await c.addAll(APP_DATEIEN);
  const index = await (await c.match("daten/index.json")).json();
  await c.addAll((index.dokumente || []).map(d => "daten/" + d));
}

self.addEventListener("install", event => {
  event.waitUntil(speichereAlles().then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SPEICHER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const kopie = res.clone();
          caches.open(SPEICHER).then(c => c.put(req, kopie));
        }
        return res;
      })
      .catch(async () => {
        const gespeichert = await caches.match(req, { ignoreSearch: true });
        if (gespeichert) return gespeichert;
        // Die Startseite nur für Seitenaufrufe nehmen, nie anstelle einer fehlenden Lernstoff-Datei.
        return req.mode === "navigate" ? caches.match("index.html") : Response.error();
      })
  );
});
