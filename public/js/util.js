// Utilidades compartidas
export const esc = (v) => window.PlantillaFicha.esc(v);

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

let temporizadorToast;
export function toast(mensaje, ms = 3000) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = mensaje;
  el.hidden = false;
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => (el.hidden = true), ms);
}

export const uuid = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Raíz de la app (carpeta que contiene /js). Sirve en "/", en "/parada/x" (SSR) y en "/repo/" (GitHub Pages).
export const BASE = new URL('../', import.meta.url).href;
export const url = (relativa) => new URL(relativa, BASE).href;
