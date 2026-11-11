// Calcula una vez los trazos por carretera de cada corrida (parada → destino) y los guarda
// en public/data/trazos.json para que la app los dibuje sin conexión.
//   · Coordenadas de destinos: Nominatim (OpenStreetMap)
//   · Trazo por carretera: OSRM de routing.openstreetmap.de (FOSSGIS), perfil auto
// Uso: npm run trazos   (respeta 1 petición por segundo; no ejecutar en bucle)
const fs = require('fs');
const path = require('path');

const UA = 'RutaExpress-proyecto-escolar/1.0 (github.com/Kaidav54/pwaauto)';
const PARADAS = path.join(__dirname, '..', 'public', 'data', 'paradas.json');
const SALIDA = path.join(__dirname, '..', 'public', 'data', 'trazos.json');

// clave de destino → búsqueda en Nominatim
const DESTINOS = {
  xilitla: { nombre: 'Xilitla, S.L.P.', buscar: 'Xilitla, San Luis Potosí, México' },
  'rio-verde': { nombre: 'Río Verde, S.L.P.', buscar: 'Rioverde, San Luis Potosí, México' },
  'ciudad-valles': { nombre: 'Ciudad Valles, S.L.P.', buscar: 'Ciudad Valles, San Luis Potosí, México' },
  tampico: { nombre: 'Tampico, Tamps.', buscar: 'Tampico, Tamaulipas, México' },
  'san-luis-potosi': { nombre: 'San Luis Potosí, S.L.P.', buscar: 'San Luis Potosí, San Luis Potosí, México' },
  queretaro: { nombre: 'Terminal de Autobuses de Querétaro', buscar: 'Terminal de Autobuses de Querétaro, Querétaro, México' },
  cdmx: { nombre: 'Terminal Central del Norte, CDMX', buscar: 'Terminal Central de Autobuses del Norte, Ciudad de México' },
  'pinal-de-amoles': { nombre: 'Pinal de Amoles, Qro.', buscar: 'Pinal de Amoles, Querétaro, México' },
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const r5 = (n) => Math.round(n * 1e5) / 1e5;

async function json(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

(async () => {
  const paradas = JSON.parse(fs.readFileSync(PARADAS, 'utf8'));
  const usados = new Set(paradas.flatMap((p) => p.rutas.map((r) => r.destino)).filter(Boolean));

  const destinos = {};
  for (const clave of usados) {
    const d = DESTINOS[clave];
    if (!d) throw new Error(`Destino sin búsqueda configurada: ${clave}`);
    const [res] = await json(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(d.buscar)}`);
    if (!res) throw new Error(`Nominatim no encontró: ${d.buscar}`);
    destinos[clave] = { nombre: d.nombre, lat: r5(+res.lat), lng: r5(+res.lon), osm: `${res.osm_type}/${res.osm_id}` };
    console.log('📍', clave, destinos[clave].lat, destinos[clave].lng, '·', res.display_name.slice(0, 70));
    await esperar(1100);
  }

  const trazos = {};
  for (const p of paradas) {
    for (const clave of new Set(p.rutas.map((r) => r.destino).filter(Boolean))) {
      const d = destinos[clave];
      const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${p.lng},${p.lat};${d.lng},${d.lat}?overview=simplified&geometries=geojson`;
      const res = await json(url);
      if (res.code !== 'Ok') throw new Error(`OSRM: ${res.code} ${p.id} → ${clave}`);
      const ruta = res.routes[0];
      (trazos[p.id] ||= {})[clave] = {
        distanciaKm: Math.round(ruta.distance / 1000),
        duracionMin: Math.round(ruta.duration / 60),
        // GeoJSON viene como [lng, lat]; Leaflet usa [lat, lng]
        puntos: ruta.geometry.coordinates.map(([lng, lat]) => [r5(lat), r5(lng)]),
      };
      console.log('🛣️ ', p.id, '→', clave, trazos[p.id][clave].distanciaKm, 'km,', trazos[p.id][clave].puntos.length, 'puntos');
      await esperar(1100);
    }
  }

  const datos = {
    generado: new Date().toISOString().slice(0, 10),
    fuente: 'Trazos aproximados por carretera calculados con OSRM sobre datos de © colaboradores de OpenStreetMap (ODbL). La ruta real del autobús puede variar.',
    destinos,
    trazos,
  };
  fs.writeFileSync(SALIDA, JSON.stringify(datos));
  console.log('✔', path.relative(process.cwd(), SALIDA), Math.round(fs.statSync(SALIDA).size / 1024), 'KB');
})().catch((e) => {
  console.error('✖', e.message);
  process.exit(1);
});
