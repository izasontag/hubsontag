import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

// Janelas são desenhadas direto no <body>: nenhum efeito de uma tela (animação, transformação)
// consegue deslocar a janela ou impedir a rolagem dela.
export default function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
