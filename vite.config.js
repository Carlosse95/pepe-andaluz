import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Rutas relativas para que el build funcione en GitHub Pages
  // (https://usuario.github.io/nombre-del-repo/) sin configurar nada más.
  base: './',
  build: {
    rollupOptions: {
      output: {
        // La app iba en UN solo archivo de millón y medio. En el iPad con
        // internet lento eso son treinta o cuarenta segundos de pantalla en
        // blanco antes de ver nada, y no se puede empezar a dibujar hasta que
        // llega el último byte.
        //
        // Partiéndolo, lo que hace falta para abrir (React y la app) baja
        // primero, y las gráficas y el PDF —que no se usan al entrar— llegan
        // en su propio archivo, en paralelo y cacheados aparte: al publicar un
        // cambio en la app, esos no se vuelven a bajar.
        //
        // jspdf NO se nombra aquí a propósito: se pide con import() cuando se
        // hace un PDF, y nombrarlo lo volvía a meter en la carga inicial.
        //
        // Se reparte archivo por archivo (y no con la lista de nombres de
        // antes) porque con la lista React terminaba DENTRO del archivo de
        // gráficas: recharts también usa React, y al armar su archivo se lo
        // llevaba. El de "react" quedaba de 30 bytes, vacío. Aquí React se
        // reclama primero, así que siempre cae donde debe.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // React primero, antes que nadie más lo reclame.
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          if (id.includes('/node_modules/@supabase/')) return 'nube';
          // recharts y lo que arrastra (los d3-* son suyos, para los ejes y
          // las escalas). Si algo de esto se escapa de la lista no se rompe
          // nada: se va al archivo de la app, solo que pesa de más al abrir.
          if (/[\\/]node_modules[\\/](recharts|react-is|react-smooth|react-transition-group|dom-helpers|d3-[^\\/]+|victory-vendor|internmap|delaunator|robust-predicates|decimal\.js-light|fast-equals|eventemitter3|es-toolkit|clsx|tiny-invariant|@babel[\\/]runtime)[\\/]/.test(id)) return 'graficas';
        },
      },
    },
  },
})
