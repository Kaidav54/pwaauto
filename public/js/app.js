// RutaExpress · punto de entrada
import { registrarServiceWorker } from './registro-sw.js';
import { ruta, iniciarRouter } from './router.js';
import { vistaInicio, vistaParadas, vistaFicha, vistaPendiente } from './vistas.js';
import { iniciarInstalacion } from './instalacion.js';
import { ocultarSplash } from './splash.js';

iniciarInstalacion();

ruta('', vistaInicio, 'inicio');
ruta('paradas', vistaParadas, 'paradas');
ruta('parada/:id', vistaFicha, 'paradas');
ruta('cerca', vistaPendiente('Cerca de mí'), 'cerca');
ruta('avisos', vistaPendiente('Avisos'), 'avisos');
ruta('ajustes', vistaPendiente('Ajustes'), 'ajustes');

iniciarRouter().finally(ocultarSplash);

window.addEventListener('load', () => {
  registrarServiceWorker();
});
