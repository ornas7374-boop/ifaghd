// Service worker لعَزم: يخلّي التطبيق يشتغل بدون إنترنت.
// - الصفحات: الشبكة أولًا (عشان التحديثات)، وإذا ما في نت نرجع للنسخة المحفوظة.
// - ملفات /_next/static: أسماؤها فيها hash فلا تتغير — المحفوظ أولًا.
const CACHE = "azm-v1";
const PAGES = [
  "/", "/stuck", "/timer", "/log", "/insights", "/plans", "/more", "/program",
  "/habits", "/review", "/control", "/tasks", "/constitution", "/settings",
];

async function precache() {
  const cache = await caches.open(CACHE);
  const assets = new Set(["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]);
  await Promise.all(
    PAGES.map(async (path) => {
      try {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) return;
        await cache.put(path, res.clone());
        const html = await res.text();
        for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) assets.add(m[0]);
      } catch {}
    }),
  );
  await Promise.all([...assets].map((a) => cache.add(a).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/calendar.ics")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match("/")) || Response.error()),
    );
    return;
  }

  // باقي الطلبات (RSC، أيقونات، manifest): الشبكة ثم المحفوظ.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && !url.searchParams.has("_rsc")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(req)) || Response.error()),
  );
});
