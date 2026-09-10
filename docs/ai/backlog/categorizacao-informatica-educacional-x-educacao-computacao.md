# Categorização do catálogo — Informática Educacional × Educação em Computação

Documento de planejamento (nenhuma linha de código deste plano está
implementada ainda). Mesmo formato dos demais docs em `docs/ai/backlog/`
(User Story / Descrição / Rastreabilidade / Prioridade / Critérios de
Aceite / Dados-Eventos), pra poder ser colado direto no backlog externo.
Identificador `CC1` é só referência interna deste arquivo — renumere ao
integrar.

## Contexto

O produto distingue duas coisas que hoje convivem sem rótulo explícito no
catálogo:

- **Informática educacional** — o computador/software é RECURSO pra
  ensinar uma disciplina da educação básica (Matemática, Ciências etc.). O
  aluno aprende COM o auxílio da tecnologia; o professor continua mediador
  do conteúdo curricular.
- **Educação em computação** — o conteúdo é a própria tecnologia:
  pensamento computacional, lógica, algoritmos, letramento digital,
  entendimento de ferramentas/hardware. O aluno deixa de só consumir/usar e
  passa a entender e criar.

Hoje o catálogo real da plataforma é:

| Conteúdo | Tabela | O que ensina | Categoria (proposta) |
|---|---|---|---|
| `angulos_formas` (geometria, editor de blocos) | `topics` | Ângulos/formas — Matemática | Informática educacional |
| `water_state` (estados da matéria, editor de blocos) | `topics` | Mudança de estado físico — Ciências | Informática educacional |
| "Fábrica de Pedaços Iguais" (mini jogo sério) | `mini_game_levels` | Frações — Matemática | Informática educacional |
| "Ferramentas do Mundo do Trabalho" (mini jogo sério, **novo**, ver `mini-jogo-ferramentas-mundo-trabalho.md`) | `mini_game_levels` (novo `gameKey`) | Identificar tecnologia/ferramenta digital adequada a um problema — BNCC Computação | **Educação em computação** |

Importante: a categoria não depende de qual MOTOR renderiza o conteúdo
(editor de blocos vs. mini jogo sério) nem do `Topic.domain`
(`blocks_turtle`/`water_state`, que decide qual TELA abre) — os três
conteúdos de blocos/mini jogo de conteúdo atuais ensinam Matemática/
Ciências (informática educacional), mesmo usando lógica de programação
como veículo; o que muda de categoria é o ASSUNTO em si (uma disciplina da
educação básica vs. a própria tecnologia).

## Rastreabilidade

⚠️ Sem respaldo direto no mapeamento sistemático da literatura (RQ1-RQ6) —
é um enquadramento curricular do produto, alinhado à Base Nacional Comum
Curricular (BNCC), Itinerário Formativo de Computação do Ensino Médio:
**Competência Geral de Computação** — "Analisar situações do mundo
contemporâneo, selecionando técnicas computacionais apropriadas para a
solução de problemas" — e a habilidade **EM13CO09** — "Identificar
tecnologias digitais, sua presença e formas de uso, nas diferentes
atividades no mundo do trabalho", que é a habilidade-alvo do novo mini
jogo (ver doc irmã). Sinalizado aqui porque a regra não-negociável 10 do
projeto pede rastreabilidade explícita mesmo quando a base não é a
literatura de TEA.

## Prioridade

Alta — é pré-requisito de organização pra qualquer conteúdo novo de
"educação em computação" (o mini jogo desta frente é o primeiro) ter um
lugar coerente no catálogo, em vez de ser só mais um item solto na seção
"Mini jogos" do `SubjectSelector`.

## Decisão de design recomendada (schema)

Mesma lógica já usada pra `User.role`/`Topic.domain` — "conjunto pequeno e
fechado de valores é uma COLUNA, nunca uma tabela de junção nem um enum
espalhado em código de tela":

