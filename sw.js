self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Uygulamanın Firebase ile kesintisiz haberleşebilmesi için proxy caching kullanmıyoruz, pass-through yapıyoruz.
});
