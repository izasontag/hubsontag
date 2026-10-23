// Anéis finos e lentos, só decoração. Herda a cor do texto ao redor.
export default function Aneis({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 400" className={`pointer-events-none ${className}`} fill="none" stroke="currentColor">
      <g className="anim-girar-lento" strokeWidth="1">
        <circle cx="200" cy="200" r="190" strokeDasharray="2 10" />
        <circle cx="200" cy="200" r="150" />
        <circle cx="200" cy="200" r="110" strokeDasharray="1 6" />
      </g>
      <g className="anim-flutuar" strokeWidth="1">
        <circle cx="200" cy="200" r="70" />
        <circle cx="200" cy="200" r="30" />
      </g>
    </svg>
  )
}
