// Mapas reales con Leaflet + OpenStreetMap.
// Leaflet se sirve desde /vendor (no CDN) para que el service worker lo precachee y funcione offline.
// Las teselas (imágenes del mapa) se guardan en caché a medida que se visitan (ver sw.js).
import { url, esc } from './util.js';

const { icono, etiquetaRuta } = window.PlantillaFicha;

let promesaLeaflet = null;

/** Carga leaflet.css y leaflet.js solo cuando hace falta un mapa. */
export function cargarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (promesaLeaflet) return promesaLeaflet;
  promesaLeaflet = new Promise((resolver, rechazar) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = url('vendor/leaflet/leaflet.css');
    document.head.append(css);
    const js = document.createElement('script');
    js.src = url('vendor/leaflet/leaflet.js');
    js.onload = () => resolver(window.L);
    js.onerror = () => {
      promesaLeaflet = null;
      rechazar(new Error('No se pudo cargar el mapa'));
    };
    document.head.append(js);
  });
  return promesaLeaflet;
}

const COLOR_TIPO = { autobus: '#b8452a', combi: '#2f5d50' };

function iconoParada(L, p, { destacada = false } = {}) {
  return L.divIcon({
    className: '',
    html: `<span class="pin${destacada ? ' pin--destacada' : ''}" style="--pin:${COLOR_TIPO[p.tipo] || '#b8452a'}">
             ${icono(p.tipo)}</span>`,
    iconSize: destacada ? [44, 44] : [36, 36],
    iconAnchor: destacada ? [22, 44] : [18, 36],
    popupAnchor: [0, destacada ? -40 : -32],
  });
}

function popupParada(p, href) {
  const rutas = [...new Set(p.rutas.map((r) => r.ruta))].map(etiquetaRuta).join(' ');
  return `<div class="popup">
    <strong>${esc(p.nombre)}</strong><br>
    <span class="suave pequeno">${esc(p.direccion)}</span>
    <div class="parada__rutas">${rutas}</div>
    ${href ? `<a class="boton popup__boton" href="${esc(href)}">Ver rutas y horarios</a>` : ''}
  </div>`;
}

/** Crea un mapa base con la capa de OpenStreetMap y aviso si no hay teselas (offline). */
async function crearMapa(contenedor, opciones = {}) {
  const L = await cargarLeaflet();
  contenedor.classList.add('mapa');
  const mapa = L.map(contenedor, { zoomControl: true, scrollWheelZoom: false, ...opciones });
  const capa = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true, // respuestas CORS: el SW puede guardarlas en caché sin respuestas opacas
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(mapa);

  let avisado = false;
  capa.on('tileerror', () => {
    if (avisado) return;
    avisado = true;
    const aviso = document.createElement('div');
    aviso.className = 'mapa__aviso';
    aviso.textContent = 'Sin conexión: solo se ven las zonas del mapa que ya visitaste.';
    contenedor.append(aviso);
  });
  // El contenedor puede haberse dibujado antes de tener tamaño final
  requestAnimationFrame(() => mapa.invalidateSize());
  return { L, mapa };
}

/** Mapa del catálogo: todas las paradas; devuelve actualizar(lista) para sincronizar con los filtros. */
export async function mapaParadas(contenedor, paradas, enlaces) {
  const { L, mapa } = await crearMapa(contenedor);
  const grupo = L.featureGroup().addTo(mapa);

  const actualizar = (lista) => {
    grupo.clearLayers();
    lista.forEach((p) =>
      L.marker([p.lat, p.lng], { icon: iconoParada(L, p), title: p.nombre, alt: p.nombre })
        .bindPopup(popupParada(p, enlaces[p.id]))
        .addTo(grupo)
    );
    if (lista.length) mapa.fitBounds(grupo.getBounds().pad(0.15), { maxZoom: 16 });
  };
  actualizar(paradas);
  if (!paradas.length) mapa.setView([0, 0], 2);
  return { actualizar, mapa };
}

