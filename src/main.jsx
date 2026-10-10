import './storageShim.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './AzafranApp.jsx'
import RedDeSeguridad from './RedDeSeguridad.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <RedDeSeguridad>
    <App />
  </RedDeSeguridad>
)

// Ya arrancó la app: se quita la pantalla de "Abriendo…" que vive en el
// index.html. Se hace aquí y no solo con CSS para que no quede colgada si el
// navegador no entiende el selector.
document.getElementById('arranque')?.remove()

// Trabajador en segundo plano: solo para recibir avisos con la app cerrada.
// No guarda nada en caché (ver public/sw.js).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {})
}
