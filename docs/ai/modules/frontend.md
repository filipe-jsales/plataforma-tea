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
├── index.css                        # 3.11 — reset global + escala tipográfica (h1/h2/h3/p crus)
├── theme/
│   ├── sensory-theme.css            # CSS vars (tokens) + prefers-reduced-motion — tema base/aluno
│   └── staff-theme.css              # 3.11 — classe `.staff-theme`: paleta rica + elevação + microanimação
├── stores/
│   ├── useSensoryProfileStore.ts    # perfil sensorial (motion/som/contraste) — CSS-facing
│   ├── useAuthStore.ts              # sessão (token + user), persistida em localStorage
│   └── turtleExecutionStore.ts      # factory Zustand — 1 instância por "mundo" PixiTurtleWorld
├── lib/
│   ├── apiClient.ts                 # fetch wrapper, injeta Authorization: Bearer (+ getRaw, 6.6)
│   ├── authFlow.ts                  # completeLogin() — login → GET /users/me → setSession
│   ├── logEvent.ts                  # POST /events centralizado (nunca fetch direto)
│   ├── illustrationAssets.ts        # assetRef (banco) → arquivo SVG estático
│   ├── blocklyToolbox.ts            # registra blocos + monta toolbox JSON a partir do catálogo
│   ├── blockProgram.ts              # interpreta o workspace serializado → lista de ações
│   ├── turtleWorld.ts               # matemática pura: caminho, checagem de meta, preview de Ajuda
│   ├── challengeTemplateTypes.ts    # 4.2 — mesma forma que a API de challenge-templates devolve
│   └── templateParameterForm.ts     # 4.2 — draft inicial, coerção de valor, indexação de erros por campo
├── assets/illustrations/            # 8 SVGs (avatar-*/login-*) + NOTICE.md (origem/licença)
├── components/
│   ├── ui/                          # 3.10/3.11 — sistema de componentes acessíveis, ver seção própria
│   │   ├── Button.tsx / Button.css
│   │   ├── LinkButton.tsx           # 3.11 — mesma classe CSS de Button, elemento <Link>
│   │   ├── ToggleSwitch.tsx / ToggleSwitch.css  # @radix-ui/react-switch
│   │   ├── Card.tsx / Card.css                  # SelectableCard (align 'center'|'start', meta), react-aria useButton
│   │   ├── Tabs.tsx / Tabs.css                  # @radix-ui/react-tabs
│   │   ├── SegmentedControl.tsx / .css          # 3.11 — @radix-ui/react-toggle-group (type="single")
│   │   ├── Select.tsx / Select.css              # 3.11 — @radix-ui/react-select
│   │   ├── Table.tsx / Table.css                # 3.11 — wrapper semântico <table>, zebra/divisor/espaçamento
│   │   ├── Badge.tsx / Badge.css                # 3.11 — status como componente, não cor inline
│   │   ├── Tooltip.tsx / Tooltip.css            # @radix-ui/react-tooltip
│   │   ├── Dialog.tsx / Dialog.css              # @radix-ui/react-dialog
│   │   ├── Heading.tsx / Text.tsx / Typography.css
│   │   ├── InlineFeedback.tsx / InlineFeedback.css
│   │   ├── VisuallyHidden.tsx       # re-export de react-aria
│   │   └── index.ts                 # barril — toda tela importa daqui, nunca direto da lib
│   ├── challenge/
│   │   └── PixiTurtleWorld.tsx      # mundo PixiJS — só lê `store`, nunca Blockly/DOM diretamente
│   ├── template-form/               # 4.2 — formulário guiado do professor, ver seção própria
│   │   ├── TemplateChallengeForm.tsx       # form completo — reusado por criar/editar/duplicar
│   │   ├── TemplateParameterField.tsx      # 1 campo, dispatch só por type/visualPreview
│   │   ├── PolygonPreviewIcon.tsx          # miniatura "nº de lados" — SVG inline
│   │   ├── AngleWedgeIcon.tsx              # miniatura "ângulo de giro" — SVG inline
│   │   └── ToleranceGaugeIcon.tsx          # miniatura "tolerância de encaixe" — SVG inline
│   └── charts/                      # 6.5 — SVG inline, sem lib externa, hue único (--color-primary)
│       ├── BoxPlot.tsx              # mediana + Q1/Q3 + whiskers min-max
│       ├── BarChart.tsx             # barras horizontais (histograma OU categórico — mesmo componente)
│       ├── ScatterPlot.tsx          # 1 ponto = 1 aluno, sem identificador
│       ├── StatSummary.tsx          # <StatList> (N/média/mediana/dp/quartis em texto) + <SampleSizeNote>
│       ├── format.ts                # formatNumber() compartilhado
│       └── charts.css
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
│   ├── home/
│   │   ├── HomeRouter.tsx           # 2.1 — dispatch por papel
│   │   ├── StudentHome.tsx
│   │   ├── TeacherHome.tsx
│   │   └── AdminHome.tsx
│   ├── teacher/                     # 4.2 — Modo Template, ver seção própria
│   │   ├── TeacherChallenges.tsx    # /teacher/challenges — "Meus desafios" (AC5)
│   │   ├── TeacherChallenges.css
│   │   ├── TeacherChallengeNew.tsx  # /teacher/challenges/new — galeria (AC1) + formulário (AC2)
│   │   ├── TeacherChallengeEdit.tsx # /teacher/challenges/:id/edit — mesmo formulário, pré-preenchido
│   │   └── TeacherChallengeNew.css  # compartilhado por New/Edit
│   └── metrics/
│       ├── AdminMetrics.tsx         # 6.2 — /admin/metrics, painel institucional do admin
│       ├── AdminMetrics.css         # sem restrição sensorial — mesmo racional de StaffLogin.css
│       ├── TeacherMetrics.tsx       # 6.3/6.4 — /teacher/metrics, progresso por turma do professor
│       ├── TeacherMetrics.css       # sem restrição sensorial — mesmo racional de AdminMetrics.css
│       ├── ChallengeReport.tsx      # 6.5 — /admin/reports, relatório de profundidade por desafio
│       ├── ChallengeReport.css
│       ├── AdminSettings.tsx        # 6.5 — /admin/settings, N mínimo pro aviso de amostra pequena
│       ├── AdminSettings.css
│       ├── AdminExport.tsx          # 6.6 — /admin/export, recorte + download JSON/CSV
│       └── AdminExport.css
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

