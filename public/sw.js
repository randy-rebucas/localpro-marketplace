// LocalPro Service Worker — push notifications + navigation caching
const CACHE_NAME = "localpro-v2";

// ─── Install: cache offline fallback ────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(["/offline"]))
      .catch(() => {
        // /offline page may not exist yet — skip silently
      })
  );
  // Do NOT auto-skipWaiting — the new worker waits until the user confirms
  // the update via the in-app banner (SKIP_WAITING message below).
});

// ─── Message: allow client to trigger skip-waiting ───────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── Activate: purge old caches ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// ─── Fetch: network-first with offline fallback for navigations ──────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests over http(s)
  if (request.method !== "GET") return;
  if (!request.url.startsWith("http")) return;
  // Never intercept API routes — always hit the network
  if (new URL(request.url).pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest navigation response
          const cloned = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, cloned))
            .catch(() => {});
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached ?? caches.match("/offline"))
        )
    );
  }
});

// ─── Push: show native notification ─────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "LocalPro", body: event.data.text() };
  }

  const options = {
    body: data.body ?? "",
    icon: data.icon ?? "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    vibrate: [100, 50, 100],
    tag: data.tag ?? "localpro-notification",
    renotify: true,
    data: { url: data.url ?? "/" },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── Notification click: focus or open URL ───────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find(
          (c) => new URL(c.url).pathname === new URL(url, self.location.origin).pathname && "focus" in c
        );
        if (existing) return existing.focus();
        return clients.openWindow(url);
      })
  );
});
