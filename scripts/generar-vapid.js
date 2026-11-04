// Genera un par de claves VAPID y las guarda en .vapid.json (ignorado por git).
// Uso: npm run vapid
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const destino = path.join(__dirname, '..', '.vapid.json');
if (fs.existsSync(destino) && !process.argv.includes('--forzar')) {
  console.log('Ya existe .vapid.json (usa --forzar para regenerarlo; las suscripciones actuales dejarán de funcionar).');
  console.log(JSON.parse(fs.readFileSync(destino, 'utf8')).publicKey);
  process.exit(0);
}

const claves = webpush.generateVAPIDKeys();
fs.writeFileSync(destino, JSON.stringify({ ...claves, subject: 'mailto:admin@rutaexpress.local' }, null, 2));
console.log('✔ Claves VAPID guardadas en .vapid.json');
console.log('Pública :', claves.publicKey);
console.log('Privada : (guardada en el archivo; no la subas a GitHub)');
console.log('\nEn producción puedes usar variables de entorno: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT');
