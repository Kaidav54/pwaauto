// Vistas renderizadas en el navegador (CSR)
import { esc, $, $$, toast, url } from './util.js';
import { obtenerParadas, obtenerParada, enlaceFicha } from './api.js';
import { estadoInstalacion, alCambiarInstalacion, instalar, instruccionesManuales } from './instalacion.js';
import { leerPref, guardarPref, borrarPrefs } from './prefs.js';
import { activarAccionesFicha } from './ficha-acciones.js';
import { versionServiceWorker } from './registro-sw.js';
import { mapaParadas } from './mapa.js';

const { icono, svg, tipoTexto, fichaHTML, etiquetaRuta } = window.PlantillaFicha;

const img = (nombre, anchos, tam) =>
  `srcset="${anchos.map((a) => `${url(`img/${nombre}-${a}.webp`)} ${a}w`).join(', ')}" sizes="${tam}" src="${url(`img/${nombre}-${anchos[0]}.webp`)}"`;

// ---------- Inicio (Home) ----------
export async function vistaInicio(c) {
  c.innerHTML = `
    <section class="portada">
      <img ${img('jalpan-carretera', [640, 1280, 1920], '100vw')} alt="Carretera federal 120 a su paso por Jalpan de Serra, con la sierra al fondo" fetchpriority="high">
      <span class="credito">Foto: <a href="https://commons.wikimedia.org/wiki/File:Hwy120Jalpan.JPG" target="_blank" rel="noopener">AlejandroLinaresGarcia</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noopener">CC BY-SA 4.0</a></span>
      <div class="portada__texto">
        <span class="kicker">Jalpan de Serra · Sierra Gorda</span>
        <h1>Muévete por la sierra</h1>
        <p>Corridas a Xilitla, Río Verde, Querétaro y más, con horarios y tarifas. Funciona aunque se vaya la señal.</p>
        <div class="botones">
          <a class="boton" href="#/paradas">${svg('paradas')}Ver paradas</a>
          <button class="boton boton--sec" id="btn-instalar" hidden>${svg('instalar')}Instalar app</button>
        </div>
        <p id="texto-instalacion"></p>
      </div>
    </section>

    <div class="atajos">
      <a class="atajo" href="#/cerca" style="--c:var(--terracota)">${svg('cerca')}<strong>Cerca de mí</strong><span class="suave pequeno">Tu parada más próxima por GPS</span></a>
      <a class="atajo" href="#/paradas" style="--c:var(--sierra)">${svg('paradas')}<strong>Paradas</strong><span class="suave pequeno">Rutas, horarios y tarifas</span></a>
      <a class="atajo" href="#/avisos" style="--c:var(--ocre)">${svg('avisos')}<strong>Avisos</strong><span class="suave pequeno">Desvíos, obras y retrasos</span></a>
      <a class="atajo" href="#/ajustes" style="--c:var(--cielo)">${svg('ajustes')}<strong>Ajustes</strong><span class="suave pequeno">Tema y datos guardados</span></a>
    </div>

    <section class="tarjeta banda">
      <img ${img('sierra-autobus', [640, 1280], '(min-width: 640px) 380px, 100vw')} alt="" loading="lazy">
      <div class="banda__texto">
        <span class="kicker">Rutas de la sierra</span>
        <h2>Antes de subir, revisa la última salida</h2>
        <p class="suave">Algunas corridas salen por última vez a media tarde. Consulta la tabla de salidas, toca una corrida para ver su recorrido y activa los avisos para enterarte de retrasos o desvíos.</p>
        <p class="pie-foto">Imagen ilustrativa generada con IA.</p>
      </div>
    </section>

    <section class="tarjeta banda">
      <img ${img('mision', [400, 800], '(min-width: 640px) 380px, 100vw')} alt="Misión de Santiago de Jalpan" loading="lazy">
      <div class="banda__texto">
        <span class="kicker">Hecha para Jalpan</span>
        <h2>Tu guía de transporte local</h2>
        <p class="suave">Comparte cómo está tu parada: si la ruta viene tardando, si está iluminada o si hay obras. Tus comentarios se guardan aunque no tengas señal y se envían solos al recuperarla.</p>
        <p class="pie-foto">Misión de Santiago de Jalpan. Foto: <a href="https://commons.wikimedia.org/wiki/File:Misi%C3%B3n_de_Santiago_de_Jalpan,_Jalpan_de_Serra.jpg" target="_blank" rel="noopener">Diana.resendiz</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noopener">CC BY-SA 4.0</a> (recortada).</p>
      </div>
    </section>`;

  seccionMisParadas(c);

  const boton = $('#btn-instalar', c);
  const texto = $('#texto-instalacion', c);
  const pintar = (estado) => {
    // El botón siempre está visible salvo que ya esté instalada
    boton.hidden = estado === 'instalada';
    texto.textContent = estado === 'instalada' ? 'Estás usando RutaExpress instalada.' : '';
  };
  pintar(estadoInstalacion());
  const quitar = alCambiarInstalacion(pintar);
  window.addEventListener('hashchange', quitar, { once: true });
  boton.addEventListener('click', async () => {
    const resultado = await instalar();
    if (resultado === 'aceptada') {
      toast('¡Gracias por instalar RutaExpress!');
    } else if (resultado === 'rechazada') {
      toast('Instalación cancelada. Puedes instalarla cuando quieras.');
    } else {
      // Sin diálogo nativo: instrucciones para este navegador
      texto.innerHTML = `<strong>Cómo instalar:</strong> ${esc(instruccionesManuales())}`;
    }
  });
}

