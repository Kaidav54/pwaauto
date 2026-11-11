// Acceso a los datos remotos del catálogo.
// Con servidor Node: /api/paradas.  En GitHub Pages (estático): data/paradas.json.
// Cada respuesta correcta se respalda en IndexedDB; si la red falla se usa el respaldo.
import { url } from './util.js';

const DB = window.RutaDB;

let servidorDisponible; // undefined = aún no se sabe

/** ¿Hay un servidor Node detrás (API, SSR, push)? En GitHub Pages será false. */
export async function hayServidor() {
  if (servidorDisponible !== undefined) return servidorDisponible;
  // GitHub Pages solo sirve archivos estáticos: no hace falta preguntar (evita un 404 en la consola)
  if (location.hostname.endsWith('github.io')) return (servidorDisponible = false);
  try {
    const r = await fetch(url('api/salud'), { cache: 'no-store' });
    servidorDisponible = r.ok && (r.headers.get('content-type') || '').includes('json');
  } catch {
    // Sin red no podemos saberlo: recordamos lo último que vimos
    return localStorage.getItem('rutaexpress:servidor') === 'si';
  }
  try { localStorage.setItem('rutaexpress:servidor', servidorDisponible ? 'si' : 'no'); } catch {}
  return servidorDisponible;
}

async function pedirJSON(relativa) {
  const direccion = url(relativa);
  const r = await fetch(direccion);
  if (!r.ok) throw new Error(`${relativa} respondió ${r.status}`);
  return r.json();
}

/** Lista de paradas desde la red (API o JSON estático). */
export async function obtenerParadasRemotas() {
  if (await hayServidor()) {
    try {
      return await pedirJSON('api/paradas');
    } catch {
      /* se intenta con el JSON estático */
    }
  }
  return pedirJSON('data/paradas.json');
}

/** Red primero; si falla, respaldo local de IndexedDB. */
export async function obtenerParadas() {
  try {
    const paradas = await obtenerParadasRemotas();
    DB.guardarParadas(paradas).catch((e) => console.warn('[DB] No se pudo respaldar', e));
    return paradas;
  } catch (error) {
    const respaldo = await DB.leerParadas().catch(() => []);
    if (respaldo.length) {
      console.info('[API] Sin red: usando respaldo local de IndexedDB');
      return respaldo;
    }
    throw error;
  }
}

export async function obtenerParada(id) {
  const paradas = await obtenerParadas();
  return paradas.find((p) => p.id === id) || null;
}

/** Enlace a la ficha: SSR si hay servidor, CSR (hash) si es sitio estático. */
export async function enlaceFicha(id) {
  return (await hayServidor()) ? url(`parada/${encodeURIComponent(id)}`) : url(`#/parada/${encodeURIComponent(id)}`);
}
