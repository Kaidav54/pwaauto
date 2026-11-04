// Indicador de conexión en el shell (cabecera)
import { toast } from './util.js';

export function iniciarIndicadorConexion() {
  const indicadores = document.querySelectorAll('[data-conexion]');
  const pintar = (avisar) => {
    const enLinea = navigator.onLine;
    indicadores.forEach((el) => {
      el.hidden = false;
      el.dataset.estado = enLinea ? 'online' : 'offline';
      el.textContent = enLinea ? 'En línea' : 'Sin conexión';
      el.title = enLinea ? 'Conectado a internet' : 'Mostrando datos guardados en el dispositivo';
    });
    document.body.classList.toggle('sin-conexion', !enLinea);
    if (avisar) toast(enLinea ? '✅ Conexión recuperada' : '📴 Sin conexión: usando datos guardados');
  };
  window.addEventListener('online', () => pintar(true));
  window.addEventListener('offline', () => pintar(true));
  pintar(false);
}
