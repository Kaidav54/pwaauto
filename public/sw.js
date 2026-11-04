// RutaExpress · service worker (versión básica: install, activate, fetch)
const VERSION = 'v1';
const CACHE_SHELL = `rutaexpress-shell-${VERSION}`;

// Archivos del app shell (rutas relativas a la ubicación de sw.js)
const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// 1) install: precachear el shell
self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE_SHELL).then((cache) => cache.addAll(SHELL)));
});

// 2) activate: borrar cachés de versiones anteriores
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((c) => c.startsWith('rutaexpress-') && c !== CACHE_SHELL).map((c) => caches.delete(c)))
    )
  );
});

// 3) fetch: primero caché, si no, red
self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  evento.respondWith(caches.match(evento.request).then((r) => r || fetch(evento.request)));
});
