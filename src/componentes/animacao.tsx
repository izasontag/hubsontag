import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

const reduzMovimento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Faz o conteúdo aparecer suavemente quando entra na tela. `ordem` escalona itens de uma lista.
export function Revelar({
  children,
  ordem = 0,
  className = '',
}: {
  children: ReactNode
  ordem?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduzMovimento() || typeof IntersectionObserver === 'undefined') {
      el.classList.add('visivel')
      return
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          el.classList.add('visivel')
          observador.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  return (
    <div ref={ref} data-revelar className={className} style={{ '--i': Math.min(ordem, 8) } as CSSProperties}>
      {children}
    </div>
  )
}

// Número que "conta" até o valor final.
export function NumeroAnimado({ valor, duracao = 900 }: { valor: number | null; duracao?: number }) {
  const [mostrado, setMostrado] = useState(0)

  useEffect(() => {
    if (valor === null) return
    if (reduzMovimento()) {
      setMostrado(valor)
      return
    }
    let quadro = 0
    const inicio = performance.now()
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao)
      setMostrado(Math.round(valor * (1 - Math.pow(1 - t, 3))))
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [valor, duracao])

  return <>{valor === null ? '...' : mostrado.toLocaleString('pt-BR')}</>
}

// Imagem que aparece com um fade quando termina de carregar.
export function ImagemSuave({ className = '', ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [pronta, setPronta] = useState(false)
  return (
    <img
      {...props}
      onLoad={() => setPronta(true)}
      onError={() => setPronta(true)}
      className={`transition-opacity duration-700 ${pronta ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  )
}

// Contraste: texto claro ou escuro sobre uma cor de destaque qualquer.
export function textoSobre(hex: string) {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '#ffffff'
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminancia > 0.38 ? '#2b2724' : '#ffffff'
}
