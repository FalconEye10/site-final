// ==============================================================================
// Service Worker pentru Notificări Push (Interact Camena Piatra Neamț)
// ==============================================================================

// Versioned cache for offline resilience and fast asset loading
const CACHE_NAME = 'interact-camena-v8-3-1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json',
  '/termeni-si-conditii.html',
  '/politica-de-confidentialitate.html'
];

// Activare imediată la instalare și precache asset-uri cheie
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('interact-camena-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptare cereri de imagini și stiluri pentru cache rapid (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorăm apelurile non-GET sau către API-ul Supabase / auth / realtime
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/storage/')
  ) {
    return;
  }

  // Pentru imagini și asset-uri statice locale, aplicăm Stale-While-Revalidate
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/logo.png' ||
    url.pathname === '/img.jpeg' ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});

// Listener pentru evenimentul 'push' - recepționează mesajul de la serverul Push (Google FCM/Mozilla/Apple)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Interact Camena',
    body: 'Ai o nouă notificare în platformă!',
    icon: '/logo.png',
    badge: '/logo.png',
    data: {
      url: '/#dashboard',
    },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || payload.message || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: {
          url: payload.url || payload.data?.url || '/#dashboard',
          timestamp: Date.now(),
          ...payload.data,
        },
      };
    } catch (err) {
      data.body = event.data.text() || data.body;
    }
  }

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    data: data.data,
    tag: (data.data && data.data.tag) || `interact_${Date.now()}`,
    renotify: true,
    requireInteraction: false,
  };

  if (!isIOS) {
    options.vibrate = [150, 50, 150];
    options.actions = [
      { action: 'open_app', title: 'Deschide' },
      { action: 'dismiss', title: 'Închide' },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options).catch((err) => {
      console.warn('showNotification standard failed, retrying with minimal options:', err);
      return self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/logo.png',
      });
    })
  );
});

// Listener pentru click pe notificare
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/#dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Dacă există deja o fereastră deschisă a aplicației, o focalizăm
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Altfel, deschidem o fereastră/tab nou
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
