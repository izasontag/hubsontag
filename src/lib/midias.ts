import { supabase } from './supabase'
import type { Midia, MidiaVista, TipoMidia } from './tipos'

export const LIMITE_IMAGEM = 10 * 1024 * 1024
export const LIMITE_VIDEO = 50 * 1024 * 1024

// As mídias ficam em um endereço longo e secreto (veja a migração 004).
export const urlPublica = (caminho: string) => supabase.storage.from('posts').getPublicUrl(caminho).data.publicUrl

export const linkValido = (texto: string) => /^https?:\/\/\S+$/i.test(texto.trim())

export function tipoDoArquivo(arquivo: File): TipoMidia | null {
  if (arquivo.type.startsWith('image/')) return 'imagem'
  if (arquivo.type.startsWith('video/')) return 'video'
  return null
}

// Devolve o motivo se o arquivo não puder ser enviado, ou null se estiver ok.
export function validarArquivo(arquivo: File): string | null {
  const tipo = tipoDoArquivo(arquivo)
  if (!tipo) return `"${arquivo.name}" precisa ser uma imagem ou um vídeo.`
  if (tipo === 'imagem' && arquivo.size > LIMITE_IMAGEM) return `"${arquivo.name}" passa de 10 MB.`
  if (tipo === 'video' && arquivo.size > LIMITE_VIDEO) {
    return `"${arquivo.name}" passa de 50 MB. Comprima o vídeo ou use a opção de link.`
  }
  return null
}

// Envia o arquivo ao armazenamento e registra na tabela. Devolve uma mensagem se der erro.
export async function enviarMidia(clienteId: string, postId: string, arquivo: File, ordem: number): Promise<string | null> {
  const tipo = tipoDoArquivo(arquivo)
  if (!tipo) return validarArquivo(arquivo)
  const extensao = (arquivo.name.split('.').pop() || (tipo === 'video' ? 'mp4' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '')
  const caminho = `${clienteId}/${postId}/${crypto.randomUUID()}.${extensao}`
  const envio = await supabase.storage.from('posts').upload(caminho, arquivo, { contentType: arquivo.type })
  if (envio.error) return `Não foi possível enviar "${arquivo.name}".`
  const linha = await supabase.from('post_midias').insert({ post_id: postId, caminho_storage: caminho, ordem, tipo })
  if (linha.error) {
    await supabase.storage.from('posts').remove([caminho])
    return `Não foi possível registrar "${arquivo.name}".`
  }
  return null
}

export const paraVista = (m: Pick<Midia, 'tipo' | 'caminho_storage' | 'link_externo'>): MidiaVista => ({
  tipo: m.tipo,
  caminho: m.caminho_storage,
  link: m.link_externo,
})

export const primeiraImagem = (midias: MidiaVista[]) => midias.find((m) => m.tipo === 'imagem' && m.caminho) ?? null
