-- Link each Supabase Auth user to a role (run after creating the users in Authentication → Users).
-- Replace the emails with the ones you created. barber_id must match the ids in site/config.js.
insert into public.profiles (user_id, role, barber_id)
select id, 'owner', null from auth.users where email = 'owner@example.com'
union all select id, 'barber', 'darwin' from auth.users where email = 'darwin@example.com'
-- union all select id, 'barber', '<barber_id>' from auth.users where email = '<email>'
on conflict (user_id) do update set role = excluded.role, barber_id = excluded.barber_id;
