-- =========================================================
-- Base de datos de la barbería (Supabase)
-- Copiar TODO esto y pegarlo en Supabase → SQL Editor → Run
-- =========================================================

-- 1) Turnos
create table if not exists public.bookings (
    id           uuid primary key default gen_random_uuid(),
    created_at   timestamptz not null default now(),
    date         date not null,
    time         text not null check (time ~ '^\d{2}:\d{2}$'),
    barber_id    text not null,
    client_name  text not null check (char_length(client_name) between 1 and 60),
    client_phone text not null default '' check (client_phone ~ '^(3\d{9})?$'),
    services     text[] not null default '{}',
    total        integer not null default 0 check (total >= 0),
    status       text not null default 'separado'
                 check (status in ('separado','atendido','no_vino','cancelado','bloqueado')),
    source       text not null default 'web' check (source in ('web','barbero','paso')),
    payment      text check (payment is null or char_length(payment) <= 40)
);

-- Una sola persona por barbero, día y hora (evita turnos dobles)
create unique index if not exists one_turn_per_slot
    on public.bookings (barber_id, date, time)
    where status in ('separado','atendido','bloqueado');

-- 2) Quién es quién (une cada usuario de Supabase con su barbero o con el dueño)
create table if not exists public.profiles (
    user_id   uuid primary key references auth.users(id) on delete cascade,
    role      text not null check (role in ('owner','barber')),
    barber_id text
);

-- 3) Seguridad: nadie ve los datos de los clientes sin entrar al panel
alter table public.bookings enable row level security;
alter table public.profiles enable row level security;

-- Cualquier persona puede SEPARAR un turno (solo como "separado", desde hoy en adelante)
drop policy if exists "clientes separan" on public.bookings;
create policy "clientes separan" on public.bookings
    for insert to anon, authenticated
    with check (status = 'separado' and source = 'web'
                and date >= (now() at time zone 'America/Bogota')::date
                and date <= (now() at time zone 'America/Bogota')::date + 31);

-- El dueño ve todo; cada barbero ve solo lo suyo
drop policy if exists "panel ve turnos" on public.bookings;
create policy "panel ve turnos" on public.bookings
    for select to authenticated
    using (exists (select 1 from public.profiles p
                   where p.user_id = auth.uid()
                     and (p.role = 'owner' or p.barber_id = bookings.barber_id)));

drop policy if exists "panel cambia turnos" on public.bookings;
create policy "panel cambia turnos" on public.bookings
    for update to authenticated
    using (exists (select 1 from public.profiles p
                   where p.user_id = auth.uid()
                     and (p.role = 'owner' or p.barber_id = bookings.barber_id)));

-- El barbero puede bloquear horas o registrar clientes de paso
drop policy if exists "barbero registra" on public.bookings;
create policy "barbero registra" on public.bookings
    for insert to authenticated
    with check (((status = 'bloqueado' and source = 'barbero') or (status = 'atendido' and source = 'paso'))
                and exists (select 1 from public.profiles p
                            where p.user_id = auth.uid()
                              and (p.role = 'owner' or p.barber_id = bookings.barber_id)));

drop policy if exists "cada uno ve su perfil" on public.profiles;
create policy "cada uno ve su perfil" on public.profiles
    for select to authenticated using (user_id = auth.uid());

-- Permisos de la API (la seguridad real la ponen las reglas de arriba)
grant usage on schema public to anon, authenticated;
grant insert on public.bookings to anon, authenticated;
grant select, update on public.bookings to authenticated;
grant select on public.profiles to authenticated;

-- 4) Horas ocupadas para la página pública (sin nombres ni celulares)
create or replace function public.taken_slots(d date)
returns table (barber_id text, "time" text)
language sql security definer set search_path = public as $$
    select b.barber_id, b.time from public.bookings b
    where b.date = d and b.status in ('separado','atendido','bloqueado');
$$;
grant execute on function public.taken_slots(date) to anon, authenticated;

-- 5) Avisos en vivo al panel cuando entra un turno
alter publication supabase_realtime add table public.bookings;

-- =========================================================
-- 6) DESPUÉS de crear los usuarios (paso 4 del LEEME), corre esto
--    cambiando los correos por los que pusiste en config.js:
-- =========================================================
-- insert into public.profiles (user_id, role, barber_id)
-- select id, 'owner', null from auth.users where email = 'dueno@mibarberia.co';
--
-- insert into public.profiles (user_id, role, barber_id)
-- select id, 'barber', 'b1' from auth.users where email = 'barbero1@mibarberia.co';
-- (repite para b2, b3, b4, b5, b6)
