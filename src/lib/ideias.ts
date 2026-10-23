import { supabase } from './supabase'
import { tipoDoArquivo } from './midias'

export const LIMITE_ARQUIVO_IDEIA = 50 * 1024 * 1024

// "#reels, humor" -> ["reels", "humor"]
export function lerTags(texto: string): string[] {
  const unicas = new Set(
    texto
      .split(',')
      .map((t) => t.trim().replace(/^#/, '').toLowerCase())
      .filter(Boolean),
  )
  return [...unicas]
}

// Envia um arquivo para uma ideia (bucket privado "ideias"). Devolve a mensagem de erro, se houver.
export async function enviarArquivoIdeia(ideiaId: string, arquivo: File, ordem: number): Promise<string | null> {
  if (arquivo.size > LIMITE_ARQUIVO_IDEIA) return `"${arquivo.name}" passa de 50 MB.`
  const extensao = (arquivo.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const caminho = `${ideiaId}/${crypto.randomUUID()}.${extensao}`
  const envio = await supabase.storage.from('ideias').upload(caminho, arquivo, { contentType: arquivo.type || undefined })
  if (envio.error) return `Não foi possível enviar "${arquivo.name}".`
  const linha = await supabase
    .from('ideia_arquivos')
    .insert({ ideia_id: ideiaId, caminho_storage: caminho, nome: arquivo.name, tipo: tipoDoArquivo(arquivo) ?? 'arquivo', ordem })
  if (linha.error) {
    await supabase.storage.from('ideias').remove([caminho])
    return `Não foi possível registrar "${arquivo.name}".`
  }
  return null
}
