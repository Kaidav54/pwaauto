// Vistas renderizadas en el navegador (CSR)
import { esc, $, $$, toast } from './util.js';
import { obtenerParadas, obtenerParada, enlaceFicha } from './api.js';
import { estadoInstalacion, alCambiarInstalacion, instalar } from './instalacion.js';

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
}

// ---------- Marcadores de vistas de fases posteriores ----------
export const vistaPendiente = (titulo) => async (c) => {
  c.innerHTML = `<section class="tarjeta estado-vacio"><h1>${esc(titulo)}</h1><p>Disponible próximamente.</p></section>`;
};
