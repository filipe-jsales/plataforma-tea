# Mini Jogos Sérios — 2ª metodologia ativa (plano de features)

Documento de planejamento, no mesmo formato já usado em
`docs/ai/backlog/metricas-professor-admin.md` (User Story / Descrição /
Rastreabilidade / Critérios de Aceite / Dados-Eventos / Bibliotecas
sugeridas), para poder ser colado direto no backlog externo. Identificadores
`MJ1`–`MJ8` são só referência interna deste arquivo — renumere ao integrar
no board principal.

## Contexto

MVP validou a 1ª metodologia ativa (Visual Programming Environments — 1ª
mais usada na literatura, RQ1: 52,17%) via editor de blocos Blockly +
mundo PixiJS. Esta frente adiciona a 2ª mais usada (Serious Games, RQ1:
39,13%) como via **complementar**, não substituta — atacando o mesmo
assunto curricular do MVP, nunca um módulo desconectado. Toda feature
herda as regras não-negociáveis já definidas em `docs/ai/rules/
coding-rule.md`/`docs/ai/persona.md` — não repetidas item a item abaixo.

**Decisão de arquitetura já tomada ao implementar MJ1** (diverge do texto
original do card): o motor de mini jogo usa **PixiJS**, não Phaser. O
próprio card já reconhece o risco de manter dois motores de renderização
2D no projeto ("por isso a recomendação é convergir... para ambos") — mas
o motor que já está em produção (`PixiTurtleWorld.tsx`, mundo de execução
do desafio de blocos) é PixiJS, não Phaser. Introduzir Phaser agora
criaria exatamente o problema de duas stacks que o próprio risco descreve;
reaproveitar PixiJS (já testado, já no bundle, mesmo padrão de componente
isolado por store) resolve o objetivo declarado ("evitar duas stacks") sem
precisar migrar o mundo de tartaruga já em produção. Ver "Riscos e
trade-offs" no fim deste documento.

## Status de implementação

