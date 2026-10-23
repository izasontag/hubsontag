import { urlImagem } from '../../lib/portal'

export default function ImagensPost({ midias, titulo }: { midias: string[]; titulo: string }) {
  if (midias.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-sm border border-dashed border-linha text-sm text-texto-suave">
        Arte ainda não disponível
      </div>
    )
  }
  return (
    <div
      className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2"
      role="group"
      aria-label={`Artes de ${titulo}${midias.length > 1 ? `, ${midias.length} imagens, role para o lado` : ''}`}
      tabIndex={0}
    >
      {midias.map((m, i) => (
        <img
          key={m}
          src={urlImagem(m)}
          alt={`${titulo}, arte ${i + 1} de ${midias.length}`}
          loading="lazy"
          className="max-h-[32rem] w-full max-w-md shrink-0 snap-center rounded-sm border border-linha object-contain bg-superficie sm:w-auto"
        />
      ))}
    </div>
  )
}
