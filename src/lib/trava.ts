import { useEffect, useRef } from 'react'

// Trava a rolagem da página enquanto há uma janela aberta. Conta quantas janelas pediram, então uma
// janela que fecha nunca destrava a página enquanto outra ainda está aberta (e nunca deixa travada).
let pedidos = 0
let anterior = ''

export function travar() {
  if (pedidos === 0) {
    anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  pedidos += 1
  let liberado = false
  return () => {
    if (liberado) return
    liberado = true
    pedidos -= 1
    if (pedidos <= 0) {
      pedidos = 0
      document.body.style.overflow = anterior
    }
  }
}

export function useTravaRolagem(ativo = true) {
  useEffect(() => {
    if (!ativo) return
    return travar()
  }, [ativo])
}

// Esc fecha a janela. Usa sempre a função mais recente, sem reinscrever o ouvinte a cada tela nova.
export function useEscape(aoFechar: () => void, ativo = true) {
  const ref = useRef(aoFechar)
  useEffect(() => {
    ref.current = aoFechar
  })
  useEffect(() => {
    if (!ativo) return
    const ouvir = (e: KeyboardEvent) => e.key === 'Escape' && ref.current()
    document.addEventListener('keydown', ouvir)
    return () => document.removeEventListener('keydown', ouvir)
  }, [ativo])
}
