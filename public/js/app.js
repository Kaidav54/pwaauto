// RutaExpress · punto de entrada
import { registrarServiceWorker } from './registro-sw.js';
import { ruta, iniciarRouter } from './router.js';
import { vistaInicio, vistaParadas, vistaFicha, vistaAjustes } from './vistas.js';
import { iniciarInstalacion } from './instalacion.js';
import { ocultarSplash } from './splash.js';
import { aplicarTema } from './prefs.js';
import { vistaAvisos } from './vista-avisos.js';
import { vistaCerca } from './vista-cerca.js';
import { iniciarIndicadorConexion } from './conexion.js';
import { iniciarSincronizacion } from './resenas.js';

aplicarTema();
iniciarInstalacion();
iniciarIndicadorConexion();
iniciarSincronizacion();

ruta('', vistaInicio, 'inicio');
ruta('paradas', vistaParadas, 'paradas');
ruta('parada/:id', vistaFicha, 'paradas');
ruta('cerca', vistaCerca, 'cerca');
ruta('avisos', vistaAvisos, 'avisos');
ruta('ajustes', vistaAjustes, 'ajustes');

iniciarRouter().finally(ocultarSplash);

window.addEventListener('load', () => {
  registrarServiceWorker();
});
