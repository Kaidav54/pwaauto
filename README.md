# 🚌 RutaExpress

Guía de paradas de autobús y bases de combis: rutas, horarios de primera y última salida, tarifas,
comentarios de usuarios en tiempo real, avisos push de desvíos y la parada más cercana por GPS.

Es una **Aplicación Web Progresiva (PWA)**: se instala, funciona sin conexión, sincroniza los
comentarios al recuperar la red y recibe notificaciones push.

- **Repositorio:** https://github.com/Kaidav54/pwaauto
- **App publicada:** https://kaidav54.github.io/pwaauto/

## Funcionalidades por fase

| Fase | Qué incluye | Archivos principales |
|---|---|---|
| 0 | Node + Express, dependencias, servidor mínimo | `package.json`, `.gitignore`, `server.js` |
| 1 | App shell (cabecera, contenido, menú) y estilos con tema claro/oscuro | `public/index.html`, `public/css/styles.css` |
| 2 | Íconos generados por script (normales y *maskable*) y manifiesto | `scripts/generar-iconos.js`, `public/manifest.json` |
| 3 | Registro del SW y eventos `install` / `activate` / `fetch` | `public/js/registro-sw.js`, `public/sw.js` |
| 4 | Catálogo **CSR** (enrutador por hash) y ficha **SSR** (`/parada/:id`) | `public/js/router.js`, `public/js/vistas.js`, `server/render.js`, `public/js/plantilla-ficha.js` |
| 5 | Splash del sistema (manifiesto), splash en la app y Home con botón «Instalar» | `public/js/splash.js`, `public/js/instalacion.js` |
| 6 | IndexedDB (respaldo, favoritas, cola), preferencias en localStorage | `public/js/db.js`, `public/js/prefs.js`, `public/js/api.js` |
| 7 | `offline.html`, estrategias Cache First / Network First / Stale-While-Revalidate, indicador de conexión | `public/sw.js`, `public/js/conexion.js` |
| 8 | API de reseñas, guardar local primero, **Background Sync** | `server.js`, `public/js/resenas.js`, `public/sw.js` |
| 9 | `skipWaiting` + `clients.claim`, aviso de versión nueva | `public/js/registro-sw.js`, `public/sw.js` |
| 10 | Notificaciones locales y **push** con VAPID | `server/push.js`, `public/js/notificaciones.js`, `public/js/vista-avisos.js` |
| 11 | GPS, vibración y compartir; vista «Cerca de mí»; hidratación de la ficha SSR | `public/js/dispositivo.js`, `public/js/vista-cerca.js`, `public/js/ficha-ssr.js` |
| 12 | Pruebas automáticas y plantilla del reporte | `test/servidor.test.js`, `docs/PRUEBAS.md` |
| 13 | Publicación en GitHub Pages con GitHub Actions | `.github/workflows/pages.yml` |

## Puesta en marcha (local, con servidor)

```bash
node -v            # 18 o superior
npm install
npm start          # http://localhost:3000
npm test           # pruebas automáticas
```

- Las claves **VAPID** se generan solas la primera vez en `.vapid.json` (no se sube a git).
  También puedes generarlas con `npm run vapid` o usar las variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`.
- Para proteger el envío de avisos define `ADMIN_TOKEN`; el cliente debe mandar la cabecera `x-admin-token`.
- Los service workers solo funcionan en `localhost` o con **HTTPS**. Para probar en el teléfono usa
  Chrome › `chrome://inspect` › *Port forwarding* (3000 → localhost:3000) o un túnel HTTPS.
- Las coordenadas de `public/data/paradas.json` son de ejemplo: cámbialas por las paradas de tu ciudad.

## Estructura

```
server.js              Express: API, SSR y push
server/render.js       Plantilla HTML de la ficha SSR
server/push.js         VAPID, suscripciones y envío
server/almacen.js      Persistencia en archivos JSON (data/)
public/                La PWA (lo único que se publica en GitHub Pages)
  index.html           App shell
  sw.js                Service worker
  manifest.json        Manifiesto
  offline.html         Página sin conexión
  data/paradas.json    Catálogo de paradas
  js/                  Módulos del cliente
scripts/               Generadores de íconos y claves VAPID
test/                  Pruebas automáticas
docs/PRUEBAS.md        Reporte de pruebas
```

## 13. Publicación en GitHub Pages

### 13.1 Subir el repositorio

```bash
git remote add origin https://github.com/Kaidav54/pwaauto.git
git push -u origin main
```

### 13.2 Activar GitHub Pages

En GitHub: **Settings › Pages › Build and deployment › Source: _GitHub Actions_**.
El workflow `.github/workflows/pages.yml` ejecuta `npm test` y publica la carpeta `public/`.
La URL aparece en la pestaña **Actions** y en **Settings › Pages**.

### 13.3 Qué funciona en GitHub Pages y qué necesita el servidor

GitHub Pages solo sirve archivos estáticos. La app detecta si hay servidor (`/api/salud`) y se adapta:

| Función | GitHub Pages | Servidor Node |
|---|---|---|
| Instalación, manifiesto, splash | ✅ | ✅ |
| App shell, offline, caché | ✅ | ✅ |
| Catálogo CSR | ✅ (`data/paradas.json`) | ✅ (`/api/paradas`) |
| Ficha de parada | ✅ CSR (`#/parada/:id`) | ✅ **SSR** (`/parada/:id`) + hidratación |
| IndexedDB, localStorage, favoritas | ✅ | ✅ |
| Cerca de mí (GPS), vibrar, compartir | ✅ | ✅ |
| Notificación local | ✅ | ✅ |
| Reseñas | ⚠️ se guardan en el dispositivo (cola) | ✅ se publican y sincronizan con Background Sync |
| Notificaciones push | ❌ (necesita enviar desde un servidor) | ✅ |

Para tener todo en línea, despliega el servidor en un servicio con Node (Render, Railway, Fly.io…)
con `npm start`; el mismo código sirve la PWA y la API.

### 13.4 Publicar una actualización

1. Haz tus cambios y **sube `VERSION`** en `public/sw.js` (p. ej. `v6` → `v7`).
   Si agregas archivos nuevos al shell, añádelos a la lista `SHELL`.
2. `npm test`
3. `git commit -am "Descripción del cambio" && git push`
4. GitHub Actions vuelve a publicar. Los usuarios verán el aviso **«Hay una nueva versión»**
   y al pulsar **Actualizar** el SW nuevo se activa (`skipWaiting`) y toma el control (`clients.claim`).
