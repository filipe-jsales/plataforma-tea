# Frontend — `apps/web`

React 18 + TypeScript + Vite. Ver `docs/ai/rules/coding-rule.md` para as
regras de UX sensorial que se aplicam a todo componente novo.

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Editor de blocos | `blockly` + `react-blockly` | Base de facto na literatura de VPEs para TEA; permite restringir toolbox por tela (Use–Modify–Create). |
| Mundo/personagem | `pixi.js` | Renderização 2D leve, controle fino de timing — necessário para permitir desligar animação. |
| Roteamento | `react-router-dom` | Guards de rota por sessão/papel (`RequireAuth`), sem servidor — SPA. |
| Estado global | `zustand` | Menos boilerplate que Redux; um store por domínio (perfil sensorial, sessão) observável por qualquer componente. |
| Tema/sensorial | CSS Variables + `prefers-reduced-motion` + atributos `data-*` no `<html>` | Alterna perfil sensorial em runtime sem recompilar; respeita config do SO por padrão. |

**Nota de compatibilidade:** React está fixado em `^18`, não `19` —
`react-blockly@9` (peer dependency) só suporta React 16–18. Não atualizar o
major do React sem antes checar se `react-blockly` já suporta a versão nova.

## Estrutura atual

```
apps/web/src/
├── theme/sensory-theme.css          # CSS vars + prefers-reduced-motion
├── stores/
│   ├── useSensoryProfileStore.ts    # perfil sensorial (motion/som/contraste) — CSS-facing
│   ├── useAuthStore.ts              # sessão (token + user), persistida em localStorage
│   └── turtleExecutionStore.ts      # factory Zustand — 1 instância por "mundo" PixiTurtleWorld
├── lib/
│   ├── apiClient.ts                 # fetch wrapper, injeta Authorization: Bearer
│   ├── authFlow.ts                  # completeLogin() — login → GET /users/me → setSession
│   ├── logEvent.ts                  # POST /events centralizado (nunca fetch direto)
│   ├── illustrationAssets.ts        # assetRef (banco) → arquivo SVG estático
│   ├── blocklyToolbox.ts            # registra blocos + monta toolbox JSON a partir do catálogo
│   ├── blockProgram.ts              # interpreta o workspace serializado → lista de ações
│   └── turtleWorld.ts               # matemática pura: caminho, checagem de meta, preview de Ajuda
├── assets/illustrations/            # 8 SVGs (avatar-*/login-*) + NOTICE.md (origem/licença)
├── components/challenge/
│   └── PixiTurtleWorld.tsx          # mundo PixiJS — só lê `store`, nunca Blockly/DOM diretamente
├── routes/
│   ├── RootRedirect.tsx             # decide login → onboarding → home
│   ├── RequireAuth.tsx              # guard de sessão/papel
│   ├── login/
│   │   ├── RoleSelect.tsx           # 1.2.1 — "Quem é você?", 3 botões grandes
│   │   ├── StudentLogin.tsx         # 1.2.1 — código → avatar (roster) → sequência de 3 imagens
│   │   ├── TeacherLogin.tsx         # 1.2.1 — e-mail + senha
│   │   ├── AdminLogin.tsx           # 1.2.1 — e-mail + senha + TOTP
│   │   ├── StudentLogin.css         # alvo de toque grande, grade de posição fixa
│   │   └── StaffLogin.css           # formulário padrão (sem restrição sensorial — ver nota abaixo)
│   ├── OnboardingSensorial.tsx      # 2.2 — só aluno, só antes do onboarding concluído
│   ├── SubjectSelector.tsx          # 2.3 — seletor de matéria/módulo
│   ├── challenge/
│   │   └── ChallengePage.tsx        # /subjects/:topicId e /challenge/:challengeId — ver seção própria
│   └── home/
│       ├── HomeRouter.tsx           # 2.1 — dispatch por papel
│       ├── StudentHome.tsx
│       ├── TeacherHome.tsx
│       └── AdminHome.tsx
├── App.tsx                          # <Routes> raiz
└── main.tsx                         # BrowserRouter + hidrata tema a partir da sessão persistida
```

