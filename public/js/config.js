// Configuración pública de RutaExpress.
// Script UMD: lo usan la página (<script>), el service worker (importScripts) y el servidor (require).
// La "publishable key" de Supabase es pública por diseño: la protección está en las reglas
// Row Level Security de la base de datos (docs/supabase.sql).
(function (raiz, config) {
  if (typeof module === 'object' && module.exports) module.exports = config;
  else raiz.RUTA_CONFIG = config;
})(typeof self !== 'undefined' ? self : this, {
  supabase: {
    url: 'https://uzdrujhnywaoxgzwutay.supabase.co',
    clave: 'sb_publishable_pwJQHBXMg9JIbmYTbKa8jQ_H7w_dWzZ',
  },
});
