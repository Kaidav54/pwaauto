// RutaExpress · servidor
const path = require('path');
const express = require('express');

const app = express();
const PUERTO = process.env.PORT || 3000;
const PUBLICO = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.static(PUBLICO));

app.get('/api/salud', (_req, res) => res.json({ ok: true, hora: new Date().toISOString() }));

if (require.main === module) {
  app.listen(PUERTO, () => console.log(`RutaExpress en http://localhost:${PUERTO}`));
}

module.exports = app;