## Sessão (`useAuthStore`)

Store Zustand persistido (`zustand/middleware persist`, chave
`plataforma-tea-session`) — sobrevive a F5 e fechar/abrir aba, porque o
aluno pode usar um computador compartilhado da sala e não deveria refazer
login/onboarding a cada sessão de navegador só por causa disso.
`RootRedirect`/`RequireAuth` leem esse store para decidir rota — nenhum
componente de tela deveria checar sessão por conta própria.

## Login (1.2.1)

`/login` (`RoleSelect`) é a única tela de fato única — "Quem é você?" com 3
botões grandes, sem papel pré-selecionado. Cada resposta leva a um fluxo
totalmente diferente:

- `/login/student` (`StudentLogin`) — 3 passos em um único componente
  (`step: 'code' | 'avatar' | 'sequence'`): código de turma
  (`GET /auth/student/classrooms/:joinCode/roster`, sem guard) → grid de
  avatares do roster → grid de 4 imagens de login
  (`GET /illustrations?kind=login_image`, sem guard) em **posição fixa**
  (ordenada por `position`, nunca embaralhada entre sessões). Ao completar 3
  toques, submete automaticamente (`POST /auth/student/login`). Erro não
  reseta pro passo 1 — só limpa a sequência e deixa tentar de novo, com
  mensagem reversível ("Quase lá — essa sequência não bateu").
- `/login/teacher` / `/login/admin` — formulário padrão (`StaffLogin.css`),
  **sem** os requisitos sensoriais do aluno (alvo de toque gigante, grade de
  ilustrações) — decisão explícita: essas restrições são especificamente
  pra reduzir carga cognitiva/motora do aluno, não fazem sentido pro
  professor/admin. `AdminLogin` pede senha + "código do aplicativo
  autenticador" (nunca a palavra "TOTP"/"OTP" na tela).

Todos os 3 fluxos terminam chamando `completeLogin()`
(`lib/authFlow.ts`): o endpoint de login só devolve
`{ accessToken, role, displayName }`, então essa função seta uma sessão
mínima (necessário pro `apiClient` já anexar o token), busca o perfil
completo em `GET /users/me`, e só então preenche `useAuthStore` de
verdade — sincronizando `useSensoryProfileStore` no caso do aluno.
Depois disso, `navigate('/')` deixa o `RootRedirect` decidir onboarding vs.
home.

## Perfil sensorial (`useSensoryProfileStore`)

Store Zustand com `motionEnabled`, `soundEnabled`, `highContrast` — todos
`false` por padrão (regra não-negociável 1). Qualquer alteração nesse estado
escreve atributos `data-motion` / `data-contrast` / `data-sound` no
`<html>` via `applyToDocument()`. `sensory-theme.css` reage a esses atributos
via seletor `:root[data-motion='full']` etc.

Esse store é só a camada CSS-facing — a fonte da verdade pro aluno é o
backend (`User.soundEnabled`/`animationEnabled`, ver `backend.md`).
`OnboardingSensorial` e qualquer tela futura que altere isso devem sempre
fazer as duas coisas juntas: `PATCH /users/:id/sensory-profile` **e**
atualizar `useSensoryProfileStore` — nunca só uma. `main.tsx` hidrata o
store a partir da sessão persistida assim que o módulo carrega, antes da
primeira renderização.

**Ao criar um componente que anima ou toca som:** ler
`useSensoryProfileStore` (ou os atributos `data-*` do `<html>`, se for
CSS puro) antes de decidir animar/tocar — nunca assumir que motion/som estão
ligados.

## Eventos (`logEvent`)

