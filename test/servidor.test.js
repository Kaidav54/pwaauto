// Pruebas automáticas del servidor (node --test). Uso: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Datos de prueba en una carpeta temporal para no tocar data/
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'rutaexpress-test-'));
process.env.SUPABASE_DESACTIVADO = '1'; // las pruebas no tocan la base de datos real
const app = require('../server');

let srv, base;
before(() => new Promise((r) => { srv = app.listen(0, () => { base = `http://localhost:${srv.address().port}`; r(); }); }));
after(() => { srv.closeAllConnections?.(); srv.close(); });

const post = (ruta, cuerpo) =>
  fetch(base + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });

test('CP-01 · /api/salud responde ok', async () => {
  const r = await fetch(`${base}/api/salud`);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).ok, true);
});

test('CP-02 · el catálogo tiene paradas con rutas, horarios y tarifa', async () => {
  const paradas = await (await fetch(`${base}/api/paradas`)).json();
  assert.ok(paradas.length >= 5);
  for (const p of paradas) {
    assert.ok(p.id && p.nombre && typeof p.lat === 'number' && typeof p.lng === 'number');
    for (const r of p.rutas) assert.ok(r.ruta && r.primera && r.ultima && r.tarifa > 0);
  }
});

test('CP-03 · la ficha SSR llega como HTML completo con datos para hidratar', async () => {
  const r = await fetch(`${base}/parada/terminal-centro`);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /<h1>Terminal Centro<\/h1>/);
  assert.match(html, /Centro – Universidad/);
  assert.match(html, /\$12\.00/);
  assert.match(html, /id="datos-ssr"/);
  assert.match(html, /ficha-ssr\.js/);
});

test('CP-04 · parada inexistente devuelve 404', async () => {
  assert.equal((await fetch(`${base}/parada/no-existe`)).status, 404);
  assert.equal((await fetch(`${base}/api/paradas/no-existe`)).status, 404);
});

test('CP-05 · publicar reseña y verla en API y SSR', async () => {
  const resena = { id: 'test-1', paradaId: 'plaza-sur', autor: 'QA', texto: 'La ruta 5 va llena', fecha: new Date().toISOString() };
  assert.equal((await post('/api/resenas', resena)).status, 201);
  const lista = await (await fetch(`${base}/api/paradas/plaza-sur/resenas`)).json();
  assert.ok(lista.some((r) => r.id === 'test-1'));
  assert.match(await (await fetch(`${base}/parada/plaza-sur`)).text(), /La ruta 5 va llena/);
});

test('CP-06 · reenviar la misma reseña (reintento de Background Sync) no la duplica', async () => {
  const resena = { id: 'test-2', paradaId: 'universidad', texto: 'Parada segura e iluminada', fecha: new Date().toISOString() };
  assert.equal((await post('/api/resenas', resena)).status, 201);
  assert.equal((await post('/api/resenas', resena)).status, 200);
  const lista = await (await fetch(`${base}/api/paradas/universidad/resenas`)).json();
  assert.equal(lista.filter((r) => r.id === 'test-2').length, 1);
});

test('CP-07 · reseñas inválidas se rechazan y el HTML se escapa', async () => {
  assert.equal((await post('/api/resenas', { id: 'x', paradaId: 'plaza-sur', texto: 'no' })).status, 400);
  assert.equal((await post('/api/resenas', { id: 'y', paradaId: 'falsa', texto: 'texto válido' })).status, 400);
  await post('/api/resenas', { id: 'xss', paradaId: 'estacion-tren', texto: '<script>alert(1)</script>' });
  const html = await (await fetch(`${base}/parada/estacion-tren`)).text();
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('CP-08 · push: clave pública VAPID y validación de suscripción', async () => {
  const { clave } = await (await fetch(`${base}/api/push/clave-publica`)).json();
  assert.match(clave, /^[A-Za-z0-9_-]{80,}$/);
  assert.equal((await post('/api/push/suscribir', { suscripcion: {} })).status, 400);
  const envio = await (await post('/api/push/enviar', { titulo: 'Prueba', cuerpo: 'Sin suscriptores' })).json();
  assert.equal(envio.total, 0);
});

test('CP-09 · archivos PWA: manifiesto, service worker y offline.html', async () => {
  const manifiesto = await (await fetch(`${base}/manifest.json`)).json();
  assert.equal(manifiesto.display, 'standalone');
  assert.ok(manifiesto.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
  assert.ok(manifiesto.icons.some((i) => i.sizes === '192x192'));
  const sw = await (await fetch(`${base}/sw.js`)).text();
  for (const evento of ['install', 'activate', 'fetch', 'sync', 'push', 'notificationclick']) {
    assert.ok(sw.includes(`addEventListener('${evento}'`), `sw.js debe escuchar ${evento}`);
  }
  assert.equal((await fetch(`${base}/offline.html`)).status, 200);
});

test('CP-10 · todos los archivos precacheados por el SW existen', async () => {
  const sw = await (await fetch(`${base}/sw.js`)).text();
  const lista = [...sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const archivo of lista) {
    const r = await fetch(new URL(archivo, `${base}/`));
    assert.equal(r.status, 200, `${archivo} no existe`);
  }
});
