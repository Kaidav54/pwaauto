// RutaExpress · punto de entrada
import { registrarServiceWorker } from './registro-sw.js';

window.addEventListener('load', () => {
  registrarServiceWorker();
});
