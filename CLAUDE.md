# Hub Sontag Media

Este arquivo é a especificação do projeto. Leia-o inteiro antes de qualquer tarefa e siga-o em todas as sessões.

## Quem sou eu e como trabalhar comigo

- Sou a Izadora, dona da Sontag Media, uma agência boutique de social media e storymaking em Campo Grande, MS.
- **Não sou programadora.** Explique cada passo em português simples, sem jargão. Quando eu precisar fazer algo fora do código (criar conta, copiar uma chave, clicar em um painel), diga exatamente onde clicar.
- Fale sempre em português do Brasil. Todo texto da interface também é em português.
- Trabalhe **uma fase por vez** (veja "Fases de construção"). Antes de começar uma fase, mostre um plano curto e espere meu ok.
- Ao final de cada fase, me diga como testar o que foi feito e faça um commit com uma mensagem clara.
- Nunca coloque chaves secretas no código. Use o arquivo `.env` (que nunca vai para o GitHub) e as variáveis de ambiente do Netlify.
- Prefira soluções simples e fáceis de manter. Não adicione bibliotecas sem necessidade.

## O que é o hub

Um sistema web com dois ambientes:

1. **Área interna (com login):** onde eu (e, no futuro, minha equipe) gerencio clientes, calendários editoriais, financeiro e ideias.
2. **Portal do cliente (sem login, por link secreto, como o compartilhar do Notion):** onde cada cliente vê só o que é dele, aprova posts, acompanha o calendário e consulta o manual da marca.

Princípios:

- Um cliente nunca vê nada de outro cliente.
- Tudo que o cliente vê nasce de algo cadastrado na área interna: o post aprovado no portal é o mesmo post do calendário.
- Poucos cliques, visual limpo e editorial. É uma agência boutique, com poucos clientes e muito cuidado em cada um.
- Funciona bem no celular (eu e os clientes vamos acessar pelo telefone).

## Tecnologia

| Parte | Ferramenta |
| --- | --- |
| Interface | React + Vite + TypeScript |
| Estilo | Tailwind CSS |
| Rotas | React Router |
| Banco de dados, login e arquivos | Supabase (Postgres, Auth, Storage) |
| Código | GitHub |
| Hospedagem | Netlify, que publica a branch `main` a cada envio |

- **Publicação:** no plano gratuito do Netlify cada publicação gasta 15 dos 300 créditos mensais. Por isso o trabalho acontece na branch `desenvolvimento` e só vai para a `main` (o que publica) quando a Izadora mandar, juntando várias mudanças em uma única publicação.
- Segurança dos dados com **Row Level Security (RLS)** do Supabase em todas as tabelas. Nenhuma tabela fica sem RLS.
- Migrações do banco em arquivos SQL dentro de `supabase/migrations/`, para eu poder rodar no painel do Supabase.
- Para o Netlify funcionar com as rotas do React, incluir `public/_redirects` com `/* /index.html 200`.
- Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Nunca usar a chave `service_role` no front-end.

## Identidade visual

