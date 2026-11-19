import { createClient } from '@supabase/supabase-js'

// Endereço do projeto e chave PÚBLICA (anon/publishable). Essa chave não é segredo: ela já vai dentro do site
// para qualquer visitante, e a proteção dos dados é feita pelas regras (RLS) do banco. Por isso vale como
// padrão quando a hospedagem não tem as variáveis de ambiente. NUNCA colocar aqui a chave service_role.
const URL_PADRAO = 'https://nwriipyyfyypnjxuliwx.supabase.co'
const CHAVE_PADRAO = 'sb_publishable_7j2g7EyAmAgtRpigI866FQ_g5ldXUtV'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || URL_PADRAO
const chave = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || CHAVE_PADRAO

export const supabaseConfigurado = Boolean(url && chave)

export const supabase = createClient(url, chave)
