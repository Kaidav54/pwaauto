// Vista «Avisos»: suscripción push, notificación local y panel de publicación (demo)
import { esc, $, toast } from './util.js';
import { hayServidor } from './api.js';
import {
  soportaPush, soportaNotificaciones, permiso, suscripcionActual,
  suscribirse, desuscribirse, notificacionLocal, publicarAviso,
} from './notificaciones.js';

const PLANTILLAS = [
  // Plantillas de ejemplo para el panel de demostración (el operador escribe el aviso real)
  { tipo: 'retraso', titulo: 'Retraso en corridas a Xilitla', cuerpo: 'Las salidas a Xilitla llevan unos 20 min de retraso. Confirma en taquilla.' },
  { tipo: 'obras', titulo: 'Trabajos en la carretera', cuerpo: 'Hay trabajos en el camino: los tiempos de viaje pueden ser mayores. Toma precauciones.' },
  { tipo: 'desvio', titulo: 'Cambio de andén', cuerpo: 'Hoy las corridas a Río Verde salen de la Central de Autobuses. Revisa el andén en taquilla.' },
];

const fecha = (iso) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });

export async function vistaAvisos(c) {
  const servidor = await hayServidor();
  const suscrito = !!(await suscripcionActual().catch(() => null));
  const recibidos = (await window.RutaDB.leerMeta('avisos').catch(() => null)) || [];

  c.innerHTML = `
    <h1>Avisos de desvíos y retrasos</h1>
    <section class="tarjeta">
      <h2>Notificaciones</h2>
      <p>Estado: <strong id="estado-push">${
        !soportaNotificaciones() ? 'No soportadas en este navegador' :
        permiso() === 'denied' ? 'Bloqueadas (actívalas en la configuración del navegador)' :
        suscrito ? '🔔 Suscrito a avisos push' : 'Sin suscripción'
      }</strong></p>
      ${servidor ? '' : '<p class="suave pequeno">Versión estática (GitHub Pages): las notificaciones push necesitan el servidor Node. La notificación local sí funciona.</p>'}
      <div class="botones">
        ${suscrito
          ? '<button class="boton boton--sec" id="btn-desuscribir">🔕 Desactivar avisos</button>'
          : `<button class="boton" id="btn-suscribir" ${soportaPush() && servidor ? '' : 'disabled'}>🔔 Activar avisos push</button>`}
        <button class="boton boton--sec" id="btn-local" ${soportaNotificaciones() ? '' : 'disabled'}>🧪 Probar notificación local</button>
      </div>
    </section>

    <section class="tarjeta">
      <h2>Últimos avisos recibidos</h2>
      <ul class="resenas" id="lista-avisos">${
        recibidos.length
          ? recibidos.map((a) => `<li class="resena"><strong>${esc(a.titulo)}</strong><div>${esc(a.cuerpo)}</div><div class="resena__meta">${esc(fecha(a.fecha))}</div></li>`).join('')
          : '<li class="suave pequeno">Todavía no has recibido avisos.</li>'
      }</ul>
    </section>

    ${servidor ? `
    <section class="tarjeta">
      <h2>Publicar aviso <span class="etiqueta etiqueta--acento">demo operador</span></h2>
      <p class="suave pequeno">Envía un push a todos los dispositivos suscritos.</p>
      <div class="filtros">${PLANTILLAS.map((p, i) => `<button class="chip" data-plantilla="${i}">${esc(p.titulo)}</button>`).join('')}</div>
      <form id="form-aviso">
        <label for="aviso-tipo">Tipo</label>
        <select id="aviso-tipo" name="tipo">
          <option value="obras">🚧 Obras</option><option value="retraso">⏱️ Retraso</option>
          <option value="desvio">↪️ Desvío</option><option value="info">ℹ️ Información</option>
        </select>
        <label for="aviso-titulo">Título</label>
        <input id="aviso-titulo" name="titulo" required maxlength="80">
        <label for="aviso-cuerpo">Mensaje</label>
        <textarea id="aviso-cuerpo" name="cuerpo" required maxlength="240"></textarea>
        <div class="botones"><button class="boton boton--acento" type="submit">📣 Enviar aviso push</button></div>
      </form>
    </section>` : ''}`;

  $('#btn-suscribir', c)?.addEventListener('click', async () => {
    try {
      await suscribirse();
      toast('🔔 Recibirás avisos de desvíos y retrasos');
    } catch (e) {
      toast(e.message);
    }
    vistaAvisos(c);
  });
  $('#btn-desuscribir', c)?.addEventListener('click', async () => {
    await desuscribirse();
    toast('Avisos desactivados');
    vistaAvisos(c);
  });
  $('#btn-local', c).addEventListener('click', async () => {
    try {
      await notificacionLocal('Prueba de RutaExpress', { body: 'Así se verán los avisos de tu ruta. 🚌', tag: 'prueba' });
    } catch (e) {
      toast(e.message);
    }
  });

  const form = $('#form-aviso', c);
  if (form) {
    c.querySelectorAll('[data-plantilla]').forEach((b) =>
      b.addEventListener('click', () => {
        const p = PLANTILLAS[b.dataset.plantilla];
        form.tipo.value = p.tipo; form.titulo.value = p.titulo; form.cuerpo.value = p.cuerpo;
      })
    );
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const r = await publicarAviso({ tipo: form.tipo.value, titulo: form.titulo.value, cuerpo: form.cuerpo.value });
        toast(`📣 Aviso enviado a ${r.enviadas} de ${r.total} dispositivos`);
      } catch (err) {
        toast('No se pudo enviar: ' + err.message);
      }
    });
  }

  // Si llega un push con la vista abierta, se vuelve a pintar
  const alRecibir = (e) => { if (e.data?.tipo === 'AVISO_RECIBIDO' && location.hash === '#/avisos') vistaAvisos(c); };
  navigator.serviceWorker?.addEventListener('message', alRecibir);
  window.addEventListener('hashchange', () => navigator.serviceWorker?.removeEventListener('message', alRecibir), { once: true });
}
