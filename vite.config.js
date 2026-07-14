import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Rutas relativas para que el build funcione en GitHub Pages
  // (https://usuario.github.io/nombre-del-repo/) sin configurar nada más.
  base: './',
})