Wrapper fino sobre `POST /events` — nunca chamar `fetch` direto pra logging.
Segue o mesmo escopo do backend (ver "Padrão: eventos RD-* são escopados ao
aluno" em `backend.md`): só telas do aluno chamam `logEvent`
(`StudentHome`, `OnboardingSensorial`, `SubjectSelector`); `TeacherHome`/
`AdminHome` não emitem eventos RD-*.

## Editor de blocos do desafio (`ChallengePage`, RQ4/RQ1/RQ2)

Duas rotas, o mesmo componente: `/subjects/:topicId` (2.3 → aqui, sempre o
Desafio 1 da sequência do tópico, via `GET /challenges/by-topic/:topicId`) e
`/challenge/:challengeId` (acesso direto a um desafio específico — é pra
onde o botão "Avançar" navega, via `GET /challenges/:id`). `challenge.locked`
na resposta decide entre os dois modos de tela abaixo — nunca uma
prop/estado inventado no frontend.

### Paleta restrita (3.1)

- `blocklyToolbox.ts` registra os blocos vindos do backend com
  `Blockly.defineBlocksWithJsonArray` (a forma de cada bloco é 100% dado, não
  código) e monta o toolbox JSON categorizado (`buildToolboxConfiguration`) —
  só os blocos do desafio aparecem, agrupados em abas pequenas e nomeadas
  (AC1/AC5), nunca a paleta padrão do Blockly inteira.
- `blocklyToolbox.applyGenerousSnapTolerance()` sobe `Blockly.config.
  snapRadius`/`connectingSnapRadius`/`dragRadius` bem acima do default —
  tolerância ampla de encaixe (AC3, RQ4 coordenação motora fina). Chamado uma
  vez no carregamento do módulo, antes de qualquer workspace injetar.
- Logging: `toolbox_rendered` (RD-I) uma vez, ao carregar o desafio;
  `block_dragged` (RD-I) a cada solta de bloco (via
  `workspace.addChangeListener` + `Blockly.Events.BlockDrag`, não o
  `onWorkspaceChange` simplificado do `react-blockly`, que não expõe o tipo
  do evento).
- **Sem autoria de toolbox pelo professor nesta versão** — decisão
  explícita, ver "Blocos por desafio" em `backend.md`. O professor não
  escolhe nem programa nada hoje; a sequência de desafios de um tópico é
  fixa (por `Challenge.position`), a mesma pra todo aluno.

### Mundo de execução 2D desacoplado via store (3.2)

- **Execução é interpretada, não gerada.** `blockProgram.ts` anda a árvore
  serializada do workspace (`Blockly.serialization.blocks.save`) e devolve
  uma lista plana de ações (`move`/`turn`, com `repeat_times` expandido em
  runtime); `turtleWorld.ts` é a matemática pura que transforma essa lista
  num caminho de pontos + heading final, a checagem de meta (fechou o
  quadrado?) e o traçado-alvo do botão de Ajuda (`buildGoalPreviewPath`, ver
  abaixo). As três são só lógica pura, cobertas por unit test sem precisar
  de Blockly/DOM de verdade (`blockProgram.spec.ts`/`turtleWorld.spec.ts`) —
  não usamos os geradores de código do Blockly (`javascript_generator` etc.)
  porque não há necessidade de produzir texto de código nenhuma hora do
  fluxo.
- **`PixiTurtleWorld` não importa nem manipula o DOM/instância do Blockly —
  comunicação exclusivamente via store (Zustand)** (3.2 AC1).
  `stores/turtleExecutionStore.ts` exporta uma **factory**
  (`createTurtleExecutionStore`), não um store singleton: `ChallengePage`
  cria uma instância por "mundo" que precisa existir na tela (a execução do
  aluno e, na fase Create, o preview de Ajuda são dois mundos
  independentes) via `useMemo(() => createTurtleExecutionStore(), [])`.
  `ChallengePage` calcula o caminho e chama `store.getState().play(points,
  animate)`; `PixiTurtleWorld` só lê o store e desenha.
- **Perfil sensorial decide o modo de execução, nunca o componente sozinho**
  (3.2 AC2 — regra não-negociável 1): `animate = useSensoryProfileStore
  ((s) => s.motionEnabled)`, passado pro `play()`.
  - `animate=false` (**padrão**): avanço por passos controlados pelo aluno.
    `PixiTurtleWorld` desenha só até `stepIndex`; um botão "Próximo passo →"
    (visível só nesse modo, some quando `status` volta a `'idle'`) chama
    `store.getState().advanceStep()`. Nada avança sozinho.
  - `animate=true` (**opt-in**): `PixiTurtleWorld` anima segmento a segmento
    sozinho (delay fixo por segmento), sempre que `runToken` muda.
  - Um programa sem nenhum movimento nasce `status: 'idle'` direto (nunca
    `'stepping'`) — não tem passo pra avançar, ver
    `turtleExecutionStore.spec.ts`.
- **Traçado persistente**: `pathGraphics` só é limpo (`clear()`) no início de
  uma nova execução (`play()` chamado de novo, seja "Executar" ou "Repetir
  execução") — nunca por timeout ou efeito colateral de outra coisa na tela.
- **Limite de segurança contra loop infinito acidental** (AC4): `MAX_ACTIONS
  = 500` em `blockProgram.ts` (`interpretProgram`) — um `repeat_times` com
  `TIMES` absurdo (o campo já limita a 12 na UI, mas isso é defesa em
  profundidade) nunca trava a interpretação nem a interface.
- Logging: `program_executed` (RD-P) a cada "Executar"/"Repetir execução" —
  `block_sequence_json` é o mesmo programa serializado enviado pro
  interpretador; `execution_duration_ms` é uma **estimativa** (nº de
  segmentos × duração fixa de animação) quando `animate=true`, e `0` em modo
  passo-a-passo (não existe duração fixa, o aluno controla o ritmo) — não é
  uma medição real de wall-clock.

### Fase Use travada — Desafio 1 (3.3)

Quando `challenge.locked` (`stage === 'use'`, ver "Blocos por desafio" em
`backend.md` — não é mais `Boolean(program)`, porque a fase `modify` também
tem `program`): workspace nasce com `initialJson` = o programa pré-montado
(mesmo formato de `Blockly.serialization.workspaces.load`),
`workspaceConfiguration.readOnly: true` e **sem `toolboxConfiguration`** —
nenhum bloco arrastável, nenhuma paleta visível. Único controle é o botão
Executar/Repetir execução (mesmo `handleRun` do modo livre — o programa é
lido do workspace normalmente, só que o aluno não pode alterá-lo).

**Motor PRIMM "Predict"** (fechando P-R-I unificados neste desafio, ver
"Rastreabilidade PRIMM × Use-Modify-Create" em `backend.md`):
`challenge.predictQuestion` reaproveita o mesmo mecanismo genérico da fase
`modify` (widget de botões grandes, `primmStage`/`predictAnswer`, ver
abaixo) — mas só trava o **primeiro** Executar, nunca reaparece nas
reexecuções seguintes, porque nada reseta `primmStage` de volta pra
`'predict'` fora do fluxo específico de `modify` (o programa aqui nunca
muda, então prever de novo a cada rodada não agregaria nada — diferente de
`modify`, ver abaixo). O comparativo previsão×resultado (`closedPolygonSides`
contra a previsão) vai direto no `program_executed` daquele desafio, sem
evento próprio (a fase `modify` é que tem um evento dedicado,
`challenge_modify_attempt`, porque ali também precisa registrar quais
valores mudaram).

Depois da 1ª execução (`attempts >= 1`): aparece a pergunta de investigação
(`challenge.investigationQuestion`, motor PRIMM "Investigate" — placeholder
mínimo, resposta livre só logada, nunca corrigida) e o botão "Avançar", que:

- Loga `challenge_use_completed` **duas vezes** (uma `RD-P`, uma `RD-C` —
  segue literalmente a notação "RD-P + RD-C" do backlog da feature, já que
  uma linha de `interaction_events` só tem uma `category`), com
  `attempts_before_proceed`.
- Navega pra `/challenge/:nextChallengeId` (a fase `modify`, ver abaixo) — nunca habilitado
  antes de `attempts >= 1` (AC4: "aluno não pode avançar sem executar ao
  menos uma vez").

Fase `use` **não avalia sucesso/falha** — o programa vem pronto e sempre
"funciona" por construção; o feedback reversível (regra não-negociável 4)
só faz sentido na fase `create`.

### Fase Modify (3.4)

Reaproveita o mesmo `initialJson`/`program` da fase `use` (`initialJson`
hoje é derivado só de `challenge.program`, não mais de `challenge.locked`),
mas com `workspaceConfiguration.readOnly: false` (senão nenhum campo dá pra
editar) e **ainda sem `toolboxConfiguration`** (`toolboxConfiguration` só é
montado quando `toolbox.stage === 'create'`) — nenhum bloco novo arrastável,
`trashcan` também escondido.

`applyModifyFieldLocking(workspace, challenge.editableFields)` roda uma vez
no `onInject` do Blockly e é o que trava a estrutura sem travar os campos
configurados:

- todo bloco recebe `block.setMovable(false)` + `block.setDeletable(false)`
  (a árvore de blocos não muda, só valores dentro dela — AC de 3.4).
- todo campo (`Blockly.Field`, achado andando `block.inputList[*].fieldRow`)
  que **não** está em `challenge.editableFields` recebe `field.setEnabled
  (false)` — visível, mas não editável (nunca "sumiço" de informação).
- todo campo que **está** na lista recebe `field.setEnabled(true)` e, se for
  `Blockly.FieldNumber` (é o caso de `TIMES`/`ANGLE`), `field.setConstraints
  (min, max, undefined)` com os limites de `EditableFieldConfig` — sobrepondo
  o min/max técnico já embutido na definição do bloco (ver
  `AddAngleFieldToTurnBlock` em `backend.md`).

**Motor PRIMM "Predict"**: quando `challenge.predictQuestion` existe, o botão
Executar não aparece até o aluno escolher uma opção — `primmStage: 'predict'
| 'run'` controla isso, e volta pra `'predict'` depois de toda execução
(valores podem ter mudado desde a última previsão, então uma previsão nova
sempre precede o próximo Executar). O widget é um conjunto de botões grandes
(não um campo numérico livre) com o intervalo do campo editável `TIMES` —
motor fino (RQ4) e permite comparar a previsão contra o resultado real de
forma determinística, sem heurística de texto livre.

Em cada Executar (`handleRun`), além do `program_executed` genérico:
`lib/editableFields.extractEditableFieldValues` lê o valor atual dos campos
editáveis do bloco recém-serializado, `diffChangedValues` compara contra o
snapshot inicial (calculado uma vez a partir de `challenge.program`), e
`turtleWorld.closedPolygonSides(result)` diz quantos lados o traçado fechou
com (`null` se não fechou) — os três juntos montam o evento
`challenge_modify_attempt` (RD-P, ver "Eventos desta feature" em
`backend.md`). A tela mostra uma frase só descritiva ("Você imaginou N
lados. A figura fechou com M lados.") — nunca "certo/errado" (regra
não-negociável 4); **sem avaliação de sucesso/fracasso** nesta fase, mesmo
racional da fase `use`. Botão de Ajuda (abaixo) também não aparece aqui —
não há forma-alvo escondida pra revelar, o aluno já vê e controla a forma
diretamente.

O botão "Avançar" (mesmo `challenge-page__investigation`/`handleProceed` da
fase `use`, condição estendida pra `challenge.locked || isModify`) libera
depois de `attempts >= 1`, mas **não** loga `challenge_use_completed` — esse
evento é específico da fase `use`; a fase `modify` já loga cada rodada via
`challenge_modify_attempt`.

### Fase Create livre + botão de Ajuda (3.5)

Quando `toolbox.stage === 'create'`: o editor livre de sempre (toolbox
arrastável, feedback de sucesso/tentativa nova sempre reversível — nunca
"errado"/X vermelho, ver `challenge-page__feedback--retry`) + `challenge.
completed` (RD-C) só quando a meta é atingida, o mesmo `type` que
`HomeService`/`StudentHome` já esperavam desde 2.1 pra contar "desafios
concluídos".

**Botão de Ajuda** ("🔎 Ajuda: ver a forma") — andaime visual sem entregar a
resposta: `turtleWorld.buildGoalPreviewPath(goal)` gera o traçado da forma-
alvo **só a partir dos números do `goal`** (`sides`/`turnAngleDeg`), nunca a
partir de blocos — não existe como essa função "vazar" quais instruções
resolvem o desafio, porque ela não sabe o que são blocos. Toca num segundo
`PixiTurtleWorld`, com sua própria instância de store (`helpStore`,
independente da execução do aluno — abrir a Ajuda nunca apaga o traçado que
o aluno já tinha montado). Loga `challenge.help_viewed` (RD-I).

### Motor PRIMM: vocabulário de config, não FSM de tela única

Ver "Como desafios futuros adotam PRIMM" em `backend.md` pra tabela completa
— resumindo do lado do frontend: nenhum dos 5 estágios PRIMM é hardcoded por
nome de desafio. `ChallengePage` deriva o que mostrar checando presença de
campo (`challenge.predictQuestion`, `challenge.investigationQuestion`,
`challenge.editableFields.length`) e `toolbox.stage` (só pra decidir toolbox/
Ajuda/trashcan, nunca pra decidir se uma pergunta aparece) — nunca
`if (challenge.title === '...')` nem equivalente. Um desafio novo (deste
tópico ou de outro, qualquer disciplina) ganha Predict/Investigate só
preenchendo o campo correspondente no seed; ganha Modify preenchendo
`editableFields` com os campos do bloco que fazem sentido editar pro
conceito curricular daquele desafio.

## Assets visuais (`assets/illustrations/`)

Os 8 SVGs (4 avatares + 4 imagens de login) foram **desenhados
originalmente pra este MVP** — formas geométricas simples, sem set de
terceiros (ver `NOTICE.md` na própria pasta). Mesmo estilo visual em todos
(emblema circular colorido + ícone branco), de propósito — nenhum arquivo
tem animação embutida. São placeholders funcionais: antes de produção,
trocar por um set profissional mantendo os mesmos nomes de arquivo/slug,
pra não precisar tocar em `illustrationAssets.ts` nem no banco. Pool de
avatar e pool de login-image usam paletas/formas diferentes de propósito —
nunca reaproveitar um ícone nas duas categorias (confundiria "quem eu sou"
com "minha senha").

## Testes

Vitest + `@testing-library/react`, configurado em `vitest.config.ts`
(`environment: 'jsdom'`, setup em `src/test/setup.ts`). Rodar com `npm run
test --workspace apps/web`, ou `npm run test:web` na raiz. Todo módulo em
`lib/` e todo store Zustand têm um `*.spec.ts` ao lado — stores são
singletons reaproveitados entre testes, então cada `describe` reseta o
estado em `beforeEach` (`useStore.setState({...})`), nunca assume estado
limpo por padrão. Ver regra "Testes" em `docs/ai/rules/coding-rule.md` para
o padrão esperado em código novo.

## Próximos passos (fora do escopo já implementado)

- O painel de reflexão da fase `modify` (`challenge-page__modify-reflection`)
  só cobre o próprio desafio — não existe ainda uma visão agregada (pro
  aluno ou pro professor) de "quais combinações de TIMES/ANGLE você já
  tentou", só o log bruto (`challenge_modify_attempt`) por trás.
- Ingestão de eventos pré-login (`login_screen_viewed`,
  `sensory_setting_changed_pre_login`) — bloqueada no backend, ver gap
  documentado em `backend.md`.
- Logout / expiração de sessão: `useAuthStore` tem `clearSession()`, mas
  nenhuma tela chama isso ainda, e `RequireAuth` não valida se o JWT
  expirou (só se existe uma sessão salva).
- Rate limiting nos 3 endpoints de login (gap do backend, ver
  `backend.md`).
