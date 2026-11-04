// Notificaciones locales y push (cliente)
import { url } from './util.js';
import { hayServidor } from './api.js';

export const soportaNotificaciones = () => 'Notification' in window && 'serviceWorker' in navigator;
export const soportaPush = () => soportaNotificaciones() && 'PushManager' in window;
export const permiso = () => (soportaNotificaciones() ? Notification.permission : 'unsupported');

// La clave pública VAPID llega en Base64URL; pushManager.subscribe la necesita como bytes
function base64UrlABytes(base64) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pedirPermiso() {
  if (!soportaNotificaciones()) throw new Error('Este navegador no soporta notificaciones');
  const resultado = await Notification.requestPermission();
  if (resultado !== 'granted') throw new Error('Permiso de notificaciones denegado');
}

/** Notificación local: la genera el propio dispositivo, sin servidor. */
export async function notificacionLocal(titulo, opciones = {}) {
  await pedirPermiso();
  const registro = await navigator.serviceWorker.ready;
  await registro.showNotification(titulo, {
    icon: url('icons/icon-192.png'),
    badge: url('icons/badge-72.png'),
    vibrate: [100, 50, 100],
    ...opciones,
  });
}

export async function suscripcionActual() {
  if (!soportaPush()) return null;
  const registro = await navigator.serviceWorker.ready;
  return registro.pushManager.getSubscription();
}

/** Flujo push: permiso → clave VAPID → suscripción → guardar en el servidor. */
export async function suscribirse() {
  if (!soportaPush()) throw new Error('Este navegador no soporta notificaciones push');
  if (!(await hayServidor())) throw new Error('Las notificaciones push necesitan el servidor Node');
  await pedirPermiso();
  const { clave } = await (await fetch(url('api/push/clave-publica'))).json();
  const registro = await navigator.serviceWorker.ready;
  let suscripcion = await registro.pushManager.getSubscription();
  if (!suscripcion) {
    suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlABytes(clave),
    });
  }
  const r = await fetch(url('api/push/suscribir'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suscripcion }),
  });
  if (!r.ok) throw new Error('El servidor no aceptó la suscripción');
  return suscripcion;
}

export async function desuscribirse() {
  const suscripcion = await suscripcionActual();
  if (!suscripcion) return;
  await fetch(url('api/push/desuscribir'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: suscripcion.endpoint }),
  }).catch(() => {});
  await suscripcion.unsubscribe();
}

/** Publica un aviso para todos los suscriptores (panel de demostración). */
export async function publicarAviso(aviso) {
  const r = await fetch(url('api/push/enviar'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aviso),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`);
  return r.json();
}
