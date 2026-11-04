// Registro del service worker
import { url } from './util.js';
export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Este navegador no soporta service workers');
    return null;
  }
  try {
    // Rutas relativas a la raíz de la app: funcionan en localhost (/), en /parada/x y en GitHub Pages (/repo/)
    const registro = await navigator.serviceWorker.register(url('sw.js'), { scope: url('./') });
    console.log('[SW] Registrado con alcance', registro.scope);
    return registro;
  } catch (error) {
    console.error('[SW] Error al registrar', error);
    return null;
  }
}
