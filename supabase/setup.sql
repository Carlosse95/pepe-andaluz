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

-- ---------- Trigger: la hora de cambio la pone la base, no la app ----------
-- La app pregunta cada pocos segundos "¿cambió algo?" leyendo solo
-- `clave, updated_at` (unos cientos de bytes) y nada más baja la clave que de
-- verdad cambió. Antes se traía las listas completas en cada ronda —más de un
-- mega, veinte veces por minuto— y eso agotó el internet mensual del plan
-- gratis en cuestión de horas cuando la lista de clientes creció a miles.
--
-- Para que esa pregunta sea de fiar la hora tiene que ponerse SOLA en cada
-- guardado, venga de donde venga: la app, un script, la consola de Supabase.
-- Antes la mandaba la app y un cambio hecho por fuera pasaba desapercibido.
-- Además así manda el reloj del servidor y no el del celular, que puede estar
-- descuadrado.

create or replace function public.almacen_marcar_actualizado()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists almacen_set_updated_at on public.almacen;

create trigger almacen_set_updated_at
  before insert or update on public.almacen
  for each row
  execute function public.almacen_marcar_actualizado();

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
