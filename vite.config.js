import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Rutas relativas para que el build funcione en GitHub Pages
  // (https://usuario.github.io/nombre-del-repo/) sin configurar nada más.
  base: './',
  build: {
    // Vite 8 arma los archivos con Rolldown. Se reparte con grupos y
    // prioridades: React va primero (prioridad más alta) para que ningún otro
    // archivo se lo lleve. Con la función de antes, React terminaba DENTRO
    // del archivo de gráficas (recharts también usa React) y el suyo quedaba
    // vacío.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'nube', test: /[\\/]node_modules[\\/]@supabase[\\/]/, priority: 20 },
            // recharts y lo que arrastra (los d3-* son suyos, para los ejes y
            // las escalas). Si algo se escapa de la lista no se rompe nada:
            // se va al archivo de la app, solo que pesa de más al abrir.
            // jspdf NO va aquí a propósito: se pide con import() al hacer un
            // PDF, y nombrarlo lo volvía a meter en la carga inicial.
            { name: 'graficas', test: /[\\/]node_modules[\\/](recharts|react-is|react-smooth|react-transition-group|dom-helpers|d3-[^\\/]+|victory-vendor|internmap|delaunator|robust-predicates|decimal\.js-light|fast-equals|eventemitter3|es-toolkit|clsx|tiny-invariant|@reduxjs|redux|reselect|immer|use-sync-external-store|@babel[\\/]runtime)[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
})
