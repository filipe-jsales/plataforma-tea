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
│   └── useAuthStore.ts              # sessão (token + user), persistida em localStorage
├── lib/
│   ├── apiClient.ts                 # fetch wrapper, injeta Authorization: Bearer
│   ├── authFlow.ts                  # completeLogin() — login → GET /users/me → setSession
│   ├── logEvent.ts                  # POST /events centralizado (nunca fetch direto)
│   ├── illustrationAssets.ts        # assetRef (banco) → arquivo SVG estático
│   ├── blocklyToolbox.ts            # registra blocos + monta toolbox JSON a partir do catálogo
│   ├── blockProgram.ts              # interpreta o workspace serializado → lista de ações
│   └── turtleWorld.ts               # matemática pura do "personagem tartaruga" + checagem de meta
├── assets/illustrations/            # 8 SVGs (avatar-*/login-*) + NOTICE.md (origem/licença)
├── components/challenge/
│   └── PixiTurtleWorld.tsx          # mundo PixiJS — só desenha o caminho já calculado
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
│   │   └── ChallengePage.tsx        # editor de blocos do desafio — ver seção própria abaixo
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

## Editor de blocos do desafio (`ChallengePage`, RQ4)

Substitui o antigo placeholder da rota `/subjects/:topicId`. Busca
`GET /challenges/by-topic/:topicId` e monta a tela em cima da resposta —
nunca decide sozinho quais blocos mostrar:

- `blocklyToolbox.ts` registra os blocos vindos do backend com
  `Blockly.defineBlocksWithJsonArray` (a forma de cada bloco é 100% dado, não
  código) e monta o toolbox JSON categorizado (`buildToolboxConfiguration`) —
  só os blocos do desafio aparecem, agrupados em abas pequenas e nomeadas
  (AC1/AC5), nunca a paleta padrão do Blockly inteira.
- `blocklyToolbox.applyGenerousSnapTolerance()` sobe `Blockly.config.
  snapRadius`/`connectingSnapRadius`/`dragRadius` bem acima do default —
  tolerância ampla de encaixe (AC3, RQ4 coordenação motora fina). Chamado uma
  vez no carregamento do módulo, antes de qualquer workspace injetar.
- **Execução é interpretada, não gerada.** `blockProgram.ts` anda a árvore
  serializada do workspace (`Blockly.serialization.blocks.save`) e devolve
  uma lista plana de ações (`move`/`turn`, com `repeat_times` expandido em
  runtime); `turtleWorld.ts` é a matemática pura que transforma essa lista
  num caminho de pontos + heading final, e a checagem de meta (fechou o
  quadrado?). As duas são só lógica pura, cobertas por unit test sem
  precisar de Blockly/DOM de verdade (ver `blockProgram.spec.ts`/
  `turtleWorld.spec.ts`) — não usamos os geradores de código do Blockly
  (`javascript_generator` etc.) porque não há necessidade de produzir texto
  de código nenhuma hora do fluxo.
- `PixiTurtleWorld` só desenha o resultado já calculado (nenhuma lógica de
  interpretação/geometria no componente) — anima segmento a segmento se
  `useSensoryProfileStore().motionEnabled`, ou desenha tudo de uma vez se não
  (regra não-negociável 1: motion é decisão do aluno/professor, nunca
  hardcoded).
- Feedback de sucesso/tentativa nova é sempre reversível (regra não-negociável
  4) — nunca "errado"/X vermelho, ver `challenge-page__feedback--retry`.
- Logging: `toolbox_rendered` (RD-I) uma vez, ao carregar o desafio;
  `block_dragged` (RD-I) a cada solta de bloco (via
  `workspace.addChangeListener` + `Blockly.Events.BlockDrag`, não o
  `onWorkspaceChange` simplificado do `react-blockly`, que não expõe o tipo
  do evento); `challenge.completed` (RD-C) só quando a meta é atingida — é o
  mesmo `type` que `HomeService`/`StudentHome` já esperavam desde 2.1 pra
  contar "desafios concluídos" (ver `docs/ai/modules/backend.md`).
- **Sem autoria de toolbox pelo professor nesta versão** — decisão
  explícita, ver "Blocos por desafio" em `backend.md`. O professor não
  escolhe nem programa nada hoje; o MVP continua com exatamente 1 desafio
  por tópico.

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

- Múltiplos desafios por tópico / estágios modify-create — hoje
  `ChallengesController` sempre devolve o primeiro (único) desafio do
  tópico; a tela já lê `toolbox.stage`, mas nada consome esse valor ainda
  (ex.: workspace pré-preenchido com blocos iniciais no estágio "modify").
- Ciclo PRIMM interno (Predict-Run-Investigate-Modify-Make como estrutura de
  tela, não só a paleta Use-Modify-Create) — hoje `ChallengePage` só tem
  "montar → executar → feedback", sem as etapas Predict/Investigate
  separadas.
- Ingestão de eventos pré-login (`login_screen_viewed`,
  `sensory_setting_changed_pre_login`) — bloqueada no backend, ver gap
  documentado em `backend.md`.
- Logout / expiração de sessão: `useAuthStore` tem `clearSession()`, mas
  nenhuma tela chama isso ainda, e `RequireAuth` não valida se o JWT
  expirou (só se existe uma sessão salva).
- Rate limiting nos 3 endpoints de login (gap do backend, ver
  `backend.md`).