- **Visual vintage / colagem em tons terrosos** (atualizado): papel creme, caramelo e bege, com textura de papel antigo (`body::after` em `global.css`).
- Cores (tokens em `src/estilos/global.css`; os nomes `azul-*` ficaram por histórico e hoje são caramelo/bege): fundo `#F4EFE6`, superfície `#FBF9F4`, texto `#2B2724`, marrom-escuro `#4B2E1E`, caramelo (`azul`) `#8B5E3F`, caramelo-escuro `#5C3A24`, bege `#E9D6BF`, bege-claro `#F3E9DB`, mostarda `#F1E6B0`, musgo/oliva para detalhes.
- Fontes: Cormorant Garamond (títulos), Outfit 600 (acentos de uma palavra, como "Izadora" e "Versículo do dia", na linha da logo sm; o token continua chamado `--font-script`), Helvetica (texto). Base de 15px: letras delicadas, nada gigante.
- Elementos: botões em pílula, cantos grandes (10 a 18px), listras, bordas recortadas, bilhetes, papel rasgado, polaroid com fita, carimbo, faixa de texto rolando, movimento suave.
- **Logo:** monograma "sm" de traço único com o "m" em laço (`src/componentes/Logo.tsx`, `public/logo-sontag.svg`) + "AG." na vertical, como nas referências. Não escrever "Sontag" por extenso na logo.
- Login: "Agência de conteúdo · cobertura de stories" no topo e a frase "Para que todos vejam e saibam." abaixo da logo.
- **Marca:** a Sontag se apresenta como **agência** (foco de crescimento): "Agência de conteúdo · cobertura de stories" no topo do login, "Storymaker & Social Media" como apoio e a frase "Para que todos vejam e saibam." (login, faixas, título da aba). Nunca usar "Media" no nome nem "Storymaker & Marketing".
- **Estilo editorial, vivo e elegante:** títulos grandes em Cormorant Garamond com uma palavra em itálico para destacar, legendas pequenas em caixa alta com espaçamento, sombras suaves nos cartões, números grandes em Helvetica leve (a serifada faz o zero parecer a letra O), avatares com iniciais na cor do cliente. O portal abre com uma faixa na cor de destaque do cliente, com anéis finos decorativos.
- **Movimento suave:** entrada com fade e leve deslize, escalonada em listas; cartões que sobem ao passar o mouse; sublinhado animado nos menus; números que contam; barras de progresso que preenchem; janelas que surgem com fade; imagens com fade ao carregar; blocos que aparecem ao rolar a página. Tudo em CSS e um pouco de JavaScript, sem biblioteca de animação. **Sempre respeitar `prefers-reduced-motion`** e nunca animar o que atrapalhe a leitura.
- **Gráficos:** colunas finas (até 24 px, topo arredondado), linhas e grade finas, legenda sempre que houver duas ou mais séries, dica ao passar o mouse e ao focar pelo teclado, e uma **visão em tabela** com os mesmos valores. Cores validadas contra daltonismo: **recebido `#5B7A38` (musgo vivo) e despesas `#C98B4F` (âmbar)**. O musgo e o marrom da identidade são parecidos demais para um gráfico e reprovam no teste. Nunca usar duas escalas no mesmo gráfico.
- **Navegação em barra lateral à esquerda** (no celular vira um menu que desliza, aberto pelo botão no topo), com ícones de linha fina e grupos: Painel, Trabalho (Clientes, Calendário, Tarefas, Ideias), Coberturas (Eventos) e Agência (Financeiro e Equipe, só para a dona).
- Cada cliente tem uma **cor de destaque** própria, usada nos detalhes do portal e do manual da marca dele.
- Contraste de texto de pelo menos 4.5:1. Botões com no mínimo 44 px de altura.

## Níveis de acesso

| Papel | Vê e faz |
| --- | --- |
| `dona` (eu) | Tudo, incluindo o financeiro da agência e o financeiro pessoal |
| `equipe` | Clientes em que trabalha, calendários, manuais e banco de ideias desses clientes. **Nunca** vê financeiro |
| `equipe` (eventos) | Nos eventos em que está atribuída: dados, contrato e checklist. **Nunca** vê valores nem parcelas do evento |
| Cliente (sem conta) | Não tem login. Abre o link secreto do próprio portal e vê só: posts a partir do status "Em aprovação", calendário, manual da marca, materiais e relatórios. Pode aprovar, pedir ajuste e comentar |

O papel de `dona` e `equipe` fica na tabela `perfis`. Clientes não têm conta nem perfil. As regras de RLS devem refletir exatamente esta tabela.

## Modelo de dados

Nomes de tabelas e colunas em português, sem acento, em `snake_case`. Toda tabela tem `id` (uuid), `criado_em` e `atualizado_em`.

### Pessoas e acesso

- **perfis**: `id` (= usuário do Supabase Auth), `nome`, `email`, `papel` (`dona`, `equipe`). Só quem tem login (dona e equipe)
- **equipe_clientes**: `perfil_id`, `cliente_id` (quais clientes cada pessoa da equipe atende)

### Clientes

