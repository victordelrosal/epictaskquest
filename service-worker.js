const CACHE_NAME = 'epictaskquest-cache-v1';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/scripts.js',
  '/hashtag-hierarchy.css',
  '/hashtag-hierarchy.js',
  '/js/AlarmService.js',
  '/js/AudioService.js',
  '/alert.mp3',
  '/trophy.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