- Novo enum compartilhado `ContentCategory` (`common/enums/`, mesmo padrão
  de `EventCategory`/`Role`): `'informatica_educacional' |
  'educacao_computacao'`.
- **`Topic.category`** (varchar, default `'informatica_educacional'` —
  todo tópico de blocos cadastrado até hoje ensina uma disciplina da
  educação básica) — migration com `UPDATE` explícito classificando
  `angulos_formas`/`water_state`, mesmo cuidado já documentado pra `seed
  não aciona @BeforeInsert` (ver coding-rule.md).
- **`MiniGameLevel.category`** (mesmo enum) — como as 3 linhas de um mesmo
  jogo (`conceptId`) sempre compartilham categoria, é redundância barata
  (mesmo racional de outras colunas denormalizadas no projeto), evita criar
  uma tabela "família de mini jogo" só pra isto agora. "Fábrica de Pedaços
  Iguais" → `informatica_educacional`; "Ferramentas do Mundo do Trabalho" →
  `educacao_computacao`.
- **Sem tabela nova.** Nenhum dos dois catálogos (`topics`,
  `mini_game_levels`) precisa de uma 3ª tabela de "categoria" — dois
  valores fechados cabem numa coluna, e a UI só precisa agrupar por ela.

## Critérios de Aceite

- Todo `Topic` e todo `MiniGameLevel` tem uma categoria explícita — nunca
  inferida do nome/slug em tempo de tela.
- `angulos_formas`/`water_state`/"Fábrica de Pedaços Iguais" ficam
  classificados como Informática Educacional; a nova trilha (mini jogo
  desta frente) fica classificada como Educação em Computação.
- `SubjectSelector` (aluno) mostra as duas categorias como seções visuais
  distintas, com título em linguagem simples (nunca os termos técnicos
  "informática educacional"/"educação em computação" crus pro aluno —
  regra não-negociável 9 aplicada também à linguagem do aluno, não só à do
  professor) — ex.: "Matérias da escola" vs. "Sobre tecnologia". Continua
  respeitando "no máximo 1 paleta nova por tela" (regra 2): as duas seções
  já existem hoje como blocos visuais separados (tópicos × "Mini jogos"),
  então isto é reclassificar o que já é visualmente separado, não
  introduzir uma 3ª área nova.
- Tela(s) de autoria do professor (Modo Template de desafio, configuração
  de mini jogo) exibem a mesma categoria ao configurar conteúdo — só
  leitura por enquanto (categoria é curada via seed/migration, mesma
  decisão já tomada pra `blocks`/`subjects`/`topics`: "sem autoria de
  toolbox LIVRE pelo professor").
- Painel do admin (relatórios 6.5/6.2) pode filtrar/agrupar por categoria —
  não obrigatório nesta entrega, mas o campo precisa existir de forma que
  isso seja só uma query nova, nunca uma migration futura.
- Documentação (`docs/ai/modules/backend.md`/`frontend.md`) explica a
  distinção e onde um conteúdo futuro deve entrar, com a tabela de
  classificação atual.

## Dados/Eventos

Nenhum evento novo — isto é metadado de catálogo (curricular), não
interação de aluno. Nenhuma emissão em `interaction_events` muda.

## Riscos e trade-offs

- Duas categorias fixas podem não bastar pra sempre (ex.: um futuro "letramento
  midiático" que não é nem uma coisa nem outra) — aceitável pro MVP, mesmo
  risco já aceito por `Topic.domain` ("conjunto pequeno e fechado"); se
  crescer, a migração natural é para uma tabela de categorias curada
  (mesmo caminho que `Subject`/`blocks` já trilharam), não um enum enorme.
- Reclassificar visualmente o `SubjectSelector` em 2 seções nomeadas exige
  cuidado de copy pra não soar mais "técnico" do que as duas frases atuais
  ("Onde você quer entrar?"/"Mini jogos") — validar linguagem com
  pedagogo/professor antes de fechar o texto final das duas seções.
