import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Rutas relativas para que el build funcione en GitHub Pages
  // (https://usuario.github.io/nombre-del-repo/) sin configurar nada más.
  base: './',
  build: {
    rollupOptions: {
      input: {
        // index.html = la app de Pepe (privada, con login).
        // carta.html = la página pública que ven los clientes.
        app: resolve(__dirname, 'index.html'),
        carta: resolve(__dirname, 'carta.html'),
      },
    },
  },
})
