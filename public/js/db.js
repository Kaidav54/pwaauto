// Capa IndexedDB de RutaExpress.
// Script clásico: se carga con <script> en la página y con importScripts() en el service worker.
// Expone self.RutaDB.
(function (global) {
  const NOMBRE = 'rutaexpress';
  const VERSION = 1;
  let promesaDB = null;

  function abrir() {
    if (promesaDB) return promesaDB;
    promesaDB = new Promise((resolver, rechazar) => {
      const pet = indexedDB.open(NOMBRE, VERSION);
      pet.onupgradeneeded = () => {
        const db = pet.result;
        if (!db.objectStoreNames.contains('paradas')) db.createObjectStore('paradas', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('resenas')) {
          db.createObjectStore('resenas', { keyPath: 'id' }).createIndex('paradaId', 'paradaId');
        }
        if (!db.objectStoreNames.contains('pendientes')) db.createObjectStore('pendientes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('favoritos')) db.createObjectStore('favoritos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'clave' });
      };
      pet.onsuccess = () => resolver(pet.result);
      pet.onerror = () => {
        promesaDB = null;
        rechazar(pet.error);
      };
    });
    return promesaDB;
  }

  const comoPromesa = (pet) =>
    new Promise((res, rej) => {
      pet.onsuccess = () => res(pet.result);
      pet.onerror = () => rej(pet.error);
    });

  /** Ejecuta fn(store) dentro de una transacción y espera a que termine. */
  async function tx(almacen, modo, fn) {
    const db = await abrir();
    return new Promise((res, rej) => {
      const t = db.transaction(almacen, modo);
      const store = t.objectStore(almacen);
      let resultado;
      Promise.resolve(fn(store)).then((r) => (resultado = r), rej);
      t.oncomplete = () => res(resultado);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }

  const RutaDB = {
    abrir,

    // ---- Respaldo del catálogo remoto ----
    async guardarParadas(lista) {
      await tx('paradas', 'readwrite', (s) => {
        s.clear();
        lista.forEach((p) => s.put(p));
      });
      await RutaDB.ponerMeta('paradasActualizadas', new Date().toISOString());
    },
    leerParadas: () => tx('paradas', 'readonly', (s) => comoPromesa(s.getAll())),

    // ---- Reseñas confirmadas por el servidor (caché local) ----
    async guardarResenas(paradaId, lista) {
      await tx('resenas', 'readwrite', async (s) => {
        const actuales = await comoPromesa(s.index('paradaId').getAllKeys(paradaId));
        actuales.forEach((k) => s.delete(k));
        lista.forEach((r) => s.put(r));
      });
    },
    leerResenas: (paradaId) => tx('resenas', 'readonly', (s) => comoPromesa(s.index('paradaId').getAll(paradaId))),
    guardarResena: (r) => tx('resenas', 'readwrite', (s) => s.put(r)),

    // ---- Cola de reseñas pendientes de enviar (Background Sync) ----
    agregarPendiente: (r) => tx('pendientes', 'readwrite', (s) => s.put(r)),
    leerPendientes: () => tx('pendientes', 'readonly', (s) => comoPromesa(s.getAll())),
    borrarPendiente: (id) => tx('pendientes', 'readwrite', (s) => s.delete(id)),

    // ---- Favoritos ----
    async alternarFavorito(id) {
      const existe = await tx('favoritos', 'readonly', (s) => comoPromesa(s.get(id)));
      await tx('favoritos', 'readwrite', (s) => (existe ? s.delete(id) : s.put({ id, fecha: Date.now() })));
      return !existe;
    },
    esFavorito: async (id) => !!(await tx('favoritos', 'readonly', (s) => comoPromesa(s.get(id)))),
    leerFavoritos: () => tx('favoritos', 'readonly', (s) => comoPromesa(s.getAllKeys())),

    // ---- Metadatos ----
    ponerMeta: (clave, valor) => tx('meta', 'readwrite', (s) => s.put({ clave, valor })),
    leerMeta: async (clave) => (await tx('meta', 'readonly', (s) => comoPromesa(s.get(clave))))?.valor,

    async borrarTodo() {
      for (const a of ['paradas', 'resenas', 'pendientes', 'favoritos', 'meta']) await tx(a, 'readwrite', (s) => s.clear());
    },
  };

  global.RutaDB = RutaDB;
})(typeof self !== 'undefined' ? self : this);
