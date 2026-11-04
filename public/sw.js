// RutaExpress · service worker
// Estrategias:
//   · Cache First            → app shell (HTML, CSS, JS, íconos precacheados)
//   · Network First          → datos (API y data/*.json) y páginas SSR de fichas
//   · Stale-While-Revalidate → imágenes e íconos no precacheados
importScripts('./js/db.js'); // self.RutaDB (IndexedDB compartida con la página)

const VERSION = 'v6'; // ⚠️ súbela en cada publicación para que los usuarios reciban los cambios
const CACHE_SHELL = `rutaexpress-shell-${VERSION}`;
const CACHE_DATOS = `rutaexpress-datos-${VERSION}`;
const CACHE_IMAGENES = `rutaexpress-img-${VERSION}`;
const CACHES_ACTUALES = [CACHE_SHELL, CACHE_DATOS, CACHE_IMAGENES];

// Rutas relativas a la ubicación de sw.js: funciona en "/" y en "/repo/" (GitHub Pages)
const SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/api.js',
  './js/db.js',
  './js/prefs.js',
  './js/router.js',
  './js/vistas.js',
  './js/util.js',
  './js/splash.js',
  './js/instalacion.js',
  './js/registro-sw.js',
  './js/ficha-acciones.js',
  './js/plantilla-ficha.js',
  './js/conexion.js',
  './js/resenas.js',
  './js/notificaciones.js',
  './js/vista-avisos.js',
  './js/vista-cerca.js',
  './js/dispositivo.js',
  './js/ficha-ssr.js',
  './data/paradas.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/badge-72.png',
];

const BASE = new URL('./', self.location).href; // p. ej. http://localhost:3000/ o https://usuario.github.io/repo/
const OFFLINE_URL = new URL('./offline.html', self.location).href;
const INDEX_URL = new URL('./index.html', self.location).href;

// ---------- install ----------
self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE_SHELL).then((cache) => cache.addAll(SHELL)));
});

// ---------- activate: limpiar versiones viejas ----------
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(
        claves.filter((c) => c.startsWith('rutaexpress-') && !CACHES_ACTUALES.includes(c)).map((c) => caches.delete(c))
      )
    )
  );
});

// ---------- Estrategias ----------
async function cacheFirst(peticion) {
  const enCache = await caches.match(peticion, { ignoreSearch: true });
  if (enCache) return enCache;
  const respuesta = await fetch(peticion);
  if (respuesta.ok) (await caches.open(CACHE_SHELL)).put(peticion, respuesta.clone());
  return respuesta;
}

async function networkFirst(peticion, { nombreCache = CACHE_DATOS, respaldo } = {}) {
  const cache = await caches.open(nombreCache);
  try {
    const respuesta = await fetch(peticion);
    if (respuesta.ok) cache.put(peticion, respuesta.clone());
    return respuesta;
  } catch (error) {
    const enCache = await caches.match(peticion); // busca en todas las cachés (incluye el precache)
    if (enCache) return enCache;
    if (respaldo) return respaldo();
    throw error;
  }
}

async function staleWhileRevalidate(peticion) {
  const cache = await caches.open(CACHE_IMAGENES);
  const enCache = await cache.match(peticion);
  const deRed = fetch(peticion)
    .then((r) => {
      if (r.ok) cache.put(peticion, r.clone());
      return r;
    })
    .catch(() => undefined);
  return enCache || (await deRed) || Response.error();
}

