-- ============================================================
--  Pepe Andaluz · Configuración de la base de datos en Supabase
--
--  Cómo usarlo:
--    1. Entra a tu proyecto en https://supabase.com
--    2. Menú lateral → SQL Editor → New query
--    3. Pega TODO este archivo y presiona RUN.
--
--  Qué crea:
--    - Tabla `almacen`: ahí viven los datos de la app (pedidos,
--      clientes, menú, presupuestos, reportes).
--    - Tabla `perfiles`: los usuarios con acceso y su rol.
--    - Seguridad (RLS): solo usuarios ACTIVOS pueden leer/escribir.
--      El PRIMER usuario que se registre se vuelve ADMIN automático;
--      cualquier otro queda DESACTIVADO hasta que el admin lo active.
-- ============================================================

-- ---------- Tablas ----------

create table if not exists public.perfiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nombre     text default '',
  rol        text not null default 'usuario',   -- 'admin' | 'usuario'
  activo     boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.almacen (
  clave      text primary key,
  valor      jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Trigger: alta automática de perfil al registrarse ----------
-- El primer usuario registrado = admin activo (ese serás tú).
-- Los siguientes quedan desactivados: el admin los activa desde la app.

create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  es_primero boolean;
begin
  select not exists (select 1 from public.perfiles) into es_primero;
  insert into public.perfiles (user_id, email, rol, activo)
  values (new.id, new.email, case when es_primero then 'admin' else 'usuario' end, es_primero);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.manejar_nuevo_usuario();

-- ---------- Funciones de ayuda para las reglas ----------

create or replace function public.es_usuario_activo()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where user_id = auth.uid() and activo
  );
$$;

create or replace function public.es_admin()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where user_id = auth.uid() and activo and rol = 'admin'
  );
$$;

-- ---------- Seguridad (RLS) ----------

alter table public.almacen  enable row level security;
alter table public.perfiles enable row level security;

-- almacen: cualquier usuario activo puede leer y escribir.
drop policy if exists "almacen leer"     on public.almacen;
drop policy if exists "almacen insertar" on public.almacen;
drop policy if exists "almacen editar"   on public.almacen;
drop policy if exists "almacen borrar"   on public.almacen;
create policy "almacen leer"     on public.almacen for select using (public.es_usuario_activo());
create policy "almacen insertar" on public.almacen for insert with check (public.es_usuario_activo());
create policy "almacen editar"   on public.almacen for update using (public.es_usuario_activo());
create policy "almacen borrar"   on public.almacen for delete using (public.es_usuario_activo());

-- perfiles: cada quien puede ver su propio perfil (para saber si está
-- activo); los activos ven la lista; solo el admin modifica.
drop policy if exists "perfiles ver"    on public.perfiles;
drop policy if exists "perfiles editar" on public.perfiles;
create policy "perfiles ver" on public.perfiles
  for select using (user_id = auth.uid() or public.es_usuario_activo());
create policy "perfiles editar" on public.perfiles
  for update using (public.es_admin());

-- ---------- Tiempo real ----------
-- Para que los cambios se reflejen al instante en otros dispositivos.

do $$
begin
  alter publication supabase_realtime add table public.almacen;
exception when duplicate_object then null;
end $$;

-- ---------- Buzón de pedidos que llegan por WhatsApp ----------
-- El bot de WhatsApp NO escribe en `almacen`: si lo hiciera tendría que
-- reescribir la lista completa de pedidos y podría borrar los que la app
-- todavía no conocía (ya pasó una vez). En vez de eso deja cada pedido
-- aquí, en su propia fila, y la app los va pasando a la lista.

create table if not exists public.pedidos_whatsapp (
  id          uuid primary key default gen_random_uuid(),
  pedido      jsonb not null,
  cliente     jsonb,
  incorporado boolean not null default false,
  creado_at   timestamptz not null default now()
);

alter table public.pedidos_whatsapp enable row level security;

-- Los usuarios activos solo leen y marcan como incorporados.
-- Insertar es exclusivo del bot, que usa la llave de servicio.
drop policy if exists "pedidos whatsapp leer"   on public.pedidos_whatsapp;
drop policy if exists "pedidos whatsapp editar" on public.pedidos_whatsapp;
create policy "pedidos whatsapp leer"   on public.pedidos_whatsapp for select using (public.es_usuario_activo());
create policy "pedidos whatsapp editar" on public.pedidos_whatsapp for update using (public.es_usuario_activo());

do $$
begin
  alter publication supabase_realtime add table public.pedidos_whatsapp;
exception when duplicate_object then null;
end $$;

-- ---------- Bandeja de entrada de WhatsApp ----------
-- Para que Pepe conteste desde la app lo que el bot no debe contestar:
-- el trato personal con él es lo que la gente busca del negocio.
-- `whatsapp_chats` guarda el contexto técnico de la IA (no se puede leer);
-- estas dos tablas guardan la conversación como un chat normal.

create table if not exists public.whatsapp_mensajes (
  id        bigserial primary key,
  telefono  text not null,
  de        text not null,          -- 'cliente' | 'bot' | 'pepe'
  texto     text not null,
  creado_at timestamptz not null default now()
);