- **clientes**: `nome`, `objetivo` (objetivo do cliente em uma frase) e `suporte` (horário de suporte e WhatsApp), ambos mostrados no início do portal, `token_portal` (código longo e aleatório do link secreto), `portal_ativo` (sim/não), `instagram`, `nicho`, `contato`, `status` (`ativo`, `pausado`, `encerrado`), `data_inicio`, `cor_destaque`, `observacoes`
- **manual_marca** (um por cliente): `cliente_id` e um campo por capítulo, em texto ou JSON:
  - `essencia` (quem é, propósito, missão, história)
  - `posicionamento` (promessa, diferenciais)
  - `publico` (persona, dores, desejos, objeções)
  - `estrategia` (objetivo do perfil, pilares com percentual, formatos prioritários, frequência)
  - `tom_voz` (como fala, palavras que usa, palavras que evita, exemplos de legendas)
  - `identidade_visual` (cores com código, fontes, logos, exemplos)
  - `regras` (o que nunca pode aparecer, regras do conselho profissional como OAB, CFO, CFM)
  - `diagnostico` (análise do perfil hoje) e `como_trabalhamos` (rotina, prazos, canais e responsabilidades)
- **metas**: `cliente_id`, `nome`, `valor_atual`, `valor_meta`, `prazo`
- **acessos_cliente**: `cliente_id`, `servico`, `link`, `observacao` (sem senhas em texto puro; só a dona vê)
- **historico_cliente**: `cliente_id`, `data`, `tipo` (reunião, decisão, feedback), `texto`

### Calendário e posts

- **posts**:
  - `cliente_id`, `data_publicacao`, `horario`
  - `formato` (`carrossel`, `reels`, `post_unico`, `stories`)
  - `pilar`, `formato_cbs` (ex.: antes e depois, lista, POV), `tema`, `gancho`, `copy`, `legenda`
  - `status`: `ideia`, `roteiro`, `design`, `em_aprovacao`, `ajuste_pedido`, `aprovado`, `agendado`, `publicado`
  - `prazo_interno` (só área interna)
  - Desempenho, preenchido depois de publicado: `desempenho` (`bom`, `media`, `abaixo` ou vazio), `alcance`, `salvamentos`, `compartilhamentos`, `comentarios_qtd`, `nota_desempenho` (minha explicação do resultado)
- **post_midias**: `post_id`, `tipo` (`imagem`, `video`), `caminho_storage` (arquivo) ou `link_externo` (vídeo em link, http/https), `capa_storage` (imagem de capa opcional para vídeos), `ordem`. Imagens até 10 MB e vídeos até 50 MB (limite do plano gratuito do Supabase); vídeo maior entra por link. Links de YouTube e Google Drive viram player dentro do cartão (o endereço do player é montado pelo código a partir do ID do vídeo, nunca copiado do link); os outros links aparecem como capa com botão de play, ou botão "Assistir ao vídeo" se não houver capa
- **rodadas**: `cliente_id`, `titulo`, `inicio`, `fim`, `status` (`rascunho`, `enviada`), `enviada_em`. Uma rodada é o lote de posts enviado de uma vez ao cliente, normalmente a quinzena. Em `posts`, `rodada_id` liga o post à rodada (do mesmo cliente). A função `enviar_rodada` passa todos os rascunhos da rodada para `em_aprovacao` de uma vez
- **tags**: `nome`, `cor`, `cliente_id` (vazio = tag geral)
- **post_tags**: `post_id`, `tag_id`
- **comentarios**: `post_id`, `autor_id` (vazio quando vem do portal do cliente), `origem` (`interno`, `portal`), `texto`, `referencia` (opcional: qual arte ou trecho da legenda)
- **aprovacoes**: `post_id`, `autor_id` (vazio quando vem do portal), `decisao` (`aprovado`, `ajuste_pedido`), `mensagem`, `criado_em` (registro permanente de que o cliente do link aprovou e quando)
- **feed_atual**: `cliente_id`, `caminho_storage`, `ordem` (prints dos posts já publicados, para a prévia do feed)

### Financeiro da agência (só dona)

