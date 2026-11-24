-- =========================================================
-- Cambio: registrar clientes de paso (con plata y medio de pago)
-- Copiar todo, pegar en Supabase → SQL Editor → New query → Run
-- =========================================================

-- 1) Nuevo origen "paso" (cliente que llegó sin turno)
alter table public.bookings drop constraint if exists bookings_source_check;
alter table public.bookings add constraint bookings_source_check
    check (source in ('web', 'barbero', 'paso'));

-- 2) Medio de pago (Efectivo, Nequi, Transferencia…)
alter table public.bookings add column if not exists payment text
    check (payment is null or char_length(payment) <= 40);

-- 3) El barbero puede bloquear horas o registrar sus clientes de paso
drop policy if exists "barbero bloquea" on public.bookings;
drop policy if exists "barbero registra" on public.bookings;
create policy "barbero registra" on public.bookings
    for insert to authenticated
    with check (
        ((status = 'bloqueado' and source = 'barbero') or (status = 'atendido' and source = 'paso'))
        and exists (select 1 from public.profiles p
                    where p.user_id = auth.uid()
                      and (p.role = 'owner' or p.barber_id = bookings.barber_id)));
