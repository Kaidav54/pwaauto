// Persistencia mínima en archivos JSON (suficiente para el proyecto; en producción sería una base de datos)
const fs = require('fs');
const path = require('path');

const DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DIR, { recursive: true });

function leer(nombre, predeterminado) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, nombre), 'utf8'));
  } catch {
    return predeterminado;
  }
}

function escribir(nombre, datos) {
  const destino = path.join(DIR, nombre);
  const temporal = `${destino}.tmp`;
  fs.writeFileSync(temporal, JSON.stringify(datos, null, 2));
  fs.renameSync(temporal, destino);
}

module.exports = { leer, escribir, DIR };
