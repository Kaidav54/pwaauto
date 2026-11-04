// Hidratación de la ficha SSR.
// El servidor ya envió el HTML completo (rápido, indexable, visible sin JS).
// Aquí el navegador "despierta" ese HTML: reutiliza el marcado existente y le
// conecta la interactividad (favoritos, reseñas offline, compartir, SW, conexión).
import { registrarServiceWorker } from './registro-sw.js';
import { aplicarTema } from './prefs.js';
import { iniciarIndicadorConexion } from './conexion.js';
import { iniciarSincronizacion } from './resenas.js';
import { activarAccionesFicha } from './ficha-acciones.js';

aplicarTema();
iniciarIndicadorConexion();
iniciarSincronizacion();

const datos = JSON.parse(document.getElementById('datos-ssr')?.textContent || 'null');
const raiz = document.querySelector('.ficha');

if (datos?.parada && raiz) {
  // Guardamos la parada en el respaldo local por si luego se abre sin conexión
  window.RutaDB.leerParadas()
    .then((lista) => {
      if (!lista.some((p) => p.id === datos.parada.id)) return window.RutaDB.guardarParadas([...lista, datos.parada]);
    })
    .catch(() => {});
  activarAccionesFicha(raiz, datos.parada).then(() => {
    raiz.dataset.hidratada = 'true';
    console.log('[SSR] Ficha hidratada:', datos.parada.id);
  });
}

window.addEventListener('load', () => registrarServiceWorker());
