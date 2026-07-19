const CACHE_NAME = 'fintrack-cache-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Tahap Install: Menyimpan aset dasar ke dalam memori cadangan (cache)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Tahap Aktivasi: Membersihkan versi memori cadangan lama jika ada pembaruan
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Tahap Pengambilan Data: Menjalankan strategi Network First
self.addEventListener('fetch', (event) => {
  // Kita lewati (bypass) pengiriman data penting seperti Firebase Database agar tidak bentrok
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebaseinstallations.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }
  
  event.respondWith(
    // Mencoba mengambil data dari Internet (Network) terlebih dahulu
    fetch(event.request)
    .then((networkResponse) => {
      // Jika internet berhasil tersambung, simpan salinan datanya ke memori cadangan (cache)
      if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    })
    .catch(() => {
      // Jika internet mati (offline), ambil data dari memori cadangan (cache)
      return caches.match(event.request);
    })
  );
});