// ---------- Enrutado de peticiones ----------
self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET') return; // POST de reseñas/push van directo a la red
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // p. ej. Google Maps

  const relativa = url.href.startsWith(BASE) ? url.href.slice(BASE.length) : url.pathname;

  // 1) Navegaciones (HTML)
  if (request.mode === 'navigate') {
    // Fichas SSR → red primero, luego copia en caché; si nunca se visitó, se redirige
    // a la ficha CSR (#/parada/id), que se dibuja con el respaldo de IndexedDB.
    if (relativa.startsWith('parada/')) {
      const id = relativa.slice('parada/'.length).split(/[?#]/)[0];
      evento.respondWith(
        networkFirst(request, {
          respaldo: async () =>
            (await caches.match(INDEX_URL)) ? Response.redirect(`${BASE}#/parada/${id}`, 302) : caches.match(OFFLINE_URL),
        })
      );
      return;
    }
    // Resto del shell (index) → caché primero (la app funciona offline al instante)
    evento.respondWith(
      caches.match(INDEX_URL).then((r) => r || fetch(request)).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 2) Datos → red primero
  if (relativa.startsWith('api/') || relativa.startsWith('data/')) {
    if (relativa.startsWith('api/salud') || relativa.startsWith('api/push')) return; // siempre a la red
    evento.respondWith(networkFirst(request));
    return;
  }

  // 3) Imágenes → stale-while-revalidate
  if (request.destination === 'image') {
    evento.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 4) Shell estático (CSS, JS, manifiesto) → caché primero
  evento.respondWith(cacheFirst(request));
});

// ---------- Background Sync: enviar reseñas pendientes ----------
const URL_RESENAS = new URL('./api/resenas', self.location).href;

async function enviarResenasPendientes() {
  const pendientes = await self.RutaDB.leerPendientes();
  const enviadas = [];
  for (const resena of pendientes) {
    const respuesta = await fetch(URL_RESENAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resena),
    }); // si no hay red, fetch lanza error → el navegador reintentará el sync más tarde
    if (respuesta.ok) {
      await self.RutaDB.guardarResena(await respuesta.json());
      await self.RutaDB.borrarPendiente(resena.id);
      enviadas.push(resena.id);
    } else if (respuesta.status === 400) {
      await self.RutaDB.borrarPendiente(resena.id); // inválida: no se reintenta
    } else {
      throw new Error(`El servidor respondió ${respuesta.status}`);
    }
  }
  if (enviadas.length) {
    const clientes = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clientes.forEach((c) => c.postMessage({ tipo: 'RESENAS_SINCRONIZADAS', ids: enviadas }));
    if (!clientes.some((c) => c.visibilityState === 'visible') && self.Notification?.permission === 'granted') {
      await self.registration.showNotification('Comentario publicado', {
        body: enviadas.length === 1 ? 'Tu comentario ya es visible para otros usuarios.' : `Se publicaron ${enviadas.length} comentarios.`,
        icon: './icons/icon-192.png',
        badge: './icons/badge-72.png',
        tag: 'resenas-sync',
      });
    }
  }
}

self.addEventListener('sync', (evento) => {
  if (evento.tag === 'sync-resenas') {
    evento.waitUntil(enviarResenasPendientes());
  }
});

// ---------- Ciclo de vida: actualización controlada por el usuario ----------
// La versión nueva queda en "waiting" hasta que el usuario pulsa «Actualizar»;
// entonces la página envía SKIP_WAITING y el SW nuevo se activa.
self.addEventListener('message', (evento) => {
  if (evento.data?.tipo === 'SKIP_WAITING') self.skipWaiting();
  if (evento.data?.tipo === 'VERSION') evento.source?.postMessage({ tipo: 'VERSION', version: VERSION });
});

// Al activarse, toma el control de las pestañas abiertas sin esperar a recargarlas
self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});

// ---------- Notificaciones push ----------
const ICONOS_AVISO = { desvio: '↪️', retraso: '⏱️', obras: '🚧', info: 'ℹ️' };

async function guardarAviso(aviso) {
  const lista = (await self.RutaDB.leerMeta('avisos').catch(() => null)) || [];
  lista.unshift(aviso);
  await self.RutaDB.ponerMeta('avisos', lista.slice(0, 20));
}

self.addEventListener('push', (evento) => {
  let aviso;
  try {
    aviso = evento.data ? evento.data.json() : null;
  } catch {
    aviso = { titulo: 'RutaExpress', cuerpo: evento.data?.text() };
  }
  aviso = { id: `${Date.now()}`, titulo: 'RutaExpress', cuerpo: 'Hay un aviso nuevo.', url: './#/avisos', tipo: 'info', fecha: new Date().toISOString(), ...aviso };

  evento.waitUntil(
    (async () => {
      await guardarAviso(aviso);
      const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clientes.forEach((c) => c.postMessage({ tipo: 'AVISO_RECIBIDO', aviso }));
      await self.registration.showNotification(`${ICONOS_AVISO[aviso.tipo] || ''} ${aviso.titulo}`.trim(), {
        body: aviso.cuerpo,
        icon: './icons/icon-192.png',
        badge: './icons/badge-72.png',
        tag: `aviso-${aviso.tipo}`,
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: new URL(aviso.url, self.location).href },
        actions: [
          { action: 'ver', title: 'Ver detalles' },
          { action: 'cerrar', title: 'Cerrar' },
        ],
      });
    })()
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  if (evento.action === 'cerrar') return;
  const destino = evento.notification.data?.url || BASE;
  evento.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const abierto = clientes.find((c) => c.url.startsWith(BASE));
      if (abierto) {
        await abierto.focus();
        return abierto.navigate?.(destino).catch(() => {});
      }
      return self.clients.openWindow(destino);
    })()
  );
});
