# Mini jogo — "Ferramentas do Mundo do Trabalho" (2º mini jogo de conteúdo)

Documento de planejamento (nenhuma linha de código deste plano está
implementada ainda). Mesmo formato de
`docs/ai/backlog/mini-jogo-fabrica-pedacos-iguais.md` (1º mini jogo de
conteúdo) — este é o 2º, construído sobre a MESMA infraestrutura genérica
(MJ1-MJ8, ver `docs/ai/backlog/mini-jogos-serios.md`), pertencente à
categoria **Educação em Computação** (ver
`categorizacao-informatica-educacional-x-educacao-computacao.md`), não a
uma disciplina da educação básica.

## Contexto

BNCC, Itinerário Formativo de Computação do Ensino Médio:

- **Competência Geral de Computação:** "Analisar situações do mundo
  contemporâneo, selecionando técnicas computacionais apropriadas para a
  solução de problemas."
- **Habilidade EM13CO09:** "Identificar tecnologias digitais, sua presença
  e formas de uso, nas diferentes atividades no mundo do trabalho."

Objetivo pedagógico (texto de produto): conduzir o estudante a perceber
quais ferramentas estão disponíveis no universo laboral e como cada uma
resolve um problema específico — ferramentas de produtividade (fluxo de
projeto, organização de processos), planilha eletrônica (controles,
gráficos), impressora 3D (protótipos), editoração gráfica, banco de dados
etc. — e também a identificar hardwares diferentes, sua necessidade e
efetividade por contexto (custo × benefício, condições de instalação,
acessibilidade). Exemplo do próprio texto de produto: "ser capaz de
identificar quais ferramentas resolveriam cada problema; exemplo do
trator, impressora 3D, ferramentas de produtividade, mapa mental."

Diferente de `angulos_formas`/`water_state`/"Fábrica de Pedaços Iguais"
(todos ensinam uma disciplina da educação básica usando computação como
veículo), este jogo ensina SOBRE tecnologia — o aluno analisa cenários do
mundo do trabalho e escolhe/avalia a ferramenta digital adequada. É por
isso que pertence à categoria Educação em Computação, não Informática
Educacional (ver doc irmã).

Não existe hoje um `Topic`/desafio de blocos equivalente — o vínculo MJ8
(`conceptId` compartilhado) fica como infraestrutura pronta e não-usada
aqui, mesma situação já documentada pra frações.

## Mecânica: "jogo de ligar" + verdadeiro ou falso

Dois modos de interação combinados na mesma rodada, nunca dois jogos
separados:

1. **Ligar (matching)** — o aluno recebe um conjunto de "cenários/
   problemas" do mundo do trabalho (ex.: "Preciso imprimir um protótipo
   físico de uma peça", "Preciso organizar o fluxo de tarefas de um
   projeto com o time", "Preciso lavrar um grande terreno agrícola",
   "Preciso estruturar visualmente as ideias de um brainstorm") e um
   conjunto de "ferramentas/tecnologias" (impressora 3D, ferramenta de
   produtividade/gestão de projeto, trator, mapa mental digital, planilha
   eletrônica, software de banco de dados, editor gráfico). Liga cada
   cenário à ferramenta correta.
   - **Interação por seleção, nunca drag-and-drop de precisão (MJ4):**
     tocar/clicar no cartão de cenário, depois no cartão de ferramenta,
     confirma o par — nunca arrastar-e-soltar fino. Um par já feito pode
     ser desfeito (reversível, sem penalidade).
