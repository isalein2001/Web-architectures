self.addEventListener('push', (event) => {
  const payload = event.data?.json?.() || {};
  const title = payload.title || 'NEXT REPS';
  const options = {
    body: payload.body || 'There is a new NEXT REPS update.',
    icon: '/favicon.svg?v=3',
    badge: '/favicon.svg?v=3',
    data: {
      url: payload.url || '/dashboard',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existingWindow = windows.find((client) => client.url === targetUrl);

    if (existingWindow) {
      return existingWindow.focus();
    }

    return clients.openWindow(targetUrl);
  })());
});