- **contratos**: `cliente_id`, `plano`, `escopo` (posts, reels e stories por mês), `valor_mensal`, `inicio`, `renovacao`, `arquivo_storage`
- **cobrancas**: `contrato_id` ou `projeto_id`, `cliente_id`, `vencimento`, `valor`, `forma_pagamento`, `status` (`a_vencer`, `pago`, `atrasado`), `pago_em`, `valor_recebido` (quanto entrou de fato; vazio = o valor combinado), `nota_storage` e `nota_nome` (nota fiscal ou recibo, bucket privado `notas`, só dona; migração `014_recebimentos_notas.sql`)
- **despesas**: `data`, `categoria` (ferramentas, freelancers, impostos, cursos, outros), `descricao`, `valor`
- **projetos_avulsos**: `cliente_id`, `nome`, `valor`, `status`, `data`

### Financeiro pessoal (só dona)

- **financas_pessoais**: `data`, `tipo` (`entrada`, `saida`), `categoria` (pró-labore, contas fixas, lazer etc.), `descricao`, `valor`
- **metas_pessoais**: `nome`, `valor_meta`, `valor_atual`, `prazo`

### Roteiros (por cliente e por evento)

- **roteiros**: `cliente_id` ou `evento_id` (exatamente um), `titulo`, `formato` (reels, carrossel, stories, video, evento, outro), `status` (rascunho, em_revisao, aprovado, gravado, publicado), `data_prevista`, `texto`, `arquivo_storage`, `arquivo_nome`. RLS: quem enxerga o cliente ou o evento. Migração `010_roteiros.sql`. O cliente do portal não vê roteiros.
- Na interface a palavra "Casamento" não aparece: tudo é "Evento" (a coluna `tipo` continua no banco por compatibilidade).

### Portal do evento (link secreto, sem login) e cofre do Instagram

- `eventos` ganhou `token_portal`, `portal_ativo`, `recado_portal`. O cliente do evento abre `/evento/:token`, responde o **checklist do grande dia** (tabela `evento_perguntas`: `secao`, `pergunta`, `resposta`, `respondida_em`; 17 perguntas padrão para cobertura de stories criadas por gatilho, editáveis, e a dona/equipe atribuída pode acrescentar, editar e apagar) e envia o **acesso do Instagram**.
- Funções (RPC, anônimas): `portal_evento_dados`, `portal_evento_responder`, `portal_evento_acesso`. O cliente nunca lê tabelas.
- **Senha do Instagram nunca em texto puro:** o navegador do cliente tranca (RSA-OAEP 3072, WebCrypto) com a chave pública (`cofre_config`, linha única) e só o texto trancado vai para `evento_acessos` (`usuario`, `senha_cifrada`, `observacao`). A chave privada é gerada no navegador da dona, mostrada uma vez (copiar/baixar) e **nunca vai para o banco**; para ver a senha a dona cola a chave (fica só na aba, `sessionStorage`) e a senha se esconde em 30 s. `cofre_config` e `evento_acessos`: só dona (a equipe não vê). Perdeu a chave = o cliente envia de novo. A dona apaga o acesso depois do evento.
- Migração `012_portal_evento.sql`. Aba "Portal do cliente" na ficha do evento (link, recado, perguntas e respostas, cofre).

### Precificação (só dona)

- Tela `/app/precificacao` (menu Trabalho, escondida da equipe e rota bloqueada). **Minha hora**: renda desejada + custos fixos ÷ horas que viram trabalho pago (dias × horas × % faturável) = valor da hora; também imposto %, lucro %, adicional de fim de semana/feriado/urgência % e custo por km (tabela `precificacao_config`, linha única).
- **Orçamentos** (`orcamentos`: `nome`, `tipo` evento/mensal/avulso, `evento_id` e `cliente_id` opcionais, `status` rascunho/enviado/fechado/perdido, `dados` jsonb com linhas de tempo e custos, `horas_total`, `preco_sugerido`, `preco_final`). Modelos prontos: cobertura de evento, social media mensal, avulso.
- Conta (em `src/lib/precificacao.ts`, testada): `preço = custos / (1 − lucro% − imposto%)`, com custos = horas × valor da hora (+ adicional) + custos diretos. Mostra mínimo (sem lucro), recomendado e premium, o valor que a dona vai cobrar de verdade, lucro real, imposto e o que sobra por hora; alerta se estiver abaixo do custo. "Copiar proposta" gera texto para o cliente sem horas nem custos. Migração `013_precificacao.sql`.

