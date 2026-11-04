// Registro del service worker
export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Este navegador no soporta service workers');
    return null;
  }
  try {
    // Ruta relativa: funciona en localhost (/) y en GitHub Pages (/repo/)
    const registro = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    console.log('[SW] Registrado con alcance', registro.scope);
    return registro;
  } catch (error) {
    console.error('[SW] Error al registrar', error);
    return null;
  }
}
