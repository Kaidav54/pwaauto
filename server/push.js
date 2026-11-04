// Notificaciones push: claves VAPID, suscripciones y envío
const fs = require('fs');
const path = require('path');
const express = require('express');
const webpush = require('web-push');
const { leer, escribir } = require('./almacen');

const ARCHIVO_VAPID = path.join(__dirname, '..', '.vapid.json');
const ARCHIVO_SUSCRIPCIONES = 'suscripciones.json';

function cargarClaves() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT || 'mailto:admin@rutaexpress.local',
    };
  }
  if (fs.existsSync(ARCHIVO_VAPID)) return JSON.parse(fs.readFileSync(ARCHIVO_VAPID, 'utf8'));
  // Primera ejecución: se generan y guardan automáticamente
  const claves = { ...webpush.generateVAPIDKeys(), subject: 'mailto:admin@rutaexpress.local' };
  fs.writeFileSync(ARCHIVO_VAPID, JSON.stringify(claves, null, 2));
  console.log('[push] Claves VAPID generadas en .vapid.json');
  return claves;
}

const claves = cargarClaves();
webpush.setVapidDetails(claves.subject, claves.publicKey, claves.privateKey);

const leerSuscripciones = () => leer(ARCHIVO_SUSCRIPCIONES, []);
const guardarSuscripciones = (lista) => escribir(ARCHIVO_SUSCRIPCIONES, lista);

/** Envía un aviso a todas las suscripciones y elimina las caducadas. */
async function enviarATodos(aviso) {
  const suscripciones = leerSuscripciones();
  const carga = JSON.stringify(aviso);
  const caducadas = new Set();
  let enviadas = 0;
  await Promise.all(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification(s, carga, { TTL: 60 * 60 * 6 });
        enviadas++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) caducadas.add(s.endpoint);
        else console.warn('[push] Error al enviar', e.statusCode, e.body || e.message);
      }
    })
  );
  if (caducadas.size) guardarSuscripciones(leerSuscripciones().filter((s) => !caducadas.has(s.endpoint)));
  return { total: suscripciones.length, enviadas, eliminadas: caducadas.size };
}

const router = express.Router();

router.get('/clave-publica', (_req, res) => res.json({ clave: claves.publicKey }));

router.post('/suscribir', (req, res) => {
  const s = req.body?.suscripcion;
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) return res.status(400).json({ error: 'Suscripción inválida' });
  const lista = leerSuscripciones().filter((x) => x.endpoint !== s.endpoint);
  lista.push({ endpoint: s.endpoint, keys: s.keys, fecha: new Date().toISOString() });
  guardarSuscripciones(lista);
  res.status(201).json({ ok: true, total: lista.length });
});

router.post('/desuscribir', (req, res) => {
  const endpoint = req.body?.endpoint;
  guardarSuscripciones(leerSuscripciones().filter((x) => x.endpoint !== endpoint));
  res.json({ ok: true });
});

// Publicar un aviso (desvío, retraso, obras…). Si ADMIN_TOKEN está definido, se exige en la cabecera.
router.post('/enviar', async (req, res) => {
  if (process.env.ADMIN_TOKEN && req.get('x-admin-token') !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const { titulo, cuerpo, url, tipo } = req.body || {};
  if (!titulo || !cuerpo) return res.status(400).json({ error: 'Faltan título o cuerpo' });
  const aviso = {
    id: `${Date.now()}`,
    titulo: String(titulo).slice(0, 80),
    cuerpo: String(cuerpo).slice(0, 240),
    url: url ? String(url) : './#/avisos',
    tipo: ['desvio', 'retraso', 'obras', 'info'].includes(tipo) ? tipo : 'info',
    fecha: new Date().toISOString(),
  };
  res.json({ aviso, ...(await enviarATodos(aviso)) });
});

module.exports = { router, enviarATodos, clavePublica: claves.publicKey };
