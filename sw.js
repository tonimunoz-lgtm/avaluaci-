// sw.js — Service Worker per a AvaluApp
const CACHE_NAME = 'avaluapp-v1';

// Fitxers principals a cachear per funcionar offline
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/classroom.js',
  '/classroom-ui.js',
  '/competencial.js',
  '/competencial-config.js',
  '/formula-info.js',
  '/auto-recalc.js',
  '/improvements.js',
  '/modals.js',
  '/terms.js',
  '/tutoria.js',
  '/tutoria-comentaris.js',
  '/ultracomentator.js',
  '/administrador.js',
  '/administrador-enhancements.js',
  '/icon-192.png',
  '/icon-512.png'
];

// Instal·lació: cachear recursos estàtics
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('SW: alguns fitxers no s\'han pogut cachear', err);
      });
    })
  );
  self.skipWaiting();
});

// Activació: eliminar caches antics
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network first, cache fallback
// (per Firebase i Google APIs sempre va a la xarxa)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Deixar passar sempre les peticions externes (Firebase, Google, CDNs)
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.includes('accounts.google.com') ||
    url.includes('cdn.tailwindcss.com') ||
    url.includes('cdn.jsdelivr.net') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) {
    return; // no interceptar, va directe a la xarxa
  }

  // Per a recursos locals: network first, cache com a fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar còpia fresca a la cache
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sense xarxa: servir des de cache
        return caches.match(event.request);
      })
  );
});
