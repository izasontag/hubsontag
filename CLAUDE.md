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

Um sistema web com dois ambientes, cada um com login próprio:

1. **Área interna:** onde eu (e, no futuro, minha equipe) gerencio clientes, calendários editoriais, financeiro e ideias.
2. **Portal do cliente:** onde cada cliente vê só o que é dele, aprova posts, acompanha o calendário e consulta o manual da marca.

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
| Hospedagem | Netlify (publica sozinho a cada envio para o GitHub) |

- Segurança dos dados com **Row Level Security (RLS)** do Supabase em todas as tabelas. Nenhuma tabela fica sem RLS.
- Migrações do banco em arquivos SQL dentro de `supabase/migrations/`, para eu poder rodar no painel do Supabase.
- Para o Netlify funcionar com as rotas do React, incluir `public/_redirects` com `/* /index.html 200`.
- Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Nunca usar a chave `service_role` no front-end.

## Identidade visual

- Tons sóbrios: cinza, marrom e verde musgo.
- Cores base:
  - Fundo: `#EDEBE7`
  - Superfície (cartões): `#F7F6F3`
  - Texto principal: `#2B2724`
  - Texto secundário: `#5E5953`
  - Marrom: `#6B4F3A`
  - Verde musgo: `#5C6B47`
  - Linhas e bordas: `#C9C3BA`
- Títulos em fonte serifada (Cormorant Garamond, do Google Fonts). Textos em Helvetica (`'Helvetica Neue', Helvetica, Arial, sans-serif`).
- Cantos pouco arredondados (2 a 4 px), muito respiro, sem gradientes, sem emojis na interface.
- Cada cliente tem uma **cor de destaque** própria, usada nos detalhes do portal e do manual da marca dele.
- Contraste de texto de pelo menos 4.5:1. Botões com no mínimo 44 px de altura.

## Níveis de acesso

| Papel | Vê e faz |
| --- | --- |
| `dona` (eu) | Tudo, incluindo o financeiro da agência e o financeiro pessoal |
| `equipe` | Clientes em que trabalha, calendários, manuais e banco de ideias desses clientes. **Nunca** vê financeiro |
| `cliente` | Só o próprio portal: posts a partir do status "Em aprovação", calendário, manual da marca, materiais e relatórios |

O papel fica na tabela `perfis`. As regras de RLS devem refletir exatamente esta tabela.

## Modelo de dados

Nomes de tabelas e colunas em português, sem acento, em `snake_case`. Toda tabela tem `id` (uuid), `criado_em` e `atualizado_em`.

### Pessoas e acesso

- **perfis**: `id` (= usuário do Supabase Auth), `nome`, `email`, `papel` (`dona`, `equipe`, `cliente`), `cliente_id` (preenchido só para clientes)
- **equipe_clientes**: `perfil_id`, `cliente_id` (quais clientes cada pessoa da equipe atende)

### Clientes

- **clientes**: `nome`, `instagram`, `nicho`, `contato`, `status` (`ativo`, `pausado`, `encerrado`), `data_inicio`, `cor_destaque`, `observacoes`
- **manual_marca** (um por cliente): `cliente_id` e um campo por capítulo, em texto ou JSON:
  - `essencia` (quem é, propósito, missão, história)
  - `posicionamento` (promessa, diferenciais)
  - `publico` (persona, dores, desejos, objeções)
  - `estrategia` (objetivo do perfil, pilares com percentual, formatos prioritários, frequência)
  - `tom_voz` (como fala, palavras que usa, palavras que evita, exemplos de legendas)
  - `identidade_visual` (cores com código, fontes, logos, exemplos)
  - `regras` (o que nunca pode aparecer, regras do conselho profissional como OAB, CFO, CFM)
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
- **post_midias**: `post_id`, `caminho_storage`, `ordem` (artes do carrossel ou capa do vídeo)
- **tags**: `nome`, `cor`, `cliente_id` (vazio = tag geral)
- **post_tags**: `post_id`, `tag_id`
- **comentarios**: `post_id`, `autor_id`, `texto`, `referencia` (opcional: qual arte ou trecho da legenda)
- **aprovacoes**: `post_id`, `autor_id`, `decisao` (`aprovado`, `ajuste_pedido`), `mensagem`, `criado_em` (registro permanente de quem aprovou e quando)
- **feed_atual**: `cliente_id`, `caminho_storage`, `ordem` (prints dos posts já publicados, para a prévia do feed)

### Financeiro da agência (só dona)

- **contratos**: `cliente_id`, `plano`, `escopo` (posts, reels e stories por mês), `valor_mensal`, `inicio`, `renovacao`, `arquivo_storage`
- **cobrancas**: `contrato_id` ou `projeto_id`, `vencimento`, `valor`, `forma_pagamento`, `status` (`a_vencer`, `pago`, `atrasado`), `pago_em`
- **despesas**: `data`, `categoria` (ferramentas, freelancers, impostos, cursos, outros), `descricao`, `valor`
- **projetos_avulsos**: `cliente_id`, `nome`, `valor`, `status`, `data`

