# Guía: publicar la app y activar la nube

La app tiene dos modos:

- **Modo local** (como está ahora): sin login, los datos viven en el navegador del dispositivo.
- **Modo nube**: pide usuario/contraseña y todos los dispositivos ven los mismos datos al instante.

Para que tu papá la use desde su casa en cel/lap/iPad necesitas los dos pasos de abajo.
Total: ~20 minutos. Todo es gratis.

---

## Paso 1 · Base de datos y usuarios (Supabase)

1. Entra a **https://supabase.com** → "Start your project" → crea tu cuenta (puedes usar tu Google).
2. Crea un proyecto nuevo: nombre `pepe-andaluz`, elige una contraseña de base de datos
   (guárdala, aunque no la usarás en el día a día) y región `East US` o la más cercana.
3. Espera 1-2 minutos a que el proyecto arranque.
4. **Configura la seguridad**: menú lateral → **SQL Editor** → New query → pega TODO el
   contenido del archivo `supabase/setup.sql` de este proyecto → botón **Run**.
   Debe decir "Success. No rows returned".
5. **Desactiva la confirmación por correo** (para que puedas crear usuarios al momento):
   menú lateral → **Authentication** → **Sign In / Up** → Email → apaga **"Confirm email"** → Save.
6. **Copia tus llaves**: menú lateral → **Settings** (engrane) → **API**:
   - `Project URL` (algo como `https://abcdefgh.supabase.co`)
   - `anon public` key (un texto largo)
7. Pégalas en el archivo **`src/config.js`** de este proyecto:
   ```js
   export const SUPABASE_URL = "https://abcdefgh.supabase.co";
   export const SUPABASE_ANON_KEY = "eyJ...";
   ```
8. **Crea TU usuario admin** (el primero que se registra es admin automáticamente):
   en Supabase → **Authentication** → **Users** → **Add user** → "Create new user" →
   pon tu correo y una contraseña → Create.
   ⚠️ Este primer usuario eres TÚ: quedas como administrador activo.

Listo. Al abrir la app ahora te pedirá login. Entra con ese correo/contraseña y en
**Ajustes → Usuarios** podrás dar de alta a tu papá (nombre, correo y contraseña) —
su cuenta queda activa al instante y tú puedes desactivarla cuando quieras.

> La llave `anon` no es secreta: está diseñada para ir en el navegador. La seguridad
> real la ponen las reglas del `setup.sql` (solo usuarios activos pueden tocar datos).

---

## Paso 2 · Publicar la app (GitHub Pages)

1. Crea cuenta en **https://github.com** si no tienes.
2. Crea un repositorio nuevo: botón **+** → "New repository" → nombre `pepe-andaluz` →
   **Private o Public** (funciona igual; Pages en repo privado requiere plan de pago,
   así que usa **Public** — no pasa nada: los datos NO están en el código, viven en Supabase).
3. Sube el proyecto. En la Terminal de tu Mac:
   ```bash
   cd ~/Downloads/pepe-andaluz-app
   git init
   git add .
   git commit -m "Pepe Andaluz v1"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/pepe-andaluz.git
   git push -u origin main
   ```
   (GitHub te pedirá iniciar sesión la primera vez.)
4. En el repo en github.com → **Settings** → **Pages** → en "Source" elige **GitHub Actions**.
5. Espera 1-2 minutos (pestaña **Actions** muestra el progreso). Tu app quedará en:
   **`https://TU-USUARIO.github.io/pepe-andaluz/`**

Ese es el link que le mandas a tu papá. En iPhone/iPad: abrirlo en Safari →
botón compartir → **"Agregar a pantalla de inicio"** → le queda como app con ícono.

Cada vez que quieras actualizar la app: haz los cambios y
```bash
git add . && git commit -m "cambios" && git push
```
y en ~2 minutos el link se actualiza solo.

---

## Paso 3 · La página pública (la carta para clientes)

Con los pasos 1 y 2 ya quedó publicada, en la misma dirección de la app pero
con `/carta.html` al final:

```
https://TU-USUARIO.github.io/pepe-andaluz/carta.html
```

Ese es el link que se comparte con los clientes (WhatsApp, Instagram, el
código QR de las tarjetas). El de la app, sin `/carta.html`, sigue siendo
privado y con contraseña.

### Lo que hay que configurar una vez

En la app: **Ajustes → Página**.

1. **Número de WhatsApp**: el número al que quieres que lleguen los pedidos.
   Sin él, el botón de la página no abre WhatsApp (al cliente solo le queda
   copiar el resumen; la solicitud igual te llega a la app).
2. **Textos**: nombre, frase principal, presentación, zona a la que llegan y
   la anticipación con la que piden. Cámbialos cuando quieras.
3. **Descripciones de los platillos**: en **Ajustes → Menú**, debajo del precio
   de cada uno. Es lo que el cliente lee en la carta.
4. **Fotos**: ver `FOTOS.md`.

Los precios NO se configuran aparte: la página toma los mismos del menú de la
app y se republica sola cada vez que guardas ahí. Así nunca anuncia un precio
que ya no cobras.

### Qué pasa cuando alguien pide

1. El cliente elige sus paellas (en personas, no en kilos) y sus extras, pone
   fecha, teléfono y si pasa a recogerla o la quiere a domicilio.
2. Al mandarlo pasan **dos cosas a la vez**:
   - se guarda la solicitud en la nube, y
   - se le abre WhatsApp con el resumen ya escrito, listo para enviarte.
3. En la app aparece al instante en la pestaña **Solicitudes**, con su globo de
   pendientes. Ahí decides: **Pasar a pedido** (abre el formulario de siempre
   ya lleno, para ajustar kilos y precio antes de guardar) o **Descartar**.

Una solicitud **no es un pedido**: nadie la revisó todavía. Por eso no entra
sola a la agenda — la confirma Pepe.

### Una tabla más en Supabase

Si ya habías corrido `supabase/setup.sql` antes de esto, vuelve a correrlo
completo (SQL Editor → New query → pegar todo → Run). Está escrito para poder
ejecutarse las veces que haga falta sin borrar nada; crea las dos tablas
nuevas (`carta_publica` y `solicitudes_web`) y deja el resto igual.

---

## Notas

- **Respaldo**: aunque los datos estén en la nube, Ajustes → Datos → "Descargar respaldo"
  sigue funcionando. Descarga uno de vez en cuando.
- **¿Olvidó su contraseña?** En Supabase → Authentication → Users → los tres puntitos
  del usuario → "Send password recovery" (o bórralo y créalo de nuevo desde la app).
- **Migrar lo capturado en modo local**: antes de activar la nube, descarga un respaldo
  (Ajustes → Datos); ya con login activo, impórtalo en el mismo lugar.
- **La carta pública sin nube**: si `src/config.js` está vacío (modo local), `carta.html`
  se sigue viendo, con el menú de ejemplo, pero no puede guardar solicitudes ni traer
  los precios de la app. Para que sirva de verdad hacen falta los pasos 1 y 2.
