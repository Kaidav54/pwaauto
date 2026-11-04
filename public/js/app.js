// RutaExpress · punto de entrada
import { registrarServiceWorker } from './registro-sw.js';
import { ruta, iniciarRouter } from './router.js';
import { vistaInicio, vistaParadas, vistaFicha, vistaAjustes, vistaPendiente } from './vistas.js';
import { iniciarInstalacion } from './instalacion.js';
import { ocultarSplash } from './splash.js';
import { aplicarTema } from './prefs.js';

aplicarTema();
iniciarInstalacion();

ruta('', vistaInicio, 'inicio');
ruta('paradas', vistaParadas, 'paradas');
ruta('parada/:id', vistaFicha, 'paradas');
ruta('cerca', vistaPendiente('Cerca de mí'), 'cerca');
ruta('avisos', vistaPendiente('Avisos'), 'avisos');
ruta('ajustes', vistaAjustes, 'ajustes');

iniciarRouter().finally(ocultarSplash);

window.addEventListener('load', () => {
  registrarServiceWorker();
});
