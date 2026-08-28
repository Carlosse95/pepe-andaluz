# Pepe Andaluz

App de pedidos para el negocio familiar de paellas del papá de Carlos (sureste
de México). React + Vite, casi todo en un solo archivo `src/AzafranApp.jsx`.
Publicada en **https://carlosse95.github.io/pepe-andaluz/** (GitHub Pages,
repo `Carlosse95/pepe-andaluz`, deploy automático al hacer `git push` a main,
tarda ~1-2 min). Nube: Supabase, proyecto `sykfhnznbneuipibatmx`.

Este archivo vive en el repo a propósito, para que sobreviva aunque la
carpeta se mueva de sitio (pasó el 21 de agosto de 2026: de
`~/Downloads/pepe-andaluz-app` a esta ubicación en iCloud).

## Dónde vive todo (desde el 21 de agosto de 2026)

```
~/Library/Mobile Documents/com~apple~CloudDocs/Pepe-Andaluz/
  pepe-andaluz-app/              ← este repo
  Respaldos-Pepe-Andaluz/        ← respaldos + .llave + respaldar.sh
  Archivo-viejo-antes-de-git/    ← un AzafranApp.jsx suelto de antes de usar git, sin uso práctico
```

Todo en una sola carpeta de iCloud, para que Carlos ya no tenga que acordarse
de dos rutas distintas.

## Reglas que no son opcionales

**1. Respaldo antes de tocar código o datos.** Correr:
```
~/Library/Mobile Documents/com~apple~CloudDocs/Pepe-Andaluz/Respaldos-Pepe-Andaluz/respaldar.sh
```
Carlos lo puso como condición después de un día en que se perdieron 111
gastos que no se pudieron reconstruir. No es "si aplica": es correrlo al
empezar y antes de cualquier cambio que escriba en Supabase. Usa la Edge
Function `respaldo` y la llave en `.llave` de esa misma carpeta — esa carpeta
está fuera del repo a propósito porque **el repo es público**. Nunca mover la
llave al repo ni imprimirla.

**2. Nunca tocar `src/config.js` con el servidor de Vite corriendo.**
Para probar en local se deja `src/config.js` en blanco (modo localStorage vía
`storageShim`). Vite recarga el módulo al vuelo: si se restaura el archivo
(`git checkout -- src/config.js`) mientras el servidor sigue arriba, la app
—que tenía datos de prueba en memoria— se reconecta a la Supabase real y en
el siguiente guardado **escribe los datos de prueba encima de los reales**.
Ya pasó una vez. Orden correcto: parar el servidor → cerrar la pestaña →
`git checkout -- src/config.js`.

**3. `almacen` se pisa entero al guardar.** En Supabase, la tabla `almacen`
guarda cada cosa (`pedidos`, `clientes`, `config-productos`, `gastos`...) como
un solo JSON completo en una fila. La app reescribe el arreglo entero desde su
copia en memoria — así que **borra cualquier cosa que no conociera**. Ningún
proceso externo (bot, script) debe escribir `almacen.pedidos` o
`almacen.clientes` directamente. El patrón correcto: dejar cada cosa nueva en
su propia tabla-buzón (ej. `pedidos_whatsapp`) y que la app la reclame
releyendo primero de la nube.

**4. Las fotos van en Supabase Storage, nunca en `almacen`.** Bucket privado
`tickets`. En el registro solo se guarda la ruta. Meter imágenes en `almacen`
lo volvería pesadísimo, por la razón del punto 3.

**5. `grep` a secas no sirve en esta máquina** — termina sin salida y sin
error, aunque el archivo sí tenga lo buscado. Usar siempre `/usr/bin/grep`.

**6. Cuidado con lo que se descarga en bucle: el plan gratis da 5 GB de
egress al mes.** El 25 de agosto de 2026 la organización entró en periodo de
gracia por pasarse (6.5 GB, 131%). La causa: la revisión de respaldo del
tiempo real volvía a bajar las SIETE claves completas cada 3 segundos con
solo tener la app abierta — 1.4 MB por ronda, ~908 MB/hora, 19,000 descargas
completas en un día. Empeoró seis veces al importar 2,930 contactos (clientes
pasó de ~90 KB a 532 KB).

Arreglado: ahora se pregunta solo `select clave, updated_at` (~600 bytes) y
se baja únicamente la clave que cambió; lo mismo al volver de segundo plano.
Quedó en ~0.69 MB/hora. La hora la pone sola la base con el disparador
`almacen_set_updated_at`, no la app: así también detecta cambios hechos por
fuera (scripts, consola de Supabase) y no depende del reloj del celular.

