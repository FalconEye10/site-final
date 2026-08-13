// ==============================================================================
// Service Worker pentru Notificări Push (Interact Camena Piatra Neamț)
// ==============================================================================

// Activare imediată la instalare fără a aștepta închiderea altor tab-uri
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: data.data,
    vibrate: [150, 50, 150],
    tag: data.data?.tag || 'interact-notification',
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'open_app', title: 'Deschide' },
      { action: 'dismiss', title: 'Închide' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
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
