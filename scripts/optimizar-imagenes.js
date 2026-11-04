// Convierte las fotos originales de assets/jalpan/ a WebP optimizado en public/img/.
// Uso: npm run imagenes   (los originales no se suben a git; solo las versiones optimizadas)
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ORIGEN = path.join(__dirname, '..', 'assets', 'jalpan');
const DESTINO = path.join(__dirname, '..', 'public', 'img');
fs.mkdirSync(DESTINO, { recursive: true });

// nombre de salida → archivo original, anchos y recorte
const IMAGENES = [
  { salida: 'jalpan-centro', original: 'fffbf838-0471-4d14-96e5-583cb09f70ec.jpg', anchos: [640, 1280, 1920], proporcion: 16 / 9 },
  { salida: 'mision', original: 'SaveClip.App_84240934_206369247268554_4425732043136735547_n-700x850.jpg', anchos: [400, 700], proporcion: 700 / 850 },
  { salida: 'sierra-autobus', original: 'Gemini_Generated_Image_gvr65mgvr65mgvr6.jpg', anchos: [640, 1280], proporcion: 2 / 1 },
];

(async () => {
  for (const img of IMAGENES) {
    const entrada = path.join(ORIGEN, img.original);
    if (!fs.existsSync(entrada)) {
      console.warn('⚠ No existe', img.original);
      continue;
    }
    for (const ancho of img.anchos) {
      const archivo = path.join(DESTINO, `${img.salida}-${ancho}.webp`);
      await sharp(entrada)
        .rotate()
        .resize({ width: ancho, height: Math.round(ancho / img.proporcion), fit: 'cover', position: 'attention' })
        .webp({ quality: 72, effort: 6 })
        .toFile(archivo);
      console.log('✔', path.basename(archivo), `${Math.round(fs.statSync(archivo).size / 1024)} KB`);
    }
  }
})();
