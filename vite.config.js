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
        manualChunks: {
          react: ['react', 'react-dom'],
          graficas: ['recharts'],
          nube: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