| Item | Status |
|---|---|
| MJ1 — Motor base | **Implementado** (ver `docs/ai/modules/frontend.md` → "Motor base de mini jogos sérios (MJ1)") |
| MJ7 — Schema de eventos | **Implementado** (ver mesma seção — vocabulário de eventos do motor) |
| MJ2 — Perfil sensorial aplicado por padrão | **Implementado** — `MiniGameEngine` lê `useSensoryProfileStore` ao vivo (`getSensory()` no contexto de cena) e repassa pra cena decidir animar/tocar som; `motionEnabled` combina o toggle da plataforma com `prefers-reduced-motion` do SO (`lib/prefersReducedMotion.ts`) — o canvas Pixi não é coberto pelo `@media` já usado em CSS, então esta combinação é o que fecha o AC "respeita o SO automaticamente" pro motor de jogo. Checklist QA em `docs/ai/qa/sensory-checklist-minigames.md`. |
| MJ3 — Roteiro visual estruturado | **Implementado** — `components/minigame/MiniGameBriefing.tsx`, reutilizável, aplicado tanto na cena placeholder (`MiniGamePage.tsx`) quanto no jogo de conteúdo (`FractionsGamePage.tsx`); botão "Ver roteiro" reabre. Verificação encontrou e corrigiu um bug real: remontar `MiniGameEngine` ao reabrir o roteiro resetava silenciosamente a fase PRIMM/tentativas (violava "sem perder o progresso") — corrigido com `shouldRestartScene` (testado em `MiniGameEngine.spec.ts` + regressão de ponta a ponta em `FractionsGamePage.spec.tsx`, e confirmado num navegador real, screenshot antes/depois de reabrir). |
| MJ4 — Áreas de interação grandes e tolerantes | **Implementado**, entregue junto com o 1º jogo de conteúdo — `components/minigame/CardSequenceEditor.tsx` reordena por botão ↑/↓ (nunca drag-and-drop), sem timer obrigatório em nenhuma mecânica. Testado com mouse E teclado (Tab+Enter, sem clique nenhum) em `CardSequenceEditor.spec.tsx`/`CardBank.spec.tsx`; touch não exige código próprio (mesmos `<button>` nativos/React Aria da plataforma inteira). |
| MJ5 — Rotulagem redundante | **Implementado**, verificado critério a critério — `InlineFeedback`/`Button`/`SelectableCard` (`components/ui`) garantem ícone+texto por contrato; resultado da rodada nunca é só cor (a peça entregue no Pixi também ganha ícone de check); feedback de erro é sempre descritivo/reversível, nunca "errado" (testado). |
| MJ6 — Comparação de progresso (opt-in) | **Verificado, continua não implementado — bloqueio confirmado.** A flag "comparação entre alunos" que MJ6 diz reaproveitar (#37/#27) não existe em NENHUM lugar do código hoje, nem pro desafio de blocos. MJ6 exige explicitamente reusar essa flag, nunca criar uma segunda — construir uma flag só pro mini jogo violaria essa regra do próprio card. Decisão registrada com o produto (2026-08-24): manter bloqueado/documentado em vez de implementar uma comparação de alunos nova e isolada. |
| MJ8 — Vínculo conceito-currículo | **Implementado** (infraestrutura pronta, ainda sem par real). `Topic.conceptId` (nullable, migration `AddConceptIdToTopics`) é o lado que faltava — `MiniGameLevel.conceptId` (MJ7) já existia. `MetricsTeacherService.getConceptComparison` + `GET /metrics/teacher/classrooms/:id/concept-comparison?conceptId=` devolvem os dois sinais lado a lado por aluno; tela em `TeacherMetrics.tsx`, aba "Blocos × jogo". Hoje nenhum tópico de blocos usa `conceptId: 'fractions_equal_parts'` (`hasBlocksChallenge: false`), então a tela mostra só o sinal do mini jogo com um aviso descritivo — sem erro, sem dado fabricado. Vira comparação real assim que um tópico de blocos do mesmo assunto for cadastrado, sem precisar de mudança de código. |

**1º mini jogo de conteúdo real:** "Fábrica de Pedaços Iguais" (frações),
ver `docs/ai/backlog/mini-jogo-fabrica-pedacos-iguais.md`. MJ4/MJ5 acima só
fazem sentido sobre uma mecânica de verdade — este jogo é o veículo que
fechou as duas.

**2º mini jogo de conteúdo (planejado, não implementado):** "Ferramentas
do Mundo do Trabalho" — mecânica de "ligar" + verdadeiro ou falso, BNCC
EM13CO09 ("identificar tecnologias digitais... no mundo do trabalho"),
categoria **Educação em Computação** (não uma disciplina da educação
básica, diferente dos dois módulos de blocos e da "Fábrica de Pedaços
Iguais" — ver `docs/ai/backlog/categorizacao-informatica-educacional-x-
educacao-computacao.md`). Plano completo em
`docs/ai/backlog/mini-jogo-ferramentas-mundo-trabalho.md`, incluindo a
generalização de infraestrutura necessária (`MiniGameLevel.gameKey` +
dispatch de validação por tipo de jogo) antes do conteúdo em si — hoje
`MinigamesService` só sabe validar o shape de frações.

---

## MJ1 — Motor base de mini jogos sérios como segunda metodologia ativa

**Descrição:** Infraestrutura inicial para mini jogos sérios (engine, ciclo
de vida da cena, integração com o roteador da área do aluno), tratando o
mini jogo como uma via alternativa/complementar de trabalhar o mesmo
conceito curricular já coberto pelo desafio de blocos — não como um módulo
desconectado. Cada mini jogo segue internamente o ciclo PRIMM
(Predict → Run → Investigate → Modify → Make), mesmo sem expor esses
rótulos ao aluno.

**Rastreabilidade:** RQ1 — Serious Games é a 2ª tecnologia mais usada na
literatura (39,13%), atrás só de Visual Programming Environments
(52,17%). Regra não-negociável de PRIMM como arquitetura interna do
componente de desafio.

**Critérios de aceite:**
- [x] Componente de mini jogo isolado, renderizado na área do aluno, sem
  acoplamento direto ao estado do editor de blocos.
- [x] O mini jogo referencia o mesmo `conceptId` do desafio de blocos
  correspondente (string livre hoje — o vínculo formal de currículo é
  MJ8, futuro).
- [x] Estrutura interna segue as 5 fases do PRIMM, sem expor os termos na UI.
- [x] Uma única cena carregada por vez (trocar de cena sempre desmonta a
  anterior primeiro).
- [x] Lazy-loading do motor — só carrega na rota do mini jogo, sem
  impacto de bundle na área principal de blocos.

**Bibliotecas usadas:** PixiJS (já dependência do projeto via
`PixiTurtleWorld.tsx`) — ver nota de decisão de arquitetura acima.

---

## MJ2 — Perfil sensorial aplicado por padrão aos mini jogos

**Descrição:** Todo mini jogo nasce sem som, sem partículas, sem
screen-shake, sem flash/estroboscopia e sem timer visível, herdando o
mesmo estado global de perfil sensorial (Zustand) já usado no restante da
plataforma. Qualquer efeito estético nasce desligado e é opt-in.

**Rastreabilidade:** RQ4 — Hipersensibilidade sensorial é a 2ª barreira
mais citada (30,43%). Regra não-negociável 1.

**Critérios de aceite:**
- Áudio do mini jogo é `muted` por padrão, só ativa se ligado
  explicitamente nas configurações sensoriais (reaproveitar
  `useSensoryProfileStore.soundEnabled`, já existente).
- Nenhum efeito de partícula, tremor de tela ou flash acima de 3Hz em
  nenhum mini jogo por padrão.
- Motor respeita `prefers-reduced-motion` automaticamente (reaproveitar
  `useSensoryProfileStore.motionEnabled` + `data-motion`, já existente).
- Nenhum contador regressivo visível por padrão.
- QA sensorial documentado: checklist executado antes de cada mini jogo
  novo entrar em produção.

**Bibliotecas sugeridas:** Nenhuma adicional — reaproveitar a camada de
tema/estado sensorial já definida, injetada como config no `Pixi.
Application` (volume master, toggles de partícula/tween).

---

## MJ3 — Roteiro visual estruturado (estilo TEACCH) antes de cada mini jogo

**Descrição:** Antes de iniciar qualquer mini jogo, o aluno vê uma tela
estruturada e previsível mostrando o que vai fazer, em quantas etapas, e
como saber que terminou.

**Rastreabilidade:** RQ2 — TEACCH/Estruturado é o modelo pedagógico mais
eficaz e mais usado na literatura (39,13%).

**Critérios de aceite:**
- Toda cena é precedida por uma tela de roteiro com objetivo em
  linguagem simples, número de etapas, e indicação visual de
  "início"/"fim".
- Ícone + texto em cada etapa (nunca só um dos dois).
- Mesmo padrão visual reutilizado em todos os mini jogos.
- Aluno pode reabrir o roteiro a qualquer momento sem perder progresso.

**Bibliotecas sugeridas:** Componente React puro (fora do canvas do
motor), consistente com o resto da UI — não requer biblioteca de jogo.

---

## MJ4 — Áreas de interação grandes e tolerantes nos mini jogos

**Descrição:** Mecânicas evitam qualquer exigência de precisão motora
fina: sem mira, sem timing curto, sem drag-and-drop de precisão. Áreas de
clique/toque e de "encaixe" são generosas e com alta tolerância.

**Rastreabilidade:** RQ4 — Coordenação motora fina citada em 21,74% dos
estudos.

**Critérios de aceite:**
- Nenhuma mecânica exige resposta em menos de X segundos (parametrizável,
  nunca obrigatório pra progredir).
- Alvos clicáveis/arrastáveis com área mínima equivalente a alvo de
  toque acessível, não pixel-preciso.
- Tolerância de "encaixe" alta — objeto solto próximo ao alvo correto é
  aceito.
- Testado com mouse, touch e teclado (navegação alternativa).

**Bibliotecas sugeridas:** Recursos nativos de input do motor escolhido
(zonas de interação com tolerância customizada); nenhuma lib externa
adicional necessária.

---

## MJ5 — Rotulagem redundante dos objetivos e estados do jogo

**Descrição:** Todo estado relevante do mini jogo (objetivo, progresso,
"quase lá", conclusão) é comunicado por ícone + texto, nunca só por cor ou
só por forma.

**Rastreabilidade:** RQ4 — Acessibilidade de interface citada em 26,09%
dos estudos.

**Critérios de aceite:**
- Nenhum estado (certo/quase/incompleto) comunicado só por variação de cor.
- Todo elemento interativo relevante tem rótulo textual, visível ou
  acessível via leitor de tela.
- Feedback de erro segue a regra de linguagem não-punitiva já definida
  (nunca "errado"/X vermelho grande; descritivo e reversível).

**Bibliotecas sugeridas:** Nenhuma — reaproveitar `components/ui`
(`InlineFeedback` etc.) já definido pro desafio de blocos.

---

## MJ6 — Comparação de progresso entre alunos no mini jogo (opt-in do professor)

**Descrição:** Comparação de desempenho entre alunos nos mini jogos fica
desligada por padrão e só é ativável explicitamente pelo professor,
reaproveitando a MESMA flag/configuração do desafio de blocos (issues
#37/#27) — sem criar um segundo sistema de comparação.

**Rastreabilidade:** RQ4 — Ansiedade social/RSD citada em 13,04% dos
estudos. Regra não-negociável 5.

**Critérios de aceite:**
- A mesma configuração de "comparação entre alunos" do desafio de blocos
  controla também a visibilidade de comparação nos mini jogos (fonte
  única de verdade).
- Flag desligada (padrão): aluno só vê progresso relativo ao próprio
  histórico.
- Flag ligada: comparação segue o mesmo padrão visual não-competitivo já
  definido nas issues de blocos.

**Bloqueado por:** #37/#27 (a flag de comparação em si ainda não existe
pro desafio de blocos — nada a reaproveitar ainda).

**Status: verificado em 2026-08-24, continua bloqueado.** Confirmado por
busca no código inteiro (`comparison`/`ranking`/`leaderboard`/campo
`allowComparison` em `Classroom` ou qualquer entidade) — a flag não existe
em lugar nenhum, nem pro desafio de blocos. Opções levantadas com o
produto: (a) construir a flag completa pros dois lados (escopo maior que
este card, envolveria decisão de UX pro painel de blocos que ninguém pediu
ainda), ou (b) manter documentado como bloqueado. Decisão: (b) — evita
criar "um segundo sistema de comparação" isolado só pro mini jogo, que é
exatamente o que este card proíbe.

**Bibliotecas sugeridas:** Nenhuma — reuso de estado/configuração já
existente (Zustand).

---

## MJ7 — Extensão do schema de eventos de log para mini jogos

**Descrição:** Cada interação relevante do aluno num mini jogo é logada de
forma estruturada desde a primeira versão, estendendo o vocabulário de
eventos já usado no desafio de blocos com os campos específicos de jogo
(fase PRIMM atual, tentativas, tempo por etapa, abandono/reinício) — sem
criar uma segunda taxonomia nem mudar o schema de banco.

**Rastreabilidade:** Regra não-negociável 6 (log estruturado desde o
primeiro protótipo). RQ5 — escassez de estudos longitudinais (34,78%).

**Critérios de aceite:**
- [x] Eventos de mini jogo usam as mesmas 5 categorias já definidas
  (RD-I/P/C/E/L), nenhuma taxonomia paralela.
- [x] Cada evento carrega `concept_id` no payload, permitindo cruzar
  (futuramente, MJ8) com eventos do mesmo conceito no desafio de blocos.
- [x] RD-E do jogo nunca vira inferência clínica — só número bruto (ex.:
  `time_since_last_action_ms`), nunca "possível sobrecarga".
- [x] Eventos usam `studentPseudoId`/pipeline já pseudonimizado — nenhum
  dado novo de identidade.

**Bibliotecas usadas:** Nenhuma nova — mesmo `logEvent`/`POST /events`
(NestJS + `interaction_events`) já definido.

---

## MJ8 — Vínculo conceito-currículo entre desafio de blocos e mini jogo equivalente

**Descrição:** Para o mesmo assunto curricular, o desafio de blocos e o
mini jogo correspondente compartilham o mesmo `concept_id`, permitindo
comparar sinais de desempenho do aluno entre as duas metodologias sobre o
mesmo conteúdo.

**Rastreabilidade:** RQ5 — ausência de instrumento padronizado de
avaliação de Pensamento Computacional (39,13% dos estudos aponta essa
lacuna). Dois sinais triangulados sobre o mesmo conceito é um passo
concreto nessa direção, sem exigir instrumento formal externo.

**Critérios de aceite:**
- [x] `concept_id` (ou equivalente) compartilhado no schema de dados entre
  desafio de blocos e mini jogo do mesmo assunto.
- [x] Painel do professor (ou consulta futura) mostra os dois sinais lado a
  lado pro mesmo aluno/conceito, sem exigir conhecimento técnico.
- [x] Nenhuma interpretação clínica derivada automaticamente da comparação —
  dado bruto, não diagnóstico.

**Status: ✅ Implementado** (2026-08-24) — decisão de produto sobre onde
`concept_id` vive resolvida: **`Topic.conceptId`** (varchar nullable,
migration `AddConceptIdToTopics1787400200000`), espelhando
`MiniGameLevel.conceptId` (MJ7) — nunca em `Challenge`, porque o conceito
é do ASSUNTO (nível tópico), não de um desafio individual dentro da
sequência Use→Modify→Create.

- `apps/api/src/subjects/subjects.service.ts#findTopicByConceptId` —
  lado "desafio de blocos", devolve `null` quando nenhum tópico usa o
  `conceptId` ainda (estado normal hoje, nunca erro).
- `apps/api/src/events/events.service.ts#findStudentsWithMiniGameEvent` —
  equivalente de `findStudentsWithEvent` (blocos) pro lado do mini jogo,
  usado pra derivar status `not_started`/`in_progress`/`completed` do
  nível de mini jogo por aluno, mesmo vocabulário dos dois lados.
- `MetricsTeacherService.getConceptComparison(classroomId, teacherId,
  conceptId)` — reaproveita `computeProgressByChallenge`/
  `getChallengeProgressForStudents` (motor 6.1) pro lado de blocos e o
  método novo acima pro lado do mini jogo; mesma checagem de titularidade
  de turma (`assertOwnClassroom`) das outras rotas de 6.3/6.4. Resposta
  inclui `hasBlocksChallenge`/`hasMiniGame` explícitos (nunca inferidos de
  array vazio) — hoje `hasBlocksChallenge: false` sempre, porque nenhum
  tópico de blocos usa `conceptId: 'fractions_equal_parts'` ainda.
- `GET /metrics/teacher/classrooms/:classroomId/concept-comparison
  ?conceptId=` (`@Roles(Role.TEACHER)`, mesmo guard das outras rotas de
  `MetricsTeacherController`).
- Tela: `apps/web/src/routes/metrics/TeacherMetrics.tsx`, 3ª aba do
  `SegmentedControl` ("Blocos × jogo") — tabela por aluno com uma coluna
  por desafio/nível (ícone 🧩 pro desafio de blocos, 🎮 pro mini jogo,
  `Badge` de status igual ao das outras abas). Quando `hasBlocksChallenge`
  é `false` (situação atual), mostra um aviso descritivo acima da tabela
  ("nenhum desafio de blocos deste assunto cadastrado ainda") e ainda
  assim renderiza as colunas do mini jogo — nunca esconde o dado que
  existe só porque o outro lado está vazio.
- **Limitação conhecida, documentada de propósito:** a infraestrutura
  está pronta e funcional, mas não há hoje nenhum tópico de blocos
  cadastrado com `conceptId: 'fractions_equal_parts'` — a comparação "lado
  a lado" só mostra dado real dos dois lados quando um tópico de blocos do
  mesmo assunto (frações) for criado e receber esse `conceptId`. Isso é
  uma decisão de conteúdo curricular (fora do escopo deste card), não uma
  lacuna de código.

**Bibliotecas sugeridas:** Nenhuma — modelagem de dados (PostgreSQL) no
backend NestJS já previsto.

---

## Riscos e trade-offs gerais desta frente

Manter dois motores de renderização (um pro "mundo" do desafio de blocos,
outro pros mini jogos) aumentaria custo de manutenção — por isso MJ1 já
converge em PixiJS pros dois, em vez de introduzir Phaser (ver nota de
decisão de arquitetura no topo deste documento). Adicionar uma segunda
metodologia ativa aumenta a superfície de configuração sensorial que
precisa ser QA'd a cada release — vale um checklist sensorial
automatizado (ou pelo menos documentado, MJ2) antes do primeiro mini jogo
de conteúdo real ir pra produção. Por fim, o vínculo conceito-currículo
(MJ8) só entrega valor real se os dois desafios (bloco e jogo) forem
desenhados em conjunto pelo mesmo pedagogo/professor autor — sinalizar
isso pra quem for desenhar o painel de criação de conteúdo.
