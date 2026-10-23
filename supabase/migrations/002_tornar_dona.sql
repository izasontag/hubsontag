-- Torna a primeira conta criada em Authentication > Users a "dona".
-- Rode UMA vez, depois de criar o seu login no Supabase.
insert into public.perfis (id, nome, email, papel)
select id, 'Izadora', email, 'dona'
from auth.users
order by created_at
limit 1
on conflict (id) do update set papel = 'dona';