### Eventos (trabalho de storymaker, separado dos clientes de social media)

Eventos têm clientes próprios (casais, aniversariantes, empresas), que **não** são linhas da tabela `clientes`, mas **contam como clientes**: aparecem na tela Clientes (seção "Clientes de eventos", somados na contagem) e entram em "Clientes ativos" do painel (negociação, contrato assinado ou em andamento).

- **eventos**: `nome` (casal ou cliente), `tipo` (`casamento`, `evento`, legado), `categoria` (texto livre escolhido pela dona: Casamento, Aniversário, Formatura, Corporativo... com sugestões; migração `011_categoria_evento.sql`), `data_evento`, `horario`, `local`, `contato`, `status` (`em_negociacao`, `contrato_assinado`, `em_andamento`, `realizado`, `entregue`, `cancelado`), `contrato_storage` (arquivo do contrato), `observacoes`
- **evento_checklist**: `evento_id`, `titulo`, `concluido`, `concluido_em`, `prazo`, `ordem`. Todo evento novo nasce com um checklist padrão editável: assinatura do contrato, pagamento da entrada, reunião de alinhamento, questionário ou lista de momentos importantes, visita ao local e cronograma do dia, confirmação final uma semana antes, cobertura do evento, entrega prévia, entrega final, pagamento do saldo
- **evento_parcelas** (só dona): `evento_id`, `descricao` (entrada, parcela 2, saldo), `vencimento`, `valor`, `status` (`a_vencer`, `pago`, `atrasado`), `pago_em`. O valor total do evento é a soma das parcelas
- **equipe_eventos**: `perfil_id`, `evento_id` (quais eventos cada pessoa da equipe acompanha)
- Arquivos: bucket privado `eventos`, caminho `<id do evento>/<arquivo>`, mesmas regras de acesso do evento

Segurança: dona vê e faz tudo. Equipe lê e edita só os eventos atribuídos (dados, contrato, checklist), nunca `evento_parcelas`. Ninguém sem login vê nada de eventos.

### Painel: atalhos e versículos (só dona)

- **atalhos**: `tipo` (`agenda`, `pinterest_quadro`, `pinterest_pin`), `titulo`, `url`, `ordem`. O banco só aceita endereços de `calendar.google.com/calendar/` para a agenda e de `pinterest.*` para os outros (pin precisa de número). O painel monta o iframe da agenda e o do pin a partir desses endereços, com `sandbox` e referrer só com a origem.
- **versiculos**: `referencia`, `texto` (versículos próprios da dona, somados aos que já vêm no código).
- Limites conhecidos: o Google Agenda privado só aparece para quem está logada no Google no mesmo navegador (não existe forma de "puxar" os eventos sem um servidor próprio), e o Pinterest não permite incorporar o site inteiro.
- **Equipe**: a dona cria o login no Supabase (Authentication > Users > Add user) e usa a tela Equipe para "liberar acesso" (função `liberar_equipe`, que só vincula o login existente ao papel `equipe` e nunca rebaixa a dona) e atribuir clientes e eventos.
- **relatorios**: um por cliente e por mês (índice único). A tela do cliente tem "Puxar os números do mês", que soma alcance, salvamentos, compartilhamentos e comentários dos posts publicados.

### Ideias e materiais

