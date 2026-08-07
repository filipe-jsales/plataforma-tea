# Métricas para Professor e Admin — plano de features

Documento de planejamento (nenhuma linha de código deste plano está
implementada ainda). Segue o formato já usado no backlog de origem deste
projeto (User Story / Descrição / Rastreabilidade / Prioridade / Critérios
de Aceite / Dados-Eventos) para poder ser colado direto nesse backlog
externo. **Não numerei como `4.x`** de propósito — o documento-fonte já usa
essa faixa (`4.2` autoria de toolbox, `4.5` autoria de desafio, `4.7`
verificação agregada de PRIMM, todos citados em `backend.md`) e eu não
tenho visibilidade de quais números já estão ocupados; use os identificadores
`M1`–`M6` abaixo só como referência interna deste arquivo e renumere ao
integrar.

## Contexto

Hoje `GET /home/{teacher,admin}` (`HomeService`, ver `docs/ai/modules/
backend.md`) é a única fonte de dado agregado pra professor/admin — e é
deliberadamente mínima: professor vê só `activeStudentsToday` por turma
(uma contagem, nunca lista de quem), admin vê só `schoolsCount`/
`classroomsCount`/`usersCount`. Nenhuma das duas telas expõe nada sobre
desafios, estágios PRIMM ou eventos individuais. `interaction_events` já
acumula um vocabulário razoável (`toolbox_rendered`, `block_dragged`,
`program_executed`, `challenge_use_completed`, `challenge.completed`,
`challenge.help_viewed`, `challenge_modify_attempt`, `login_attempt`/
`login_success`, `home_viewed`) — RD-I/RD-P/RD-C/RD-L têm emissão real hoje;
**RD-E tem só 1 emissão no código inteiro** (`OnboardingSensorial.tsx`, um
contador de tentativas do onboarding sensorial) — qualquer feature abaixo
que prometa métricas de engajamento-proxy robustas depende de instrumentar
mais RD-E primeiro, não é um dado que já existe em volume.

## Restrições não-negociáveis que todo feature abaixo herda

Não repito isto em cada item — vale pra M1–M6 inteiros:

1. **RD-E nunca vira inferência clínica na UI, nem pro professor nem pro
   admin** (regra não-negociável 7 — o texto da regra fala "UI do
   professor", mas o princípio ["interpretação clínica não é
   responsabilidade do software"] não tem exceção pro admin: mais dado bruto
   não é mais interpretação). "Tempo de inatividade: 4min" ok, "possível
   dificuldade/sobrecarga" nunca — nem em admin.
2. **Sem ranking competitivo por padrão.** A regra não-negociável 5 protege
   a *experiência do aluno* (nunca comparar aluno a aluno pra ele mesmo) —
   uma lista de alunos pro professor não viola isso por existir, mas o
   *default* de ordenação nunca deve ser "melhor→pior" (ordenar por
   matrícula/nome, nunca por desempenho, a menos que o próprio
   professor/admin escolha ordenar assim explicitamente na tela).
3. **Pseudonimização.** `interaction_events.studentPseudoId` é o único
   identificador que qualquer serviço de métrica deve usar pra cruzar dados
   de evento. Pro professor, cruzar isso com `User.displayName` (mesmo
   catálogo que ele já vê no roster de login, 1.2.1) é aceitável — não é
   dado novo, só reorganizado. **Pro admin, por padrão, os relatórios
   trabalham no nível de pseudônimo/agregado, nunca `displayName` cruzado
   entre escolas** — admin plausivelmente supervisiona múltiplas escolas
   (arquitetura já assume isso, ver `AdminHome`), e nome real só faz sentido
   dentro do contexto de uma única escola. Isso é decisão de projeto deste
   plano, não uma regra já escrita em `coding-rule.md` — sinalizando aqui
   caso alguém queira revisar.
4. **`StudentIdentityReversal`/`schoolReversibleRef` nunca entram em nenhuma
   feature de métrica abaixo.** Aquilo é uma trilha de reversão de
   identidade separada e mais sensível (regra não-negociável 8) — mesmo
   pro admin, mesmo "pra pesquisa". Se um dia for necessário, é uma feature
   própria com guard/auditoria dedicados, não um join a mais num endpoint de
   métrica.
