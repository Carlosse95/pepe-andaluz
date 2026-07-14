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