- **ideias**: `texto`, `tipo` (ideia de post, referência visual, filme, livro, trend, formato que funcionou), `cliente_id` (vazio = geral), `para_sontag` (ideia da própria agência: só a dona vê), `tags` (lista), `fonte` (link ou anotação), `post_id` (post que nasceu desta ideia), `criado_por`
- **ideia_arquivos**: `ideia_id`, `caminho_storage`, `nome`, `tipo` (`imagem`, `video`, `arquivo`), `ordem`. Bucket **privado** `ideias`, caminho `<id da ideia>/<arquivo>`, até 50 MB, sempre visto por link assinado
- **prompts** (só área interna, o cliente nunca vê): `cliente_id` (vazio = biblioteca geral, só a dona edita), `categoria` (`design`, `video`, `legenda`, `outro`), `titulo`, `ferramenta`, `texto` (o prompt ou a skill do Claude), `notas`. Fica dentro da aba Manual da marca de cada cliente, com botão Copiar
- **tarefas** (plano de ação e checklist): `cliente_id` (vazio = tarefa geral da agência, só a dona), `titulo`, `data`, `tipo` (`tarefa`, `reuniao`, `captacao`, `entrega`), `status` (`fazer`, `fazendo`, `feito`), `responsavel` (`agencia`, `cliente`), `visivel_cliente`, `material` (link http/https), `concluido_em`. Itens marcados como visíveis aparecem no Plano de ação do portal. Os itens **"com o cliente"** funcionam como checklist para ele: o cliente marca "já fiz" e escreve uma resposta (`resposta_cliente`, `respondida_em`, função `portal_tarefa_responder`, só nesses itens e só status e resposta; migração `015_checklist_cliente.sql`); a dona vê a resposta no plano de ação. Os itens da agência continuam somente leitura
- **modelos_checklist**: `nome`, `descricao`, `itens` (lista de `titulo`, `dias` depois da data base, `tipo`, `responsavel`, `visivel_cliente`). A função `aplicar_modelo` cria uma tarefa por item em um cliente. A dona cria e edita; dona e equipe aplicam. Vêm prontos "Onboarding de cliente" e "Rodada quinzenal". O mesmo recurso serve ao checklist dos eventos (Fase 3B)
- **materiais**: `cliente_id`, `titulo`, `tipo` (briefing, contrato, identidade, documento), `caminho_storage`
- **relatorios**: `cliente_id`, `mes`, `resumo`, `destaques`, `proximos_passos`

### Arquivos (Supabase Storage)

- Bucket `posts` (artes, vídeos e prints do feed, em `<cliente>/<post>/<arquivo>` e `<cliente>/feed/<arquivo>`). Envio e remoção só por quem enxerga o cliente (RLS). **O bucket é público por endereço**: quem tem o endereço exato abre o arquivo, mas os endereços têm códigos aleatórios longos, só aparecem para quem tem o link do portal e ninguém consegue listar os arquivos. Por isso, **nada sensível** (contratos, documentos) vai nesse bucket. Materiais do portal são só links.
- Outros buckets, privados: `eventos` (Fase 3B) e `contratos` (financeiro).

### Regras de segurança importantes

- O portal **não acessa as tabelas direto**. Ele só chama funções do Supabase (RPC) que recebem o `token_portal` e devolvem apenas os dados daquele cliente. Visitante anônimo não lê nenhuma tabela.
- O cliente só vê posts com status `em_aprovacao` ou posteriores, e nunca vê `prazo_interno`, financeiro, acessos nem histórico. As funções expõem só as colunas permitidas.
- O cliente pode criar `comentarios` e `aprovacoes` apenas nos posts do próprio token, por funções específicas. Ao aprovar, o status do post muda para `aprovado`; ao pedir ajuste, para `ajuste_pedido`.
- A dona pode desativar (`portal_ativo`) ou trocar o `token_portal` a qualquer momento. O token tem 32 caracteres ou mais, impossível de adivinhar.
- Imagens do portal usam links temporários assinados, gerados pelas funções.
- Equipe nunca acessa tabelas de financeiro (agência ou pessoal) nem `acessos_cliente`.

## Páginas

### Área interna (`/app`)

