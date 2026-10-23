import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && chave)

// Sem as variáveis, usa valores de mentira só para o site abrir e mostrar o aviso.
export const supabase = createClient(url || 'http://localhost', chave || 'sem-chave')