// Favoritas (IndexedDB) y última parada consultada (localStorage)
async function seccionMisParadas(c) {
  try {
    const [paradas, favoritos] = await Promise.all([obtenerParadas(), window.RutaDB.leerFavoritos()]);
    const ultima = leerPref('ultimaParada');
    const ids = [...new Set([...(ultima ? [ultima] : []), ...favoritos])];
    const lista = ids.map((id) => paradas.find((p) => p.id === id)).filter(Boolean);
    if (!lista.length) return;
    const items = await Promise.all(
      lista.map(async (p) => itemParada(p, await enlaceFicha(p.id), favoritos.includes(p.id) ? 'Favorita' : 'Reciente'))
    );
    const sec = document.createElement('section');
    sec.className = 'tarjeta';
    sec.innerHTML = `<h2>Mis paradas</h2><ul class="lista">${items.join('')}</ul>`;
    c.querySelector('.atajos')?.after(sec);
  } catch (e) {
    console.warn('No se pudieron cargar las paradas guardadas', e);
  }
}

// ---------- Catálogo (CSR) ----------
export async function vistaParadas(c) {
  const paradas = await obtenerParadas();
  const enlaces = Object.fromEntries(await Promise.all(paradas.map(async (p) => [p.id, await enlaceFicha(p.id)])));

  c.innerHTML = `
    <span class="kicker">${paradas.length} puntos de salida</span>
    <h1>Paradas y bases</h1>
    <div class="buscador">
      <label for="q" class="suave pequeno">Busca por destino, empresa o nombre</label>
      <input id="q" type="search" placeholder="Ej. Xilitla, Vencedor, Querétaro…" autocomplete="off">
    </div>
    ${new Set(paradas.map((p) => p.tipo)).size > 1 ? `<div class="filtros" role="group" aria-label="Filtrar por tipo">
      <button class="chip" data-tipo="todos" aria-pressed="true">Todas</button>
      <button class="chip" data-tipo="autobus" aria-pressed="false">${svg('autobus')}Autobús</button>
      <button class="chip" data-tipo="combi" aria-pressed="false">${svg('combi')}Combis</button>
    </div>` : ''}
    <div id="mapa-paradas" role="region" aria-label="Mapa de paradas"></div>
    <ul class="lista" id="lista"></ul>`;

  // Mapa real; si falla (p. ej. sin Leaflet en caché) la lista sigue funcionando
  let mapa = null;
  mapaParadas($('#mapa-paradas', c), paradas, enlaces)
    .then((m) => (mapa = m))
    .catch((e) => {
      console.warn(e);
      $('#mapa-paradas', c).remove();
    });

  let tipo = 'todos';
  const dibujar = () => {
    const q = $('#q', c).value.trim().toLowerCase();
    const filtradas = paradas.filter((p) => {
      const texto = `${p.nombre} ${p.zona} ${p.direccion} ${p.rutas.map((r) => `${r.ruta} ${r.nombre} ${r.empresa || ''}`).join(' ')}`.toLowerCase();
      return (tipo === 'todos' || p.tipo === tipo) && (!q || texto.includes(q));
    });
    $('#lista', c).innerHTML = filtradas.length
      ? filtradas.map((p) => itemParada(p, enlaces[p.id])).join('')
      : '<li class="estado-vacio">No hay paradas que coincidan.</li>';
    mapa?.actualizar(filtradas);
  };

  $('#q', c).addEventListener('input', dibujar);
  $$('.chip', c).forEach((b) =>
    b.addEventListener('click', () => {
      tipo = b.dataset.tipo;
      $$('.chip', c).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      dibujar();
    })
  );
  dibujar();
}

export function itemParada(p, href, extra = '') {
  return `<li><a class="parada" data-tipo="${esc(p.tipo)}" href="${esc(href)}">
    <span class="parada__icono">${icono(p.tipo)}</span>
    <span>
      <span class="parada__nombre">${esc(p.nombre)}</span>
      <span class="parada__meta">${tipoTexto(p.tipo)} · ${esc(p.zona)}</span>
      <span class="parada__rutas">${[...new Set(p.rutas.map((r) => r.ruta))].map(etiquetaRuta).join('')}</span>
    </span>
    <span class="parada__extra">${extra ? esc(extra) : svg('flecha')}</span>
  </a></li>`;
}