- **Painel** (`/app`): a página inicial é um resumo bonito. Saudação com a data; **versículo do dia** em destaque (lista de ~60 versículos da tradução Almeida dentro do código, um por dia, e a dona pode acrescentar os dela, que entram na mesma rotação); próximo evento com contagem regressiva; tarefas da semana; indicadores (clientes ativos, esperando aprovação, ajustes pedidos, tarefas atrasadas e, só para a dona, cobranças atrasadas e contratos vencendo em 30 dias); próximos 7 dias de posts; e, só para a dona, **Minha agenda** (Google Agenda incorporado). O Pinterest saiu da página inicial (a tabela `atalhos` continua aceitando os tipos antigos, sem uso na interface).
- **Clientes** (`/app/clientes`): lista de clientes com status e cor de destaque
- **Cliente** (`/app/clientes/:id`) com abas:
  - **Ficha**: dados básicos, acessos, histórico
  - **Calendário**: calendário do mês inteiro do cliente (ver abaixo)
  - **Manual da marca**: os 8 capítulos e as metas
  - **Aprovações**: rodadas quinzenais. Cria a rodada, adiciona posts (arrasta as imagens do carrossel ou o vídeo, escreve a legenda), vê o feed como o cliente verá, envia a rodada de uma vez e acompanha esperando, ajustes pedidos e aprovados
  - **Roteiros**: roteiros do cliente (título, formato, status, data prevista, texto e arquivo anexo de até 50 MB, bucket privado `roteiros`)
  - **Recebimentos** (só dona): quanto já entrou em cada mês do cliente (recebido de previsto, barra, total do ano), cobranças com situação (recebido, recebido em parte, atrasado, a receber), "Marcar como recebido" com valor, data e forma, "Nova cobrança do mês" e **subir a nota** de cada pagamento (PDF, imagem ou XML, até 20 MB, link assinado), com aviso de pagamentos sem nota. A Visão geral do financeiro usa o valor recebido.
  - **Portal**: link secreto, recado, prints do feed atual e links de materiais
  - **Materiais** e **Relatórios**
- **Ideias** (`/app/ideias`) e **Tarefas** (`/app/tarefas`, com os modelos de checklist) já existem desde a Fase 3. Na ficha do cliente há também as abas **Plano de ação** e, no Manual da marca, a seção **Prompts e skills**.
- **Calendário geral** (`/app/calendario`): todos os clientes no mesmo mês, **mais os clientes de eventos no dia do evento** (marcador tracejado que abre o evento; caixa para mostrar/esconder; somem quando há filtro de cliente ou tag), filtro por cliente e por tag, e uma visão em quadro (kanban) por status
- **Financeiro** (`/app/financeiro`, só dona, link do menu escondido para a equipe e rota bloqueada). Duas áreas separadas: **Agência** (`/app/financeiro`, com Visão geral, Cobranças, Contratos, Despesas e Avulsos) e **Pessoal** (`/app/financeiro/pessoal`: lançamentos, metas e resumo do mês). A Visão geral mostra previsto, recebido, a receber, atrasado, despesas e resultado do mês, receita recorrente dos contratos, gráfico de recebido contra despesas dos últimos 6 meses, cobranças atrasadas e contratos vencendo em 30 dias. Ao abrir, a função `marcar_atrasadas` converte o que venceu e não foi pago em "atrasado". A função `gerar_cobrancas` cria as mensalidades de um contrato (sem duplicar, no dia de vencimento, ajustando meses curtos). Contrato assinado vai para o bucket privado `contratos`
- **Ideias** (`/app/ideias`): captura rápida (um campo no topo, ótimo no celular), filtros por tipo, cliente e tag, botão "Virar post" que cria o post com status `ideia`
- **Eventos** (`/app/eventos`): lista dos eventos por data, com a próxima data em destaque e o progresso do checklist (ex.: 4 de 10). Ficha do evento (`/app/eventos/:id`) com abas **Dados e contrato** (upload do contrato, data, local, contato, status), **Checklist** (marcar, editar, adicionar itens, prazo, o que está atrasado), **Roteiros** (mesmo recurso da aba do cliente) e **Pagamentos** (parcelas e vencimentos, só dona)
- **Equipe** (`/app/equipe`, só dona): convidar pessoas e definir quais clientes cada uma atende

### Calendário mensal do cliente (a tela mais importante)

- Grade do mês, um quadrado por dia.
- Cada dia mostra o post planejado: miniatura da arte, formato, tema e as tags coloridas.
- Cor ou selo de status bem visível.
- Depois de publicado, o post ganha o selo de desempenho: **Performando bem** (verde musgo), **Na média** (cinza) ou **Abaixo do esperado** (marrom). Os selos também têm texto, nunca só cor.
- Clicar no dia abre o post com todos os campos, artes, comentários e números.
- Filtro por tag e por status. No celular, a grade vira uma lista por dia.

### Portal do cliente (`/portal/:token`, sem login)

