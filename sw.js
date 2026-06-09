self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force la mise à jour immédiate
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); // Prend le contrôle des pages ouvertes
});
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/img/logo.png', 
            badge: '/img/badge.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2'
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});
