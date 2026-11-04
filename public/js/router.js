// Enrutador CSR basado en el hash (#/ruta). Funciona sin configuración del servidor
// y también en GitHub Pages.
const rutas = [];

/** Registra una ruta. El patrón admite parámetros, p. ej. "parada/:id". */
export function ruta(patron, vista, nombreMenu) {
  const claves = [];
  const regex = new RegExp(
    '^' + patron.replace(/:(\w+)/g, (_, k) => (claves.push(k), '([^/]+)')) + '$'
  );
  rutas.push({ regex, claves, vista, nombreMenu });
}

function resolver() {
  const camino = decodeURI(location.hash.replace(/^#\/?/, '')).replace(/\/$/, '');
  for (const r of rutas) {
    const m = camino.match(r.regex);
    if (m) {
      const params = Object.fromEntries(r.claves.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      return { ...r, params };
    }
  }
  return null;
}

async function navegar() {
  const contenedor = document.getElementById('contenido');
  const r = resolver();
  document.querySelectorAll('.menu a').forEach((a) => {
    if (a.dataset.ruta === r?.nombreMenu) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (!r) {
    contenedor.innerHTML = '<section class="tarjeta estado-vacio"><h1>Página no encontrada</h1><p><a href="#/">Volver al inicio</a></p></section>';
    return;
  }
  contenedor.innerHTML = '<div class="cargando">Cargando…</div>';
  try {
    await r.vista(contenedor, r.params);
  } catch (e) {
    console.error(e);
    contenedor.innerHTML = `<section class="tarjeta estado-vacio"><h1>No se pudo cargar</h1><p>${e.message}</p></section>`;
  }
  window.scrollTo(0, 0);
}

export function iniciarRouter() {
  window.addEventListener('hashchange', navegar);
  return navegar();
}