- **Início**: posts esperando aprovação, próximos posts da semana, recado da Izadora
- **Aprovações**: feed por rodada, com cada post como um cartão de Instagram (cabeçalho do perfil, carrossel deslizável com pontinhos, vídeo com player ou link, legenda completa), barra de progresso da rodada e botões **Aprovar**, **Pedir ajuste** (comentário obrigatório) e **Só comentar**
- **Prévia do feed**: grade de 3 colunas no estilo do Instagram, com os posts aprovados e agendados por cima dos prints do feed atual
- **Calendário**: o mesmo calendário mensal, com tags, selos de desempenho e números, sem status internos de produção
- **Plano de ação**: tarefas, reuniões, captações e entregas marcadas como visíveis, com data, quem faz ("Com você" ou "Com a Sontag") e material; os itens "Com você" podem ser marcados como feitos e respondidos, os outros são só para ler
- **Manual da marca**: leitura do manual, em layout editorial, com botão de exportar em PDF (pode ser via impressão do navegador com CSS de impressão)
- **Materiais** e **Relatórios**

### Login

- `/entrar`: login por e-mail e senha (Supabase Auth), só para a dona e a equipe. Depois do login, vai para `/app`.
- A equipe é convidada pela dona; ninguém se cadastra sozinho.
- Clientes não fazem login: a dona copia o link do portal na ficha do cliente e envia a ele.

## Fases de construção

Construa uma fase por vez. Cada fase precisa estar funcionando e publicada antes da próxima.

### Fase 0: preparação

- Criar o projeto (Vite + React + TypeScript + Tailwind) e a estrutura de pastas.
- Me guiar, passo a passo, para criar as contas gratuitas no **Supabase**, **GitHub** e **Netlify**, e para conectar o GitHub ao Netlify.
- Configurar `.env`, `.gitignore` e `_redirects`.
- Publicar uma página inicial simples no Netlify para confirmar que tudo está conectado.

### Fase 1: base interna

- Login, perfis e papéis com RLS.
- Layout da área interna com a identidade visual.
- Clientes: lista, cadastro, edição e ficha.
- Manual da marca com os 8 capítulos e as metas.
- **Pronto quando:** eu consigo entrar, cadastrar meus clientes atuais e preencher o manual de um deles.

### Fase 2: calendário editorial

- Posts com todos os campos, upload de artes, tags e status.
- Calendário mensal de cada cliente, calendário geral e quadro por status.
- Selo e números de desempenho.
- **Pronto quando:** eu consigo montar o mês inteiro de um cliente e marcar o desempenho dos posts publicados.

### Fase 3: portal do cliente e aprovação

- Link secreto por cliente (copiar, desativar, trocar), funções RPC do portal e RLS.
- Páginas do portal, aprovação com registro de data e hora, comentários e prévia do feed.
- **Pronto quando:** um cliente de teste abre o link, vê só os posts dele, aprova um e pede ajuste em outro, e eu vejo isso na área interna.

### Fase 3B: eventos e casamentos

- Eventos, ficha, upload do contrato, checklist padrão editável, parcelas (só dona) e atribuição da equipe, com RLS.
- **Pronto quando:** eu cadastro um casamento com data, subo o contrato, marco o checklist e registro as parcelas, e uma conta de equipe de teste vê o evento atribuído mas não os valores.

### Fase 4: financeiro

- Financeiro da agência (contratos, cobranças, despesas, avulsos, indicadores do mês). A receita prevista e recebida inclui as parcelas dos eventos (`evento_parcelas`), e `marcar_atrasadas` cobre cobranças e parcelas.
- Financeiro pessoal (lançamentos, metas, resumo).
- **Pronto quando:** eu vejo receita prevista e recebida do mês, cobranças atrasadas e meu resumo pessoal, e uma conta de equipe de teste não consegue ver nada disso.

### Fase 5: ideias, painel e relatórios

- Banco de ideias com captura rápida e "Virar post".
- Painel geral da área interna.
- Relatórios mensais por cliente.
- Acesso de equipe (convite e clientes atribuídos).

## Decisões em aberto (pergunte antes de decidir)

- Como o cliente será avisado de posts para aprovar: e-mail, WhatsApp ou os dois.
- Prazo padrão para o cliente responder antes de um lembrete.
- Endereço final do site (por exemplo, um subdomínio da Sontag Media).
