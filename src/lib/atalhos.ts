// Aceita o código de incorporação do Google Agenda (<iframe src="...">) ou só o endereço.
export function lerEnderecoAgenda(texto: string): string | null {
  const dentro = texto.match(/src\s*=\s*["']([^"']+)["']/i)?.[1] ?? texto.trim()
  const url = dentro.replace(/&amp;/g, '&').trim()
  if (!/^https:\/\/calendar\.google\.com\/calendar\//i.test(url)) return null
  try {
    const u = new URL(url)
    if (u.hostname !== 'calendar.google.com') return null
    if (!u.searchParams.has('ctz')) u.searchParams.set('ctz', 'America/Campo_Grande')
    return u.toString()
  } catch {
    return null
  }
}

export const enderecoPinterestValido = (url: string) => /^https:\/\/([a-z0-9-]+\.)?pinterest\.[a-z.]+\//i.test(url.trim())

// "https://br.pinterest.com/pin/123456/" -> "123456"
export const idDoPin = (url: string) => url.match(/^https:\/\/([a-z0-9-]+\.)?pinterest\.[a-z.]+\/pin\/(\d+)/i)?.[2] ?? null
