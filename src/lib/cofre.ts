// Cofre do Instagram: a senha é trancada (RSA-OAEP) no celular do cliente com a chave PÚBLICA.
// Só a chave PRIVADA, guardada pela dona, consegue abrir. O banco guarda apenas o texto trancado.

const emB64 = (buf: ArrayBuffer) => {
  let s = ''
  new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s)
}
const deB64 = (s: string) => Uint8Array.from(atob(s.trim()), (c) => c.charCodeAt(0))

const ALGORITMO = { name: 'RSA-OAEP', hash: 'SHA-256' } as const
export const LIMITE_BYTES = 300 // o que cabe em uma chave de 3072 bits

export async function gerarChaves(): Promise<{ publica: string; privada: string }> {
  const par = await crypto.subtle.generateKey(
    { ...ALGORITMO, modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ['encrypt', 'decrypt'],
  )
  const [publica, privada] = await Promise.all([
    crypto.subtle.exportKey('spki', par.publicKey),
    crypto.subtle.exportKey('pkcs8', par.privateKey),
  ])
  return { publica: emB64(publica), privada: emB64(privada) }
}

export async function cifrar(chavePublica: string, texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto)
  if (bytes.length > LIMITE_BYTES) throw new Error('texto_grande')
  const chave = await crypto.subtle.importKey('spki', deB64(chavePublica), ALGORITMO, false, ['encrypt'])
  return emB64(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, chave, bytes))
}

export async function decifrar(chavePrivada: string, cifra: string): Promise<string> {
  const chave = await crypto.subtle.importKey('pkcs8', deB64(chavePrivada), ALGORITMO, false, ['decrypt'])
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, chave, deB64(cifra)))
}

// a chave privada fica só na aba aberta (some ao fechar o navegador)
const CHAVE_SESSAO = 'cofre-chave-privada'
export const lerChaveSessao = () => {
  try {
    return sessionStorage.getItem(CHAVE_SESSAO)
  } catch {
    return null
  }
}
export const guardarChaveSessao = (chave: string | null) => {
  try {
    if (chave) sessionStorage.setItem(CHAVE_SESSAO, chave)
    else sessionStorage.removeItem(CHAVE_SESSAO)
  } catch {
    /* sem armazenamento: a dona cola a chave de novo quando precisar */
  }
}
