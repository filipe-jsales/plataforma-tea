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

**Critérios de Aceite:**
- `countChallengeAttemptsByStudent(studentPseudoId, challengeId)` — conta
  `program_executed` (RD-P) por par aluno/desafio.
- `getChallengeStatusByStudent(studentPseudoId, challengeId)` — devolve
  `'not_started' | 'in_progress' | 'completed'`, derivado de: nenhum
  `program_executed` → `not_started`; tem `program_executed` mas nenhum
  evento de conclusão do estágio → `in_progress`; tem evento de conclusão
  → `completed`. **Gap conhecido:** o estágio `create` tem `challenge.
  completed` (RD-C) e o `use` tem `challenge_use_completed` (RD-C) como
  evento de conclusão — o estágio `modify` **não tem** um evento de
  "concluiu"/"avançou" (decisão deliberada ao implementar 3.4, pra não
  inventar evento fora do spec original). Antes de M2/M3 mostrarem status
  "completed" pro `modify`, decidir: (a) tratar "completed" como "clicou
  Avançar" e adicionar esse evento agora, ou (b) `modify` nunca mostra
  "completed", só "tentativas: N" (`changed_values`/`result_matched_
  prediction` da última tentativa). Recomendo (b) pra não reabrir escopo já
  fechado de 3.4 sem necessidade.
- `getPrimmStageSummaryByStudent(studentPseudoId, topicId)` — pro tópico,
  devolve por desafio: `stage`, `status`, `attempts`, e (só quando aplicável)
  `predictionMatchRate` (média de `result_matched_prediction` dos
  `challenge_modify_attempt` daquele aluno naquele desafio).
- `countActiveStudentsSince(pseudoIds, since)` — já existe
  (`EventsService.countDistinctStudentsActiveSince`), só reexportar/reusar,
  não duplicar.
- Toda query aceita uma lista de `studentPseudoId` pré-filtrada pelo
  chamador (M2/M4 resolvem o escopo — turma, escola — *antes* de chamar
  `MetricsService`; o serviço em si não sabe o que é "turma do professor
  X", só agrega o que a lista de pseudônimos manda).
- Testes: `MetricsService` testado como todo `*.service.ts` do projeto —
  repositório mockado (`jest.Mocked<Repository<InteractionEvent>>`), sem
  `TestingModule`/Postgres real (ver "Testes" em `coding-rule.md`).

**Dados/Eventos usados:** `program_executed` (RD-P), `challenge.completed`
(RD-C), `challenge_use_completed` (RD-P+RD-C), `challenge_modify_attempt`
(RD-P), `toolbox_rendered`/`block_dragged`/`challenge.help_viewed` (RD-I).

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

**Critérios de Aceite:**
- `@Roles(Role.ADMIN)` — sem escopo de titularidade (admin vê tudo,
  regra do próprio pedido).
- `GET /metrics/admin/schools` → `[{ schoolId, name, classroomsCount,
  teachersCount, activeStudentsCount, activeStudentsToday }]`.
- `GET /metrics/admin/schools/:schoolId` → detalha turmas: `[{ classroomId,
  name, teacherDisplayName, teacherId, activeStudentsCount,
  activeStudentsToday }]`. `teacherDisplayName` é aceitável aqui (professor
  não é dado de aluno, não tem a mesma exigência de pseudonimização — já é
  visível em `GET /auth/*/roster` hoje pro próprio fluxo de login).
- **Nunca** nome de aluno nesta feature — é views institucional/escola, o
  nível de aluno é só M5 (e ainda assim pseudonimizado, ver M5).
- Teste: escola sem turma cadastrada devolve `classroomsCount: 0`, não
  erro; escola com turma sem professor titular (`teacherId: null`, caso já
  suportado pelo schema) devolve `teacherDisplayName: null`, não quebra.

**Dados/Eventos usados:** `SchoolsService` (contagens já existem pra
`countSchools`/`countClassrooms`, estender pra por-escola), M1 pra
`activeStudentsToday`/`activeStudentsCount`.

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

**Critérios de Aceite:**
- `@Roles(Role.ADMIN)`.
- Resposta mínima: `{ challengeId, title, stage, totalAttempts,
  studentsReached, studentsCompleted, eventsByCategory: { 'RD-I': n,
  'RD-P': n, 'RD-C': n, 'RD-E': n, 'RD-L': n }, eventsByType: [{ type,
  count }] }` — o "aprofundado sobre eventos" do pedido é literalmente isto:
  contagem por `type` controlado (`toolbox_rendered`, `block_dragged`,
  `program_executed`, etc.), não só por categoria.
- **Se `stage: 'modify'`:** bloco adicional `modifyInsights: {
  averageAttemptsBeforeMatch, predictionMatchRate, mostChangedField:
  'TIMES' | 'ANGLE' | null }` — derivado de `challenge_modify_attempt.
  payload.changed_values`/`result_matched_prediction`. Isto é dado que só
  existe por causa da instrumentação de 3.4 — é o exemplo mais concreto de
  "dado pra pesquisa que a feature já gera, só falta expor".
- **Se `stage: 'use'`:** bloco `investigateInsights: { answersLogged,
  averageAttemptsBeforeProceed, predictionMatchRate }` —
  `predictionMatchRate` vem de `program_executed.payload.
  result_matched_prediction` (motor PRIMM "Predict" também mora em 3.3, ver
  "Duas decisões confirmadas" acima — só a 1ª execução de cada aluno carrega
  esses campos, o resto é `program_executed` "puro"). Nunca o *texto* da
  resposta de investigação exposto em agregado sem contexto de pesquisa
  formal (é resposta livre de criança, tratar com o mesmo cuidado de
  qualquer dado qualitativo — se um dia precisar do texto puro, isso é o
  `M6` [exportação], não este resumo).
- RD-E aparece só como contagem (`eventsByCategory['RD-E']`) — nunca
  interpretado ("X eventos RD-E" é o máximo, nunca "X sinais de
  sobrecarga").
- Teste: desafio sem nenhum evento ainda devolve zeros em tudo, nunca erro;
  desafio `create` sem `modifyInsights`/`investigateInsights` (campos
  ausentes, não `null` forçado — a forma da resposta já diz o estágio).

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

---

## Ordem de implementação sugerida

M1 → M4 (mais simples, reusa contagens que já existem) → M2 → M3 → M5 →
M6. M2/M3 ficam depois de M4 apesar de serem "o pedido do professor" porque
dependem da decisão de escopo em aberto (turma vs. escola) — melhor destravar
essa decisão enquanto M4 (que não depende dela) já está em progresso.