2. **Verdadeiro ou falso** — depois (ou intercalado) dos pares, o aluno
   avalia afirmações curtas sobre uso/custo-benefício/contexto de uma
   ferramenta (ex.: "Uma impressora 3D é a melhor escolha pra imprimir 500
   panfletos" → falso; "Uma planilha eletrônica pode gerar gráficos pra
   entender melhor um cenário" → verdadeiro). Reforça a parte da
   habilidade sobre "custo × benefício, condições de instalação,
   acessibilidade" que o "ligar" sozinho não cobre (ligar só testa "qual
   ferramenta resolve X", não "por que ela é/não é a melhor escolha").

### Por que os dois modos juntos, não um jogo de ligar puro

O texto da habilidade EM13CO09 pede tanto identificar A ferramenta certa
(matching cobre isso) quanto avaliar adequação/custo-benefício (uma
pergunta binária sobre uma alegação de uso cobre isso sem exigir um
formulário de "compare 3 opções" — mecânica mais pesada cognitivamente,
RQ4 sobrecarga/abstração 39,13%). Os dois modos reaproveitam a MESMA
paleta pequena de cartões (cenário/ferramenta/afirmação), nunca introduzem
uma 2ª interface dentro do mesmo nível.

## Estrutura em 3 níveis (Use → Modify → Create)

Mesmo padrão de `mini_game_levels` (`stage`+`position`) das frações:

1. **Use** — rodada pronta e correta: todos os pares já ligados
   corretamente e todas as afirmações V/F já respondidas certo. Aluno só
   observa/"roda" a rodada (mesmo racional do Use de blocos — objetivo é
   apresentar o vocabulário de ferramentas antes de exigir qualquer
   julgamento do aluno).
2. **Modify** — rodada quase certa: 1 par errado (cenário ligado à
   ferramenta errada) e/ou 1 afirmação V/F marcada errada por engano.
   Aluno identifica e corrige só o(s) item(ns) errado(s) — estrutura
   travada (não pode adicionar/remover cenário/ferramenta/afirmação, só
   corrigir o vínculo/resposta already existente), mesmo racional de
   `applyModifyFieldLocking`/"Repetir corte" nas frações (só o parâmetro
   errado é editável, a estrutura toda não vira uma paleta livre).
3. **Create** — cenários, ferramentas (com distratores — ferramentas sem
   par correto na rodada) e afirmações vêm soltos; aluno monta os pares e
   responde as afirmações do zero, com "Novo cenário" sorteando outro
   conjunto de um pool configurável.

## Nada é gabarito oculto

Mesmo racional de "Fábrica de Pedaços Iguais" (ao contrário de
`water_state`/`expectedModel`): o par correto e a resposta V/F correta são
sempre visíveis no `config` que o backend serve — a validação de acerto
roda no cliente. Não há necessidade de esconder isso do aluno; o jogo é
sobre praticar a associação, não sobre resistir a uma tentativa de burlar
o sistema.

## Config sugerido (`mini-game-level-config.interface.ts`, dado, não código fechado)

```ts
export type WorkToolsStage = 'use' | 'modify' | 'create';

export interface WorkToolsScenario {
  id: string;
  label: string; // "Preciso imprimir um protótipo físico de uma peça"
  icon: string;  // emoji, mesmo "sistema de ícone" já usado no projeto
}

export interface WorkToolsTool {
  id: string;
  label: string; // "Impressora 3D"
  icon: string;
}

export interface WorkToolsStatement {
  id: string;
  text: string;      // "Uma impressora 3D é a melhor escolha pra imprimir 500 panfletos"
  isTrue: boolean;    // gabarito visível no config (nada oculto)
}

export interface WorkToolsLevelConfig {
  scenarios: WorkToolsScenario[];
  tools: WorkToolsTool[];              // pode ter distratores (sem par correto)
  correctMatches: { scenarioId: string; toolId: string }[];
  statements: WorkToolsStatement[];
  // Só 'use'/'modify': estado pré-montado da rodada. Em 'modify', 1 entrada
  // de presetMatches ou presetStatementAnswers diverge do gabarito de propósito.
  presetMatches?: { scenarioId: string; toolId: string }[];
  presetStatementAnswers?: Record<string, boolean>;
  // Só 'create': pool de cenários extras sorteados em "Novo cenário"
  // (mesmo racional de fractionPool).
  scenarioPool?: WorkToolsScenario[];
}
```

Mesma decisão já registrada pra frações: schema tipado só em código de
aplicação (`jsonb` livre no banco), curado via seed/migration — sem
autoria de conteúdo livre pelo professor nesta fase (professor configura
CAMPOS específicos, nunca o JSON, ver "Configurável pelo professor"
abaixo).

## Infra necessária: suporte a múltiplos "tipos" de mini jogo

`MinigamesService.updateLevelConfig` hoje está **hardcoded** pro shape de
`FractionsFactoryLevelConfig` (valida `theme`/`targetFraction`/
`fractionPool` diretamente, sem dispatch por tipo de jogo) — porque até
agora só existia 1 jogo. Isto é o mesmo ponto de inflexão que motivou o
handler-registry de `challenge-templates` (4.2, "por que dado+handler-
por-key, não 100% dado"): com um 2º jogo de conteúdo real, a validação
precisa saber QUAL jogo está validando.

Proposta mínima consistente com o padrão já estabelecido:

- **`MiniGameLevel.gameKey`** (varchar, ex.: `'fractions_factory'` |
  `'work_tools_match'`) — chave pequena e fechada (mesmo racional de
  `Topic.domain`), curada via seed. Migration faz `UPDATE` explícito nas 3
  linhas de frações existentes pra `'fractions_factory'` antes de tornar a
  coluna `NOT NULL`.
- **Registro de validador por `gameKey`** (`minigames/validators/
  <game-key>.validator.ts` + `validator-registry.ts`), MUITO mais simples
  que `ChallengeTemplateHandler` — aqui não existe "traduzir parâmetros de
  formulário em config" (o professor edita campos que já são o formato
  final, ver seed abaixo), só `validateAndApplyUpdate(level, dto)`. Cada
  jogo novo = 1 arquivo de validador + 1 linha no registry, nenhum outro
  arquivo do módulo muda (mesmo compromisso já feito em `template-
  registry.ts`: "nenhum outro arquivo... muda").
- `UpdateMiniGameLevelDto` passa a aceitar os campos de QUALQUER jogo
  suportado como opcionais (mesmo racional de DTOs de template) — o
  validador do `gameKey` da linha decide quais campos fazem sentido pra
  ELE, ignorando os demais.

Isto é trabalho de infraestrutura, não de conteúdo — pode (e deve) ser
uma issue própria antes do conteúdo do jogo em si.

## Configurável pelo professor

`GET/PATCH /teacher/minigames/levels` (mesmo endpoint, dispatch por
`gameKey` reaproveitando o novo registry) — edita, por nível
(Use/Modify/Create): quais cenários/ferramentas aparecem, o(s) erro(s)
proposital(is) do nível Modify, e o pool de cenários sorteados no Create.
Nunca "edite o JSON de config" (regra não-negociável 9) — campos
nomeados, com mensagens de erro descritivas (ex.: "todo cenário precisa de
uma ferramenta correta cadastrada no pool de ferramentas da rodada").

Tela: reaproveita `TeacherMiniGameSettings.tsx` (adiciona uma seção/aba
por `gameKey`, mesmo componente de formulário, campos diferentes por
jogo) — nunca uma tela nova do zero só pra este jogo.

## Admin recebe métricas — sem trabalho novo

`MetricsAdminMiniGameService`/`GET /metrics/admin/minigames[/:levelId]`
já são inteiramente genéricos sobre `mini_game_levels`/`miniGameLevelId`
(nenhuma menção a frações no código do serviço — confirmado por leitura
direta de `metrics-admin-minigame.service.ts`) — o novo jogo aparece nessas
telas automaticamente assim que emitir os eventos padrão
(`minigame_scene_started`/`minigame_completed`/`minigame_abandoned` etc.),
sem nenhuma mudança de código. **Não precisa de issue própria.**

## Dados/Eventos (MJ7 estendido, mesmas 5 categorias RD-*)

Reaproveita os eventos genéricos já existentes
(`minigame_scene_started`, `minigame_primm_phase_changed`,
`minigame_step_retry`, `minigame_completed`, `minigame_abandoned`) e
adiciona 2 (mesmo racional de frações adicionar
`minigame_round_executed`/`minigame_predict_answered`):

- `work_tools_match_made` (RD-P) — a cada par confirmado:
  `{ scenario_id, tool_id, correct: boolean, mini_game_level_id }`.
- `work_tools_statement_answered` (RD-C) — a cada julgamento V/F:
  `{ statement_id, answered_true: boolean, correct: boolean,
  mini_game_level_id }`.

## Ciclo PRIMM interno

Mesmo mapeamento já usado em frações sobre `createMiniGameStore` (MJ1/
MJ7), sem alterar a store: `predict → run` na 1ª tentativa da rodada
(pergunta de predição opcional, ex.: "Antes de ver as opções, você acha
que uma impressora comum resolveria o problema do protótipo físico?");
toda correção de par/afirmação errada fica em `run` via `recordAttempt()`;
ao completar todos os pares corretos + todas as afirmações corretas,
`run→investigate→modify→make` marca `completed`. "Novo cenário" (fase
Make) chama `store.startScene()` de novo, sorteando do `scenarioPool`
quando o nível é `create`.

## Feedback não-punitivo

Mesma regra não-negociável 4 de sempre: par errado nunca vira "errado" — 
"Esse par ainda não é o melhor encontro — quer tentar outro?"; afirmação
julgada errada nunca vira "você errou" — "Vamos rever essa juntos: [texto
descritivo do porquê]".

## Critérios de Aceite (resumo, ver seções acima pro detalhe)

- Mecânica de "ligar" é por seleção (toque/clique em par de cartões),
  nunca drag-and-drop de precisão fina (RQ4, MJ4).
- Verdadeiro/falso e "ligar" usam a MESMA paleta pequena de cartões da
  rodada, nunca uma 2ª interface dentro do mesmo nível.
- 3 níveis Use → Modify → Create implementados, mesma estrutura de
  `mini_game_levels`/`stage`/`position` já usada em frações.
- Nenhum gabarito oculto — `config` sempre visível/servido por inteiro.
- Feedback de erro sempre descritivo/reversível (regra 4).
- Estado do jogo (par certo/errado, V/F certo/errado) nunca só por cor —
  ícone + texto sempre (MJ5, já garantido pelos componentes reaproveitados
  de `components/ui`).
- `MiniGameLevel.gameKey` existe e o dispatch de validação por jogo está
  implementado ANTES do conteúdo deste jogo entrar (pré-requisito, ver
  issue de infraestrutura).
- Categoria do jogo é `educacao_computacao` (ver doc de categorização) —
  aparece na seção correspondente do `SubjectSelector`, nunca junto da
  seção de conteúdo curricular.
- Eventos novos seguem as 5 categorias RD-* já definidas, sem taxonomia
  paralela; admin vê o jogo em `/admin/minigames` sem nenhuma mudança de
  código no lado de métricas.
- Painel do professor configura cenários/ferramentas/afirmações por campo
  nomeado, nunca JSON cru.

## Riscos e trade-offs

- Combinar 2 mecânicas (ligar + V/F) na mesma tela arrisca sobrecarga
  cognitiva se aparecerem juntas sem sequência clara — mitigar exibindo o
  bloco de "ligar" primeiro, só liberando as afirmações V/F depois que
  todos os pares corretos estiverem feitos (progressão dentro do próprio
  nível, mesmo racional de "não expor 2 conjuntos novos na mesma tela").
- Escolher ícones/emojis pra ferramentas de trabalho (impressora 3D,
  planilha, banco de dados, trator) é mais amplo que os ícones já
  existentes no projeto (formas geométricas, estados físicos) — validar
  legibilidade dos novos emojis/ícones com o mesmo cuidado de rotulagem
  redundante (ícone nunca substitui o texto).
- `gameKey`/dispatch por tipo é trabalho de infraestrutura que precisa
  entrar ANTES do conteúdo — se for pulado "pra ir mais rápido", o
  próximo jogo de conteúdo (3º) reabriria a mesma discussão de novo, e o
  código de `MinigamesService` ficaria com `if/else` por jogo em vez do
  registry (mesma armadilha que `challenge-templates` já evitou
  deliberadamente).

## Status de implementação

**Não implementado — este documento é o plano do jogo em si (MJ10/MJ11).**

A seção "Infra necessária: suporte a múltiplos 'tipos' de mini jogo" (MJ9)
**já está implementada** — `MiniGameLevel.gameKey`, `validators/`
(`MiniGameLevelValidator`, `FractionsFactoryValidator`,
`validator-registry.ts`) e `MinigamesService.updateLevelConfig` despachando
por `gameKey`, ver "Suporte a múltiplos jogos de conteúdo no motor de mini
jogos (MJ9)" em `docs/ai/modules/backend.md`. O pré-requisito bloqueante de
MJ10/MJ11 está resolvido — falta só o conteúdo do jogo em si.
