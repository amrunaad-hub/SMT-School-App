import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

precacheAndRoute(self.__WB_MANIFEST);

// SPA offline fallback: unknown navigations (e.g. refreshing /communication
// while offline) fall back to the precached app shell — except /api/ and
// /uploads/, which must reach the network (or a real 404) rather than
// silently getting index.html back, which is exactly the bug that broke
// attachment Preview/Download links before this file existed.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), {
  denylist: [/^\/api\//, /^\/uploads\//],
}));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* non-JSON payload, ignore */ }

  event.waitUntil(self.registration.showNotification(data.title || 'VidyaSetu', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
  }));
});

// Always navigate an existing tab to the target URL (including its query
// string — deep links carry ?module=&noticeId=) rather than just focusing
// whatever was already open, which previously left the click landing
// wherever the app happened to already be instead of the actual notice.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      const existing = clientList[0];
      if (existing) {
        if ('navigate' in existing) await existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
