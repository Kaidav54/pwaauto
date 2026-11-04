// Botón de instalación (beforeinstallprompt) y detección de modo instalado
let eventoInstalacion = null;
const oyentes = new Set();
const avisar = () => oyentes.forEach((fn) => fn(estadoInstalacion()));

export function estaInstalada() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    navigator.standalone === true // iOS
  );
}

export function estadoInstalacion() {
  if (estaInstalada()) return 'instalada';
  if (eventoInstalacion) return 'disponible';
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return 'ios';
  return 'no-disponible';
}

export function alCambiarInstalacion(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export async function instalar() {
  if (!eventoInstalacion) return false;
  eventoInstalacion.prompt();
  const { outcome } = await eventoInstalacion.userChoice;
  eventoInstalacion = null;
  avisar();
  return outcome === 'accepted';
}

export function iniciarInstalacion() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // guardamos el evento para lanzarlo desde nuestro botón
    eventoInstalacion = e;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    eventoInstalacion = null;
    avisar();
  });
}
