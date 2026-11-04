// Preferencias del usuario en localStorage (datos pequeños y síncronos)
const CLAVE = 'rutaexpress:prefs';
const PREDETERMINADAS = { tema: 'sistema', autor: '', ultimaParada: null, avisosZona: 'todas' };

function leerTodo() {
  try {
    return { ...PREDETERMINADAS, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') };
  } catch {
    return { ...PREDETERMINADAS };
  }
}

export const leerPref = (clave) => leerTodo()[clave];

export function guardarPref(clave, valor) {
  const prefs = leerTodo();
  prefs[clave] = valor;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(prefs));
  } catch {
    /* almacenamiento bloqueado (modo privado): se ignora */
  }
  if (clave === 'tema') aplicarTema();
}

export function borrarPrefs() {
  try { localStorage.removeItem(CLAVE); } catch {}
  aplicarTema();
}

/** Aplica el tema guardado: "claro", "oscuro" o "sistema". */
export function aplicarTema() {
  const tema = leerPref('tema');
  if (tema === 'sistema') document.documentElement.removeAttribute('data-tema');
  else document.documentElement.setAttribute('data-tema', tema);
}
