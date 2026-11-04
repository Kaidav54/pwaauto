// Reseñas: "guardar local primero, enviar después".
// 1) La reseña se guarda en IndexedDB (almacén "pendientes").
// 2) Se registra un Background Sync ("sync-resenas"); el service worker la envía cuando haya red.
// 3) Si el navegador no soporta Background Sync, la página reintenta al recuperar la conexión.
//
// Destino de las reseñas compartidas:
//   · Supabase (js/config.js) → funciona también en GitHub Pages y en tiempo real.
//   · Si no está configurado → la API del servidor Node (/api/resenas).
import { url, uuid } from './util.js';
import { hayServidor } from './api.js';

const DB = window.RutaDB;
const Remoto = window.RutaRemoto;
export const ETIQUETA_SYNC = 'sync-resenas';

/** ¿Las reseñas se comparten con otros usuarios en este despliegue? */
export async function resenasCompartidas() {
  return Remoto?.activo() || (await hayServidor());
}

async function descargarResenas(paradaId) {
  if (Remoto?.activo()) return Remoto.listarResenas(paradaId);
  if (!(await hayServidor())) throw new Error('sin servidor');
  const r = await fetch(url(`api/paradas/${encodeURIComponent(paradaId)}/resenas`), { cache: 'no-store' });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

/** Envía una reseña. Devuelve { ok, reintentar }; lanza error si no hay red. */
async function subirResena(resena) {
  if (Remoto?.activo()) return Remoto.publicarResena(resena);
  const r = await fetch(url('api/resenas'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resena),
  });
  return { ok: r.ok, reintentar: !r.ok && r.status !== 400 };
}

/** Reseñas confirmadas (red → IndexedDB) + pendientes locales de esa parada. */
export async function cargarResenas(paradaId) {
  let confirmadas;
  try {
    confirmadas = await descargarResenas(paradaId);
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

let enviando = false;

/** Envía todas las pendientes desde la página (respaldo cuando no hay Background Sync). */
export async function enviarPendientes() {
  if (enviando || !navigator.onLine || !(await resenasCompartidas())) return [];
  enviando = true;
  const enviadas = [];
  try {
    for (const r of await DB.leerPendientes()) {
      let resultado;
      try {
        resultado = await subirResena(r);
      } catch {
        break; // sin red: se reintenta más tarde
      }
      if (resultado.ok) {
        await DB.guardarResena(r);
        await DB.borrarPendiente(r.id);
        enviadas.push(r.id);
      } else if (!resultado.reintentar) {
        await DB.borrarPendiente(r.id); // inválida: no tiene sentido reintentar
      }
    }
  } finally {
    enviando = false;
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

// ---------- Tiempo real (Supabase Realtime) ----------
let promesaCliente = null;

function clienteSupabase() {
  if (promesaCliente) return promesaCliente;
  promesaCliente = new Promise((resolver, rechazar) => {
    const crear = () => resolver(window.supabase.createClient(Remoto.config.url, Remoto.config.clave, {
      auth: { persistSession: false, autoRefreshToken: false },
    }));
    if (window.supabase?.createClient) return crear();
    const s = document.createElement('script');
    s.src = url('vendor/supabase/supabase.js');
    s.onload = crear;
    s.onerror = () => {
      promesaCliente = null;
      rechazar(new Error('No se pudo cargar el cliente de Supabase'));
    };
    document.head.append(s);
  });
  return promesaCliente;
}

/**
 * Escucha reseñas nuevas de una parada en tiempo real.
 * Llama a alLlegar(resena) por cada INSERT. Devuelve una función para dejar de escuchar.
 */
export async function escucharResenas(paradaId, alLlegar) {
  if (!Remoto?.activo() || !navigator.onLine) return () => {};
  try {
    const cliente = await clienteSupabase();
    const canal = cliente
      .channel(`resenas-${paradaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'resenas', filter: `parada_id=eq.${paradaId}` },
        (cambio) => {
          const f = cambio.new || {};
          alLlegar({ id: f.id, paradaId: f.parada_id, autor: f.autor, texto: f.texto, fecha: f.fecha });
        }
      )
      .subscribe();
    return () => cliente.removeChannel(canal);
  } catch (e) {
    console.warn('[Realtime]', e);
    return () => {};
  }
}

export async function reportarResena(id) {
  if (!Remoto?.activo()) throw new Error('Reportar solo está disponible con Supabase');
  await Remoto.reportarResena(id);
}