## Sistema de componentes acessíveis do aluno (`components/ui/`, 3.10)

Base de UI compartilhada pra toda a área do aluno — botões, toggle de
configuração sensorial, cards de seleção (tópico/desafio), abas, tooltip,
modal, tipografia e feedback de tentativa. Substitui e absorve o escopo do
3.10 original (só as áreas de encaixe do Blockly, ver "Paleta restrita"
acima) — hoje é infraestrutura transversal, não uma tela específica.

### Decisão técnica: Radix UI + React Aria, não uma lib "completa"

**Radix UI** (`@radix-ui/react-switch`, `-tabs`, `-tooltip`, `-dialog`) para
os primitivos estruturais — é headless (zero estilo/animação própria), o
que já é exatamente o que a regra não-negociável 1 exige ("nasce desligada
por padrão"): nenhuma transição de entrada/saída pré-definida pra desligar
depois, o CSS de cada componente em `components/ui/*.css` é escrito do zero
sobre a estrutura acessível que a lib garante (role, `aria-*`, teclado).

**React Aria** (`react-aria`, hooks `useButton`/`useFocusRing`/
`mergeProps`/`VisuallyHidden`) só entra onde Radix não tem primitivo —
hoje só `Card.tsx` (`SelectableCard`): um cartão clicável não é
dialog/tooltip/toggle/tabs, e um `<div onClick>` sozinho não ganha teclado
(Enter/Espaço) nem `role="button"` de graça. `useButton` dá esse
comportamento completo sem reescrever handler de teclado na mão;
`useFocusRing` é o que faz o anel de foco aparecer só pra quem navega por
teclado, nunca "piscar" a cada clique de mouse.

Por que não Chakra/Mantine: ambos vêm com tema e componentes já
estilizados — produtividade mais rápida, mas o preço é desfazer decisões
visuais padrão (transição, sombra, easing) em vez de partir de uma tela em
branco. O projeto já tem CSS Variables + Zustand pro tema sensorial (ver
seção acima); um headless se encaixa melhor porque Radix/React Aria cuidam
só de acessibilidade estrutural, o tema sensorial que já existe cuida de
100% da aparência.

⚠️ Isto é decisão de engenharia, sem respaldo literal no mapeamento
sistemático (nenhum PS do corpus especifica biblioteca de componente) — a
rastreabilidade abaixo é com a barreira (RQ4), não com uma recomendação da
literatura.

### O que cada componente resolve (RQ4)

- **`Button`** (`.ui-button`) — `<button>` nativo estilizado, sem
  `useButton` (o elemento já tem o comportamento nativo correto). Área de
  toque mínima `--hit-area-min` (56px, `theme/sensory-theme.css`)
  independente do tamanho de ícone/texto — coordenação motora fina, RQ4
  21,74%. `icon` é sempre decorativo (`aria-hidden`) e nunca substitui
  `children` (o texto) — rotulagem redundante, RQ4 acessibilidade de
  interface 26,09%. Três variantes (`primary`/`secondary`/`ghost`), todas
  com `:focus-visible` (nunca `outline: none` sem substituto) e sem
  `transition`/`animation` própria — quem zera isso globalmente fora de
  `data-motion='full'` é `sensory-theme.css`, um componente novo nunca
  reimplementa esse mecanismo.
- **`ToggleSwitch`** (Radix Switch) — configuração binária (som/animação
  hoje, contraste é candidato natural). O estado nunca depende só da
  posição/cor do trilho: `.ui-toggle__state` escreve "Ligado"/"Desligado"
  em texto ao lado, sempre. O `<label>` externo estende a área de toque pra
  linha inteira, não só o trilho de 48×28.
- **`SelectableCard`** (`Card.tsx`, React Aria `useButton`) — tópico/
  desafio selecionável. Seleção nunca é só borda colorida: mostra
  "✓ Selecionado" em texto quando `selected`.
- **`Tabs`** (Radix Tabs) — teclado (setas/Home/End) de graça; candidato
  pra `TeacherMetrics` (hoje 2 `<button>` soltos alternando estado, ver nota
  de débito abaixo).
- **`Tooltip`** (Radix Tooltip) — reforço textual **opcional**, nunca a
  única fonte do rótulo; o gatilho (`children`) precisa ter nome acessível
  próprio de qualquer forma (AC "nunca só ícone").
- **`Dialog`** (Radix Dialog) — nenhuma tela do MVP usa ainda (a Ajuda de
  3.5 é painel inline, não modal); nasce pronto pro dia que uma tela
  precisar de confirmação antes de uma ação difícil de reverter.
- **`Heading`/`Text`** — hierarquia tipográfica presa ao nível semântico
  (`h1`/`h2`/`h3`), sem prop de tamanho solto que permita um `<h2>` do
  tamanho de `<h1>`. Sem prop de itálico/uppercase de propósito — nenhum
  texto da área do aluno usa isso como único indicador de ênfase (AC).
- **`InlineFeedback`** — feedback de tentativa (regra não-negociável 4):
  ícone (padrão por `kind`, redundante com a cor) + texto, sempre os dois,
  nunca só um. `kind="retry"` sai com `role="status"`, pra leitor de tela
  anunciar sem precisar de recarregar a página.

Todo componente lê os tokens `--hit-area-min`/`--focus-ring-*` de
`theme/sensory-theme.css` (adicionados nesta feature) em vez de
valores soltos — um único lugar pra auditar/mudar a área de toque mínima do
produto inteiro.

### Onde já está em uso vs. débito de migração

Aplicado em telas tocadas por 3.10 — `OnboardingSensorial` (`ToggleSwitch` +
`Button`, substituindo checkbox cru), `SubjectSelector` (`SelectableCard` +
`Button`, substituindo `<button>` cru) e `StudentHome` (`Button` nas 2 ações
principais). 3.11 estendeu o mesmo barril pra área de staff — ver "Sistema
de design compartilhado (professor/admin, 3.11)" logo abaixo — `TeacherHome`/
`AdminHome`/`TeacherMetrics`/`AdminMetrics`/`AdminSettings`/`ChallengeReport`/
`TeacherLogin`/`AdminLogin` já usam `Button`/`LinkButton`/`SelectableCard`/
`SegmentedControl`/`Select`/`Table`/`Badge`, só com tema mais rico
(`.staff-theme`) em vez das restrições sensoriais do aluno.

**Não migrado ainda** (débito reconhecido, não silencioso):
`ChallengePage.tsx` (botões Executar/Ajuda/Avançar/Predict e o
`challenge-page__feedback`) — critério pra migrar continua o mesmo: só
quando a tela for tocada por outro motivo (evita um PR gigante só de
refactor visual sem mudança funcional), e ela já tem lógica PRIMM densa o
bastante pra não misturar com uma troca de biblioteca de UI no mesmo
commit.

### Testes

Cada componente em `components/ui/` tem `*.spec.tsx` (Vitest +
`@testing-library/react`) verificando o comportamento que a AC exige, não
só "renderiza sem erro": ícone nunca substitui o texto (`Button`), estado
sempre em texto visível (`ToggleSwitch`, `SelectableCard`), foco/teclado
funcionam (`SelectableCard` via Enter, `ToggleSwitch` via Espaço, `Tabs`
via clique), `Dialog` fecha com um botão que tem texto "Fechar" visível
(nunca só `✕`). `src/test/setup.ts` ganhou um stub de `ResizeObserver` —
jsdom não implementa isso e `@radix-ui/react-popper` (usado por `Tooltip`)
precisa dele mesmo sem nenhum teste chamar posicionamento explicitamente.

## Sistema de design compartilhado (professor/admin, 3.11)

Camada de tema visual mais rica pra professor/admin, construída sobre a
MESMA fundação de componente de 3.10 (Radix UI + React Aria,
`components/ui/`) — nunca uma biblioteca nova. A regra do card: a diferença
entre módulos é só tema (cor/sombra/movimento), nunca geometria de
componente — o botão do professor e o botão do aluno nascem do mesmo
`<Button>`, só com `--color-primary`/`--shadow-card` diferentes.

### A causa raiz que motivou o card

Os bugs dos prints (título/subtítulo sobrepostos, conteúdo preso numa faixa
estreita e centralizada em qualquer tela, inclusive do aluno) não eram bugs
pontuais de tela — eram `apps/web/src/index.css` ainda sendo, ao pé da
letra, o template padrão do `npm create vite` nunca limpo desde o bootstrap
do projeto: `#root { width: 1126px; text-align: center; border-inline:
... }` e `h1 { font-size: 56px; margin: 32px 0 }`/`h2 { line-height: 118%
}` sem nenhuma relação com o design real da plataforma. 3.11 reescreveu
`index.css` do zero (reset + tokens, ver abaixo) — isso sozinho já resolve
os dois bugs mais visíveis dos prints, em qualquer módulo.

### Tokens novos em `theme/sensory-theme.css`

- **Escala tipográfica** (`--font-size-h1/h2/h3/body/small`,
  `--line-height-heading/body`, `--font-weight-heading/body`) — definida
  uma vez, lida tanto por `index.css` (`<h1>`/`<h2>`/`<h3>`/`<p>` crus,
  maioria das telas de professor/admin hoje) quanto por
  `components/ui/Typography.css` (`<Heading>`/`<Text>`, aluno) — as duas
  formas de título têm a hierarquia idêntica, nunca 2 escalas divergentes.
  `line-height` proporcional ao tamanho da fonte (nunca um valor fixo) é
  especificamente o que fecha o bug "sobreposto".
- **`--page-max-width` (1080px) + classe `.page`** — grid de página
  compartilhado entre professor e admin (AC "mesmo grid... hoje ambos
  parecem centralizados sem largura máxima definida"). Substitui o
  `max-width`/`margin: auto` que `TeacherMetrics.css`/`AdminMetrics.css`/
  etc. repetiam cada uma na própria folha de estilo. Telas do aluno
  (`Home`/`SubjectSelector`/`OnboardingSensorial`) continuam com largura
  mais estreita própria — fluxo single-column, decisão de design, não bug.
- **`--shadow-card`/`--shadow-card-hover`/`--shadow-modal`** — elevação.
  `none` por padrão (aluno: `components/ui/Card.css` só usa borda simples);
  quem dá valor real é `.staff-theme` (ver abaixo). Um componente
  compartilhado nunca hardcoda `box-shadow` diretamente — sempre lê o
  token, então o MESMO `Card.css` renderiza plano no aluno e elevado no
  professor sem nenhum código condicional.

### `theme/staff-theme.css` — a classe `.staff-theme`

Aplicada na raiz de cada tela de staff (`<main className="teacher-metrics
staff-theme page">`) — nunca no `<html>` inteiro, porque papel de usuário é
exclusivo por sessão (`User.role`, ver `backend.md`), então não existe
transição aluno↔staff pra cobrir dentro da mesma árvore. Duas coisas
acontecem só dentro dela:

1. **Paleta mais rica**: `--color-primary`/`--color-primary-hover`/
   `--color-accent` mais saturados que os do aluno (permitido — RQ4
   hipersensibilidade sensorial, 30,43%, é especificamente sobre o aluno) +
   valor real pra `--shadow-card`/`--shadow-modal`.
2. **Microanimação permitida**: hover de botão/card com `transition`. Isto
   só é seguro porque `.staff-theme` é a ÚNICA exceção ao reset "sem
   transição por padrão" — a regra de `sensory-theme.css`
   (`:root:not([data-motion='full']) *`) ganhou um `:not(.staff-theme,
   .staff-theme *)` explícito. Um componente compartilhado (`Button`,
   `Card`) continua sem declarar a própria `transition` — ela só passa a
   existir por estar dentro de `.staff-theme`, nunca por o componente saber
   em qual módulo está. `prefers-reduced-motion` do SO continua valendo
   pra todo mundo, staff incluído — isso não é uma preferência específica
   de TEA, é acessibilidade geral, então nunca teve motivo pra ficar de
   fora do reset.

**Ícone**: nenhuma lib nova — emoji continua sendo o "sistema de ícone"
compartilhado dos 3 módulos (já era assim desde antes de 3.10/3.11).
Introduzir um set de ícone SVG dedicado contradiria a proibição explícita
do card ("não uma biblioteca nova"); decisão registrada aqui, não um
esquecimento.

### Componentes novos em `components/ui/`

- **`LinkButton`** — a mesma classe CSS de `Button` (`.ui-button`/
  `.ui-button--*` de `Button.css`) aplicada a um `<Link>` do react-router
  em vez de um `<button>`. Existe especificamente pro bug "← Voltar sem
  affordance de botão" dos prints — `<LinkButton to="/home" variant="ghost"
  icon="←">Voltar</LinkButton>` em vez de um `<Link>` de texto solto. É
  também o que garante a AC "consistência entre módulos": o botão "Entrar"
  (`Button`, elemento `<button>`) e "← Voltar" (`LinkButton`, elemento
  `<a>`) têm exatamente a mesma geometria porque compartilham a mesma
  classe — só o elemento HTML muda, nunca a forma.
- **`SegmentedControl`** (`@radix-ui/react-toggle-group`, `type="single"` +
  `rovingFocus`) — substitui o padrão "2 `<button>` soltos com
  `aria-selected` calculado à mão e estilos levemente diferentes um do
  outro" (era assim em `TeacherMetrics` "Por aluno"/"Turma toda"). Root sai
  `role="radiogroup"`, cada opção `role="radio"` — teclado (setas movem
  entre opções) vem da lib. `onValueChange` ignora string vazia: clicar de
  novo na opção já ativa nunca desmarca tudo (sempre existe uma visão
  ativa).
- **`Select`** (`@radix-ui/react-select`) — "Ordenar por"/"Desafio" deixam
  de ser `<select>` nativo sem estilo. `label` sempre visível (nunca só
  placeholder). Testar: as opções (`role="option"`) só existem no DOM com o
  dropdown aberto (diferente de `<option>` nativo, sempre presente) — todo
  teste que troca valor precisa abrir o trigger antes
  (`userEvent.click(getByLabelText(...))`), ver
  `ChallengeReport.spec.tsx`/`Select.spec.tsx`.
- **`Table`/`TableHead`/`TableBody`/`TableRow`/`TableHeaderCell`/
  `TableCell`** — Radix não tem primitivo de tabela (a semântica correta
  pra leitor de tela — `<table>`/`<th scope>`/`<td>` — já É headless por
  natureza); aqui só padronizamos espaçamento/zebra/divisor/peso do
  cabeçalho (`Table.css`), nunca a semântica. Usado hoje em
  `TeacherMetrics` (por aluno × desafio) e `AdminMetrics` (turmas de uma
  escola).
- **`Badge`** — "Concluído"/"Em andamento"/"Não iniciado" como componente
  (`variant="success"/"warning"/"neutral"`) em vez de `background-color`
  inline repetido em cada tela (AC explícita). Reaproveita as MESMAS cores
  de feedback (`--color-success`/`--color-warning`) que
  `InlineFeedback.tsx` usa pro aluno — "concluído = verde" significa a
  mesma coisa nos 3 módulos (feedback positivo pode ser expressivo, regra
  não-punitiva aplicada ao lado positivo).
- **`SelectableCard` ganhou `meta`/`align`** — `meta` é o metadado
  secundário (ex.: "Código: AZUL-1 · 12 alunos ativos"), sempre num nível
  tipográfico abaixo do título (AC "hierarquia clara... nunca tudo no mesmo
  nível visual"). `align="start"` (professor/admin — título+meta
  empilhados à esquerda) convive com o `align="center"` original do aluno
  (ícone grande em cima, ver `SubjectSelector`) no MESMO componente — só o
  arranjo do conteúdo muda, a fundação (`useButton`/`useFocusRing`/seleção)
  é idêntica.

### Telas migradas

`TeacherMetrics` é o card visual desta feature quase inteiro num lugar só —
"← Voltar" → `LinkButton`; card de turma → `SelectableCard align="start"
meta=...`; "Por aluno"/"Turma toda" → `SegmentedControl`; "Ordenar por" →
`Select`; tabela → `Table`; badge de status → `Badge`. `AdminMetrics`
(cards de escola + tabela de turmas), `AdminSettings` (botão "Salvar"),
`ChallengeReport` (picker de desafio) e `TeacherHome`/`AdminHome`/
`TeacherLogin`/`AdminLogin` (`Button`/`LinkButton`) seguem o mesmo padrão,
com `.staff-theme` na raiz de cada `<main>`. Nenhuma mudança de
comportamento/endpoint — só troca de camada visual; os testes já existentes
(`TeacherMetrics.spec.tsx`, `AdminMetrics.spec.tsx`, `AdminSettings.spec.tsx`,
`ChallengeReport.spec.tsx`) passam sem alteração de asserção de dado, só a
migração do picker de `ChallengeReport` (native `<select>` →
`@radix-ui/react-select`) trocou `userEvent.selectOptions` por
clique+clique nos testes correspondentes.

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
- `blocklyToolbox.applyGenerousSnapTolerance(tolerancePercent?)` sobe
  `Blockly.config.snapRadius`/`connectingSnapRadius`/`dragRadius` bem acima
  do default — tolerância ampla de encaixe (AC3, RQ4 coordenação motora
  fina). Chamado uma vez no carregamento do módulo (sem argumento, 100% —
  o comportamento de sempre) e de novo dentro de `onInject`, com
  `challenge.snapTolerancePercent ?? undefined` (4.2): um desafio criado
  via template pelo professor pode escolher uma tolerância diferente
  (nunca 0%, ver backend.md), reaplicada especificamente pra AQUELE
  desafio — `Blockly.config` é estado global do módulo, não por-workspace,
  então "reaplicar a cada desafio carregado" é o suficiente (não há dois
  workspaces com tolerâncias diferentes montados ao mesmo tempo nesta
  tela).
- Logging: `toolbox_rendered` (RD-I) uma vez, ao carregar o desafio;
  `block_dragged` (RD-I) a cada solta de bloco (via
  `workspace.addChangeListener` + `Blockly.Events.BlockDrag`, não o
  `onWorkspaceChange` simplificado do `react-blockly`, que não expõe o tipo
  do evento).
- **Sem autoria de toolbox LIVRE pelo professor** nesta tela — decisão
  explícita, ver "Blocos por desafio" em `backend.md`. A sequência de
  desafios de um tópico continua fixa (por `Challenge.position`), a mesma
  pra todo aluno. Desde 4.2, o professor cria desafios ADICIONAIS por fora
  dessa sequência via um formulário guiado por template — nunca editando
  `ChallengePage`/Blockly diretamente; ver "Configuração de desafio via
  formulário guiado — Modo Template" abaixo.

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

## Configuração de desafio via formulário guiado — Modo Template (4.2)

Três telas novas, todas `.staff-theme` (professor), reaproveitando
`components/ui/` como qualquer outra tela de staff (3.11) — nenhuma delas
importa Blockly nem monta um `<BlocklyWorkspace>`: o professor nunca vê a
representação em blocos, nem no formulário, nem no preview, nem num erro.

- **`/teacher/challenges`** (`TeacherChallenges`, AC5) — "Meus desafios":
  `GET /teacher/challenges`, um item por desafio criado via template
  (ícone+nome do template, nunca o `key` técnico). Ações: "Editar" e
  "Duplicar" (`LinkButton` pra `/teacher/challenges/:id/edit` e
  `/teacher/challenges/new?fromChallengeId=:id`) e "Excluir", que abre um
  `Dialog` de confirmação (`components/ui/Dialog`, 3.10 — **primeiro uso
  real desse componente no produto**, existia pronto desde 3.10 esperando
  "o dia que uma tela precisar de confirmação antes de uma ação difícil de
  reverter") antes de chamar `DELETE /teacher/challenges/:id`
  (`apiClient.delete`, novo método no wrapper — só faltava DELETE no
  conjunto get/post/patch/getRaw que já existia).
- **`/teacher/challenges/new`** (`TeacherChallengeNew`, AC1/AC2/AC6) — dois
  passos no mesmo componente: sem `selectedTemplateId`, mostra a GALERIA
  (`GET /challenge-templates`, um `SelectableCard align="start"` por
  template — nome+ícone+descrição em português, nunca o blockType); ao
  selecionar, busca `GET /challenge-templates/:id` (schema já resolvido) e
  troca pro `TemplateChallengeForm`. Query string `?fromChallengeId=` é o
  mecanismo de DUPLICAR (AC6): busca `GET /teacher/challenges/:id` do
  desafio de origem, pré-seleciona o MESMO template e pré-preenche o
  `TemplateChallengeForm` com os mesmos parâmetros + título sufixado
  "(cópia)" — nunca clona `Challenge.config` bruto, é literalmente reabrir
  a tela de criação com um rascunho diferente.
- **`/teacher/challenges/:id/edit`** (`TeacherChallengeEdit`, AC5) — busca
  `GET /teacher/challenges/:id` (403/404 vira uma frase, nunca stack
  trace) + `GET /challenge-templates/:templateId` pro schema, e renderiza
  o MESMO `TemplateChallengeForm`, `onSubmit` chamando `PATCH
  /teacher/challenges/:id` em vez de `POST .../challenges`. AC5 —
  "nenhuma tela de edição expõe estrutura de blocos" é verdade por
  construção: este componente nunca lê `Challenge.config`, só o que
  `GET /teacher/challenges/:id` devolve (`title`/`prompt`/`templateKey`/
  `params`).

### `TemplateChallengeForm` — um componente para criar/editar/duplicar

`components/template-form/TemplateChallengeForm.tsx` é o formulário guiado
de verdade, parametrizado só por `template` (o `ChallengeTemplateDetail`
já resolvido) + `initialTitle`/`initialParams` opcionais + `onSubmit` — as
3 telas acima só decidem QUANDO montá-lo e o que fazer com o resultado,
nunca reimplementam campo nenhum.

- **Renderização 100% orientada a schema**: um `TemplateParameterField`
  por entrada de `template.parameterSchema`, dispatch só por
  `definition.type`/`visualPreview` (`components/template-form/
  TemplateParameterField.tsx`) — nunca `if (param.key === 'sides')` em
  lugar nenhum. `integer` vira `<input type="number">`, `percentage` vira
  um `<input type="range">` com leitura numérica ao lado, `boolean` vira
  `ToggleSwitch` (`components/ui/`, pronto pra um template futuro que
  precise — nenhum parâmetro do MVP usa hoje, ver nota "sem parâmetro de
  ângulos negativos" em backend.md), `blockSelection` vira um
  `ToggleSwitch` por bloco candidato (reaproveita o mesmo componente de
  liga/desliga com estado sempre em texto — "Ligado"/"Desligado" — em vez
  de inventar um checkbox novo). É o mecanismo que cumpre "reutilizável
  sem refazer pra cada novo desafio": um template de outra disciplina só
  precisa reusar um `type`/`visualPreview` já suportado pra funcionar
  aqui sem tocar neste arquivo.
- **AC2 — exemplo visual inline por campo**: `visualPreview` decide qual
  miniatura SVG mostrar ao lado do controle — `PolygonPreviewIcon`
  (`sides`, desenha o polígono com o Nº de lados ATUAL — a prévia É o
  valor, atualiza a cada mudança, não um par estático "4 vs 6"),
  `AngleWedgeIcon` (`turnAngleDeg`, um leque cuja abertura é o ângulo —
  efeito isolado deste campo, independente de `sides`) e
  `ToleranceGaugeIcon` (`snapTolerancePercent`, barra preenchida
  proporcionalmente). Todo SVG inline, sem lib nova — mesmo padrão
  zero-dependência de `components/charts/`. Miniatura é decorativa
  (`aria-hidden` no wrapper): o valor em si já é anunciado pelo input
  rotulado (`aria-label`/`htmlFor` = `definition.label`), então a
  miniatura não duplica informação pra quem usa leitor de tela — só reforça
  visualmente pra quem enxerga.
- **AC3 — validação pedagógica inline, um endpoint pras duas coisas**:
  `runValidation()` chama `POST /challenge-templates/:id/preview` (sempre
  200, nunca lança) e `errorsByParameterKey` (`lib/templateParameterForm.ts`,
  função pura testada) indexa `errors` por `parameterKey` — cada
  `TemplateParameterField` recebe só a mensagem do PRÓPRIO campo, nunca um
  card de erro solto no topo da tela. Toda mudança em qualquer campo limpa
  `fieldErrors`/fecha o preview (`handleParamChange`) — nunca deixa uma
  mensagem de um valor anterior grudada depois que o professor já ajustou
  o valor.
- **AC4 — "Visualizar como aluno"**: `handleVisualize()` chama o MESMO
  `runValidation()`; se inválido, mostra os erros de campo (nunca abre o
  preview com dado incompleto); se válido, usa `goal` da resposta com
  `buildGoalPreviewPath` (`lib/turtleWorld.ts`) — **a mesma função pura que
  o botão de Ajuda do aluno (3.5) já usa pro traçado-alvo** — e
  `PixiTurtleWorld` (o mesmo componente de mundo do aluno, uma instância de
  `turtleExecutionStore` própria desta tela). O professor nunca vê um
  `<BlocklyWorkspace>`: o preview é só a forma final animada, exatamente
  como a fase Create do aluno mostraria. Animação sempre ligada aqui
  (`play(points, true)`), independente do próprio perfil sensorial do
  professor — a tela é uma demonstração de autoria, não a experiência
  sensorial real de nenhum aluno específico (cada aluno continua vendo o
  desafio de acordo com o PRÓPRIO perfil quando for jogar de verdade).
- **Salvar**: `handleSubmit` primeiro exige título não-vazio (mensagem
  própria, não HTML5 nativo — mesmo racional de `AdminSettings`), depois
  roda a mesma `runValidation()` antes de chamar `onSubmit({ title, params
  })` — nunca deixa a criação/edição ir pro backend com uma combinação que
  a própria tela já sabe que é inválida.

### `lib/templateParameterForm.ts` — funções puras, testadas

`buildInitialParams` (schema → rascunho com os defaults), `coerceParameterValue`
(string de `<input>` → número/boolean/array, nunca guarda string crua nem
`NaN`), `errorsByParameterKey`, `toggleBlockType` (liga/desliga 1 bloco na
lista sem duplicar/perder os outros). Nenhuma conhece "polígono" — são o
motor genérico por trás de `TemplateParameterField`/`TemplateChallengeForm`.

### Testes

`TemplateParameterField.spec.tsx` (cada `type`/`visualPreview`, rótulo
ícone+texto, erro inline) e `TemplateChallengeForm.spec.tsx` (bloqueio sem
título, bloqueio com combinação inválida — erro no campo certo, preview só
abre quando válido, payload de salvar) são os testes de lógica de decisão
mais densos desta feature — `Pixi` é mockado nesses dois arquivos (mesmo
racional do débito "ChallengePage sem RTL ainda" logo abaixo: jsdom não
roda WebGL/Canvas de verdade, o que importa testar é SE o painel de preview
aparece, não como o Pixi desenha por dentro). `TeacherChallenges.spec.tsx`/
`TeacherChallengeNew.spec.tsx`/`TeacherChallengeEdit.spec.tsx` cobrem a
galeria (AC1), a confirmação antes de excluir, e o fluxo de duplicar
(AC6) pré-preenchendo o mesmo template+parâmetros.

## Painel institucional do admin (`AdminMetrics`, 6.2)

`/admin/metrics` (`RequireAuth roles={['admin']}`), link a partir de
`AdminHome`: busca `GET /metrics/admin/schools` (card por escola —
`classroomsCount`/`teachersCount`/`activeStudentsCount`/
`activeStudentsToday`); clicar num card seleciona a escola e busca
`GET /metrics/admin/schools/:schoolId/classrooms` (nome da turma + professor
responsável + alunos ativos). Clicar de novo no mesmo card desmarca (mesmo
`onClick` alterna `selectedSchoolId`). Nenhum nome de aluno em nenhum
momento desta tela — é visão institucional (AC de 6.2); nível de aluno
individual é de uma feature futura (M5 em
`docs/ai/backlog/metricas-professor-admin.md`).

**Sem as restrições sensoriais do aluno** (`.staff-theme`, 3.11) — regra
não-negociável 1 protege a experiência do *aluno*, e `StaffLogin.css` já
estabelece esse mesmo racional pra telas de professor/admin; esta tela usa
cor/hierarquia visual mais densa de propósito. Card de escola é
`SelectableCard align="start"` (`components/ui/`) com `meta` = grid de
estatísticas — a sombra (`box-shadow: var(--shadow-card)`) e o hover com
leve elevação vêm do tema, não de CSS próprio da tela; lista de turmas é
`Table`. Desde 3.11, `.staff-theme` é a única exceção ao reset global de
`sensory-theme.css` (`:root:not([data-motion='full']) *`) — o hover do
card anima de verdade aqui, sem depender do aluno ter ativado animação (ver
"Sistema de design compartilhado" acima).

## Painel do professor: progresso por turma (`TeacherMetrics`, 6.3/6.4)

`/teacher/metrics` (`RequireAuth roles={['teacher']}`), link a partir de
`TeacherHome`. Busca `GET /home/teacher` (já existente, 2.1) pra listar as
turmas do próprio professor — mesmo endpoint que a home já usava, nenhuma
rota nova só pra listar turmas; a seleção de turma nesta tela nunca deixa o
professor digitar/injetar um `classroomId` arbitrário na UI (o backend
ainda valida titularidade de qualquer forma, ver "Painel do professor:
progresso por turma" em `backend.md`, mas a tela não dá esse vetor de
propósito).

Selecionar uma turma (`SelectableCard align="start"` com `meta` = código +
alunos ativos, ver 3.11) busca as duas rotas de métrica em paralelo
(`GET /metrics/teacher/classrooms/:id/students` e `.../summary`) e alterna
entre duas visões via `SegmentedControl` (`components/ui/`,
`@radix-ui/react-toggle-group` — antes de 3.11 era 2 `<button role="tab">`
com `aria-selected` calculado à mão):

- **"Por aluno" (6.3, visão default)** — `Table` (`components/ui/`) com 1
  linha por aluno matriculado ativo (nome + data de matrícula) e 1 coluna
  por desafio disponível (título + rótulo do estágio + status como `Badge`
  + nº de tentativas). Ordenação default é por data de matrícula (a mesma
  ordem que o backend já devolve); um `Select` (`components/ui/`,
  `@radix-ui/react-select`) deixa trocar pra ordenação por nome — **nunca**
  por status/tentativas, não existe essa opção na tela (regra não-negociável
  5, aplicada ao nível de UI também, não só ao default do backend).
- **"Turma toda" (6.4)** — 3 cartões de totais (`totalStudents`/
  `activeStudentsToday`/`helpButtonUsageRate`) e uma barra horizontal
  segmentada por estágio (`use`/`modify`/`create`), cada segmento com
  largura proporcional a `studentsCompleted`/`studentsInProgress`/
  `studentsNotStarted` — largura **estática**, calculada uma vez a partir
  do dado (`pct = count/total*100`), sem nenhuma transição/animação
  decorativa. `role="img"` com `aria-label` textual describe a barra pra
  leitor de tela, já que a informação em si é visual. Nenhum nome de aluno
  nesta aba (AC de 6.4) — só esta tela existe pra visão agregada;
  `STATUS_LABEL`/`STAGE_LABEL` (dicionários fixos no componente) são a
  única "tradução" de vocabulário técnico pra português, sem inferência
  nenhuma sobre o número (ex.: nunca "turma com dificuldade", só o
  percentual cru — regra não-negociável 7).

**Sem as restrições sensoriais do aluno** (`.staff-theme`, 3.11) — mesmo
racional de `AdminMetrics`/`StaffLogin`.

## Relatório de profundidade por desafio (`ChallengeReport`, 6.5)

`/admin/reports` (`RequireAuth roles={['admin']}`), link a partir de
`AdminHome`. Busca `GET /metrics/admin/challenges` (seletor — todo desafio
cadastrado, qualquer tópico, hoje um `Select` de `components/ui/` — nativo
`<select>` antes de 3.11, ver `ChallengeReport.spec.tsx` pro padrão de teste
clique+clique que substituiu `userEvent.selectOptions`) e, ao selecionar
um, `GET /metrics/admin/challenges/:challengeId` (o relatório completo).
`.staff-theme` na raiz da tela (3.11). "O que um revisor de
artigo esperaria ver" (AC de 6.5): todo card de estatística mostra
`<StatList>` (N/média/mediana/desvio/quartis em texto — a alternativa não-
visual ao gráfico) + `<SampleSizeNote>` (aviso quando `n < report.
minSampleSizeThreshold`, nunca esconde o número) + o gráfico recomendado.

- **Bloco comum** (todo desafio): `attemptsPerStudent` → `<StatList>` +
  `<BoxPlot>`; `attemptsHistogram` → `<BarChart>` (buckets fixos `1/2/3/
  4+`); `timeToFirstExecutionMs` → convertido pra segundos
  (`statsToSeconds`) antes de renderizar, porque o backend devolve `ms`
  bruto e nenhum revisor lê "4199994 ms" com facilidade;
  `eventsByCategory`/`eventsByType` → `<BarChart>` categórico (ordem fixa
  RD-I/P/C/E/L pro primeiro, ordenado por contagem pro segundo).
- **`modifyInsights`/`useInsights`** só renderizam quando a chave existe na
  resposta (`report.modifyInsights &&`, nunca checando `report.stage ===
  'modify'` no frontend — a mesma regra "nunca decidir por `stage`
  diretamente" que `ChallengePage` já segue, ver "Motor PRIMM" acima).
  `<RateCard>` (componente local) é o único jeito que a dualidade
  agregada×por-aluno da taxa de acerto aparece — dois números e dois `n`
  lado a lado, nunca fundidos num só.
- **`attemptsVsMatchRateScatter`** (só `modify`) vira `<ScatterPlot>` com
  eixos "Tentativas" × "Acerto (%)" — o array já vem sem identificador
  nenhum do backend, o componente nem saberia expor pseudônimo se
  quisesse.
- **Nenhum nome/pseudônimo de aluno aparece nesta tela em lugar nenhum** —
  testado explicitamente (`ChallengeReport.spec.tsx`, "never shows an
  individual student name/pseudonym").

### Gráficos (`components/charts/`)

SVG inline, sem biblioteca nova — segue o padrão zero-dependência já
estabelecido no resto do frontend (Blockly/PixiJS são os únicos motores de
render externos do projeto, e nenhum dos dois serve pra gráfico
estatístico). Hue único (`--color-primary`) em toda marca: nenhum destes
gráficos compara séries categóricas coloridas entre si (é sempre magnitude/
distribuição de 1 variável), então a paleta categórica de um design system
de dataviz não se aplica — "sequential = hue único" é o formato certo por
definição, não uma simplificação.

- **`<BoxPlot>`**: whiskers até min/max direto ("min-max boxplot", não
  Tukey/1.5×IQR com outlier à parte) — decisão deliberada dado N tipicamente
  pequeno neste produto. Mostra `N=0 — sem dados` pra distribuição vazia e
  uma mensagem própria pra `N=1` (desvio/quartis não calculáveis com 1
  sujeito), nunca uma caixa degenerada.
- **`<BarChart>`**: barras **horizontais** de propósito — rótulos deste
  relatório variam de curtos (`"1"`) a longos (`type` de evento, ex.
  `"toolbox_rendered"`), e horizontal evita rótulo rotacionado/cortado
  independente do tamanho do texto. Mesmo componente serve histograma
  (`attemptsHistogram`) e categórico (`eventsByType`, `eventsByCategory`,
  `mostChangedFieldDistribution`) — a diferença é só o array de entrada.
- **`<ScatterPlot>`**: 1 ponto = 1 aluno, `fill-opacity` < 1 como único
  mecanismo de legibilidade contra sobreposição (N pequeno não justifica
  jitter/clustering).
- Todo componente checa array vazio/`n=0` primeiro e renderiza
  `<p className="chart-empty">` em vez de calcular com dado vazio (guarda
  contra `NaN`/divisão por zero client-side, mesmo racional do backend).
- Estático, sem `transition`/`animation` — não depende do estado sensorial
  (área de staff/admin, mesmo racional de `AdminMetrics.css`), mas também
  não teria porquê de animar um gráfico de pesquisa.

### N mínimo (`AdminSettings`, 6.5)

`/admin/settings` — formulário mínimo de propósito (AC: "não precisa ser
dedicada, pode ser parte de uma tela geral de Configurações"), só o campo
`minSampleSizeThreshold` hoje. `GET /admin/settings` pré-preenche o input;
`PATCH /admin/settings` no submit. Validação client-side (inteiro
positivo) roda **antes** da checagem HTML5 nativa — o `<input type=
"number">` não declara `min`/`step`, de propósito: a validação nativa do
browser bloqueia o evento `submit` inteiro antes do JS rodar (não dispara
`onSubmit`), o que impediria a mensagem de erro própria do app ("Informe um
número inteiro positivo.") de aparecer — mesmo padrão de linguagem não-
punitiva/descritiva já usado em `StudentLogin`.

## Exportação de dados brutos (`AdminExport`, 6.6)

`/admin/export` — o admin escolhe um recorte (escola e/ou desafio via
`Select` de `components/ui/`, mais um período opcional com dois `<input
type="date">` nativos) e clica em "Baixar exportação"; a tela nunca mostra
os dados crus na própria página — o objetivo é analisar FORA da
plataforma (ver `docs/ai/backlog/metricas-professor-admin.md`, M6), então
o resultado sempre vira um arquivo baixado, nunca uma tabela em tela.

- **Formato decide o método de `apiClient` usado, não só um parâmetro de
  query**: `format=json` chama `apiClient.get<ExportResult>` (JSON
  parseado, `result.rows` vira o conteúdo do arquivo baixado — `JSON.
  stringify(result.rows, null, 2)`, não a resposta inteira com
  `page`/`pageSize`); `format=csv` chama `apiClient.getRaw` (texto cru,
  baixado exatamente como o backend gerou — `lib/apiClient.ts` ganhou esse
  método nesta feature, especificamente porque `get`/`post`/`patch` sempre
  fazem `response.json()`, o que quebraria num corpo CSV).
- **Download client-side via Blob + `<a download>` temporário**
  (`downloadFile`, local ao componente) — sem endpoint de "gerar link",
  sem redirecionar a aba; cria o `<a>`, clica, remove, revoga a URL do
  objeto.
- **Sentinela `__all__`** pros `Select` de escola/desafio representarem
  "sem filtro" — Radix Select não aceita `Item` com `value=""` (reservado
  internamente pra "nada selecionado"), então o "Todas as escolas"/"Todos
  os desafios" precisa de um valor real que o componente sabe tratar como
  ausência de filtro antes de montar a query string.
- **Validação client-side espelha a do backend** (ao menos um filtro;
  período sempre com as duas datas juntas) — mensagem própria antes de
  gastar uma chamada de API, mas o backend continua sendo a fonte de
  verdade (`MetricsAdminExportService`, ver `backend.md`); o card de erro
  (`InlineFeedback kind="retry"`) mostra a mensagem exata que a API
  devolve quando a validação passa do lado do cliente mas falha no
  servidor (ex.: período > 90 dias).
- **Aviso de `hasMore`**: quando a resposta JSON sinaliza que existem mais
  linhas além da página atual, a tela soma uma frase ao resumo pedindo pra
  reduzir o recorte — não existe paginação na UI (sem botão "próxima
  página") de propósito nesta versão; refinar o filtro é o caminho
  esperado, não navegar página a página num export de pesquisa.
- Sem `logEvent` — mesmo racional de `AdminMetrics`/`AdminSettings`
  (regra "eventos RD-* são escopados ao aluno", ver `backend.md`): esta é
  uma ação de staff, não gera dado de interação do aluno.
- `.staff-theme` na raiz, mesmo padrão de todo o resto da área de
  professor/admin (3.11).

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
- Migrar `ChallengePage` pra `components/ui/` (3.10/3.11 já migraram todo o
  resto — professor/admin inteiros, ver "Onde já está em uso vs. débito de
  migração" acima) — débito reconhecido, não bloqueante; migrar quando a
  tela for tocada por outro motivo.
- `components/ui/Tooltip`/`Tabs` seguem sem nenhum uso real em produção
  (3.10) — infraestrutura pronta, nenhuma tela pediu ainda. `Dialog` saiu
  dessa lista em 4.2 (confirmação de exclusão em `TeacherChallenges`,
  primeiro uso real).
- Desafio criado via template (4.2) não tem tela de "atribuir à turma" —
  hoje só é alcançável por link direto de `/challenge/:id`; ver gap
  equivalente em `backend.md` ("Autorização e escopo" / "Próximos
  passos").
- `TemplateParameterField` só tem componentes de exemplo visual pros 3
  `visualPreview` que o template `regular_polygon` usa hoje
  (`polygonSides`/`angleWedge`/`toleranceGauge`) — um template de outra
  disciplina que precise de um tipo de miniatura genuinamente novo (não
  reaproveitável) precisa de 1 componente SVG novo + 1 `case` em
  `renderVisualPreview`, o resto do formulário continua igual.
