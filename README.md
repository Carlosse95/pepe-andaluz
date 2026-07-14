# Pepe Andaluz — app de pedidos

## Cómo abrirla en VS Code (paso a paso)

1. **Descomprime** este archivo .zip donde quieras (por ejemplo en tu carpeta de Documentos).
2. Abre **VS Code**.
3. Ve a `Archivo > Abrir carpeta...` y selecciona la carpeta `pepe-andaluz-app` que acabas de descomprimir.
4. Abre la terminal integrada: menú `Terminal > Nueva terminal` (o `Ctrl/Cmd + ñ` / `` Ctrl+` ``).
5. En esa terminal escribe y da Enter:
   ```
   npm install
   ```
   Esto descarga las piezas que la app necesita (React, Tailwind, etc.). Solo se hace una vez, tarda un minuto.
6. Cuando termine, escribe:
   ```
   npm run dev
   ```
7. La terminal te va a mostrar algo como:
   ```
   ➜  Local:   http://localhost:5173/
   ```
   Con `Cmd` (Mac) o `Ctrl` (Windows) apretado, haz clic en ese link — o cópialo y pégalo en Safari/Chrome.

Listo, ahí está la app corriendo. Mientras la terminal siga abierta con ese proceso, puedes editar el código y el navegador se actualiza solo.

Para apagarla: clic en la terminal y `Ctrl + C`.

## Por qué VS Code no tiene un botón "Run" para esto

Un archivo `.jsx` no se ejecuta solo, como sí pasaría con un script de Python. Necesita un "empaquetador" (Vite) que lo traduzca a algo que el navegador entienda y lo sirva en una dirección local — por eso se usa `npm run dev` en la terminal en lugar de un botón Run.

## Probarla en el iPhone (misma red WiFi)

1. Corre en lugar del paso 6:
   ```
   npm run dev -- --host
   ```
2. Verás dos direcciones: `Local` y `Network` (algo como `http://192.168.1.xx:5173/`).
3. En el iPhone, con el mismo WiFi que la computadora, abre esa dirección `Network` en Safari.
4. Para que quede como ícono: botón compartir → "Añadir a pantalla de inicio".

## Nota sobre los datos guardados

Esta copia local guarda pedidos, clientes y precios en el navegador de esa computadora (usando un pequeño archivo, `src/storageShim.js`, que imita el guardado que usa Claude). Son datos **independientes** de los que se ven al abrir la app dentro de Claude — no se comparten entre ambos lugares. Si quieren una sola base de datos real, compartida entre varias computadoras o el teléfono, el siguiente paso sería conectarla a una base de datos de verdad (por ejemplo Supabase) y publicarla en internet (por ejemplo con Vercel).
