// Acceso a los datos remotos del catálogo.
// Con servidor Node: /api/paradas.  En GitHub Pages (estático): data/paradas.json.

let servidorDisponible; // undefined = aún no se sabe

/** ¿Hay un servidor Node detrás (API, SSR, push)? En GitHub Pages será false. */
export async function hayServidor() {
  if (servidorDisponible !== undefined) return servidorDisponible;
  try {
    const r = await fetch('api/salud', { cache: 'no-store' });
    servidorDisponible = r.ok && (r.headers.get('content-type') || '').includes('json');
  } catch {
    servidorDisponible = false;
  }
  return servidorDisponible;
}

async function pedirJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} respondió ${r.status}`);
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

export async function obtenerParadas() {
  return obtenerParadasRemotas();
}

export async function obtenerParada(id) {
  const paradas = await obtenerParadas();
  return paradas.find((p) => p.id === id) || null;
}

/** Enlace a la ficha: SSR si hay servidor, CSR (hash) si es sitio estático. */
export async function enlaceFicha(id) {
  return (await hayServidor()) ? `parada/${encodeURIComponent(id)}` : `#/parada/${encodeURIComponent(id)}`;
}
