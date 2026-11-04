// Reseñas compartidas en Supabase (API REST, sin librerías).
// Script UMD: lo usan la página, el service worker y el servidor (SSR). Requiere config.js.
// Expone RutaRemoto.
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./config.js'));
  else raiz.RutaRemoto = fabrica(raiz.RUTA_CONFIG);
})(typeof self !== 'undefined' ? self : this, function (CONFIG) {
  const sb = (CONFIG && CONFIG.supabase) || {};
  const activo = () => Boolean(sb.url && sb.clave);
  const cabeceras = (extra) => Object.assign({ apikey: sb.clave, 'Content-Type': 'application/json' }, extra);

  // Columnas de la base (snake_case) ↔ objetos de la app (camelCase)
  const desdeFila = (f) => ({ id: f.id, paradaId: f.parada_id, autor: f.autor, texto: f.texto, fecha: f.fecha });

  /** Reseñas visibles de una parada, más recientes primero. */
  async function listarResenas(paradaId, { limite = 50, señal } = {}) {
    const q = new URLSearchParams({
      select: 'id,parada_id,autor,texto,fecha',
      parada_id: `eq.${paradaId}`,
      order: 'fecha.desc',
      limit: String(limite),
    });
    const r = await fetch(`${sb.url}/rest/v1/resenas?${q}`, { headers: cabeceras(), cache: 'no-store', signal: señal });
    if (!r.ok) throw new Error(`Supabase respondió ${r.status}`);
    return (await r.json()).map(desdeFila);
  }

  /**
   * Publica una reseña. Idempotente: si el mismo id ya existe (reintento de Background Sync) no se duplica.
   * Devuelve { ok, reintentar }:
   *   ok=true                → publicada
   *   ok=false, reintentar   → error temporal (sin red, 429, 5xx): dejarla en la cola
   *   ok=false, !reintentar  → datos inválidos (400): no tiene sentido reintentar
   * Si no hay red, fetch lanza una excepción (la maneja quien llama).
   */
  async function publicarResena(resena) {
    const cuerpo = {
      id: resena.id,
      parada_id: resena.paradaId,
      autor: String(resena.autor || '').trim().slice(0, 40) || 'Anónimo',
      texto: String(resena.texto || '').trim().slice(0, 500),
      fecha: resena.fecha,
    };
    const r = await fetch(`${sb.url}/rest/v1/resenas?on_conflict=id`, {
      method: 'POST',
      headers: cabeceras({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
      body: JSON.stringify(cuerpo),
    });
    if (r.ok) return { ok: true };
    const invalida = r.status === 400 || r.status === 422;
    return { ok: false, reintentar: !invalida, estado: r.status, mensaje: await r.text().catch(() => '') };
  }

  async function reportarResena(id) {
    const r = await fetch(`${sb.url}/rest/v1/rpc/reportar_resena`, {
      method: 'POST',
      headers: cabeceras(),
      body: JSON.stringify({ p_id: id }),
    });
    if (!r.ok) throw new Error(`No se pudo reportar (${r.status})`);
  }

  return { activo, listarResenas, publicarResena, reportarResena, config: sb };
});
