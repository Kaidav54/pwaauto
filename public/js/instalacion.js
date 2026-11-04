// Instalación de la PWA.
// · Si el navegador entrega "beforeinstallprompt" (Chrome/Edge), el botón abre el diálogo nativo.
// · Si no (iPhone, Firefox, navegadores dentro de otras apps, o el evento aún no llega),
//   el botón muestra instrucciones para instalar a mano en ESE navegador.
let eventoInstalacion = window.__eventoInstalacion || null; // capturado pronto en index.html
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
  return 'manual';
}

export function alCambiarInstalacion(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/** Detecta el entorno para dar las instrucciones correctas. */
export function entorno() {
  const ua = navigator.userAgent;
  const movil = /android|iphone|ipad|ipod/i.test(ua);
  if (!window.isSecureContext) return 'sin-https';
  if (/FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat|TikTok|; wv\)/i.test(ua)) return 'app-interna';
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/firefox|fxios/i.test(ua)) return movil ? 'firefox-android' : 'firefox-escritorio';
  if (/samsungbrowser/i.test(ua)) return 'samsung';
  if (/android/i.test(ua)) return 'android';
  return 'escritorio';
}

const INSTRUCCIONES = {
  'sin-https': 'La instalación necesita HTTPS. Abre la app desde https://kaidav54.github.io/pwaauto/ (o en localhost en tu computadora).',
  'app-interna': 'Estás dentro de otra app (WhatsApp, Facebook, Instagram…) y ahí no se puede instalar. Toca el menú ⋮ y elige «Abrir en Chrome» (o en Safari en iPhone).',
  ios: 'En iPhone/iPad: toca el botón Compartir (el cuadro con flecha ↑) y luego «Agregar a pantalla de inicio».',
  'firefox-android': 'En Firefox: toca el menú ⋮ y elige «Instalar» o «Agregar a pantalla de inicio».',
  'firefox-escritorio': 'Firefox de computadora no instala apps web. Ábrela en Chrome o Edge para instalarla.',
  samsung: 'En Samsung Internet: toca el menú ☰ y elige «Añadir página a» › «Pantalla de inicio».',
  android: 'Toca el menú ⋮ de Chrome (arriba a la derecha) y elige «Instalar aplicación» o «Agregar a pantalla principal». Si no aparece, navega unos segundos por la app y vuelve a intentar.',
  escritorio: 'Haz clic en el ícono de instalar (monitor con flecha ⊕) a la derecha de la barra de direcciones, o en el menú ⋮ › «Transmitir, guardar y compartir» › «Instalar página como aplicación» (en Edge: ⋯ › «Aplicaciones» › «Instalar este sitio como una aplicación»).',
};

export const instruccionesManuales = () => INSTRUCCIONES[entorno()];

/**
 * Intenta instalar. Devuelve:
 *  'aceptada' | 'rechazada' → se mostró el diálogo nativo
 *  'manual'                 → no hay diálogo: hay que mostrar instrucciones
 */
export async function instalar() {
  if (!eventoInstalacion) return 'manual';
  const evento = eventoInstalacion;
  eventoInstalacion = null; // prompt() solo puede usarse una vez por evento
  window.__eventoInstalacion = null;
  try {
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    avisar();
    return outcome === 'accepted' ? 'aceptada' : 'rechazada';
  } catch (e) {
    console.warn('[Instalación] El diálogo nativo falló', e);
    avisar();
    return 'manual';
  }
}

export function iniciarInstalacion() {
  const guardar = (e) => {
    e.preventDefault(); // lo guardamos para lanzarlo desde nuestro botón
    eventoInstalacion = e;
    avisar();
  };
  window.addEventListener('beforeinstallprompt', guardar);
  // Por si llegó antes de que cargara este módulo
  window.addEventListener('instalacion-disponible', () => {
    if (window.__eventoInstalacion) {
      eventoInstalacion = window.__eventoInstalacion;
      avisar();
    }
  });
  window.addEventListener('appinstalled', () => {
    eventoInstalacion = null;
    avisar();
  });
}
