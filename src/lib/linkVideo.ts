// Reconhece links de vídeo que dá para mostrar dentro do cartão (player embutido).
// O endereço do player é sempre montado por nós a partir do código do vídeo, nunca copiado do link.

export interface LinkVideo {
  servico: 'youtube' | 'drive'
  embed: string
  miniatura: string | null
}

const idValido = (id: string | null | undefined) => (id && /^[A-Za-z0-9_-]{6,80}$/.test(id) ? id : null)

export function analisarLink(link: string): LinkVideo | null {
  let u: URL
  try {
    u = new URL(link.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.replace(/^(www|m)\./, '')

  let ytId: string | null = null
  if (host === 'youtu.be') ytId = idValido(u.pathname.split('/')[1])
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname.startsWith('/watch')) ytId = idValido(u.searchParams.get('v'))
    else ytId = idValido(u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1])
  }
  if (ytId) {
    return {
      servico: 'youtube',
      embed: `https://www.youtube.com/embed/${ytId}`,
      miniatura: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    }
  }

  if (host === 'drive.google.com') {
    const driveId = idValido(u.pathname.match(/^\/file\/d\/([^/?#]+)/)?.[1] ?? u.searchParams.get('id'))
    if (driveId) return { servico: 'drive', embed: `https://drive.google.com/file/d/${driveId}/preview`, miniatura: null }
  }
  return null
}