5. **Painel do professor operável sem formação técnica** (regra
   não-negociável 9) — isto aqui é plano de API/dado; a tela que consome
   precisa continuar simples (números e frases, não "exporte um CSV e rode
   uma query" pro professor — isso é o `M6`, exclusivo do admin).

## Duas decisões confirmadas antes de detalhar M2/M3

Duas ambiguidades do pedido original, já resolvidas:

- **Escopo do professor: turmas onde ele é titular** (`Classroom.teacherId`
  = o professor autenticado), não "toda a escola". Mesmo padrão já
  estabelecido em `getTeacherHome`/`findClassroomsByTeacher` — um professor
  nunca vê métrica de aluno que não é dele, mesmo mesma escola. M2/M3 abaixo
  já refletem essa decisão nos critérios de aceite.
- **Predict mora em 3.3 e em 3.4** (P-R-I unificados em 3.3, mais a
  previsão própria de 3.4 repetida a cada rodada) — já implementado, ver
  `docs/ai/modules/backend.md` → "Rastreabilidade PRIMM × Use-Modify-Create"
  pra tabela completa. M5 (profundidade PRIMM) abaixo já considera os dois
  desafios como fonte do estágio "Predict".

---

## M1 — Serviço de agregação de eventos (infraestrutura, sem rota própria)

**User Story:** Como time de engenharia, preciso de um serviço central de
agregação sobre `interaction_events`/`enrollments`/`challenges`, pra não
duplicar lógica de query entre o painel do professor e o do admin.

**Descrição:** Um `MetricsService` novo (`apps/api/src/metrics/`), que
estende — não duplica — o que `EventsService`/`SchoolsService` já expõem
(`countDistinctStudentsActiveSince`, `countByStudentCategoryType`,
`findClassroomsByTeacher`, `findActiveStudentsInClassroom`). Não tem
controller próprio; M2–M6 consomem isto. Concentrar aqui evita que cada
endpoint de métrica escreva sua própria query crua contra
`interaction_events`.

**Rastreabilidade:** RQ5 do mapeamento sistemático (ausência de instrumento
padronizado de avaliação de CT, 39,13%; escassez de estudos longitudinais,
34,78%) — este serviço é o que transforma o log estruturado (presente desde
o primeiro commit, regra não-negociável 6) em dado utilizável pra pesquisa
e gestão pedagógica.

**Prioridade:** Bloqueante — M2–M6 dependem disto.

**Status: ✅ Implementado** (`apps/api/src/metrics/metrics.service.ts` +
`apps/api/src/events/events.service.ts`, testado em `metrics.service.spec.ts`
e `events.service.spec.ts`). Divergências do desenho original abaixo:

- `MetricsService.getChallengeProgressForStudents(pseudoIds, { challengeId,
  stage, nextChallengeId })` — uma chamada só, devolve `Map<studentPseudoId,
  { status, attempts }>` pra todo o recorte (não uma chamada por aluno).
  `attempts` conta `program_executed` (RD-P) via
  `EventsService.countAttemptsByStudents` (query agrupada, não N+1).
- **"Concluído" no estágio `modify` (3.4) — decisão tomada: opção C,
  "derivar, não instrumentar".** Não existe (nem vai existir) um evento
  `challenge_modify_completed`. Em vez disso, um aluno "saiu" do `modify`
  quando tem **qualquer evento** no desafio seguinte (`create`) da mesma
  sequência — calculado na hora da consulta
  (`EventsService.findStudentsWithEvent(pseudoIds, nextChallengeId)`, sem
  filtro de `type`), cruzando a ordem já conhecida da sequência Use→Modify→
  Create. Zero mudança em `ChallengePage.tsx`. Isso não é uma constatação de
  sucesso/fracasso (regra 4 continua intacta) — é só "o aluno seguiu em
  frente", e `attempts` continua sendo o dado pedagogicamente mais
  relevante desta fase (quanto o aluno explorou), não um binário. Quando
  não há próximo desafio cadastrado (`nextChallengeId: null`), o estágio
  `modify` nunca resolve como `completed`.
- `getPrimmStageSummaryByStudent`/`countActiveStudentsSince` standalone
  **não foram criados** — `countDistinctStudentsActiveSince` já existente
  em `EventsService` é reusado diretamente por quem precisar (ver M4
  abaixo), sem precisar de um wrapper em `MetricsService` (esse método não
  é uma pergunta de "status de desafio", é engajamento geral — escopo
  diferente do que 6.1 pede).
- Todo método aceita `pseudoIds: string[]` pré-filtrado pelo chamador —
  nunca varre a plataforma inteira (AC de 6.1 respeitado).

**Dados/Eventos usados:** `program_executed` (RD-P) e, por estágio,
`challenge_use_completed` (`use`), `challenge.completed` (`create`), ou
qualquer evento no desafio seguinte (`modify`, derivado — ver acima).

---

## M2 — Métricas do professor: por aluno da própria turma

**User Story:** Como professor, quero ver o progresso de cada aluno da
minha turma nos desafios do tópico atual, pra saber quem já passou do
"observar" pra "criar sozinho" e quem ainda está travado numa fase.

**Descrição:** `GET /metrics/teacher/classrooms/:classroomId/students` —
lista os alunos com matrícula ativa (`Enrollment.active`) na turma, cada um
com o progresso na sequência Use→Modify→Create do(s) tópico(s) disponíveis.
Escopo de acesso: só turmas onde `Classroom.teacherId` = o professor
autenticado (ver "Duas decisões em aberto" acima) — 403 pra qualquer outra
`classroomId`, mesmo turma da mesma escola.

**Rastreabilidade:** RQ5 (avaliação de CT/progresso pedagógico) — é a
ferramenta que substitui "instrumento padronizado de avaliação" ausente na
literatura (39,13% dos estudos apontam essa lacuna) por dado observável real
do próprio uso da plataforma.

**Prioridade:** Alta (é o pedido explícito do professor no request original).

**Critérios de Aceite:**
- `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.TEACHER)`.
- Verifica `classroom.teacherId === req.user.sub` antes de qualquer query —
  nunca confia em "é professor" sozinho, tem que ser *o* professor daquela
  turma (mesmo padrão que falta hoje em `PATCH /users/:id/sensory-profile`,
  ver nota em `backend.md`: "autorização mais fina... fica para quando o
  painel de turma existir de verdade" — este é esse painel).
- Resposta por aluno: `{ studentPseudoId, displayName, enrolledAt,
  challenges: [{ challengeId, title, stage, status, attempts }] }` — nunca
  `email`/`pseudonymId` bruto exposto fora do necessário pro frontend
  requisitar mais detalhe (se precisar de um segundo endpoint por aluno).
- **Ordenação default: por `enrolledAt` ou nome, nunca por desempenho** —
  regra não-negociável 5 aplicada ao *default*, não proíbe o professor de
  reordenar manualmente na tela.
- Turma sem aluno matriculado → lista vazia, não erro.
- Teste: `MetricsTeacherController`/`Service` — nega acesso a turma de outro
  professor (fixture com `teacherId` diferente do usuário autenticado),
  nunca vaza `email`/pseudônimo fora do payload definido acima.

**Dados/Eventos usados:** os de M1, escopados pelos `pseudoIds` da turma
(via `SchoolsService.findActiveStudentsInClassroom`).

**Status: ✅ Implementado** (`apps/api/src/metrics/metrics-teacher.{service,
controller}.ts`, testado em `metrics-teacher.service.spec.ts` +
`metrics-teacher.controller.spec.ts`; tela em
`apps/web/src/routes/metrics/TeacherMetrics.tsx`, aba "Por aluno"). Divergências
do desenho original abaixo:

- `GET /metrics/teacher/classrooms/:classroomId/students` devolve, por
  aluno, **todo desafio disponível de todo tópico** (não só o tópico
  "atual") — a sequência é reconstruída percorrendo
  `SubjectsService.findAllTopics()` × `ChallengesService.findByTopicIdOrdered`,
  cada tópico mantendo seu próprio `nextChallengeId` (nunca misturando a
  sequência de um tópico com a de outro). MVP tem 1 tópico só, então na
  prática hoje é "os 3 desafios do ciclo Use→Modify→Create de
  `angulos_formas`", mas o serviço já suporta N tópicos sem mudança.
- `classroom.teacherId !== req.user.sub` → `403 ForbiddenException`; turma
  inexistente → `404 NotFoundException` (checado nesta ordem, antes de
  qualquer query de aluno/evento) — cobre literalmente o AC "mesmo
  manipulando a URL".
- Um desafio cujo `config` ainda não passou por `isChallengeConfig` (seed
  incompleto) é **omitido** da lista de desafios do aluno, em vez de
  quebrar a resposta — mesmo tratamento que `ChallengesController` já dava
  a esse estado.
- Ordenação default implementada como `enrolledAt` ascendente no backend;
  a tela permite alternar pra "Nome" (`localeCompare('pt-BR')`) — as duas
  únicas opções oferecidas, nunca por status/tentativas.

---

## M3 — Métricas do professor: visão agregada da turma

**User Story:** Como professor, quero ver como a turma está indo como um
todo (não aluno a aluno), pra decidir se preciso revisar um conceito antes
de avançar todo mundo.

**Descrição:** `GET /metrics/teacher/classrooms/:classroomId/summary` —
agregados só de contagem/percentual, complementar ao M2 (que é por-aluno).
Pensado pra virar gráfico simples (barra de progresso por estágio, não
tabela de números).

**Rastreabilidade:** Mesma de M2 (RQ5) + RQ4/barreira institucional
(17,39%) — o professor não devia precisar abrir 30 perfis de aluno pra
perceber "a turma inteira está travada no desafio Modify".

**Prioridade:** Média — depende de M2 existir primeiro (mesmo guard de
autorização, mesma fonte de dado, só a agregação muda).

**Critérios de Aceite:**
- Mesmo guard/verificação de titularidade de turma que M2.
- Resposta: `{ totalStudents, activeStudentsToday, byStage: [{ stage,
  studentsCompleted, studentsInProgress, studentsNotStarted }],
  helpButtonUsageRate }` (taxa de uso do botão de Ajuda no estágio `create`
  — sinal de dificuldade *observável*, nunca rotulado como "dificuldade" na
  resposta, só o número).
- Nunca devolve lista de nomes nesta rota — é agregado puro, M2 é quem tem
  o nível de aluno individual.
- Teste: turma com 0 alunos ativos devolve zeros, não divide por zero /
  não quebra.

**Dados/Eventos usados:** os de M1, mais `challenge.help_viewed` (RD-I) pra
`helpButtonUsageRate`.

**Status: ✅ Implementado** (`MetricsTeacherService.getClassroomSummary`,
mesmo arquivo/testes de M2; tela em `TeacherMetrics.tsx`, aba "Turma
toda"). Divergências do desenho original abaixo:

- `byStage` é sempre as 3 entradas `use`/`modify`/`create` nesta ordem, uma
  por estágio — nunca uma por desafio individual. Quando (no futuro) mais
  de um tópico tiver, digamos, dois desafios `stage: 'use'`, os dois somam
  no mesmo bucket `use` (contagem de alunos, não de desafios) — decisão
  implícita no formato do AC original (`byStage` chaveado por `stage`, não
  por `challengeId`).
- `helpButtonUsageRate` conta, entre os alunos matriculados ativos da
  turma, quantos têm `challenge.help_viewed` em **qualquer** desafio
  `stage: 'create'` da sequência (união entre desafios `create` de tópicos
  diferentes, se houver mais de um) — arredondado pra inteiro
  (`Math.round`), nunca decimal cru.
- Turma sem nenhum aluno matriculado ativo → devolve `{ totalStudents: 0,
  activeStudentsToday: 0, byStage: [zeros nos 3 estágios],
  helpButtonUsageRate: 0 }` sem nenhuma query de evento (curto-circuito
  antes de dividir por zero).
- Tela: card de totais + 3 barras horizontais (uma por estágio, segmentada
  concluído/em andamento/não iniciado, `role="img"` com resumo textual
  acessível) — nunca tabela de números, seguindo o AC literalmente.

---

## M4 — Métricas do admin: visão institucional (escolas/turmas/professores)

**User Story:** Como admin, quero ver como cada escola está usando a
plataforma — quantas turmas ativas, quantos professores, quanto engajamento
— sem entrar no detalhe de aluno individual.

**Descrição:** `GET /metrics/admin/schools` (lista, uma linha por escola) e
`GET /metrics/admin/schools/:schoolId` (drill-down: turmas daquela escola +
professor titular de cada uma + contagem de alunos ativos). Este é o
primeiro nível dos 3 pedidos pelo admin ("escola, professores, desafios dos
alunos") — os outros dois são M5/M6.

**Rastreabilidade:** RQ5 (estudos longitudinais) — histórico de matrícula já
existe (`Enrollment.active`/`unenrolledAt`), este endpoint é o que expõe
isso de forma consumível (comparar adoção entre escolas ao longo do tempo).

**Prioridade:** Alta.

**Status: ✅ Implementado** (`apps/api/src/metrics/metrics-admin.{service,
controller}.ts`, testado em `metrics-admin.service.spec.ts` +
`metrics-admin.controller.spec.ts`; tela em
`apps/web/src/routes/metrics/AdminMetrics.tsx`). Divergências do desenho
original:

- `GET /metrics/admin/schools` → `[{ id, name, classroomsCount,
  teachersCount, activeStudentsCount, activeStudentsToday }]` (campo
  chamado `id`, não `schoolId` — consistente com o resto da API, ex.
  `ChallengeDetail.id`).
- Drill-down é uma rota própria, não o mesmo `:schoolId` da lista:
  `GET /metrics/admin/schools/:schoolId/classrooms` → `[{ id, name,
  teacherDisplayName, activeStudentsCount }]`. Sem `activeStudentsToday`
  por turma nem `teacherId` — não pedido pelo AC original, adiado até
  haver uma tela que precise (ex.: um link direto pro painel do professor
  daquela turma).
- **Não usa `MetricsService` (6.1)** — 6.2 é contagem institucional pura
  (turmas/professores/alunos ativos), não precisa da pergunta "status de
  desafio por aluno" que 6.1 resolve; reusa `SchoolsService`/`EventsService`
  diretamente, mesmo padrão já usado por `HomeService`.
- `@Roles(Role.ADMIN)` no controller inteiro — sem escopo de titularidade
  (admin vê tudo).
- **Nunca** nome de aluno nesta feature — é visão institucional/escola, o
  nível de aluno é de uma feature futura (M5), e mesmo lá pseudonimizado.
- Testado: escola sem turma cadastrada devolve `classroomsCount: 0`, sem
  erro; turma sem professor titular devolve `teacherDisplayName: null`,
  sem quebrar (frontend mostra "sem professor definido").
- Tela: card por escola com as 4 métricas, clique seleciona/expande a
  lista de turmas daquela escola. Sem as restrições sensoriais do aluno
  (StaffLogin.css já estabelece esse mesmo racional) — visual mais denso/
  colorido de propósito.

**Dados/Eventos usados:** contagens de `SchoolsService`
(`findAllSchools`, `countDistinctTeachersBySchool`,
`findActiveStudentsBySchool`, `countActiveStudentsInClassroom`) +
`EventsService.countDistinctStudentsActiveSince` (já existente, reusado).

---

## M5 — Métricas do admin: profundidade por desafio/evento

**User Story:** Como admin (e, por trás disso, como pesquisador do estudo
que fundamenta esta plataforma), quero dados aprofundados sobre como os
alunos interagem com cada desafio — não só "completou ou não", mas o padrão
de tentativas, previsões, ajuda usada — pra alimentar a pesquisa sobre
Pensamento Computacional e TEA que motiva o produto.

**Descrição:** Esta é a feature "com mais dado" que o pedido original
menciona — granularidade de evento, não só contagem. `GET /metrics/admin/
challenges/:challengeId` devolve um relatório completo daquele desafio
específico, cruzando toda categoria RD-* relevante.

**Rastreabilidade:** RQ5 por inteiro — ausência de instrumento padronizado
de avaliação de CT (39,13%) e escassez de estudos longitudinais (34,78%)
são exatamente o gap que dado deste nível de detalhe começa a preencher.
Também é onde a rastreabilidade PRIMM (ver `backend.md`) fica *observável*
em vez de só arquitetural: dá pra ver, por desafio, quantos alunos
efetivamente passaram por Predict/Run/Investigate/Modify/Make.

**Prioridade:** Alta, mas maior escopo — considerar dividir em duas entregas
(resumo do desafio primeiro, distribuição por-aluno depois) se o time achar
grande demais pra uma entrega só.

**Critérios de Aceite:** substituídos por uma especificação bem mais
detalhada quando a feature foi de fato implementada (renumerada "6.5" no
pedido original) — ver "Status: ✅ Implementado" abaixo pro AC completo
realmente construído (estatística descritiva completa — média, mediana,
desvio padrão, quartis — em vez de só média, mais taxa agregada×por-aluno,
distribuição de campo alterado, scatter tentativas×acerto, e configuração
de N mínimo). O rascunho original acima (`averageAttemptsBeforeMatch`,
`investigateInsights`, etc.) não reflete a resposta real da API — mantido
só como histórico de como a feature começou a ser pedida.

**Status: ✅ Implementado** (`apps/api/src/metrics/{statistics,
metrics-admin-challenge.service,metrics-admin-challenge.service.spec}.ts`
+ rota em `metrics-admin.controller.ts`; `apps/api/src/settings/` pro N
mínimo configurável; tela em
`apps/web/src/routes/metrics/{ChallengeReport,AdminSettings}.tsx` +
`apps/web/src/components/charts/`). Forma final da resposta de
`GET /metrics/admin/challenges/:challengeId`:

```
{
  challengeId, title, stage, minSampleSizeThreshold,
  studentsReached, studentsCompleted,
  attemptsPerStudent: DescriptiveStats,       // n/mean/median/stdDev/min/max/q1/q3
  attemptsHistogram: [{ label: '1'|'2'|'3'|'4+', count }],
  timeToFirstExecutionMs: DescriptiveStats,
  eventsByCategory: { 'RD-I': n, 'RD-P': n, 'RD-C': n, 'RD-E': n, 'RD-L': n },
  eventsByType: [{ label: type, count }],
  modifyInsights?: {                          // só quando stage: 'modify'
    attemptsUntilMatch: DescriptiveStats,
    predictionMatchRate: { aggregate, perStudent, perStudentHistogram },
    mostChangedFieldDistribution: [{ label, count }],
    attemptsVsMatchRateScatter: [{ attempts, matchRatePercent }],
  },
  useInsights?: {                             // só quando stage: 'use'
    attemptsBeforeProceed: DescriptiveStats,
    predictionMatchRate: { aggregate, perStudent, perStudentHistogram },
    investigationResponses: { n },
  },
}
```

Decisões/divergências relevantes:

- **Todo cálculo estatístico é código puro, não SQL agregado**
  (`apps/api/src/metrics/statistics.ts`, zero I/O, 28 testes com dataset
  canônico `[1..10]` conferido contra numpy) — decisão técnica confirmada a
  pedido de quem propôs a feature, mantém a lógica testável sem depender de
  `PERCENTILE_CONT`/`STDDEV` do Postgres.
- **Quartis por interpolação linear** (método R "type 7" / default de
  `numpy.percentile`) — escolhido especificamente pra reproduzir o mesmo
  número em R/Python a partir do export bruto (6.6), não um método
  arbitrário.
- **Desvio padrão é sempre amostral** (denominador n-1), `null` (nunca 0)
  quando N&lt;2 — matematicamente indefinido nesse caso.
- **Histograma de tentativas exclui alunos com 0 tentativas** — o AC pede
  buckets exatos `1/2/3/4+`, sem bucket "0"; um aluno que chegou ao desafio
  mas nunca executou entra em `attemptsPerStudent` (que inclui o zero) mas
  não no histograma. Cada card carrega seu próprio N implícito.
- **Boxplot é "min-max"**, não Tukey/1.5×IQR com outliers à parte — decisão
  deliberada dado N tipicamente pequeno neste produto (turma/desafio, não
  milhares de sujeitos), onde a regra de outlier de Tukey tende a marcar o
  próprio min/max sem agregar leitura nova.
- **Taxa de acerto de previsão sempre em duas formas nunca fundidas**:
  `aggregate` (todas as tentativas com previsão, de todos os alunos, juntas)
  e `perStudent` (média/desvio das taxas individuais) — os dois `n` são
  diferentes de propósito (nº de tentativas vs. nº de alunos) e reportados
  separados.
- **`attemptsVsMatchRateScatter` não expõe pseudônimo** — cada ponto é só
  `{ attempts, matchRatePercent }`, sem nenhum identificador (nem
  pseudonimizado) porque o gráfico não precisa disso pra ser lido.
- **N mínimo configurável** (`apps/api/src/settings/`, tabela singleton
  `platform_settings`, default 5): `GET/PATCH /admin/settings`. Puramente
  de apresentação — mudar o valor nunca recalcula dado histórico, só decide
  quando `SampleSizeNote` (frontend) mostra o aviso. Tela em
  `AdminSettings.tsx`, linkada de `AdminHome`.
- **Seletor de desafio** (`GET /metrics/admin/challenges`,
  `ChallengesService.findAllWithTopic`) — todo desafio cadastrado, qualquer
  tópico, pro admin escolher por título+tópico (nunca por uuid).
- **Gráficos são SVG inline sem biblioteca nova** (`apps/web/src/
  components/charts/`: `BoxPlot`, `BarChart`, `ScatterPlot`) — hue único
  (`--color-primary`) em toda marca, porque nenhum destes gráficos compara
  séries categóricas coloridas entre si (é sempre magnitude/distribuição de
  1 variável, nunca identidade de N séries) — a paleta categórica validada
  do skill de dataviz não se aplica aqui por não haver múltiplas séries
  competindo por cor.
- **`RD-E` nunca interpretado** — só `eventsByCategory['RD-E']`, um número,
  em qualquer gráfico/texto desta tela (regra não-negociável 7).
- Teste: desafio sem nenhum evento devolve N=0/nulls em tudo (nunca
  erro/NaN); desafio `create` sem `modifyInsights` nem `useInsights` (chave
  ausente da resposta, não `null` forçado — AC explícito: "ausência
  comunica o estágio").
- Verificado ponta a ponta contra o Postgres real via `curl` com a conta
  admin demo, nos 3 desafios seed (`use`/`modify`/`create` de
  `angulos_formas`) — números cruzados manualmente contra `eventsByType`
  (ex.: `attemptsBeforeProceed.n` bate com a metade da contagem de
  `challenge_use_completed`, já que esse tipo é logado 2× por "Avançar", uma
  vez RD-P uma vez RD-C, e só a cópia RD-P entra nesta estatística).

**Dados/Eventos usados:** todos os RD-* emitidos por `ChallengePage` (ver
lista em "Contexto" acima) — esta é a feature que consome o vocabulário de
evento mais largo do projeto.

---

## M6 — Exportação de dados brutos para pesquisa (admin)

**User Story:** Como admin (pesquisador), quero exportar os eventos brutos
de um período/escola/desafio em formato estruturado, pra analisar fora da
plataforma (a pesquisa que fundamenta o produto precisa disso, não só
dashboard).

**Descrição:** Distinto de M4/M5 (agregados prontos pra virar gráfico) —
aqui o admin pede um recorte e recebe as linhas de `interaction_events`
quase cruas (só sem o que a regra 4 (identidade real) proíbe, que já não
está em `interaction_events` de qualquer forma). `GET /metrics/admin/
export?schoolId=&challengeId=&from=&to=&format=json` (CSV como
alternativa de `format`, pra abrir direto em planilha).

**Rastreabilidade:** RQ5 por completo — é o que efetivamente viabiliza usar
os dados coletados desde o MVP (regra não-negociável 6) num futuro artigo/
análise, não só guardar num banco que ninguém consulta.

**Prioridade:** Média — depende de M1/M5 existirem (mesma fonte de dado,
sem agregação) e tem superfície de risco maior (acesso a volume de dado
maior por request), então deveria vir depois de M4/M5 estarem validados em
produção.

**Critérios de Aceite:**
- `@Roles(Role.ADMIN)`.
- Linha exportada: `{ id, studentPseudoId, category, type, payload,
  sessionId, challengeId, createdAt }` — exatamente as colunas de
  `InteractionEvent`, nunca um join com `User`/`Enrollment` que
  reintroduza `displayName` (mantém pseudonimização mesmo no export bruto —
  quem precisar cruzar pseudônimo↔turma faz isso com um export separado de
  `enrollments`, não no mesmo arquivo).
- Paginação ou limite de intervalo obrigatório (`from`/`to` não pode passar
  de N dias, ex. 90) — não é uma rota de "baixar a tabela inteira de uma
  vez", volume precisa ser deliberado.
- **Log de auditoria próprio:** todo export deve gerar um evento de
  telemetria operacional (não em `interaction_events`, que é escopado a
  aluno — ver "Padrão: eventos RD-* são escopados ao aluno" em
  `backend.md`) registrando qual admin exportou o quê e quando. Esta feature
  é a primeira do projeto que precisa dessa tabela de telemetria de
  staff — hoje não existe (ver nota em `backend.md`: "eventos RD-* são
  escopados ao aluno... se um caso de uso futuro precisar de telemetria
  operacional real de professor/admin, isso é uma tabela nova").
- Rate limit — mesma lacuna geral já documentada em "Próximos passos"
  (`backend.md`), mas aqui é pré-requisito, não nice-to-have, dado o volume
  de dado exposto por request.
- Teste: intervalo de data acima do limite rejeita com erro claro, não
  trunca silenciosamente.

**Dados/Eventos usados:** `interaction_events` bruto (sem agregação),
mais a tabela de auditoria de export (nova).

**Status: ✅ Implementado** (`apps/api/src/metrics/metrics-admin-export.
service.ts` + `apps/api/src/audit/` + `apps/api/src/metrics/csv.ts`,
testado em `metrics-admin-export.service.spec.ts`,
`metrics-admin.controller.spec.ts`, `audit.service.spec.ts`, `csv.spec.ts`
e nos testes novos de `EventsService`/`SchoolsService`; tela em
`apps/web/src/routes/metrics/AdminExport.tsx`). Divergências/detalhes do
desenho original abaixo:

- `GET /metrics/admin/export?schoolId=&challengeId=&from=&to=&format=json|csv&page=&pageSize=`
  — os 3 filtros do desenho original (`schoolId`/`challengeId`/período) e
  mais `page`/`pageSize` (paginação sempre ativa, máximo 500/página — ver
  próximo bullet), não citados no rascunho original mas necessários pra
  cumprir "não é uma rota de baixar a tabela inteira de uma vez" mesmo num
  recorte só por escola/desafio sem período.
- **AC "paginação OU limite de intervalo" virou os DOIS, não um ou
  outro** — paginação sempre ativa (qualquer filtro) + limite de 90 dias
  quando período é usado. Um recorte só por escola/desafio (sem período)
  não tinha, no desenho original, nenhum teto de volume — a paginação
  cobre esse caso que o "OU" original deixava aberto.
- **Escola resolve pra TODO aluno já matriculado, não só os ativos hoje**
  (`SchoolsService.findAllStudentPseudoIdsBySchool`, método novo,
  diferente do `findActiveStudentsBySchool` que 6.2 já usava) — decisão
  não explícita no desenho original: pesquisa quer o histórico completo da
  escola, um aluno que trocou de turma não deveria sumir do dado
  exportável.
- **`AuditModule` é módulo próprio** (`apps/api/src/audit/`, não dentro de
  `MetricsModule`) — telemetria de staff é uma preocupação transversal,
  reaproveitável por qualquer feature futura de admin/professor que
  precise do mesmo padrão "quem fez o quê, quando".
- **Rate limit via `@nestjs/throttler`** (`ThrottlerModule.forRoot`,
  5 requisições/admin/minuto), só na rota `export` — dependência nova, mas
  mínima e oficial do ecossistema Nest; primeiro rate limit do projeto
  (login continua sem, ver "Próximos passos" em `backend.md`).
- CSV é gerado por uma função pura própria (`metrics/csv.ts`, RFC 4180) —
  sem lib nova, mesmo raciocínio de `statistics.ts` não depender de
  `PERCENTILE_CONT` do banco.

---

## Ordem de implementação sugerida

M1 → M4 (mais simples, reusa contagens que já existem) → M2 → M3 → M5 →
M6. M2/M3 ficam depois de M4 apesar de serem "o pedido do professor" porque
dependem da decisão de escopo em aberto (turma vs. escola) — melhor destravar
essa decisão enquanto M4 (que não depende dela) já está em progresso.

**M1–M6 implementados** (ver "Status: ✅ Implementado" em cada seção
acima) — este documento está completo; toda feature planejada no painel de
métricas de professor/admin já existe em produção.
