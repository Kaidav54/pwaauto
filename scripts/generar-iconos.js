// Genera los íconos PNG de RutaExpress sin dependencias externas.
// Uso: npm run iconos
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SALIDA = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(SALIDA, { recursive: true });

// ---------- Escritor PNG mínimo ----------
const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function bloque(tipo, datos) {
  const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
  const td = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([largo, td, crc]);
}
function png(ancho, alto, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0); ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  const filas = Buffer.alloc((ancho * 4 + 1) * alto);
  for (let y = 0; y < alto; y++) rgba.copy(filas, y * (ancho * 4 + 1) + 1, y * ancho * 4, (y + 1) * ancho * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', ihdr),
    bloque('IDAT', zlib.deflateSync(filas, { level: 9 })),
    bloque('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Dibujo del ícono (coordenadas normalizadas 0..1) ----------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const VERDE = hex('#0f766e'), BLANCO = hex('#ffffff'), OSCURO = hex('#134e4a'), AMBAR = hex('#f59e0b');
const TRANSP = [0, 0, 0, 0];

const enRectRed = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const enCirculo = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

// escala < 1 encoge el dibujo para dejar zona segura (íconos maskable)
function colorEn(x, y, { maskable }) {
  const fondo = maskable ? true : enRectRed(x, y, 0, 0, 1, 1, 0.22);
  if (!fondo) return TRANSP;
  const s = maskable ? 0.72 : 0.92;
  const u = (x - 0.5) / s + 0.5, v = (y - 0.5) / s + 0.5;
  // ruedas
  if (enRectRed(u, v, 0.28, 0.74, 0.40, 0.84, 0.03) || enRectRed(u, v, 0.60, 0.74, 0.72, 0.84, 0.03)) return OSCURO;
  // carrocería del autobús
  if (enRectRed(u, v, 0.22, 0.16, 0.78, 0.78, 0.09)) {
    if (enRectRed(u, v, 0.28, 0.26, 0.72, 0.50, 0.04)) return OSCURO;          // parabrisas
    if (enRectRed(u, v, 0.36, 0.19, 0.64, 0.23, 0.02)) return OSCURO;          // letrero de ruta
    if (enCirculo(u, v, 0.33, 0.64, 0.045) || enCirculo(u, v, 0.67, 0.64, 0.045)) return AMBAR; // faros
    return BLANCO;
  }
  return VERDE;
}

function dibujar(tam, opciones) {
  const SS = 4; // supermuestreo para suavizar bordes
  const buf = Buffer.alloc(tam * tam * 4);
  for (let py = 0; py < tam; py++) {
    for (let px = 0; px < tam; px++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = colorEn((px + (sx + 0.5) / SS) / tam, (py + (sy + 0.5) / SS) / tam, opciones);
        acc[0] += c[0] * c[3]; acc[1] += c[1] * c[3]; acc[2] += c[2] * c[3]; acc[3] += c[3];
      }
      const i = (py * tam + px) * 4, a = acc[3];
      buf[i] = a ? acc[0] / a : 0; buf[i + 1] = a ? acc[1] / a : 0; buf[i + 2] = a ? acc[2] / a : 0;
      buf[i + 3] = a / (SS * SS);
    }
  }
  return png(tam, tam, buf);
}

const ICONOS = [
  { nombre: 'icon-72.png', tam: 72 },
  { nombre: 'icon-96.png', tam: 96 },
  { nombre: 'icon-144.png', tam: 144 },
  { nombre: 'icon-192.png', tam: 192 },
  { nombre: 'icon-512.png', tam: 512 },
  { nombre: 'maskable-192.png', tam: 192, maskable: true },
  { nombre: 'maskable-512.png', tam: 512, maskable: true },
  { nombre: 'apple-touch-icon.png', tam: 180, maskable: true },
  { nombre: 'badge-72.png', tam: 72 },
];

for (const { nombre, tam, maskable = false } of ICONOS) {
  fs.writeFileSync(path.join(SALIDA, nombre), dibujar(tam, { maskable }));
  console.log('✔', nombre, `${tam}x${tam}`);
}
