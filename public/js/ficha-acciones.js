// Interactividad de la ficha de una parada. La usan:
//  - la ficha CSR (vistas.js) y
//  - la hidratación de la ficha SSR (Fase 11).
import { $, toast } from './util.js';
import { guardarPref } from './prefs.js';

const DB = window.RutaDB;

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

export async function activarAccionesFicha(raiz, parada) {
  guardarPref('ultimaParada', parada.id);
  await botonFavorito(raiz, parada);
}
