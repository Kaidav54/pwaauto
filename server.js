// RutaExpress · servidor
const fs = require('fs');
const path = require('path');
const express = require('express');
const { paginaFicha, paginaNoEncontrada } = require('./server/render');

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

// ---------- SSR: ficha generada en el servidor ----------
app.get('/parada/:id', (req, res) => {
  const parada = buscarParada(req.params.id);
  if (!parada) return res.status(404).type('html').send(paginaNoEncontrada());
  res.type('html').send(paginaFicha(parada));
});

if (require.main === module) {
  app.listen(PUERTO, () => console.log(`RutaExpress en http://localhost:${PUERTO}`));
}

module.exports = app;
