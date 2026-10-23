-- Tipo do evento escolhido pela dona (casamento, aniversário, formatura, corporativo...).
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

alter table public.eventos add column categoria text check (categoria is null or char_length(btrim(categoria)) between 1 and 60);
update public.eventos set categoria = case when tipo = 'casamento' then 'Casamento' else 'Evento' end where categoria is null;
