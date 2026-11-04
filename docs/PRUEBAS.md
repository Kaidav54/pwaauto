# Reporte de pruebas · RutaExpress

| Dato | Valor |
|---|---|
| Proyecto | RutaExpress — Guía de paradas de transporte y rutas locales |
| Versión del SW | `v6` (ver `public/sw.js`) |
| Fecha | ____ / ____ / ______ |
| Responsable | ______________________ |
| URL probada | `http://localhost:3000` · `https://<usuario>.github.io/<repo>/` |

## 12.1 Herramientas

| Herramienta | Para qué se usa |
|---|---|
| **Chrome / Edge DevTools › Application** | Manifiesto, service worker (estado, *Update on reload*, *skipWaiting*), Cache Storage, IndexedDB, localStorage, *Background Sync* y *Push* (botones para simular eventos). |
| **DevTools › Network** | Casilla **Offline** y *throttling* para probar sin conexión; ver qué responde el SW (columna *Size* = “(ServiceWorker)”). |
| **Lighthouse** (DevTools › Lighthouse) | Auditoría de rendimiento, accesibilidad, buenas prácticas y SEO; criterios de PWA instalable. |
| **DevTools › Sensors** | Simular coordenadas GPS para «Cerca de mí». |
| **`npm test`** (`node:test`) | Pruebas automáticas del servidor: API, SSR, reseñas, push y archivos PWA (`test/servidor.test.js`). |
| **Teléfono Android real** (Chrome) | Instalación, splash del sistema, vibración, notificaciones push, GPS real. |
| `chrome://serviceworker-internals` / `edge://serviceworker-internals` | Ver y depurar todos los SW registrados. |

## 12.2 Casos de prueba

Resultado: ✅ pasa · ❌ falla · ⚠️ parcial. Los marcados como ✅ fueron verificados durante el desarrollo
(Edge headless + `npm test`); repítelos y completa la columna «Evidencia» con tus capturas.

| ID | Fase | Caso | Pasos | Resultado esperado | Resultado | Evidencia |
|---|---|---|---|---|---|---|
| CP-01 | 0 | Servidor arranca | `npm start`, abrir `/api/salud` | JSON `{"ok":true}` | ✅ | |
| CP-02 | 1 | App shell | Abrir `/` | Cabecera, contenido y menú inferior visibles | ✅ | |
| CP-03 | 2 | Manifiesto válido | DevTools › Application › Manifest | Nombre, íconos 192/512 y *maskable* sin errores | ✅ | |
| CP-04 | 3 | Registro del SW | Application › Service Workers | `sw.js` *activated and running* | ✅ | |
| CP-05 | 4 | Catálogo CSR | Ir a **Paradas**, buscar «12», filtrar «Combis» | La lista se filtra sin recargar la página | ✅ | |
| CP-06 | 4 | Ficha SSR | Abrir `/parada/terminal-centro` con JS desactivado | La ficha (rutas, horarios, tarifa) se ve completa | ✅ | |
| CP-07 | 5 | Splash del sistema | Instalar y abrir desde el ícono (Android) | Fondo verde con ícono y nombre | | |
| CP-08 | 5 | Splash en la app | Recargar `/` | Splash animado ~0.7 s y luego Home | ✅ | |
| CP-09 | 5 | Botón instalar | Abrir en Chrome/Edge escritorio o Android | Aparece «📲 Instalar app» y abre el diálogo | | |
| CP-10 | 6 | IndexedDB | Ver Paradas → Application › IndexedDB › `rutaexpress` | Almacén `paradas` con 8 registros | ✅ | |
| CP-11 | 6 | localStorage | Ajustes › tema «Oscuro», recargar | El tema se conserva (`rutaexpress:prefs`) | ✅ | |
| CP-12 | 6 | Favoritas | Ficha › «Guardar en favoritas» › Inicio | Aparece en «Mis paradas» con ★ | ✅ | |
| CP-13 | 7 | Offline: shell y catálogo | Network › Offline, recargar, ir a Paradas | La app abre y lista paradas; indicador «Sin conexión» | ✅ | |
| CP-14 | 7 | Offline: ficha SSR visitada | Visitar una ficha online, luego offline y reabrirla | Se sirve la copia en caché | ✅ | |
| CP-15 | 7 | Offline: ficha no visitada | Offline, abrir `/parada/hospital-general` | Redirige a la ficha CSR con datos de IndexedDB | ✅ | |
| CP-16 | 8 | Reseña online | Publicar «La ruta 12 está tardando 20 min» | Se ve en la lista y en `/api/paradas/:id/resenas` | ✅ | |
| CP-17 | 8 | Reseña offline + Background Sync | Offline, publicar comentario, volver online | Aparece «⏳ pendiente»; al reconectar se envía sola y se quita la marca | ✅ | |
| CP-18 | 8 | Sin duplicados | Reintentar el mismo envío (`npm test` CP-06) | El servidor guarda una sola copia | ✅ | |
| CP-19 | 9 | Nueva versión | Cambiar `VERSION` en `sw.js`, recargar | Banner «Hay una nueva versión» → «Actualizar» recarga con la versión nueva | ✅ | |
| CP-20 | 10 | Notificación local | Avisos › «Probar notificación local» | Aparece la notificación del sistema | ✅ | |
| CP-21 | 10 | Push | Avisos › «Activar avisos push» › enviar «Obras viales en Av. Central» | Llega la notificación; al tocarla abre Avisos | ✅ | |
| CP-22 | 11 | Cerca de mí | Sensors › ubicación (19.4198, -99.1595) › Buscar | «Parada Universidad · 176 m al noroeste» | ✅ | |
| CP-23 | 11 | Hidratación SSR | Abrir `/parada/universidad` | Aparecen «Guardar en favoritas» y «Compartir»; el formulario funciona | ✅ | |
| CP-24 | 11 | Vibración y compartir | En Android, publicar comentario / tocar Compartir | Vibra; se abre la hoja de compartir nativa | | |
| CP-25 | 12 | Lighthouse | DevTools › Lighthouse › Mobile | Rendimiento, accesibilidad y buenas prácticas ≥ 90 | | |
| CP-26 | 13 | GitHub Pages | Abrir la URL publicada | Se instala, funciona offline; catálogo y fichas en modo CSR | | |

## Resultados de Lighthouse

| Categoría | Puntuación | Observaciones |
|---|---|---|
| Rendimiento | | |
| Accesibilidad | | |
| Buenas prácticas | | |
| SEO | | |

## Incidencias encontradas

| # | Descripción | Severidad | Estado |
|---|---|---|---|
| 1 | | | |

## Conclusión

_______________________________________________________________________
