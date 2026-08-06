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
│   └── illustrationAssets.ts        # assetRef (banco) → arquivo SVG estático
├── assets/illustrations/            # 8 SVGs (avatar-*/login-*) + NOTICE.md (origem/licença)
├── routes/
│   ├── RootRedirect.tsx             # decide login → onboarding → home
│   ├── RequireAuth.tsx              # guard de sessão/papel
│   ├── StubPage.css                 # estilo compartilhado de placeholders
│   ├── login/
│   │   ├── RoleSelect.tsx           # 1.2.1 — "Quem é você?", 3 botões grandes
│   │   ├── StudentLogin.tsx         # 1.2.1 — código → avatar (roster) → sequência de 3 imagens
│   │   ├── TeacherLogin.tsx         # 1.2.1 — e-mail + senha
│   │   ├── AdminLogin.tsx           # 1.2.1 — e-mail + senha + TOTP
│   │   ├── StudentLogin.css         # alvo de toque grande, grade de posição fixa
│   │   └── StaffLogin.css           # formulário padrão (sem restrição sensorial — ver nota abaixo)
│   ├── OnboardingSensorial.tsx      # 2.2 — só aluno, só antes do onboarding concluído
│   ├── SubjectSelector.tsx          # 2.3 — seletor de matéria/módulo
│   ├── ModuleStub.tsx               # placeholder pós-seleção (desafio ainda não existe)
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

## Próximos passos (fora do escopo já implementado)

- Editor de blocos com toolbox contextual por desafio (Use–Modify–Create) —
  hoje `ModuleStub.tsx` é só um placeholder de texto.
- Componente do mundo PixiJS que executa o programa montado no Blockly.
- Ingestão de eventos pré-login (`login_screen_viewed`,
  `sensory_setting_changed_pre_login`) — bloqueada no backend, ver gap
  documentado em `backend.md`.
- Logout / expiração de sessão: `useAuthStore` tem `clearSession()`, mas
  nenhuma tela chama isso ainda, e `RequireAuth` não valida se o JWT
  expirou (só se existe uma sessão salva).
- Rate limiting nos 3 endpoints de login (gap do backend, ver
  `backend.md`).
