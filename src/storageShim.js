// Fuera de Claude.ai no existe window.storage de forma nativa.
// Este archivo lo crea usando localStorage del navegador, con la misma
// forma (get/set/delete/list) para que AzafranApp.jsx funcione igual
// aquí que dentro de Claude, sin tener que tocar su código.

if (typeof window !== 'undefined' && !window.storage) {
  const PREFIX = 'pepe_andaluz_';

  window.storage = {
    async get(key) {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw === null) {
        throw new Error(`storage: la clave "${key}" no existe`);
      }
      return { key, value: raw, shared: false };
    },

    async set(key, value) {
      window.localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    },

    async delete(key) {
      const existed = window.localStorage.getItem(PREFIX + key) !== null;
      window.localStorage.removeItem(PREFIX + key);
      return { key, deleted: existed, shared: false };
    },

    async list(prefix = '') {
      const keys = Object.keys(window.localStorage)
        .filter((k) => k.startsWith(PREFIX + prefix))
        .map((k) => k.slice(PREFIX.length));
      return { keys, prefix, shared: false };
    },
  };
}
