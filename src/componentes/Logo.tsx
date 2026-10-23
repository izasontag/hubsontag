// Logo da Sontag Media: selo recortado (borda de renda) com o "S" e a estrela de story.
const PONTAS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2
  return { x: 50 + Math.cos(a) * 41, y: 50 + Math.sin(a) * 41 }
})

export function LogoSelo({ className = '', titulo = 'Sontag Media' }: { className?: string; titulo?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={titulo}>
      <g fill="var(--color-azul)">
        <circle cx="50" cy="50" r="41" />
        {PONTAS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="7.5" />
        ))}
      </g>
      <circle cx="50" cy="50" r="38" fill="none" stroke="var(--color-superficie)" strokeWidth="0.8" strokeDasharray="1.5 2.5" />
      <text x="47" y="63" textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontSize="56" fontWeight="600" fill="var(--color-superficie)">
        S
      </text>
      <path d="M72 24l1.8 6.2L80 32l-6.2 1.8L72 40l-1.8-6.2L64 32l6.2-1.8z" fill="var(--color-azul-claro)" />
    </svg>
  )
}
