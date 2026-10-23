import { useRef, useState } from 'react'
import { analisarLink } from '../lib/linkVideo'
import { ImagemSuave } from './animacao'
import { urlPublica } from '../lib/midias'
import type { MidiaVista } from '../lib/tipos'

function BotaoPlay() {
  return (
    <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-texto/70 text-superficie">
      <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-current">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  )
}

// Vídeo por link: player dentro do cartão (YouTube, Drive), capa com play, ou botão para abrir o link.
function VideoPorLink({ link, capa, alt, className }: { link: string; capa: string | null | undefined; alt: string; className: string }) {
  const [tocando, setTocando] = useState(false)
  const info = analisarLink(link)
  const capaUrl = capa ? urlPublica(capa) : null

  if (info && (tocando || !capaUrl)) {
    const src = tocando && info.servico === 'youtube' ? `${info.embed}?autoplay=1` : info.embed
    return (
      <iframe
        src={src}
        title={alt}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        className={`border-0 bg-texto ${className}`}
      />
    )
  }

  if (capaUrl) {
    const conteudo = (
      <>
        <ImagemSuave src={capaUrl} alt={alt} className="h-full w-full object-contain" />
        <span className="absolute inset-0 flex items-center justify-center">
          <BotaoPlay />
        </span>
      </>
    )
    return info ? (
      <button type="button" onClick={() => setTocando(true)} aria-label={`Assistir ao vídeo: ${alt}`} className={`relative cursor-pointer bg-fundo ${className}`}>
        {conteudo}
      </button>
    ) : (
      <a href={link} target="_blank" rel="noreferrer noopener" aria-label={`Assistir ao vídeo (abre em outra aba): ${alt}`} className={`relative block bg-fundo ${className}`}>
        {conteudo}
      </a>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 bg-fundo p-6 text-center ${className}`}>
      <p className="text-sm text-texto-suave">Este vídeo está em outro endereço.</p>
      <a href={link} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center rounded-sm bg-marrom px-5 text-sm font-medium text-superficie">
        Assistir ao vídeo
      </a>
    </div>
  )
}

// Uma mídia: imagem, vídeo em arquivo (com player e capa) ou vídeo por link.
export function MidiaItem({ midia, alt, className = '' }: { midia: MidiaVista; alt: string; className?: string }) {
  if (midia.tipo === 'video' && midia.caminho) {
    return (
      <video
        src={`${urlPublica(midia.caminho)}${midia.capa ? '' : '#t=0.1'}`}
        poster={midia.capa ? urlPublica(midia.capa) : undefined}
        controls
        playsInline
        preload="metadata"
        aria-label={alt}
        className={`bg-texto ${className}`}
      />
    )
  }
  if (midia.tipo === 'video' && midia.link) {
    return <VideoPorLink link={midia.link} capa={midia.capa} alt={alt} className={className} />
  }
  if (midia.caminho) {
    return <ImagemSuave src={urlPublica(midia.caminho)} alt={alt} loading="lazy" className={className} />
  }
  return null
}

// Miniatura pequena (calendário, grade do feed): imagem, capa do vídeo ou o primeiro quadro.
export function MiniaturaMidia({ midias, alt, className = '' }: { midias: MidiaVista[]; alt: string; className?: string }) {
  const imagem = midias.find((m) => m.tipo === 'imagem' && m.caminho)
  const video = midias.find((m) => m.tipo === 'video')
  if (imagem?.caminho) return <ImagemSuave src={urlPublica(imagem.caminho)} alt={alt} loading="lazy" className={`object-cover ${className}`} />
  if (video?.capa) return <ImagemSuave src={urlPublica(video.capa)} alt={alt} loading="lazy" className={`object-cover ${className}`} />
  const miniaturaLink = video?.link ? analisarLink(video.link)?.miniatura : null
  if (miniaturaLink) return <ImagemSuave src={miniaturaLink} alt={alt} loading="lazy" referrerPolicy="no-referrer" className={`object-cover ${className}`} />
  if (video?.caminho) {
    return <video src={`${urlPublica(video.caminho)}#t=0.1`} preload="metadata" muted playsInline aria-label={alt} className={`bg-texto object-cover ${className}`} />
  }
  return (
    <span className={`flex items-center justify-center border border-dashed border-linha p-1 text-center text-xs text-texto-suave ${className}`}>
      {video ? 'Vídeo' : 'Sem arte'}
    </span>
  )
}

// Carrossel deslizável com pontinhos, como no Instagram.
export function CarrosselMidias({ midias, titulo }: { midias: MidiaVista[]; titulo: string }) {
  const faixa = useRef<HTMLDivElement>(null)
  const [atual, setAtual] = useState(0)

  if (midias.length === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-fundo text-sm text-texto-suave">
        Arte ainda não disponível
      </div>
    )
  }

  const aoRolar = () => {
    const el = faixa.current
    if (el && el.clientWidth > 0) setAtual(Math.round(el.scrollLeft / el.clientWidth))
  }
  const ir = (i: number) => faixa.current?.scrollTo({ left: i * faixa.current.clientWidth, behavior: 'smooth' })

  return (
    <div className="relative">
      <div
        ref={faixa}
        onScroll={aoRolar}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-roledescription="carrossel"
        aria-label={`${titulo}${midias.length > 1 ? `, ${midias.length} itens, deslize para o lado` : ''}`}
        tabIndex={0}
      >
        {midias.map((m, i) => (
          <div key={`${m.caminho ?? m.link}-${i}`} className="aspect-[4/5] w-full shrink-0 snap-center bg-fundo">
            <MidiaItem midia={m} alt={`${titulo}, item ${i + 1} de ${midias.length}`} className="h-full w-full object-contain" />
          </div>
        ))}
      </div>
      {midias.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => ir(Math.max(0, atual - 1))}
            disabled={atual === 0}
            aria-label="Item anterior"
            className="absolute left-2 top-[40%] hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-superficie/90 text-lg text-texto shadow-suave transition duration-200 hover:scale-105 disabled:opacity-0 md:flex"
          >
            &larr;
          </button>
          <button
            type="button"
            onClick={() => ir(Math.min(midias.length - 1, atual + 1))}
            disabled={atual === midias.length - 1}
            aria-label="Próximo item"
            className="absolute right-2 top-[40%] hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-superficie/90 text-lg text-texto shadow-suave transition duration-200 hover:scale-105 disabled:opacity-0 md:flex"
          >
            &rarr;
          </button>
          <span className="pointer-events-none absolute right-2 top-2 rounded-sm bg-texto/70 px-2 py-0.5 text-xs text-superficie" aria-hidden>
            {atual + 1}/{midias.length}
          </span>
          <div className="flex justify-center gap-1 py-2">
            {midias.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => ir(i)}
                aria-label={`Ir para o item ${i + 1}`}
                aria-current={i === atual}
                className="flex h-6 w-6 cursor-pointer items-center justify-center"
              >
                <span className={`block h-2 w-2 rounded-full ${i === atual ? 'bg-marrom' : 'bg-linha'}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
