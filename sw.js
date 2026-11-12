const CACHE = "lab-pvgas-v65";
const FILES = ["./", "./index.html", "./app.js", "./auth.js", "./photos.js", "./formulas.js", "./cloud.js", "./vendor/supabase.min.js", "./refs.js", "./calc.js", "./calc2.js", "./data.js", "./devices.js", "./docs.js", "./docs2.js", "./mocan.js", "./zip.js", "./vendor/exceljs.min.js", "./manifest.webmanifest",
  "./vendor/html2canvas.min.js", "./vendor/jspdf.umd.min.js", "./vendor/temml.min.js", "./vendor/temml-local.css", "./vendor/Temml.woff2", "./assets/logo.jpg", "./assets/logo2026.jpg", "./assets/vilas.jpg", "./assets/wm.jpg", "./assets/wm_pg.jpg", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
// Network first so updates arrive when online; cache when offline at site.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;   // máy chủ đồng bộ (Supabase) đi thẳng, không qua cache
  // cache: "no-cache" revalidates with the server, so the 10-minute GitHub Pages HTTP cache cannot hold back an update
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./index.html"))));
});
