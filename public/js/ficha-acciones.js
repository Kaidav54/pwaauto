// Interactividad de la ficha de una parada. La usan:
//  - la ficha CSR (vistas.js) y
//  - la hidratación de la ficha SSR (Fase 11).
import { $, toast } from './util.js';
import { guardarPref, leerPref } from './prefs.js';
import { cargarResenas, publicarResena } from './resenas.js';
import { hayServidor } from './api.js';
import { compartir, vibrar } from './dispositivo.js';
import { mapaFicha } from './mapa.js';

const DB = window.RutaDB;
const { listaResenasHTML } = window.PlantillaFicha;

async function botonFavorito(raiz, parada) {
  const acciones = $('[data-acciones]', raiz);
  if (!acciones || $('[data-favorito]', acciones)) return;
  const boton = document.createElement('button');
  boton.className = 'boton';
  boton.dataset.favorito = '';
  const pintar = (fav) => {
    boton.textContent = fav ? '★ En favoritas' : '☆ Guardar en favoritas';
    boton.setAttribute('aria-pressed', String(fav));
  };
  pintar(await DB.esFavorito(parada.id).catch(() => false));
  boton.addEventListener('click', async () => {
    const fav = await DB.alternarFavorito(parada.id);
    pintar(fav);
    toast(fav ? 'Parada guardada en favoritas' : 'Parada quitada de favoritas');
  });
  acciones.prepend(boton);
}

async function seccionResenas(raiz, parada) {
  const lista = $('[data-lista-resenas]', raiz);
  const form = $('[data-form-resena]', raiz);
  const estado = $('[data-estado-resena]', raiz);
  if (!lista || !form) return;

  const refrescar = async () => {
    lista.innerHTML = listaResenasHTML(await cargarResenas(parada.id));
  };
  await refrescar();

  if (!(await hayServidor())) {
    estado.textContent = 'Versión estática (GitHub Pages): tu comentario queda guardado en este dispositivo y se envía cuando uses la app con su servidor.';
  }

  form.autor.value = leerPref('autor') || '';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = form.texto.value.trim();
    if (texto.length < 3) return toast('Escribe al menos 3 caracteres');
    const autor = form.autor.value.trim();
    guardarPref('autor', autor);
    const boton = form.querySelector('button[type=submit]');
    boton.disabled = true;
    try {
      const { modo } = await publicarResena({ paradaId: parada.id, autor, texto });
      form.texto.value = '';
      vibrar(30);
      await refrescar();
      toast(
        modo === 'enviada' ? '✅ Comentario publicado' :
        navigator.onLine ? '📤 Enviando comentario…' : '⏳ Sin conexión: se enviará al recuperar la red'
      );
    } catch (err) {
      console.error(err);
      toast('No se pudo guardar el comentario');
    } finally {
      boton.disabled = false;
    }
  });

  // Cuando el SW (o la página) confirma el envío, se vuelve a pintar la lista
  const alSincronizar = () => refrescar();
  window.addEventListener('resenas-sincronizadas', alSincronizar);
  window.addEventListener('hashchange', () => window.removeEventListener('resenas-sincronizadas', alSincronizar), { once: true });
}

function botonCompartir(raiz, parada) {
  const acciones = $('[data-acciones]', raiz);
  if (!acciones || $('[data-compartir]', acciones)) return;
  const boton = document.createElement('button');
  boton.className = 'boton boton--sec';
  boton.dataset.compartir = '';
  boton.textContent = 'Compartir';
  boton.addEventListener('click', async () => {
    const rutas = parada.rutas.map((r) => r.ruta).join(', ');
    const r = await compartir({
      titulo: parada.nombre,
      texto: `${parada.nombre} (${parada.direccion}) · rutas ${rutas} — vía RutaExpress`,
      url: location.href,
    });
    if (r === 'copiado') toast('Enlace copiado al portapapeles');
    if (r !== 'cancelado') vibrar(40);
  });
  acciones.append(boton);
}

export async function activarAccionesFicha(raiz, parada) {
  guardarPref('ultimaParada', parada.id);
  botonCompartir(raiz, parada);
  const contenedorMapa = $('[data-mapa-ficha]', raiz);
  if (contenedorMapa) {
    mapaFicha(contenedorMapa, parada).catch((e) => {
      console.warn(e);
      contenedorMapa.remove();
    });
  }
  await Promise.all([botonFavorito(raiz, parada), seccionResenas(raiz, parada)]);
}
