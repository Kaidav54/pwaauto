// Registro del service worker y aviso de versión nueva
import { url } from './util.js';

const UNA_HORA = 60 * 60 * 1000;
let actualizando = false; // true solo cuando el usuario pulsó «Actualizar»

function mostrarBannerActualizacion(registro) {
  let banner = document.getElementById('banner-actualizacion');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'banner-actualizacion';
    banner.className = 'banner';
    banner.setAttribute('role', 'alert');
    banner.innerHTML = `<span>🚀 Hay una nueva versión de RutaExpress.</span>
      <span class="botones" style="margin:0">
        <button class="boton boton--acento" data-actualizar>Actualizar</button>
        <button class="boton boton--sec" data-despues style="color:#fff;border-color:#fff">Luego</button>
      </span>`;
    document.body.append(banner);
    banner.querySelector('[data-despues]').addEventListener('click', () => (banner.hidden = true));
  }
  banner.hidden = false;
  banner.querySelector('[data-actualizar]').onclick = () => {
    actualizando = true;
    banner.querySelector('[data-actualizar]').disabled = true;
    registro.waiting?.postMessage({ tipo: 'SKIP_WAITING' });
  };
}

function vigilarActualizaciones(registro) {
  // a) Ya había una versión esperando (p. ej. se descargó en otra visita)
  if (registro.waiting && navigator.serviceWorker.controller) mostrarBannerActualizacion(registro);

  // b) Se encuentra una versión nueva mientras la app está abierta
  registro.addEventListener('updatefound', () => {
    const nuevo = registro.installing;
    nuevo?.addEventListener('statechange', () => {
      // "installed" + ya hay un SW controlando = es una ACTUALIZACIÓN (no la primera instalación)
      if (nuevo.state === 'installed' && navigator.serviceWorker.controller) mostrarBannerActualizacion(registro);
    });
  });

  // c) Cuando el SW nuevo toma el control, recargamos una sola vez
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando || !actualizando) return;
    recargando = true;
    location.reload();
  });

  // d) Buscar actualizaciones periódicamente y al volver a la app
  setInterval(() => registro.update().catch(() => {}), UNA_HORA);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registro.update().catch(() => {});
  });
}

export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Este navegador no soporta service workers');
    return null;
  }
  try {
    // Rutas relativas a la raíz de la app: funcionan en localhost (/), en /parada/x y en GitHub Pages (/repo/)
    const registro = await navigator.serviceWorker.register(url('sw.js'), { scope: url('./') });
    console.log('[SW] Registrado con alcance', registro.scope);
    vigilarActualizaciones(registro);
    return registro;
  } catch (error) {
    console.error('[SW] Error al registrar', error);
    return null;
  }
}

/** Pregunta al SW activo qué versión está corriendo. */
export function versionServiceWorker() {
  return new Promise((resolver) => {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return resolver(null);
    const alRecibir = (e) => {
      if (e.data?.tipo !== 'VERSION') return;
      navigator.serviceWorker.removeEventListener('message', alRecibir);
      resolver(e.data.version);
    };
    navigator.serviceWorker.addEventListener('message', alRecibir);
    sw.postMessage({ tipo: 'VERSION' });
    setTimeout(() => resolver(null), 1500);
  });
}
