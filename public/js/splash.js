// Splash dentro de la app: se muestra mientras arranca el shell y se oculta
// cuando la primera vista está lista (con una duración mínima para que no "parpadee").
const DURACION_MINIMA = 700;
const inicio = performance.now();

export function ocultarSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const espera = Math.max(0, DURACION_MINIMA - (performance.now() - inicio));
  setTimeout(() => {
    splash.classList.add('splash--oculto');
    splash.setAttribute('aria-hidden', 'true');
    setTimeout(() => splash.remove(), 500);
  }, espera);
}