### Financeiro pessoal (só dona)

- **financas_pessoais**: `data`, `tipo` (`entrada`, `saida`), `categoria` (pró-labore, contas fixas, lazer etc.), `descricao`, `valor`
- **metas_pessoais**: `nome`, `valor_meta`, `valor_atual`, `prazo`

### Ideias e materiais

- **ideias**: `texto`, `tipo` (ideia de post, referência visual, filme, livro, trend, formato que funcionou), `cliente_id` (vazio = geral), `para_sontag` (sim/não), `tags` (lista), `fonte` (link ou anotação), `post_id` (post que nasceu desta ideia)
- **materiais**: `cliente_id`, `titulo`, `tipo` (briefing, contrato, identidade, documento), `caminho_storage`
- **relatorios**: `cliente_id`, `mes`, `resumo`, `destaques`, `proximos_passos`

### Arquivos (Supabase Storage)

- Bucket `posts` (artes), `materiais`, `feed`, `contratos`. Acesso por RLS seguindo os mesmos papéis.

### Regras de segurança importantes

- Cliente só lê linhas com o próprio `cliente_id`.
- Cliente só vê posts com status `em_aprovacao` ou posteriores, e nunca vê `prazo_interno`. Para isso, o portal lê de uma **view** (`portal_posts`) que expõe só as colunas permitidas.
- Cliente pode criar `comentarios` e `aprovacoes` apenas nos próprios posts. Ao aprovar, o status do post muda para `aprovado`; ao pedir ajuste, para `ajuste_pedido`.
- Equipe nunca acessa tabelas de financeiro (agência ou pessoal) nem `acessos_cliente`.

## Páginas

### Área interna (`/app`)

- **Painel** (`/app`): posts da semana, posts esperando aprovação, ajustes pedidos, cobranças atrasadas (só dona), contratos vencendo em 30 dias (só dona)
- **Clientes** (`/app/clientes`): lista de clientes com status e cor de destaque
- **Cliente** (`/app/clientes/:id`) com abas:
  - **Ficha**: dados básicos, acessos, histórico
  - **Calendário**: calendário do mês inteiro do cliente (ver abaixo)
  - **Manual da marca**: os 8 capítulos e as metas
  - **Materiais** e **Relatórios**
- **Calendário geral** (`/app/calendario`): todos os clientes no mesmo mês, filtro por cliente e por tag, e uma visão em quadro (kanban) por status
- **Financeiro** (`/app/financeiro`, só dona): abas Agência (contratos, cobranças, despesas, avulsos, indicadores) e Pessoal (lançamentos, metas, resumo do mês)
- **Ideias** (`/app/ideias`): captura rápida (um campo no topo, ótimo no celular), filtros por tipo, cliente e tag, botão "Virar post" que cria o post com status `ideia`
- **Equipe** (`/app/equipe`, só dona): convidar pessoas e definir quais clientes cada uma atende

### Calendário mensal do cliente (a tela mais importante)

- Grade do mês, um quadrado por dia.
- Cada dia mostra o post planejado: miniatura da arte, formato, tema e as tags coloridas.
- Cor ou selo de status bem visível.
- Depois de publicado, o post ganha o selo de desempenho: **Performando bem** (verde musgo), **Na média** (cinza) ou **Abaixo do esperado** (marrom). Os selos também têm texto, nunca só cor.
- Clicar no dia abre o post com todos os campos, artes, comentários e números.
- Filtro por tag e por status. No celular, a grade vira uma lista por dia.

### Portal do cliente (`/portal`)

- **Início**: posts esperando aprovação, próximos posts da semana, recado da Izadora
- **Aprovações**: galeria dos posts em aprovação, com botões **Aprovar** e **Pedir ajuste** e campo de comentário
- **Prévia do feed**: grade de 3 colunas no estilo do Instagram, com os posts aprovados e agendados por cima dos prints do feed atual
- **Calendário**: o mesmo calendário mensal, com tags, selos de desempenho e números, sem status internos de produção
- **Manual da marca**: leitura do manual, em layout editorial, com botão de exportar em PDF (pode ser via impressão do navegador com CSS de impressão)
- **Materiais** e **Relatórios**

### Login

- `/entrar`: login por e-mail com link mágico ou senha (Supabase Auth). Depois do login, a pessoa vai para `/app` ou `/portal` conforme o papel.
- Clientes e equipe são convidados pela dona; ninguém se cadastra sozinho.

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

- Convite de clientes, view `portal_posts` e RLS do portal.
- Páginas do portal, aprovação com registro de data e hora, comentários e prévia do feed.
- **Pronto quando:** um cliente de teste entra, vê só os posts dele, aprova um e pede ajuste em outro, e eu vejo isso na área interna.

### Fase 4: financeiro

- Financeiro da agência (contratos, cobranças, despesas, avulsos, indicadores do mês).
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
