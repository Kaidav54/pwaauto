// Vistas renderizadas en el navegador (CSR)
import { esc, $, $$, toast } from './util.js';
import { obtenerParadas, obtenerParada, enlaceFicha } from './api.js';
import { estadoInstalacion, alCambiarInstalacion, instalar } from './instalacion.js';
import { leerPref, guardarPref, borrarPrefs } from './prefs.js';
import { activarAccionesFicha } from './ficha-acciones.js';

const { icono, tipoTexto, fichaHTML } = window.PlantillaFicha;

// ---------- Inicio (Home) ----------
export async function vistaInicio(c) {
  c.innerHTML = `
    <section class="tarjeta hero">
      <h1>¿A dónde vas hoy?</h1>
      <p>Consulta paradas, rutas, horarios y tarifas de tu ciudad, incluso sin conexión.</p>
      <div class="botones">
        <a class="boton" href="#/paradas">Ver paradas</a>
        <button class="boton boton--sec" id="btn-instalar" hidden>📲 Instalar app</button>
      </div>
      <p class="pequeno" id="texto-instalacion"></p>
    </section>
    <div class="atajos">
      <a class="atajo" href="#/paradas"><span>🚏</span><strong>Paradas</strong><span class="suave pequeno">Catálogo y horarios</span></a>
      <a class="atajo" href="#/cerca"><span>📍</span><strong>Cerca de mí</strong><span class="suave pequeno">Parada más cercana</span></a>
      <a class="atajo" href="#/avisos"><span>🔔</span><strong>Avisos</strong><span class="suave pequeno">Desvíos y retrasos</span></a>
      <a class="atajo" href="#/ajustes"><span>⚙️</span><strong>Ajustes</strong><span class="suave pequeno">Tema y datos</span></a>
    </div>`;

  seccionMisParadas(c);

  const boton = $('#btn-instalar', c);
  const texto = $('#texto-instalacion', c);
  const pintar = (estado) => {
    boton.hidden = estado !== 'disponible';
    texto.textContent =
      estado === 'instalada' ? '✅ Estás usando RutaExpress instalada.' :
      estado === 'ios' ? 'En iPhone: toca Compartir ▸ «Agregar a pantalla de inicio».' : '';
  };
  pintar(estadoInstalacion());
  const quitar = alCambiarInstalacion(pintar);
  window.addEventListener('hashchange', quitar, { once: true });
  boton.addEventListener('click', async () => {
    if (await instalar()) toast('¡Gracias por instalar RutaExpress!');
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
      lista.map(async (p) => itemParada(p, await enlaceFicha(p.id), favoritos.includes(p.id) ? '★' : '🕘'))
    );
    const sec = document.createElement('section');
    sec.className = 'tarjeta';
    sec.innerHTML = `<h2>Mis paradas</h2><p class="suave pequeno">★ favoritas · 🕘 última consultada</p><ul class="lista">${items.join('')}</ul>`;
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
    <h1>Paradas y bases</h1>
    <div class="buscador">
      <label for="q" class="suave pequeno">Buscar por nombre, zona o número de ruta</label>
      <input id="q" type="search" placeholder="Ej. Centro, 12, combi…" autocomplete="off">
    </div>
    <div class="filtros" role="group" aria-label="Filtrar por tipo">
      <button class="chip" data-tipo="todos" aria-pressed="true">Todas</button>
      <button class="chip" data-tipo="autobus" aria-pressed="false">🚌 Autobús</button>
      <button class="chip" data-tipo="combi" aria-pressed="false">🚐 Combis</button>
    </div>
    <ul class="lista" id="lista"></ul>`;

  let tipo = 'todos';
  const dibujar = () => {
    const q = $('#q', c).value.trim().toLowerCase();
    const filtradas = paradas.filter((p) => {
      const texto = `${p.nombre} ${p.zona} ${p.direccion} ${p.rutas.map((r) => r.ruta + ' ' + r.nombre).join(' ')}`.toLowerCase();
      return (tipo === 'todos' || p.tipo === tipo) && (!q || texto.includes(q));
    });
    $('#lista', c).innerHTML = filtradas.length
      ? filtradas.map((p) => itemParada(p, enlaces[p.id])).join('')
      : '<li class="estado-vacio">No hay paradas que coincidan.</li>';
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
  return `<li><a class="parada" href="${esc(href)}">
    <span class="parada__icono" aria-hidden="true">${icono(p.tipo)}</span>
    <span>
      <span class="parada__nombre">${esc(p.nombre)}</span>
      <span class="suave pequeno"> · ${tipoTexto(p.tipo)} · ${esc(p.zona)}</span>
      <span class="parada__rutas">${p.rutas.map((r) => `<span class="etiqueta">${esc(r.ruta)}</span>`).join('')}</span>
    </span>
    <span class="suave">${extra || '›'}</span>
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
      </ul>
      <div class="botones">
        <button class="boton boton--sec" id="btn-actualizar">🔄 Actualizar catálogo</button>
        <button class="boton boton--sec" id="btn-borrar">🗑️ Borrar datos locales</button>
      </div>
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

// ---------- Marcadores de vistas de fases posteriores ----------
export const vistaPendiente = (titulo) => async (c) => {
  c.innerHTML = `<section class="tarjeta estado-vacio"><h1>${esc(titulo)}</h1><p>Disponible próximamente.</p></section>`;
};
