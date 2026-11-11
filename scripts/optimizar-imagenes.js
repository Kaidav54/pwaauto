// Convierte las fotos originales de assets/ a WebP optimizado en public/img/.
// Uso: npm run imagenes   (los originales no se suben a git; solo las versiones optimizadas)
//
// Fotos de Wikimedia Commons (CC BY-SA 4.0, se recortan y comprimen = obra modificada):
//   · jalpan-carretera ← «Hwy120Jalpan.JPG», AlejandroLinaresGarcia
//     https://commons.wikimedia.org/wiki/File:Hwy120Jalpan.JPG
//   · mision ← «Misión de Santiago de Jalpan, Jalpan de Serra.jpg», Diana.resendiz
//     https://commons.wikimedia.org/wiki/File:Misi%C3%B3n_de_Santiago_de_Jalpan,_Jalpan_de_Serra.jpg
// Imagen ilustrativa generada con IA:
//   · sierra-autobus
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'assets');
const DESTINO = path.join(__dirname, '..', 'public', 'img');
fs.mkdirSync(DESTINO, { recursive: true });

// nombre de salida → archivo original, anchos y recorte
const IMAGENES = [
  { salida: 'jalpan-carretera', original: 'commons/jalpan-carretera.jpg', anchos: [640, 1280, 1920], proporcion: 16 / 9 },
  { salida: 'mision', original: 'commons/mision-jalpan.jpg', anchos: [400, 800], proporcion: 4 / 3 },
  { salida: 'sierra-autobus', original: 'jalpan/Gemini_Generated_Image_gvr65mgvr65mgvr6.jpg', anchos: [640, 1280], proporcion: 2 / 1 },
];

(async () => {
  for (const img of IMAGENES) {
    const entrada = path.join(ASSETS, img.original);
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
