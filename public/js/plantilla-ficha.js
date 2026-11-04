// Plantilla de la ficha de una parada y piezas de interfaz compartidas.
// Script UMD: lo usa el servidor (SSR, con require) y el navegador (CSR de respaldo, window.PlantillaFicha).
(function (raiz, fabrica) {
  // Ubicación del sprite de íconos: en el navegador se deduce de dónde se cargó este script
  // (funciona en "/", en "/parada/x" y en GitHub Pages "/repo/"); en el servidor es "/img/iconos.svg".
  let sprite = '/img/iconos.svg';
  if (typeof document !== 'undefined' && document.currentScript) {
    sprite = new URL('../img/iconos.svg', document.currentScript.src).pathname;
  }
  if (typeof module === 'object' && module.exports) module.exports = fabrica(sprite);
  else raiz.PlantillaFicha = fabrica(sprite);
})(typeof self !== 'undefined' ? self : this, function (SPRITE) {
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /** Ícono SVG del sprite (i-autobus, i-combi, i-cerca…). */
  const svg = (nombre, clase = 'ico') =>
    `<svg class="${clase}" aria-hidden="true" focusable="false"><use href="${SPRITE}#i-${nombre}"></use></svg>`;

  const icono = (tipo) => svg(tipo === 'combi' ? 'combi' : 'autobus');
  const tipoTexto = (tipo) => (tipo === 'combi' ? 'Base de combis' : 'Parada de autobús');
  const tarifa = (n) => `$${Number(n).toFixed(2)}`;

  // Cada ruta tiene siempre el mismo color, como los letreros pintados de las combis
  const COLORES_RUTA = ['#b8452a', '#2f5d50', '#3d6f9e', '#c47d1f', '#7a3e65', '#4f6b2a', '#8f3320', '#28597a'];
  function colorRuta(ruta) {
    let h = 0;
    for (const c of String(ruta)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return COLORES_RUTA[h % COLORES_RUTA.length];
  }
  const etiquetaRuta = (ruta) => `<span class="etiqueta" style="--ruta:${colorRuta(ruta)}">${esc(ruta)}</span>`;

  function caracteristicas(p) {
    const lista = [
      p.iluminada ? ['Iluminada', ''] : ['Poca iluminación de noche', ' etiqueta--alerta'],
      p.techada ? ['Techada', ''] : null,
      p.accesible ? ['Accesible', ''] : null,
    ].filter(Boolean);
    return lista.map(([t, extra]) => `<span class="etiqueta etiqueta--dato${extra}">${esc(t)}</span>`).join('');
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
    const estado = r.pendiente ? ' · pendiente de enviar' : '';
    return `<li class="resena${pendiente}" data-id="${esc(r.id)}">
      <div>${esc(r.texto)}</div>
      <div class="resena__meta">${esc(r.autor || 'Anónimo')} · ${esc(fecha(r.fecha))}${estado}</div>
    </li>`;
  }

  function listaResenasHTML(resenas) {
    if (!resenas || !resenas.length) return '<li class="suave pequeno" data-vacio>Todavía nadie ha comentado esta parada.</li>';
    return resenas.map(resenaHTML).join('');
  }

  /** Devuelve el HTML de la ficha (sin el shell). */
  function fichaHTML(p, { resenas = [], enlaceVolver = '#/paradas' } = {}) {
    const filas = p.rutas
      .map(
        (r) => `<tr>
          <td class="c-ruta">${etiquetaRuta(r.ruta)}</td>
          <td class="recorrido">${esc(r.nombre)}</td>
          <td class="hora" data-label="Primera">${esc(r.primera)}</td>
          <td class="hora" data-label="Última">${esc(r.ultima)}</td>
          <td class="frecuencia" data-label="Cada">${esc(r.frecuencia)}</td>
          <td class="tarifa">${tarifa(r.tarifa)}</td>
        </tr>`
      )
      .join('');

    return `<article class="ficha" data-parada="${esc(p.id)}">
  <a class="ficha__volver" href="${esc(enlaceVolver)}">${svg('flecha')}Todas las paradas</a>
  <section class="tarjeta">
    <div class="ficha__cabecera">
      <div class="ficha__icono" data-tipo="${esc(p.tipo)}">${icono(p.tipo)}</div>
      <div>
        <span class="kicker">${tipoTexto(p.tipo)} · ${esc(p.zona)}</span>
        <h1>${esc(p.nombre)}</h1>
        <div class="suave">${esc(p.direccion)}</div>
      </div>
    </div>
    <p>${esc(p.descripcion)}</p>
    <div class="ficha__datos">${caracteristicas(p)}</div>
    <div class="mapa mapa--ficha" data-mapa-ficha role="region" aria-label="Mapa de ubicación de ${esc(p.nombre)}"></div>
    <div class="botones" data-acciones>
      <a class="boton boton--sec" target="_blank" rel="noopener"
         href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}">${svg('cerca')}Cómo llegar</a>
    </div>
  </section>

  <section class="tablero" aria-labelledby="titulo-horarios">
    <div class="tablero__titulo"><span id="titulo-horarios">Salidas desde aquí</span><span>${p.rutas.length} ${p.rutas.length === 1 ? 'ruta' : 'rutas'}</span></div>
    <div class="tabla-envoltura">
      <table class="tabla">
        <thead><tr><th>Ruta</th><th>Recorrido</th><th>Primera</th><th>Última</th><th>Cada</th><th>Tarifa</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  </section>

  <section class="tarjeta" id="resenas" style="margin-top:16px">
    <h2>Lo que dicen los usuarios</h2>
    <p class="suave pequeno">Avisa a otros: retrasos, seguridad, iluminación…</p>
    <ul class="resenas" data-lista-resenas>${listaResenasHTML(resenas)}</ul>
    <form data-form-resena>
      <label for="texto-resena">Tu comentario</label>
      <textarea id="texto-resena" name="texto" required minlength="3" maxlength="500"
        placeholder="Ej. «La 12 viene tardando 20 min» o «Parada segura e iluminada»"></textarea>
      <label for="autor-resena">Nombre (opcional)</label>
      <input id="autor-resena" name="autor" maxlength="40" placeholder="Anónimo">
      <div class="botones"><button class="boton" type="submit">Publicar comentario</button></div>
      <p class="suave pequeno" data-estado-resena>Funciona sin señal: se envía solo cuando vuelva la red.</p>
    </form>
  </section>
</article>`;
  }

  return { esc, svg, icono, tipoTexto, tarifa, colorRuta, etiquetaRuta, fichaHTML, resenaHTML, listaResenasHTML };
});
