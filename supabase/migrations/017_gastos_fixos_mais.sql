-- Gastos fixos mais completos: conta "só neste mês" (1 parcela), forma de pagamento e observação em cada mês.
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

alter table public.gastos_fixos drop constraint if exists gastos_fixos_parcelas_total_check;
alter table public.gastos_fixos add constraint gastos_fixos_parcelas_total_check
  check (parcelas_total is null or parcelas_total between 1 and 120);

alter table public.gastos_fixos_mes
  add column forma_pagamento text check (forma_pagamento is null or forma_pagamento in ('pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro')),
  add column observacao text check (observacao is null or char_length(observacao) <= 300);
