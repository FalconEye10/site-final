// ==============================================================================
// Service Worker pentru Notificări Push (Interact Camena Piatra Neamț)
// ==============================================================================

// Listener pentru evenimentul 'push' - primește payload-ul de la server
self.addEventListener('push', (event) => {
  let data = {
    title: 'Interact Camena',
    body: 'Ai primit o notificare nouă!',
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: '/#dashboard' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        ...data,
        ...payload,
        data: {
          url: payload.data?.url || payload.url || '/#dashboard',
          timestamp: Date.now(),
        },
      };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: [
      { action: 'open', title: 'Deschide Aplicația' },
      { action: 'close', title: 'Închide' },
    ],
    tag: data.tag || 'interact-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Listener pentru click pe notificare
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/#dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
