import { Cartao, Titulo } from '../../componentes/ui'
import ConteudoPost from '../../componentes/portal/ConteudoPost'
import PainelDecisao from '../../componentes/portal/PainelDecisao'
import { formatarDataHora, usePortal } from '../../lib/portal'

export default function PortalAprovacoes() {
  const { posts } = usePortal()
  const aguardando = posts.filter((p) => p.status === 'em_aprovacao')
  const ajustes = posts.filter((p) => p.status === 'ajuste_pedido')

  return (
    <div className="space-y-8">
      <h2 className="font-titulo text-3xl font-semibold text-marrom">Aprovações</h2>
      {aguardando.length === 0 && <p className="text-texto-suave">Nada esperando a sua aprovação agora.</p>}
      {aguardando.map((p) => (
        <Cartao key={p.id}>
          <ConteudoPost post={p}>
            <PainelDecisao post={p} />
          </ConteudoPost>
        </Cartao>
      ))}
      {ajustes.length > 0 && (
        <section className="space-y-3">
          <Titulo>Ajustes pedidos</Titulo>
          <p className="text-sm text-texto-suave">A Sontag Media está ajustando. Quando voltar para aprovação, o post aparece de novo no topo desta página.</p>
          <ul className="space-y-3">
            {ajustes.map((p) => {
              const ultimo = [...p.aprovacoes].reverse().find((a) => a.decisao === 'ajuste_pedido')
              return (
                <li key={p.id} className="rounded-md border border-linha bg-superficie p-4">
                  <p className="font-medium">{p.tema || 'Post'}</p>
                  {ultimo && (
                    <p className="text-sm text-texto-suave">
                      Pedido em {formatarDataHora(ultimo.criado_em)}: {ultimo.mensagem}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