/** Mapa de «Cerca de mí»: tu posición, la precisión del GPS y una línea hasta la parada más cercana. */
export async function mapaCerca(contenedor, pos, masCercana, otras, enlaces) {
  const { L, mapa } = await crearMapa(contenedor);
  const yo = [pos.lat, pos.lng];
  L.circle(yo, { radius: pos.precision, color: '#3d6f9e', weight: 1, fillOpacity: 0.12 }).addTo(mapa);
  L.circleMarker(yo, { radius: 8, color: '#fff', weight: 3, fillColor: '#3d6f9e', fillOpacity: 1 })
    .bindTooltip('Estás aquí', { direction: 'top' })
    .addTo(mapa);

  otras.forEach((p) =>
    L.marker([p.lat, p.lng], { icon: iconoParada(L, p), title: p.nombre }).bindPopup(popupParada(p, enlaces[p.id])).addTo(mapa)
  );
  const destino = [masCercana.lat, masCercana.lng];
  L.polyline([yo, destino], { color: '#2a1d14', weight: 4, dashArray: '2 9', lineCap: 'round' }).addTo(mapa);
  L.marker(destino, { icon: iconoParada(L, masCercana, { destacada: true }), title: masCercana.nombre, zIndexOffset: 1000 })
    .bindPopup(popupParada(masCercana, enlaces[masCercana.id]))
    .bindTooltip(masCercana.nombre, { permanent: true, direction: 'top', offset: [0, -42] })
    .addTo(mapa);
  mapa.fitBounds(L.latLngBounds([yo, destino]).pad(0.4), { maxZoom: 17 });
  return mapa;
}

/** Mapa pequeño de la ficha de una parada. */
export async function mapaFicha(contenedor, parada) {
  const { L, mapa } = await crearMapa(contenedor, { center: [parada.lat, parada.lng], zoom: 17 });
  const origen = [parada.lat, parada.lng];
  L.marker(origen, { icon: iconoParada(L, parada, { destacada: true }), title: parada.nombre, zIndexOffset: 1000 }).addTo(mapa);
  const capa = L.layerGroup().addTo(mapa); // aquí se dibuja la corrida o la caminata seleccionada

  // Línea con "borde" blanco para que se distinga sobre el mapa
  const linea = (puntos, color, extra = {}) => {
    L.polyline(puntos, { color: '#fff', weight: 9, opacity: 0.9, lineJoin: 'round' }).addTo(capa);
    return L.polyline(puntos, { color, weight: 5, lineJoin: 'round', ...extra }).addTo(capa);
  };

  return {
    mapa,

    /** Dibuja el trazo por carretera de una corrida hasta su destino. */
    mostrarCorrida(trazo, destino, color) {
      capa.clearLayers();
      const l = linea(trazo.puntos, color);
      L.circleMarker([destino.lat, destino.lng], { radius: 8, color: '#fff', weight: 3, fillColor: color, fillOpacity: 1 })
        .bindTooltip(destino.nombre, { permanent: true, direction: 'top', offset: [0, -8] })
        .addTo(capa);
      mapa.fitBounds(l.getBounds().pad(0.12));
    },

    /** Dibuja el camino a pie desde la posición del usuario hasta la parada. */
    mostrarCaminata(puntos, pos) {
      capa.clearLayers();
      const yo = [pos.lat, pos.lng];
      L.circle(yo, { radius: pos.precision || 0, color: '#3d6f9e', weight: 1, fillOpacity: 0.12 }).addTo(capa);
      const l = linea(puntos, '#3d6f9e', { dashArray: puntos.length > 2 ? null : '2 9', lineCap: 'round' });
      L.circleMarker(yo, { radius: 8, color: '#fff', weight: 3, fillColor: '#3d6f9e', fillOpacity: 1 })
        .bindTooltip('Estás aquí', { permanent: true, direction: 'top', offset: [0, -8] })
        .addTo(capa);
      mapa.fitBounds(l.getBounds().pad(0.25), { maxZoom: 17 });
    },

    limpiar() {
      capa.clearLayers();
      mapa.setView(origen, 17);
    },
  };
}

/** Camino a pie por calles (OSRM perfil peatón). Si falla, devuelve null. */
export async function rutaAPie(desde, hasta) {
  const u = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${desde.lng},${desde.lat};${hasta.lng},${hasta.lat}?overview=full&geometries=geojson`;
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    if (j.code !== 'Ok') return null;
    const ruta = j.routes[0];
    return {
      metros: ruta.distance,
      minutos: Math.max(1, Math.round(ruta.duration / 60)),
      puntos: ruta.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    };
  } catch {
    return null;
  }
}