// ---------- Ficha en el navegador (respaldo cuando no hay SSR, p. ej. GitHub Pages) ----------
export async function vistaFicha(c, { id }) {
  const p = await obtenerParada(id);
  if (!p) {
    c.innerHTML = '<section class="tarjeta estado-vacio"><h1>Parada no encontrada</h1><p><a href="#/paradas">Ver todas</a></p></section>';
    return;
  }
  document.title = `${p.nombre} · RutaExpress`;
  c.innerHTML = fichaHTML(p);
  await activarAccionesFicha(c, p);
}

// ---------- Ajustes: preferencias (localStorage) y datos locales (IndexedDB) ----------
export async function vistaAjustes(c) {
  const DB = window.RutaDB;
  const [actualizadas, paradas, pendientes, favoritos] = await Promise.all([
    DB.leerMeta('paradasActualizadas').catch(() => null),
    DB.leerParadas().catch(() => []),
    DB.leerPendientes().catch(() => []),
    DB.leerFavoritos().catch(() => []),
  ]);
  const tema = leerPref('tema');

  c.innerHTML = `
    <h1>Ajustes</h1>
    <section class="tarjeta">
      <h2>Preferencias</h2>
      <label for="tema">Tema</label>
      <select id="tema">
        <option value="sistema" ${tema === 'sistema' ? 'selected' : ''}>Como el sistema</option>
        <option value="claro" ${tema === 'claro' ? 'selected' : ''}>Claro</option>
        <option value="oscuro" ${tema === 'oscuro' ? 'selected' : ''}>Oscuro</option>
      </select>
      <label for="autor">Tu nombre para los comentarios</label>
      <input id="autor" maxlength="40" placeholder="Anónimo" value="${esc(leerPref('autor'))}">
      <p class="suave pequeno">Se guarda en <code>localStorage</code> de este dispositivo.</p>
    </section>
    <section class="tarjeta">
      <h2>Datos sin conexión (IndexedDB)</h2>
      <ul>
        <li>Paradas respaldadas: <strong>${paradas.length}</strong></li>
        <li>Última actualización: <strong>${actualizadas ? new Date(actualizadas).toLocaleString('es-MX') : '—'}</strong></li>
        <li>Favoritas: <strong>${favoritos.length}</strong></li>
        <li>Comentarios pendientes de enviar: <strong id="num-pendientes">${pendientes.length}</strong></li>
        <li>Versión del service worker: <strong>${esc((await versionServiceWorker()) || '—')}</strong></li>
      </ul>
      <div class="botones">
        <button class="boton boton--sec" id="btn-actualizar">🔄 Actualizar catálogo</button>
        <button class="boton boton--sec" id="btn-borrar">🗑️ Borrar datos locales</button>
      </div>
    </section>
    <section class="tarjeta">
      <h2>Créditos</h2>
      <ul class="pequeno">
        <li>Foto de portada: «Hwy120Jalpan», <a href="https://commons.wikimedia.org/wiki/File:Hwy120Jalpan.JPG" target="_blank" rel="noopener">AlejandroLinaresGarcia</a>, CC BY-SA 4.0, vía Wikimedia Commons (recortada y comprimida).</li>
        <li>Misión de Santiago de Jalpan: <a href="https://commons.wikimedia.org/wiki/File:Misi%C3%B3n_de_Santiago_de_Jalpan,_Jalpan_de_Serra.jpg" target="_blank" rel="noopener">Diana.resendiz</a>, CC BY-SA 4.0, vía Wikimedia Commons (recortada y comprimida).</li>
        <li>Autobús en la sierra: imagen ilustrativa generada con IA.</li>
        <li>Mapas, ubicaciones y trazos: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">colaboradores de OpenStreetMap</a> (ODbL), con Leaflet y OSRM.</li>
        <li>Horarios y precios: Reservamos y horariodeautobuses.com.mx (fuentes en cada ficha).</li>
        <li>Tipografías: Bricolage Grotesque y Atkinson Hyperlegible (SIL Open Font License).</li>
      </ul>
    </section>`;

  $('#tema', c).addEventListener('change', (e) => guardarPref('tema', e.target.value));
  $('#autor', c).addEventListener('change', (e) => guardarPref('autor', e.target.value.trim()));
  $('#btn-actualizar', c).addEventListener('click', async () => {
    try {
      await obtenerParadas();
      toast('Catálogo actualizado');
      vistaAjustes(c);
    } catch {
      toast('Sin conexión: no se pudo actualizar');
    }
  });
  $('#btn-borrar', c).addEventListener('click', async () => {
    if (!confirm('¿Borrar favoritas, respaldo y preferencias de este dispositivo?')) return;
    await DB.borrarTodo();
    borrarPrefs();
    toast('Datos locales borrados');
    vistaAjustes(c);
  });
}