create index if not exists whatsapp_mensajes_chat_idx
  on public.whatsapp_mensajes (telefono, creado_at);

create table if not exists public.whatsapp_conversaciones (
  telefono     text primary key,
  nombre       text not null default '',
  ultimo_texto text not null default '',
  ultimo_at    timestamptz not null default now(),
  -- Se prende cuando la IA pide que conteste Pepe; solo él lo apaga.
  necesita_pepe boolean not null default false,
  motivo_pepe   text not null default '',
  leido_at      timestamptz
);

alter table public.whatsapp_mensajes       enable row level security;
alter table public.whatsapp_conversaciones enable row level security;

-- Los usuarios activos leen todo y escriben sus respuestas.
drop policy if exists "wa mensajes leer"      on public.whatsapp_mensajes;
drop policy if exists "wa mensajes insertar"  on public.whatsapp_mensajes;
drop policy if exists "wa conversa leer"      on public.whatsapp_conversaciones;
drop policy if exists "wa conversa editar"    on public.whatsapp_conversaciones;
create policy "wa mensajes leer"     on public.whatsapp_mensajes       for select using (public.es_usuario_activo());
create policy "wa mensajes insertar" on public.whatsapp_mensajes       for insert with check (public.es_usuario_activo());
create policy "wa conversa leer"     on public.whatsapp_conversaciones for select using (public.es_usuario_activo());
create policy "wa conversa editar"   on public.whatsapp_conversaciones for update using (public.es_usuario_activo());

do $$
begin
  alter publication supabase_realtime add table public.whatsapp_mensajes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.whatsapp_conversaciones;
exception when duplicate_object then null;
end $$;

-- ---------- Carta pública (la página que ven los clientes) ----------
-- La página `carta.html` NO puede leer `almacen`: ahí viven los pedidos y los
-- datos de los clientes. En vez de eso, la app publica aquí una copia con solo
-- lo que el cliente debe ver (nombres, descripciones, precios y fotos).
-- Una sola fila, siempre id = 1.

create table if not exists public.carta_publica (
  id             int primary key default 1 check (id = 1),
  datos          jsonb not null default '{}'::jsonb,
  actualizado_at timestamptz not null default now()
);

insert into public.carta_publica (id, datos) values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.carta_publica enable row level security;

-- Cualquiera (incluso sin cuenta) puede leerla: para eso es pública.
-- Solo los usuarios activos de la app la publican.
drop policy if exists "carta leer"     on public.carta_publica;
drop policy if exists "carta escribir" on public.carta_publica;
drop policy if exists "carta insertar" on public.carta_publica;
create policy "carta leer"     on public.carta_publica for select using (true);
create policy "carta escribir" on public.carta_publica for update using (public.es_usuario_activo());
create policy "carta insertar" on public.carta_publica for insert with check (public.es_usuario_activo());

-- ---------- Solicitudes que llegan desde la página ----------
-- El cliente arma lo que le gustaría pedir en `carta.html` y lo manda. Cae
-- aquí Y se abre WhatsApp con el mismo resumen: si el cliente nunca llega a
-- mandar el WhatsApp, la solicitud ya quedó registrada de todos modos.
--
-- Ojo: esto NO es un pedido. Es una petición sin confirmar; Pepe la revisa,
-- ajusta kilos y precio, y decide si se vuelve pedido.

create table if not exists public.solicitudes_web (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null check (length(nombre) between 2 and 80),
  telefono     text not null check (length(telefono) between 7 and 25),
  fecha        date,
  hora         text check (hora is null or length(hora) <= 10),
  personas     int  check (personas is null or personas between 1 and 500),
  entrega      text not null default 'recoger' check (entrega in ('recoger', 'domicilio')),
  direccion    text check (direccion is null or length(direccion) <= 300),
  items        jsonb not null default '[]'::jsonb,
  nota         text check (nota is null or length(nota) <= 600),
  estimado     numeric,
  estado       text not null default 'nueva' check (estado in ('nueva', 'atendida', 'descartada')),
  creado_at    timestamptz not null default now()
);

create index if not exists solicitudes_web_estado_idx
  on public.solicitudes_web (estado, creado_at desc);

alter table public.solicitudes_web enable row level security;

-- Insertar es abierto (el cliente no tiene cuenta); los checks de arriba
-- limitan el tamaño de lo que se puede escribir. Leer y cambiar el estado
-- es solo de los usuarios activos: nadie de fuera ve las solicitudes ajenas.
drop policy if exists "solicitudes insertar" on public.solicitudes_web;
drop policy if exists "solicitudes leer"     on public.solicitudes_web;
drop policy if exists "solicitudes editar"   on public.solicitudes_web;
create policy "solicitudes insertar" on public.solicitudes_web for insert with check (true);
create policy "solicitudes leer"     on public.solicitudes_web for select using (public.es_usuario_activo());
create policy "solicitudes editar"   on public.solicitudes_web for update using (public.es_usuario_activo());

do $$
begin
  alter publication supabase_realtime add table public.solicitudes_web;
exception when duplicate_object then null;
end $$;
