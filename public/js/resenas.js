// Reseñas: "guardar local primero, enviar después".
// 1) La reseña se guarda en IndexedDB (almacén "pendientes").
// 2) Se registra un Background Sync ("sync-resenas"); el service worker la envía cuando haya red.
// 3) Si el navegador no soporta Background Sync, la página reintenta al recuperar la conexión.
import { url, uuid } from './util.js';
import { hayServidor } from './api.js';

const DB = window.RutaDB;
export const ETIQUETA_SYNC = 'sync-resenas';

/** Reseñas confirmadas (red → IndexedDB) + pendientes locales de esa parada. */
export async function cargarResenas(paradaId) {
  let confirmadas;
  try {
    if (!(await hayServidor())) throw new Error('sin servidor');
    const r = await fetch(url(`api/paradas/${encodeURIComponent(paradaId)}/resenas`), { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    confirmadas = await r.json();
    await DB.guardarResenas(paradaId, confirmadas);
  } catch {
    confirmadas = await DB.leerResenas(paradaId).catch(() => []);
  }
  const pendientes = (await DB.leerPendientes().catch(() => []))
    .filter((p) => p.paradaId === paradaId)
    .map((p) => ({ ...p, pendiente: true }));
  const idsConfirmadas = new Set(confirmadas.map((r) => r.id));
  return [...pendientes.filter((p) => !idsConfirmadas.has(p.id)), ...confirmadas].sort((a, b) =>
    b.fecha.localeCompare(a.fecha)
  );
}

/** Guarda la reseña localmente y programa su envío. Devuelve { resena, modo }. */
export async function publicarResena({ paradaId, autor, texto }) {
  const resena = { id: uuid(), paradaId, autor: autor || 'Anónimo', texto, fecha: new Date().toISOString() };
  await DB.agregarPendiente(resena);

  const registro = await navigator.serviceWorker?.ready.catch(() => null);
  if (registro && 'sync' in registro) {
    try {
      await registro.sync.register(ETIQUETA_SYNC);
      return { resena, modo: 'background-sync' };
    } catch (e) {
      console.warn('[Sync] No se pudo registrar, se envía desde la página', e);
    }
  }
  // Respaldo sin Background Sync (Firefox, Safari): intento inmediato
  const enviadas = await enviarPendientes();
  return { resena, modo: enviadas.includes(resena.id) ? 'enviada' : 'en-cola' };
}

/** Envía todas las pendientes desde la página (respaldo cuando no hay Background Sync). */
export async function enviarPendientes() {
  if (!navigator.onLine || !(await hayServidor())) return [];
  const enviadas = [];
  for (const r of await DB.leerPendientes()) {
    try {
      const resp = await fetch(url('api/resenas'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      });
      if (resp.ok || resp.status === 400) {
        // 400 = datos inválidos: no tiene sentido reintentar
        if (resp.ok) await DB.guardarResena(await resp.json());
        await DB.borrarPendiente(r.id);
        enviadas.push(r.id);
      }
    } catch {
      break; // sin red: se reintenta más tarde
    }
  }
  if (enviadas.length) window.dispatchEvent(new CustomEvent('resenas-sincronizadas', { detail: enviadas }));
  return enviadas;
}

/** Reintenta al recuperar la red y escucha los avisos del service worker. */
export function iniciarSincronizacion() {
  window.addEventListener('online', () => enviarPendientes());
  navigator.serviceWorker?.addEventListener('message', (e) => {
    if (e.data?.tipo === 'RESENAS_SINCRONIZADAS') {
      window.dispatchEvent(new CustomEvent('resenas-sincronizadas', { detail: e.data.ids }));
    }
  });
  enviarPendientes();
}
