# Design system — polimento visual e consolidação (DS1–DS4)

Documento de planejamento (nenhuma linha de código deste plano está
implementada ainda). Mesmo formato dos demais docs em `docs/ai/backlog/`
(User Story / Descrição / Rastreabilidade / Prioridade / Critérios de
Aceite / Dados-Eventos), pra poder ser colado direto no backlog externo.
Identificadores `DS1`–`DS4` são só referência interna deste arquivo —
renumere ao integrar.

## Contexto

O sistema de design da plataforma já existe e está em produção — não é um
card de "criar do zero". Foi construído em duas fases:

- **3.10** (issue #24) — base de componentes acessíveis do aluno
  (`components/ui/`), Radix UI + React Aria sobre CSS Variables/Zustand.
- **3.11** (issue #56) — tema compartilhado professor/admin (`.staff-theme`),
  escala tipográfica única, `--page-max-width`/`.page`, tokens de elevação.

Ver "Sistema de componentes acessíveis do aluno (3.10)" e "Sistema de
design compartilhado (professor/admin, 3.11)" em
[`docs/ai/modules/frontend.md`](../modules/frontend.md) para a arquitetura
completa já implementada.

Este documento **não recria o design system** — audita o que o próprio
`frontend.md` já registra como débito reconhecido ou inconsistência
residual ("Próximos passos" / "Onde já está em uso vs. débito de
migração") e propõe o fechamento desses pontos, mais a lacuna real que
falta: **documentação navegável** do sistema (hoje ele só existe descrito
em prosa dentro de `frontend.md`, não como referência visual consultável
por quem for construir uma tela nova).

## DS1 — Migrar `ChallengePage.tsx` para `components/ui/`

### Descrição

`ChallengePage.tsx` é a única tela de aluno que ainda não usa a base de
componentes acessíveis (3.10) — os botões Executar/Ajuda/Avançar/Predict e
o painel `challenge-page__feedback` são elementos nativos com CSS próprio
em `ChallengePage.css`/`WaterStateChallengePage.css`, em vez de `Button`/
`InlineFeedback` do barril compartilhado. Débito já reconhecido
explicitamente em `frontend.md` ("Não migrado ainda... critério pra migrar
continua o mesmo: só quando a tela for tocada por outro motivo").

Esta tela é hoje a mais visitada pelo aluno (é o editor de blocos em si),
então é também onde a inconsistência de área de toque/foco visível/rótulo
redundante entre telas do produto mais pesa.

### Rastreabilidade

- RQ4 — coordenação motora fina (21,74%): hoje os botões de
  `ChallengePage` não garantem `--hit-area-min` (56px) do mesmo jeito que
  `Button` garante — é herdado do CSS próprio da tela, não auditado num
  único lugar.
- RQ4 — acessibilidade de interface (26,09%): `challenge-page__feedback`
  não passou pelo componente `InlineFeedback` (que só chegou depois, 3.7) —
  checar se ícone+texto e `role="status"` continuam garantidos.
- Regra não-negociável 4 (feedback nunca punitivo): reforça a garantia via
  componente compartilhado em vez de depender de CSS/JSX duplicado.

### Prioridade

Média — não bloqueia nenhuma feature nova; é dívida de consistência numa
tela que já funciona corretamente hoje. Fazer junto da próxima mudança
funcional relevante em `ChallengePage`/`WaterStateChallengePage` (o
próprio `frontend.md` já recomenda essa janela, para evitar um PR gigante
só de refactor visual).

### Critérios de Aceite

- Botões Executar/Repetir execução/Ajuda/Avançar/"Próximo passo" usam
  `components/ui/Button` (ou `LinkButton` onde aplicável), preservando
  `variant`/ícone decorativo.
- Painel de feedback de Use/Create/Modify usa `InlineFeedback` (já é o
  caso desde 3.7 — confirmar que `WaterStateChallengePage` também usa, não
  só `ChallengePage`).
- Nenhuma mudança de comportamento/endpoint/evento — só troca de camada
  visual, mesma regra aplicada nas migrações de 3.11.
- Testes existentes (`ChallengePage.spec.tsx`, `WaterStateChallengePage`
  se existir) continuam passando sem alteração de asserção de dado.

### Dados/Eventos

Nenhum evento novo — troca puramente de camada de apresentação.

---

## DS2 — Guia vivo do design system (tokens e componentes navegáveis)

### Descrição

O design system da plataforma (tokens de `sensory-theme.css`/
`staff-theme.css`, os 13 componentes de `components/ui/`, a regra
aluno-vs-staff) hoje só é descrito em prosa dentro de `frontend.md` — não
existe uma página/artefato onde alguém (dev novo, ou o próprio professor
de design do time) veja os componentes renderizados lado a lado com seus
estados (habilitado/desabilitado/foco/alto contraste), sem precisar ler
markdown e depois abrir 5 telas diferentes do produto pra achar um
exemplo real de cada.

Proposta: um guia de estilo navegável (Storybook, ou uma rota interna
`/dev/design-system` renderizada só em modo dev — decisão de ferramenta
em aberto, ver nota abaixo) cobrindo:

- Tokens: paleta base (aluno) vs. paleta staff, escala tipográfica,
  escala de espaçamento, `--hit-area-min`/`--focus-ring-*`, elevação.
- Cada componente de `components/ui/` com seus estados reais (`Button`
  3 variantes, `ToggleSwitch` ligado/desligado, `Badge` 3 variantes,
  `SelectableCard` `align='center'|'start'`, etc.) — os mesmos estados já
  cobertos por `*.spec.tsx`, só renderizados visualmente em vez de só
  testados.
- Toggle ao vivo de `data-motion`/`data-contrast`/`data-sound` na própria
  página do guia, pra ver o efeito do perfil sensorial sem precisar logar
  como aluno e passar pelo onboarding a cada verificação visual.

⚠️ Nota de escopo: **isto é ferramenta de desenvolvimento, não uma tela
nova do produto** — não é visível a aluno/professor/admin em produção, não
compete com a regra "sem biblioteca nova" de 3.11 (que é sobre a
interface do produto) e não introduz risco sensorial (não é uma tela que
um usuário real usa). Se a decisão for Storybook, é uma devDependency,
nunca embarcada no bundle de produção.

### Rastreabilidade

⚠️ Sem respaldo direto no mapeamento sistemático — é infraestrutura de
processo de engenharia. Rastreável indiretamente à regra não-negociável 9
(painel do professor operável sem formação técnica) e à barreira
institucional/formação docente (17,39%) por analogia: assim como o
professor não deveria precisar entender Blockly/toolbox JSON, quem
constrói uma tela nova não deveria precisar reconstruir de memória qual
componente já resolve qual barreira — a documentação viva é o que evita
reinventar (ou pior, contornar) o sistema já construído em 3.10/3.11.

### Prioridade

Média-alta — quanto mais telas novas forem criadas sem uma referência
visual central, maior o risco de inconsistência (exatamente o problema que
motivou 3.11) se reabrir em outra frente do produto.

### Critérios de Aceite

- Toda entrada de `components/ui/index.ts` tem pelo menos uma página/story
  cobrindo seus estados documentados no respectivo `*.spec.tsx`.
- Tokens de `sensory-theme.css`/`staff-theme.css` documentados com nome,
  valor e onde são consumidos (não só uma lista de cores soltas).
- Guia acessível localmente via `npm run <script> --workspace apps/web`
  dedicado (ex.: `storybook`), sem afetar `build:web`/bundle de produção.
- README/`frontend.md` ganha um link pro comando que abre o guia.

### Dados/Eventos

Não aplicável — ferramenta de desenvolvimento, não emite eventos RD-*.

---

## DS3 — Tokenizar cor de texto sobre fundo saturado (`--color-text-on-dark`)

### Descrição

`color: #fff` está hardcoded (sem token) em 5 arquivos CSS —
`components/ui/Badge.css`, `routes/challenge/ChallengePage.css`,
`routes/challenge/WaterStateChallengePage.css`,
`routes/metrics/ChallengeReport.css`, `routes/metrics/MiniGameReport.css`
— sempre no mesmo papel: texto sobre um fundo colorido (badge de status,
faixa de feedback, cabeçalho de gráfico). Nenhum desses 5 lugares reage ao
modo alto-contraste (`data-contrast='high'`) porque o branco fixo nunca
passou a ser um token — diferente de `--color-bg`/`--color-text`/
`--color-primary`, que `sensory-theme.css` já redefine no bloco de alto
contraste.

Isso é uma lacuna concreta de acessibilidade de interface (RQ4, 26,09%):
hoje um badge "Concluído" (fundo `--color-success`, texto `#fff` fixo) não
tem a garantia de contraste mínimo (WCAG) revisada quando o aluno ativa
alto contraste — o token de fundo muda, o de texto não acompanha.

### Rastreabilidade

- RQ4 — acessibilidade de interface (26,09%): contraste texto/fundo é
  parte central dessa barreira, e hoje só é auditado para o par
  `--color-text`/`--color-bg`, não para texto-sobre-cor-de-destaque.
- Regra não-negociável 1 (filtro sensorial antes do estético): um valor
  fixo escapando do sistema de tokens é exatamente o tipo de regressão
  silenciosa que motivou reescrever `index.css` em 3.11.

### Prioridade

Baixa-média — não é um bug visível hoje (o branco funciona bem sobre as
cores atuais), é prevenção de regressão futura e fechamento de lacuna do
sistema de alto contraste.

### Critérios de Aceite

- Novo token `--color-text-on-dark` (ou nome equivalente) em
  `sensory-theme.css`, com valor próprio no bloco de alto contraste
  (`:root[data-contrast='high']`) se a auditoria de contraste apontar
  necessidade.
- Os 5 arquivos listados passam a ler o token em vez do literal `#fff`.
- Nenhuma mudança visual perceptível no modo padrão (o valor do token no
  tema base é `#fff`, idêntico ao literal atual) — só o modo alto
  contraste pode mudar, se a auditoria justificar.

### Dados/Eventos

Nenhum evento novo — mudança de CSS/token.

---

## DS4 — Ativar `Tabs`/`Tooltip` do sistema de design no primeiro uso real (ou remover se seguirem sem uso)

### Descrição

`components/ui/Tabs` e `components/ui/Tooltip` (Radix, parte de 3.10)
seguem "sem nenhum uso real em produção" — infraestrutura pronta,
testada, mas nenhuma tela do produto os consome (`frontend.md`, seção
"Próximos passos"). Isso não é um bug, mas é código morto do ponto de
vista do produto: cada componente do design system deveria eventualmente
ganhar um consumidor real, ou o próprio time deveria decidir
explicitamente descontinuá-lo — nenhum dos dois caminhos está fechado
hoje.

### Rastreabilidade

⚠️ Sem achado direto de RQ4 — é manutenibilidade do design system em si.
Indireto: cada componente sem uso real é um componente cujo contrato
comportamental (foco por teclado, `aria-*`) nunca foi validado contra uma
necessidade de tela de verdade, só contra o próprio teste unitário.

### Prioridade

Baixa — não é bloqueante, é auditoria de dívida de design system.

### Critérios de Aceite

- Decisão registrada (comentário na issue, ou atualização de
  `frontend.md`) para cada um dos dois componentes: **(a)** identificado
  um uso real na tela em que fizer sentido nativamente (ex.: `Tooltip`
  como reforço textual opcional em alguma métrica de `ChallengeReport`/
  `AdminMetrics` que hoje só tem rótulo curto; `Tabs` em qualquer tela
  futura com navegação por seções, sem forçar um uso artificial numa tela
  que já está resolvida por outro componente — `TeacherMetrics`
  "Por aluno/Turma toda" já é `SegmentedControl`, não é candidato); ou
  **(b)** decisão explícita de manter como infraestrutura pronta sem uso
  ainda, documentada, não silenciosa.
- Nenhuma migração forçada de uma tela que já usa o componente certo
  (`SegmentedControl`) só para justificar uso de `Tabs`.

### Dados/Eventos

Não aplicável a menos que um uso real específico seja escolhido — nesse
caso, seguir o padrão de logging já existente na tela escolhida.

---

## DS5–DS9 — Troca de emoji por `lucide-react` + alinhamento ícone/texto

### Contexto e decisão (reabre nota de 3.11)

`docs/ai/modules/frontend.md` registrava emoji como "sistema de ícone"
deliberado, com a nota explícita "introduzir um set de ícone SVG dedicado
contradiria a proibição explícita do card [3.11] ('não uma biblioteca
nova')". Esta frente **reabre essa decisão intencionalmente** — decisão do
usuário, não uma constatação de bug — trocando por `lucide-react`
(~1500 ícones, traço único consistente 24×24/stroke 2px, MIT, tree-shakeable).

Justificativa (RQ4 — acessibilidade de interface, 26,09%, mesma barreira
que já motivava "ícone nunca substitui texto"): emoji varia de renderização
entre SO/navegador, carrega cor e peso emocional/cultural imprevisível
(nem sempre neutro), e não tem tamanho auditável contra `--hit-area-min`.
Um set de traço único, monocromático (herda `currentColor`, segue o token
de cor do texto ao lado) e tamanho fixo é mais previsível — menos ruído
visual não solicitado, não mais. Isto não afrouxa a regra "ícone + texto
sempre juntos" (4/`Button`/`InlineFeedback` seguem exigindo os dois) — só
troca o glifo.

Emoji aparece hoje em ~44 arquivos (`components/ui/*` + telas de aluno,
professor, admin, mini-jogos). Dividido em 5 cards pra poder ser
distribuído a alguém júnior um de cada vez, sem depender de dominar o
sistema inteiro de uma vez.

### DS5 — Fundação: dependência + `components/ui/Icon` + mapeamento (NÃO júnior)

Card de base, feito por quem já conhece o sistema de design — os demais
(DS6–DS9) dependem deste.

Critérios de Aceite:
- `lucide-react` adicionado via `npm install --workspace apps/web
  lucide-react` (nunca instalado dentro de `apps/web` isolado — regra do
  monorepo).
- Novo `components/ui/Icon.tsx` (wrapper fino: tamanho fixo por token
  novo, ex. `--icon-size: 20px`, cor sempre `currentColor` — nunca cor
  hardcoded no ícone, pra herdar automaticamente `--color-primary`/
  `--color-on-dark`/etc. de onde for usado) + `Icon.spec.tsx`.
- Tabela de mapeamento emoji → componente Lucide (ex.: `⚙️` →
  `Settings`, `←` → `ArrowLeft`, `✓`/`✅` → `Check`, `❌` → `X`, `🔎` →
  `Search`, `❄️`/`💧`/`☁️` → `Snowflake`/`Droplet`/`Cloud`) documentada em
  `docs/ai/modules/frontend.md`, seção de ícone — é a referência que os
  cards DS6–DS9 seguem, pra não cada um escolher um ícone diferente pro
  mesmo conceito.
- `Button`/`LinkButton`/`InlineFeedback`/`Dialog`/`Card` (os 5 componentes
  de `components/ui/` que hoje aceitam/renderizam emoji) migrados pra
  `Icon`, com os ícones default de `InlineFeedback` (sucesso/retry)
  atualizados na mesma migração — são o contrato que toda tela nova (e as
  migrações DS6–DS9) vai consumir.
- Nenhuma mudança de comportamento — só o glifo do ícone.

### Regras comuns a DS6–DS9

- Trocar cada emoji listado pelo `Icon` (Lucide) correspondente na tabela
  de mapeamento de DS5 (`docs/ai/modules/frontend.md`). Conceito sem
  ícone mapeado ainda? Perguntar antes de escolher um por conta própria.
- Só troca de glifo — nada de lógica, endpoint, evento ou texto além do
  emoji.
- Teste que afirma o emoji literal (ex. `getByText('🔁')`) é atualizado
  pra afirmar o ícone novo, resto do teste não muda.
- Fazer sempre depois de DS5 estar mesclado.

### DS6 — Trocar emoji por `Icon`: área do aluno (júnior)

| Tela | Emojis a trocar |
|---|---|
| `routes/login/RoleSelect.tsx` | 🎒 🍎 🛠️ |
| `routes/home/StudentHome.tsx` | 🚪 ⚙️ 📈 🎉 |
| `routes/StudentSensorySettings.tsx` | 🔊 ✨ |
| `routes/SubjectSelector.tsx` | 📐 💻 🎮 🧩 |
| `routes/challenge/ChallengePage.tsx` | 🔁 ▶️ 🔎 |
| `routes/challenge/WaterStateChallengePage.tsx` | ❄️ 💧 ☁️ 🔁 ▶️ |
| `components/challenge/WaterStateTransition.tsx` | ❄️ 💧 ☁️ |
| `routes/login/StudentLogin.tsx`, `routes/RootRedirect.tsx`, `routes/RequireAuth.tsx` | nenhum emoji encontrado — conferir mesmo assim |

Critérios de Aceite: todos os emojis da tabela trocados pelo `Icon`
correspondente; testes que afirmam o emoji literal ajustados; suíte de
testes passando.

### DS7 — Trocar emoji por `Icon`: área do professor (júnior)

| Tela | Emojis a trocar |
|---|---|
| `routes/home/TeacherHome.tsx` | 🚪 ➕ 🧑‍🤝‍🧑 📈 🧩 🎮 |
| `routes/teacher/TeacherChallenges.tsx` | ➕ 🏫 ✏️ 🧬 🗑️ |
| `routes/teacher/TeacherMiniGameSettings.tsx` | 🗑️ ➕ |
| `routes/teacher/TeacherStudents.tsx` | 🔄 🔑 |
| `routes/teacher/TeacherAddStudent.tsx` | 🖨️ ➕ |
| `routes/metrics/TeacherMetrics.tsx` | 📚 📊 🧩 🎮 |
| `routes/teacher/TeacherChallengeNew.tsx`, `TeacherChallengeEdit.tsx` | nenhum emoji hardcoded encontrado (ícone vem do template, dado do banco) — conferir mesmo assim |

Critérios de Aceite: todos os emojis da tabela trocados pelo `Icon`
correspondente; testes que afirmam o emoji literal ajustados; suíte de
testes passando.

### DS8 — Trocar emoji por `Icon`: área do admin e relatórios (júnior)

| Tela | Emojis a trocar |
|---|---|
| `routes/home/AdminHome.tsx` | 🚪 👤 🏫 📊 🔬 🎮 ⚙️ |
| `routes/admin/AdminUsers.tsx` | ➕ ✏️ 🛡️ 🔑 🚫 ✅ |
| `routes/admin/AdminSchools.tsx` | ➕ 🏫 ✏️ 🚫 ✅ |
| `routes/admin/AdminSchoolClassrooms.tsx` | ➕ ✏️ 🚫 ✅ |
| `routes/metrics/AdminMetrics.tsx` | 🏫 |
| `routes/metrics/AdminSettings.tsx`, `AdminExport.tsx`, `ChallengeReport.tsx`, `MiniGameReport.tsx`, `components/charts/BarChart.tsx` | nenhum emoji encontrado — conferir mesmo assim |

Critérios de Aceite: todos os emojis da tabela trocados pelo `Icon`
correspondente; testes que afirmam o emoji literal ajustados; suíte de
testes passando.

### DS9 — Trocar emoji por `Icon`: mini-jogos (júnior)

⚠️ Fora de escopo: emoji desenhado **dentro do canvas Pixi**
(`components/minigame/scenes/fractionsFactoryScene.ts`,
`components/minigame/scenes/placeholderScene.ts`) — não é JSX/CSS, não dá
pra trocar pelo `Icon` da mesma forma. Não tocar nesses 2 arquivos.

| Tela | Emojis a trocar |
|---|---|
| `routes/minigame/MiniGamePage.tsx` | ➡️ 📋 |
| `routes/minigame/fractions/FractionsGamePage.tsx` | 👀 🔍 ✏️ 🧩 📋 ➡️ ✓ |
| `routes/minigame/work-tools/WorkToolsGamePage.tsx` | 👀 🔎 ✅ ✏️ 👉 🔁 📋 ➡️ |
| `components/minigame/MiniGameBriefing.tsx` | 🚩 🏁 |
| `components/minigame/cardLabels.ts` | 🧺 ✂️ 🔁 🎁 📦 |
| `components/minigame/CardSequenceEditor.tsx` | 🗑️ |

Critérios de Aceite: todos os emojis da tabela trocados pelo `Icon`
correspondente; `fractionsFactoryScene.ts`/`placeholderScene.ts` não
alterados; testes que afirmam o emoji literal ajustados; suíte de testes
passando.

### Rastreabilidade (comum a DS5–DS9)

RQ4 — acessibilidade de interface (26,09%): consistência visual e
previsibilidade de tamanho/cor do ícone. Regra não-negociável 1 (filtro
sensorial antes do estético): `Icon` nunca ganha cor/animação própria fora
do que o token/`.staff-theme` já define — segue exatamente o mesmo
mecanismo que `Button`/`Card` já usam.

### Prioridade

Baixa individualmente (cosmético, mecânico) — adequado pra distribuir
como primeiras tarefas de alguém júnior no projeto, um card por vez,
sempre depois de DS5 estar mesclado.

### Dados/Eventos

Nenhum evento novo em nenhum dos 5 cards — troca de glifo visual.

---

## DS10 — Corrigir sublinhado herdado em todo `LinkButton` (bug, não cosmético por design)

### Descrição

Auditoria visual (screenshots reais das telas de aluno/professor/admin,
14/09/2026) encontrou a causa raiz de vários botões "parecerem link":
`.ui-button` (a classe base em `components/ui/Button.css`) nunca reseta
`text-decoration`. Isso não afeta `Button` (elemento `<button>`, sem
sublinhado nativo do navegador), mas afeta **todo `LinkButton`** (elemento
`<a>` do react-router) — confirmado comparando o CSS computado:

```
LinkButton (<a>, qualquer variant): textDecorationLine = "underline"  ← bug
Button (<button>, qualquer variant): textDecorationLine = "none"      ← correto
```

Isso não é só os botões `ghost` tipo "Voltar" — afeta também botões
`primary`/`secondary` sólidos que navegam em vez de disparar ação: "Adicionar
aluno"/"Meus alunos"/"Meus desafios" (`TeacherHome`), "Criar desafio"
(`TeacherChallenges`), "Editar"/"Duplicar" (`TeacherChallenges`), e os
itens de mini-jogo/desafio em `SubjectSelector.tsx` (já são `LinkButton
variant="secondary"`, não falta estilo — é o mesmo bug do sublinhado).
Contradiz o próprio racional documentado em `LinkButton.tsx` ("Entrar"
(Button) e "← Voltar" (LinkButton) nascem visualmente idênticos").

### Critérios de Aceite

- `.ui-button` em `Button.css` ganha `text-decoration: none` na regra
  base (não em cada variant — é a mesma classe pra `Button` e
  `LinkButton`).
- Conferido visualmente (`npm run dev:web`) que nenhum `LinkButton` do
  app aparece sublinhado: "Voltar" (qualquer tela), "Configurações"
  (`StudentHome`), os botões de `TeacherHome`, "Criar desafio"/"Editar"/
  "Duplicar" (`TeacherChallenges`), mini-jogos/desafios em
  `SubjectSelector`.
- `Button` (elemento `<button>`) continua sem sublinhado — sem mudança
  visual ali.
- Testes existentes continuam passando (mudança é só decoração visual,
  não afeta texto/role/comportamento).

### Rastreabilidade

RQ4 — acessibilidade de interface (26,09%): consistência visual entre
elementos com a mesma função (navegação) é parte da previsibilidade que a
barreira exige. Regra não-negociável 1: fundação de componente
compartilhada (`Button.css`) é o único lugar que devia decidir isso — a
inconsistência veio de uma omissão nessa fundação, não de uma tela
individual.

### Prioridade

Alta — é bug (contradiz o próprio contrato documentado do componente),
correção de 1 linha, conserta a aparência de dezenas de botões em todas
as áreas do produto de uma vez.

### Dados/Eventos

Nenhum evento novo — mudança de CSS.

---

## DS11 — "Sair"/"Configurações"/"Voltar" sem fundo: trocar `ghost` → `secondary`

### Descrição

Decisão do usuário: essas 3 ações (hoje `variant="ghost"` — fundo
transparente por design, ver `Button.css`) devem ganhar fundo
(`secondary`: fundo `--color-surface`, borda `--color-border`) pra parar
de parecer um link de texto solto, mesmo depois do fix de DS10. Trocar só
a prop `variant`, sem tocar em `icon`/rota/handler.

⚠️ Fazer depois de DS10 mesclado, pra já conferir o resultado final (fundo
+ sem sublinhado) de uma vez.

### Telas a trocar

**"Voltar" (`LinkButton variant="ghost"` → `"secondary"`):**
`routes/admin/AdminUsers.tsx`, `AdminSchools.tsx`,
`AdminSchoolClassrooms.tsx` ("Voltar para escolas"), `routes/
StudentSensorySettings.tsx`, `routes/teacher/TeacherAddStudent.tsx` (3
ocorrências), `TeacherChallengeEdit.tsx`, `TeacherChallengeNew.tsx`,
`TeacherChallenges.tsx`, `TeacherStudents.tsx`,
`TeacherMiniGameSettings.tsx`, `routes/metrics/TeacherMetrics.tsx`,
`AdminMetrics.tsx`, `AdminSettings.tsx`, `AdminExport.tsx`,
`ChallengeReport.tsx`, `MiniGameReport.tsx`, `routes/minigame/
MiniGamePage.tsx`, `routes/minigame/fractions/FractionsGamePage.tsx` (2
ocorrências), `routes/minigame/work-tools/WorkToolsGamePage.tsx` (2
ocorrências).

**"Sair" (`Button variant="ghost"` → `"secondary"`):** `routes/home/
AdminHome.tsx`, `StudentHome.tsx`, `TeacherHome.tsx`.

**"Configurações" (`LinkButton variant="ghost"` → `"secondary"`):**
`routes/home/StudentHome.tsx` (a de `AdminHome.tsx` já é `secondary`,
não mexer).

⚠️ Fora de escopo: os "Voltar" com elemento `<Link>` puro (não
`LinkButton`) em `routes/challenge/ChallengePage.tsx` e
`WaterStateChallengePage.tsx` — já cobertos por DS1 (migração dessas
telas pra `components/ui/`), não duplicar aqui.

### Critérios de Aceite

- Todas as ocorrências listadas trocam `variant="ghost"` por
  `variant="secondary"` (nenhuma outra prop tocada).
- Conferido visualmente que "Voltar"/"Sair"/"Configurações" agora têm
  fundo (`--color-surface`) e borda em toda tela onde aparecem.
- Nenhuma mudança de comportamento/rota/evento.
- Testes existentes continuam passando (nenhum deles depende do
  `variant` como seletor).

### Rastreabilidade

RQ4 — acessibilidade de interface (26,09%): affordance de "isto é
clicável" mais forte com fundo+borda do que com texto solto, mesmo
depois do fix de sublinhado de DS10.

### Prioridade

Baixa-média — cosmético, mecânico, mas visível (ações presentes em quase
toda tela do produto).

### Dados/Eventos

Nenhum evento novo — troca de variant visual.
