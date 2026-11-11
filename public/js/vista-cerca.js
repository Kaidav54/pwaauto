// Vista «Cerca de mí»: usa el GPS para indicar la parada más cercana
import { esc, $, toast } from './util.js';
import { obtenerParadas, enlaceFicha } from './api.js';
import { itemParada } from './vistas.js';
import { mapaCerca } from './mapa.js';
import {
  soportaGPS, obtenerPosicion, ordenarPorCercania, formatoDistancia, minutosCaminando, rumbo, vibrar,
} from './dispositivo.js';

const { icono, svg, etiquetaRuta } = window.PlantillaFicha;

export async function vistaCerca(c) {
  c.innerHTML = `
    <h1>Cerca de mí</h1>
    <section class="tarjeta">
      <p>Usamos el GPS de tu dispositivo para encontrar la parada o base de combis más cercana.
         Tu ubicación no sale de tu teléfono.</p>
      <div class="botones">
        <button class="boton" id="btn-gps" ${soportaGPS() ? '' : 'disabled'}>${svg('cerca')}Buscar la parada más cercana</button>
      </div>
      ${soportaGPS() ? '' : '<p class="suave">Este dispositivo no tiene geolocalización.</p>'}
    </section>
    <div id="resultado"></div>`;

  $('#btn-gps', c).addEventListener('click', () => buscar(c));
}

async function buscar(c) {
  const boton = $('#btn-gps', c);
  const resultado = $('#resultado', c);
  boton.disabled = true;
  resultado.innerHTML = '<div class="cargando">Buscando tu ubicación…</div>';
  try {
    const [pos, paradas] = await Promise.all([obtenerPosicion(), obtenerParadas()]);
    const ordenadas = ordenarPorCercania(paradas, pos);
    const [masCercana, ...resto] = ordenadas;
    vibrar([60, 40, 60]);

    const href = await enlaceFicha(masCercana.id);
    const enlaces = Object.fromEntries(await Promise.all(ordenadas.map(async (p) => [p.id, await enlaceFicha(p.id)])));
    const otras = resto.slice(0, 4).map((p) => itemParada(p, enlaces[p.id], formatoDistancia(p.distancia)));

    resultado.innerHTML = `
      <section class="tarjeta">
        <span class="kicker">Tu parada más cercana</span>
        <div class="ficha__cabecera">
          <div class="ficha__icono" data-tipo="${esc(masCercana.tipo)}">${icono(masCercana.tipo)}</div>
          <div>
            <h2>${esc(masCercana.nombre)}</h2>
            <div><strong>${formatoDistancia(masCercana.distancia)}</strong> al ${rumbo(pos, masCercana)}
              · unos ${minutosCaminando(masCercana.distancia)} min caminando</div>
            <div class="suave">${esc(masCercana.direccion)}</div>
            <div class="parada__rutas">${[...new Set(masCercana.rutas.map((r) => r.ruta))].map(etiquetaRuta).join('')}</div>
          </div>
        </div>
        <div class="botones">
          <a class="boton" href="${esc(href)}">Ver rutas y horarios</a>
          <a class="boton boton--sec" target="_blank" rel="noopener"
             href="https://www.google.com/maps/dir/?api=1&origin=${pos.lat},${pos.lng}&destination=${masCercana.lat},${masCercana.lng}&travelmode=walking">${svg('cerca')}Cómo llegar a pie</a>
        </div>
        <p class="suave pequeno">Precisión del GPS: ±${Math.round(pos.precision)} m</p>
        <div id="mapa-cerca" class="mapa" role="region" aria-label="Mapa de tu ubicación y la parada más cercana"></div>
      </section>
      <h2>Otras paradas cercanas</h2>
      <ul class="lista">${otras.join('')}</ul>`;

    mapaCerca($('#mapa-cerca', c), pos, masCercana, resto.slice(0, 4), enlaces).catch((e) => {
      console.warn(e);
      $('#mapa-cerca', c)?.remove();
    });
  } catch (e) {
    resultado.innerHTML = `<section class="tarjeta estado-vacio"><p>${esc(e.message)}</p></section>`;
    toast(e.message);
  } finally {
    boton.disabled = false;
  }
}
