// SSR: genera en el servidor la página completa (shell + ficha) de una parada.
const { esc, fichaHTML } = require('../public/js/plantilla-ficha.js');

function pagina({ titulo, descripcion, cuerpo, datos }) {
  // Los datos se incrustan como JSON para que el cliente pueda "hidratar" la ficha (Fase 11)
  const json = JSON.stringify(datos ?? null).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(descripcion)}">
  <meta name="theme-color" content="#0f766e">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body data-ssr="ficha">
  <header class="barra">
    <a class="marca" href="/#/"><span class="marca__logo" aria-hidden="true">🚌</span><span class="marca__nombre">RutaExpress</span></a>
  </header>
  <main id="contenido" class="contenido">
${cuerpo}
  </main>
  <nav class="menu" aria-label="Navegación principal">
    <a href="/#/"><span aria-hidden="true">🏠</span>Inicio</a>
    <a href="/#/paradas" aria-current="page"><span aria-hidden="true">🚏</span>Paradas</a>
    <a href="/#/cerca"><span aria-hidden="true">📍</span>Cerca</a>
    <a href="/#/avisos"><span aria-hidden="true">🔔</span>Avisos</a>
    <a href="/#/ajustes"><span aria-hidden="true">⚙️</span>Ajustes</a>
  </nav>
  <script type="application/json" id="datos-ssr">${json}</script>
</body>
</html>`;
}

function paginaFicha(parada, resenas = []) {
  const rutas = parada.rutas.map((r) => r.ruta).join(', ');
  return pagina({
    titulo: `${parada.nombre} · RutaExpress`,
    descripcion: `${parada.nombre}: rutas ${rutas}, horarios y tarifas.`,
    cuerpo: fichaHTML(parada, { resenas, enlaceVolver: '/#/paradas' }),
    datos: { parada, resenas },
  });
}

function paginaNoEncontrada() {
  return pagina({
    titulo: 'Parada no encontrada · RutaExpress',
    descripcion: 'La parada solicitada no existe.',
    cuerpo: '<section class="tarjeta estado-vacio"><h1>Parada no encontrada</h1><p><a href="/#/paradas">Ver todas las paradas</a></p></section>',
  });
}

module.exports = { paginaFicha, paginaNoEncontrada };
