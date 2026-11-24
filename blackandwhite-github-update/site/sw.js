/* Hace que la página se pueda instalar como app.
   Siempre busca la versión nueva en internet; si no hay señal, muestra la última guardada. */
const CACHE = "bw-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;  // Supabase y fuentes van directo
    e.respondWith(
        fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
        }).catch(() => caches.match(req))
    );
});
