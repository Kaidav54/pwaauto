// RutaExpress · servidor
const fs = require('fs');
const path = require('path');
const express = require('express');
const { paginaFicha, paginaNoEncontrada } = require('./server/render');
const { leer, escribir } = require('./server/almacen');
const Remoto = require('./public/js/remoto.js');

// Reseñas compartidas en Supabase (se desactiva con SUPABASE_DESACTIVADO=1, p. ej. en las pruebas)
const usarSupabase = () => Remoto.activo() && process.env.SUPABASE_DESACTIVADO !== '1';

const app = express();
const PUERTO = process.env.PORT || 3000;
const PUBLICO = path.join(__dirname, 'public');
const ARCHIVO_PARADAS = path.join(PUBLICO, 'data', 'paradas.json');

const leerParadas = () => JSON.parse(fs.readFileSync(ARCHIVO_PARADAS, 'utf8'));
const buscarParada = (id) => leerParadas().find((p) => p.id === id);

app.use(express.json());
app.use(express.static(PUBLICO));

app.get('/api/salud', (_req, res) => res.json({ ok: true, hora: new Date().toISOString() }));

// ---------- Catálogo (datos remotos que consume el CSR) ----------
app.get('/api/paradas', (_req, res) => res.json(leerParadas()));

app.get('/api/paradas/:id', (req, res) => {
  const parada = buscarParada(req.params.id);
  if (!parada) return res.status(404).json({ error: 'Parada no encontrada' });
  res.json(parada);
});

// ---------- Reseñas ----------
const resenasDe = (paradaId) =>
  leer('resenas.json', [])
    .filter((r) => r.paradaId === paradaId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

app.get('/api/paradas/:id/resenas', (req, res) => {
  if (!buscarParada(req.params.id)) return res.status(404).json({ error: 'Parada no encontrada' });
  res.json(resenasDe(req.params.id));
});

app.post('/api/resenas', (req, res) => {
  const { id, paradaId, autor, texto, fecha } = req.body || {};
  const textoLimpio = String(texto || '').trim();
  if (!id || typeof id !== 'string' || id.length > 64) return res.status(400).json({ error: 'id inválido' });
  if (!buscarParada(paradaId)) return res.status(400).json({ error: 'paradaId inválido' });
  if (textoLimpio.length < 3 || textoLimpio.length > 500) return res.status(400).json({ error: 'El comentario debe tener entre 3 y 500 caracteres' });

  const todas = leer('resenas.json', []);
  // Idempotente: si Background Sync reintenta el mismo envío, no se duplica
  const existente = todas.find((r) => r.id === id);
  if (existente) return res.status(200).json(existente);

  const fechaValida = !Number.isNaN(Date.parse(fecha)) ? new Date(fecha).toISOString() : new Date().toISOString();
  const resena = {
    id,
    paradaId,
    autor: String(autor || '').trim().slice(0, 40) || 'Anónimo',
    texto: textoLimpio,
    fecha: fechaValida,
    recibida: new Date().toISOString(),
  };
  todas.push(resena);
  escribir('resenas.json', todas);
  res.status(201).json(resena);
});

// ---------- Notificaciones push ----------
app.use('/api/push', require('./server/push').router);

// ---------- SSR: ficha generada en el servidor ----------
app.get('/parada/:id', async (req, res) => {
  const parada = buscarParada(req.params.id);
  if (!parada) return res.status(404).type('html').send(paginaNoEncontrada());
  let resenas = resenasDe(parada.id);
  if (usarSupabase()) {
    try {
      resenas = await Remoto.listarResenas(parada.id, { señal: AbortSignal.timeout(2500) });
    } catch (e) {
      console.warn('[SSR] Supabase no respondió, se usan las reseñas locales:', e.message);
    }
  }
  res.type('html').send(paginaFicha(parada, resenas));
});

if (require.main === module) {
  app.listen(PUERTO, () => console.log(`RutaExpress en http://localhost:${PUERTO}`));
}

module.exports = app;
