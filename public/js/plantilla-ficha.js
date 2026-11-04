// Plantilla de la ficha de una parada.
// Script UMD: lo usa el servidor (SSR, con require) y el navegador (CSR de respaldo, window.PlantillaFicha).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.PlantillaFicha = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const icono = (tipo) => (tipo === 'combi' ? '🚐' : '🚌');
  const tipoTexto = (tipo) => (tipo === 'combi' ? 'Base de combis' : 'Parada de autobús');
  const tarifa = (n) => `$${Number(n).toFixed(2)}`;

  function caracteristicas(p) {
    const lista = [];
    lista.push(p.iluminada ? '💡 Iluminada' : '🌑 Poca iluminación');
    if (p.techada) lista.push('⛱️ Techada');
    if (p.accesible) lista.push('♿ Accesible');
    return lista.map((t) => `<span class="etiqueta${p.iluminada ? '' : ' etiqueta--acento'}">${esc(t)}</span>`).join(' ');
  }

  function fecha(iso) {
    try {
      return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }

  function resenaHTML(r) {
    const pendiente = r.pendiente ? ' resena--pendiente' : '';
    const estado = r.pendiente ? ' · ⏳ pendiente de enviar' : '';
    return `<li class="resena${pendiente}" data-id="${esc(r.id)}">
      <div>${esc(r.texto)}</div>
      <div class="resena__meta">${esc(r.autor || 'Anónimo')} · ${esc(fecha(r.fecha))}${estado}</div>
    </li>`;
  }

  function listaResenasHTML(resenas) {
    if (!resenas || !resenas.length) return '<li class="suave pequeno" data-vacio>Aún no hay comentarios. ¡Sé el primero!</li>';
    return resenas.map(resenaHTML).join('');
  }

  /** Devuelve el HTML de la ficha (sin el shell). */
  function fichaHTML(p, { resenas = [], enlaceVolver = '#/paradas' } = {}) {
    const filas = p.rutas
      .map(
        (r) => `<tr>
          <td><span class="etiqueta">${esc(r.ruta)}</span></td>
          <td>${esc(r.nombre)}</td>
          <td>${esc(r.primera)}</td>
          <td>${esc(r.ultima)}</td>
          <td>${esc(r.frecuencia)}</td>
          <td><strong>${tarifa(r.tarifa)}</strong></td>
        </tr>`
      )
      .join('');

    return `<article class="ficha" data-parada="${esc(p.id)}">
  <p><a href="${esc(enlaceVolver)}">← Todas las paradas</a></p>
  <section class="tarjeta">
    <div class="ficha__cabecera">
      <div class="ficha__icono" aria-hidden="true">${icono(p.tipo)}</div>
      <div>
        <h1>${esc(p.nombre)}</h1>
        <div class="suave">${tipoTexto(p.tipo)} · ${esc(p.zona)}</div>
        <div>📍 ${esc(p.direccion)}</div>
      </div>
    </div>
    <p>${esc(p.descripcion)}</p>
    <div>${caracteristicas(p)}</div>
    <div class="botones" data-acciones>
      <a class="boton boton--sec" target="_blank" rel="noopener"
         href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}">🧭 Cómo llegar</a>
    </div>
  </section>

  <section class="tarjeta">
    <h2>Rutas que pasan por aquí</h2>
    <div class="tabla-envoltura">
      <table class="tabla">
        <thead><tr><th>Ruta</th><th>Recorrido</th><th>1.ª salida</th><th>Última</th><th>Frecuencia</th><th>Tarifa</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  </section>

  <section class="tarjeta" id="resenas">
    <h2>Comentarios de usuarios</h2>
    <p class="suave pequeno">Avisa a otros: retrasos, seguridad, iluminación…</p>
    <ul class="resenas" data-lista-resenas>${listaResenasHTML(resenas)}</ul>
    <form data-form-resena>
      <label for="texto-resena">Tu comentario</label>
      <textarea id="texto-resena" name="texto" required minlength="3" maxlength="500"
        placeholder="Ej. «La ruta 12 está tardando 20 min» o «Parada segura e iluminada»"></textarea>
      <label for="autor-resena">Nombre (opcional)</label>
      <input id="autor-resena" name="autor" maxlength="40" placeholder="Anónimo">
      <div class="botones"><button class="boton" type="submit">Publicar comentario</button></div>
      <p class="suave pequeno" data-estado-resena>Funciona sin conexión: se envía solo cuando vuelva la red.</p>
    </form>
  </section>
</article>`;
  }

  return { esc, icono, tipoTexto, tarifa, fichaHTML, resenaHTML, listaResenasHTML };
});