Segunda vuelta (28 de agosto de 2026): con eso ya arreglado, un día de
captura seguía gastando 293 MB — 8.6 GB/mes al ritmo de ese día. La causa era
otra: **quien guardaba se volvía a bajar su propio cambio.** Al guardar, la
hora de esa clave cambiaba, la revisión la veía distinta a la apuntada, creía
que había sido otro aparato y bajaba el archivo entero. Medido: 382 guardados
y 462 descargas completas el mismo día, casi uno a uno; `pedidos` pesa 1.1 MB,
así que eran ~263 MB solo en eso.

Arreglado haciendo que `almacen.set` devuelva el `updated_at` que dejó esa
escritura (`.select("updated_at")` en el mismo upsert) y que `persist` lo
anote en `horasVistas`. **Importante: la hora se pide de regreso en la misma
operación, NO con una consulta aparte** — entre una cosa y otra puede colarse
el guardado de otro aparato y entonces se anotaría la hora del otro y su
cambio no se bajaría nunca.

**Antes de agregar cualquier consulta que corra en bucle, calcular cuánto
pesa × cuántas veces por minuto.** La base de datos y el Storage están al 6%;
lo que se agota es el ancho de banda. Para medirlo de verdad: envolver
`window.fetch` en el navegador y sumar bytes, o revisar `edge_logs` agrupando
por `request.path` y `request.search`. Ojo con los `OPTIONS`: aparecen en los
registros pero son preflight, no traen datos — contar solo los `GET`.

Para probar cambios de permisos o de forma de consulta sin arriesgar a que la
app deje de guardar, se puede simular la sesión de un usuario en SQL:
`begin; set local role authenticated; set local request.jwt.claims =
'{"sub":"<user_id>","role":"authenticated"}'; ... ; rollback;`

## Cómo es Carlos (para calibrar el tono y el nivel de detalle)

Español, no programador, nuevo en GitHub/Supabase/terminal. Prefiere que
Claude ejecute directamente en vez de dar instrucciones para que él las siga.
Explicar en lenguaje llano, un paso a la vez. Usa Safari en iPhone/iPad/Mac
(ojo: `Cmd+Shift+R` en Safari abre Modo Lector, no recarga — el recargado
forzado es `Cmd+Option+R`). La app la usa principalmente su papá, desde el
celular.

**Sus instrucciones cortas admiten más de una lectura.** Ejemplo real: "dame
el número total, no por orden" sobre las croquetas se leyó como "no separes
por sabor" cuando la lectura correcta era "no me des el conteo de órdenes,
dame el total en piezas". Otro: "ya no se incrementa... la barra la quiero
así" sonaba a "quita el efecto" pero era "el efecto dejó de pasar y lo quiero
de vuelta" — casi lo contrario. Señal de alerta: instrucciones cortas sobre
cálculos/agregaciones, o con "ya no" + un verbo. Si hay dos lecturas
razonables y equivocarse es costoso (afecta varias secciones, difícil de
revertir), preferir la lectura más literal y menos destructiva, o preguntar
con un ejemplo concreto de cada interpretación antes de tocar código.

## Probando funciones de WhatsApp en el navegador de pruebas

El navegador sandbox (`mcp__Claude_Browser__*`) bloquea `window.open`
silenciosamente — sin error, sin pestaña nueva, sin request de red — incluso
en botones que sí funcionan en producción. No es un bug de la app. Para
verificar: monkey-patch de `window.open` vía `javascript_tool`
(`window.open = (url) => { window.__opens.push(url); return null; }`) y
disparar la acción con un clic real (`computer`, no `form_input`, en botones
reales). No reportar como roto solo porque no se abrió una pestaña.

## Bot de WhatsApp con IA — pausado a propósito

Código en `supabase/functions/whatsapp-webhook/index.ts`. Funciona completo
(entiende el pedido, usa el menú real, dejaba el pedido en `pedidos_whatsapp`
para que la app lo recoja) salvo **enviar** mensajes: el número del negocio
está "Sin conexión" en WhatsApp Manager. Conectarlo por el camino directo de
Meta borraría la cuenta de WhatsApp Business del papá, con su historial —
**nunca intentar registrar el número desde WhatsApp Manager**, es
destructivo. Las salidas viables: un número nuevo dedicado solo al bot, o un
proveedor de coexistencia (360dialog, Wati, Twilio — normalmente de paga).
Carlos decidió pausar ahí.

## Comandos útiles

```bash
npm run dev              # servidor local (usar mcp__Claude_Browser__preview_start, no Bash)
npm run build             # antes de publicar, para revisar errores
~/Library/Mobile\ Documents/com~apple~CloudDocs/Pepe-Andaluz/Respaldos-Pepe-Andaluz/respaldar.sh
```

Verificar que el deploy de GitHub Pages ya se actualizó (no hay `gh` CLI en
todos los entornos): comparar el hash del build local contra
`curl -s https://carlosse95.github.io/pepe-andaluz/ | /usr/bin/grep -o 'assets/index-[^"]*\.js'`.
