# Backend — `apps/api`

NestJS 11 + TypeORM + PostgreSQL + JWT. Ver
`docs/ai/rules/coding-rule.md` para convenções de módulo/DTO/guard e para o
schema de eventos (RD-I/RD-P/RD-C/RD-E/RD-L).

## Estrutura atual

```
apps/api/src/
├── common/enums/
│   ├── role.enum.ts             # student | teacher | admin
│   └── event-category.enum.ts   # RD-I | RD-P | RD-C | RD-E | RD-L
├── users/
│   ├── entities/user.entity.ts  # pseudonymId (auto-gerado), role, active (1.4), perfil sensorial...
│   ├── dto/{update-sensory-profile,create-staff-user,update-staff-user,update-user-status,list-users-query}.dto.ts
│   ├── users.controller.ts      # GET /users/me, PATCH /users/:id/sensory-profile
│   ├── users.service.ts
│   ├── admin-users.controller.ts  # 1.4 — GET/POST/PATCH /admin/users[...]
│   ├── admin-users.service.ts
│   └── users.module.ts
├── identity/
│   ├── entities/student-identity-reversal.entity.ts  # pseudônimo → id real
│   ├── identity.service.ts
│   └── identity.module.ts       # NUNCA importar a partir do EventsModule
├── auth/
│   ├── strategies/jwt.strategy.ts
│   ├── guards/jwt-auth.guard.ts
│   ├── guards/roles.guard.ts
│   ├── decorators/roles.decorator.ts
│   ├── dto/{student,teacher,admin}-login.dto.ts
│   ├── auth.service.ts          # 3 fluxos de login — ver seção "Login" abaixo
│   ├── auth.controller.ts       # GET roster + 3x POST .../login
│   └── auth.module.ts
├── illustrations/
│   ├── entities/illustration.entity.ts  # catálogo avatar | login_image, position fixa
│   ├── dto/list-illustrations.dto.ts
│   ├── illustrations.controller.ts  # GET /illustrations?kind= — SEM guard (pré-login)
│   ├── illustrations.service.ts
│   └── illustrations.module.ts
├── subjects/
│   ├── entities/subject.entity.ts   # disciplina (tabela, não enum) — ex.: "geometria"
│   ├── entities/topic.entity.ts     # assunto dentro da disciplina — ex.: "angulos_formas"
│   ├── subjects.controller.ts       # GET /subjects/topics — alimenta o seletor 2.3
│   ├── subjects.service.ts
│   └── subjects.module.ts
├── schools/
│   ├── entities/school.entity.ts
│   ├── entities/classroom.entity.ts   # turma; teacherId reatribuível, sem vínculo fixo
│   ├── entities/enrollment.entity.ts  # matrícula aluno↔turma, histórico (active/unenrolledAt)
│   ├── schools.service.ts       # + createEnrollment/endEnrollment/duplicate-check (1.2/1.5)
│   └── schools.module.ts
├── student-accounts/            # 1.2 — criação de conta de aluno, ver seção própria
│   ├── dto/create-student-account.dto.ts
│   ├── student-accounts.service.ts  # + resetCredential (1.3, recuperação de acesso)
│   ├── student-accounts.controller.ts  # POST /teacher/students[...]/reset-credential
│   └── student-accounts.module.ts
├── enrollments/                 # 1.5 — matrícula/transferência, ver seção própria
│   ├── dto/transfer-student.dto.ts
│   ├── enrollments.service.ts
│   ├── enrollments.controller.ts  # POST /teacher/students/:id/enrollments + GET /teacher/classrooms/:id/students
│   └── enrollments.module.ts
├── blocks/
│   ├── entities/block-definition.entity.ts  # catálogo de blocos Blockly (tabela, não enum)
│   ├── blocks.service.ts
│   └── blocks.module.ts
├── challenges/
│   ├── entities/challenge.entity.ts  # config.toolbox + templateId/templateParams/createdByUserId (4.2)
│   ├── challenge-config.interface.ts  # forma tipada de Challenge.config
│   ├── block-progression.ts     # valida a regra Use-Modify-Create (AC2)
│   ├── challenges.service.ts    # + CRUD escopado ao professor autor (4.2)
│   ├── challenges.controller.ts # GET /challenges/{by-topic/:topicId,:id} — aluno só
│   └── challenges.module.ts
├── challenge-templates/         # 4.2 — Modo Template, ver seção própria abaixo
│   ├── entities/challenge-template.entity.ts  # catálogo curado (tabela, não enum)
│   ├── challenge-template-parameter.interface.ts  # schema genérico de campo do formulário
│   ├── handlers/
│   │   ├── challenge-template-handler.interface.ts
│   │   ├── regular-polygon.handler.ts  # único template do MVP (geometria)
│   │   └── template-registry.ts        # key → handler — único ponto que muda por template novo
│   ├── dto/{template-params,save-template-challenge}.dto.ts
│   ├── challenge-templates.service.ts       # galeria/formulário/preview/criação
│   ├── challenge-templates.controller.ts    # GET/POST /challenge-templates...
│   ├── teacher-challenges.controller.ts     # GET/PATCH/DELETE /teacher/challenges/:id (AC5/AC6)
│   └── challenge-templates.module.ts
├── challenge-allocations/       # 4.3 — vínculo desafio↔turma, ver seção própria
│   ├── entities/challenge-classroom-allocation.entity.ts  # tabela de associação N:N
│   ├── dto/allocate-challenge.dto.ts
│   ├── challenge-allocations.service.ts
│   ├── teacher-challenge-allocations.controller.ts    # /teacher/challenges/:id/allocations
│   ├── student-classroom-challenges.controller.ts     # /students/me/classroom-challenges
│   └── challenge-allocations.module.ts
├── events/
│   ├── entities/interaction-event.entity.ts  # tabela append-only
│   ├── dto/create-event.dto.ts
│   ├── events.service.ts
│   ├── events.controller.ts     # POST /events (protegido por JwtAuthGuard)
│   └── events.module.ts
├── home/
│   ├── home.service.ts          # agregações por papel — nunca dado individual pro admin
│   ├── home.controller.ts       # GET /home/{student,teacher,admin}
│   └── home.module.ts
├── settings/
│   ├── entities/platform-setting.entity.ts  # tabela singleton (1 linha), N mínimo (6.5)
│   ├── dto/update-settings.dto.ts
│   ├── settings.controller.ts   # GET/PATCH /admin/settings
│   ├── settings.service.ts
│   └── settings.module.ts
├── audit/
│   ├── entities/export-audit-log.entity.ts  # 6.6 — append-only, "quem exportou o quê, quando"
│   ├── entities/admin-action-log.entity.ts  # 1.4/1.3 — append-only, CRUD de usuário + reset de credencial (quem/quando/o quê)
│   ├── audit.service.ts
│   └── audit.module.ts
├── metrics/
│   ├── statistics.ts             # 6.5 — motor estatístico puro (mean/median/stdDev/quartis/histogramas)
│   ├── csv.ts                    # 6.6 — serializador CSV puro (RFC 4180), sem lib nova
│   ├── dto/export-events-query.dto.ts  # 6.6
│   ├── metrics.service.ts        # 6.1 — motor único de status/progresso por desafio
│   ├── metrics-admin.service.ts  # 6.2 — visão institucional (escolas/turmas/professores)
│   ├── metrics-admin-challenge.service.ts  # 6.5 — relatório de profundidade por desafio
│   ├── metrics-admin-export.service.ts  # 6.6 — exportação bruta pra pesquisa
│   ├── metrics-admin.controller.ts  # GET /metrics/admin/{schools[...],challenges[...],export}
│   ├── metrics-teacher.service.ts   # 6.3/6.4 — progresso por turma do professor
│   ├── metrics-teacher.controller.ts  # GET /metrics/teacher/classrooms/:id/{students,summary}
│   └── metrics.module.ts        # importa AuditModule + ThrottlerModule.forRoot (6.6)
├── database/
│   ├── data-source.ts           # DataSource p/ CLI de migrations (fora do Nest DI)
│   └── migrations/              # uma migration por mudança de schema
├── app.module.ts                # ConfigModule + TypeOrmModule.forRootAsync + módulos
└── main.ts                      # ValidationPipe global + CORS
```

## Autenticação e Login

Três fluxos distintos, não um formulário genérico — a tela "Quem é você?" é
a única coisa realmente única; o que vem depois diverge totalmente por
papel (ver decisão de design completa na conversa que originou esta
implementação).

`GET /auth/student/classrooms/:joinCode/roster` — passo 1+2 do fluxo aluno
(código de turma → lista de avatares dos alunos ativos da turma, pra
reconhecimento visual). **Sem guard** de propósito: acontece antes de
qualquer autenticação — só devolve `userId` + `displayName` + avatar, nunca
e-mail/pseudônimo/dado reversível. `GET /illustrations?kind=avatar|login_image`
segue o mesmo raciocínio — o passo 3 (grade de imagens) também acontece
pré-login, e só devolve `label`/`assetRef`/`position`.

`POST /auth/student/login` — `{ userId, imageSequence: [id,id,id] }`,
compara a sequência exatamente (ordem importa) contra
`User.loginImageSequence`. Emite `login_attempt` (RD-I) sempre que o
`userId` resolve pra um aluno real, e `login_success` (RD-L) só no sucesso.

`POST /auth/teacher/login` — `{ email, password }`, bcrypt contra
`passwordHash`, escopado a `role=teacher` (mesmo e-mail com role errado não
autentica).

`POST /auth/admin/login` — `{ email, password, otp }`, bcrypt + TOTP
(`otplib`, `verify({secret, token})`) contra `User.totpSecret`. Segundo
fator obrigatório — maior superfície de risco (múltiplas escolas).

Todos os três emitem JWT via `issueToken()` com `{ sub, pseudonymId, role }`
— o mesmo payload que `JwtStrategy`/`RolesGuard` já esperavam desde o início.
Mensagens de erro da API são genéricas de propósito ("Credenciais
inválidas.", "Sequência incorreta.") — a linguagem não-punitiva da regra 4 é
responsabilidade da tela (frontend), a API só precisa não vazar qual campo
falhou.

Para proteger uma rota nova (fora do auth):

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
@Controller('turmas')
export class TurmasController { ... }
```

### Gap conhecido: eventos pré-login

`login_screen_viewed` e `sensory_setting_changed_pre_login` (ver spec de
login) acontecem **antes** de qualquer autenticação — não têm como carregar
JWT. `POST /events` hoje exige `JwtAuthGuard` sempre, então esses dois tipos
de evento não têm por onde entrar ainda. Não implementado de propósito:
abrir um endpoint de ingestão sem autenticação é uma decisão de segurança
(superfície de abuso/spam) que merece ser tomada explicitamente, não
resolvida por conveniência. Próxima decisão necessária antes do frontend
precisar disso.

### Credenciais de desenvolvimento (seed)

Ver `docs/ai/modules/database.md` — a migration `AddLoginMechanisms` semeia
1 turma (`AZUL-1`) com 1 professor, 1 admin e 1 aluno de teste. **Nunca usar
essas credenciais fora de ambiente local.**

## Perfil sensorial persistente e Home por papel (2.1/2.2)

`User.soundEnabled` / `animationEnabled` / `sensoryOnboardingCompletedAt`
persistem a escolha do onboarding sensorial — não é um estado só de
cliente, porque o aluno pode logar em outro computador da sala e o
professor pode ajustar pelo painel dele. `GET /users/me` devolve o perfil
completo (nunca `passwordHash`/`totpSecret`/`loginImageSequence` — ver
`toPublicProfile()`); `PATCH /users/:id/sensory-profile` aceita o próprio
usuário (`sub === id`) ou `teacher`/`admin` alterando o de qualquer aluno —
autorização mais fina (só o professor *daquela* turma) fica para quando o
painel de turma existir de verdade.

**3.9 — configurações sensoriais acessíveis ao próprio aluno.** O endpoint
acima já aceitava `isSelf` desde 2.2; o que faltava era uma tela pro aluno
REVISITAR a escolha depois da primeira sessão (o onboarding em si só roda
uma vez, guardado por `sensoryOnboardingCompletedAt`). `apps/web/src/
routes/StudentSensorySettings.tsx` (rota `/settings/sensory`) reaproveita
100% o mesmo endpoint/campos de `OnboardingSensorial.tsx` — a única
diferença é que os toggles nascem PRÉ-PREENCHIDOS com o perfil atual do
aluno (`user.soundEnabled`/`animationEnabled`), não sempre `false`, e
salvar não navega pra lugar nenhum (fica na própria tela, com confirmação
"Salvo."). `UsersService.updateSensoryProfile` já protegia
`sensoryOnboardingCompletedAt` de ser sobrescrito numa 2ª chamada — nenhuma
mudança de backend precisou entrar pra isso. Acesso: link discreto
"⚙️ Configurações" no topbar de `StudentHome`, mesmo racional do "Sair"
(1.5.1) — ação de escape sempre disponível, fora das "no máximo 2 ações
principais" (AC1 de 2.1). Emite `sensory_settings_updated` (RD-E) — evento
NOVO, distinto de `sensory_onboarding_completed` (2.2), pra distinguir na
análise "primeira escolha" de "ajuste posterior" sem perder o dado.

`GET /home/{student,teacher,admin}` (`HomeModule`) — uma rota por papel,
cada uma com sua própria regra de "o que pode aparecer":

- **student**: `continueChallenge` (o único desafio do MVP) + `progress`
  (contagem de desafios concluídos do próprio aluno). Nunca número
  comparativo a outro aluno.
- **teacher**: turmas do professor com `activeStudentsToday` (contagem de
  alunos distintos com algum evento hoje) — nunca lista de quais alunos, e
  nunca ranking.
- **admin**: só `schoolsCount`/`classroomsCount`/`usersCount`. Nenhum dado
  no nível de aluno individual nesta tela, mesmo que o admin tenha acesso
  técnico a isso em outro lugar.

### Padrão: eventos RD-* são escopados ao aluno

`interaction_events.studentPseudoId` é `NOT NULL` e nomeado para aluno de
propósito — o schema RD-I/RD-P/RD-C/RD-E/RD-L existe para avaliar Pensamento
Computacional do estudante (RQ5), não para telemetria operacional de
professor/admin. Por isso:

- `login_attempt`/`login_success` só são emitidos no fluxo **aluno**
  (`AuthService.loginStudent`) — login de professor/admin não gera evento
  nessa tabela.
- `home_viewed` só é emitido por `StudentHome` no frontend —
  `TeacherHome`/`AdminHome` não chamam `POST /events`.

Se um caso de uso futuro precisar de telemetria operacional real de
professor/admin, isso é uma tabela nova (ou um `type`/schema explicitamente
pensado pra isso), não um forçar de pseudônimo de staff dentro de
`studentPseudoId` — ver `ExportAuditLog` (`AuditModule`, 6.6) pro primeiro
caso real disso ("quem exportou o quê, quando"), na seção "Exportação de
dados brutos pra pesquisa" abaixo.

## Blocos por desafio (RQ4 — sobrecarga cognitiva/abstração, 39,13%)

`GET /challenges/by-topic/:topicId` (entrada da sequência de um tópico) e
`GET /challenges/:id` (acesso direto a um desafio específico — usado pelo
"Avançar" saindo do anterior) devolvem a paleta **restrita** ao desafio —
nunca a paleta completa do Blockly (AC1 de 3.1). Ambas as rotas passam pelo
mesmo `ChallengesController.buildDetailOrThrow`. O mecanismo:

- **`blocks`** (`BlocksModule`) é o catálogo de blocos — tabela, não enum
  fixo (mesmo padrão de `subjects`/`topics`/`illustrations`, ver regra de
  modelagem abaixo). Cada linha tem `blockType` (o `type` que o Blockly usa
  em runtime), `label` em português, `category`/`categoryLabel` (agrupamento
  livre, curado por quem cadastra — não uma enum de código) e `blocklyJson`,
  a definição completa no formato de `Blockly.defineBlocksWithJsonArray`. O
  frontend nunca hardcoda a forma de um bloco — registra em runtime a partir
  daqui. Um bloco novo existe só cadastrando uma linha + o desafio que o usa,
  sem deploy de frontend.
- **`Challenge.config`** (jsonb, tipado em `challenge-config.interface.ts`)
  guarda `{ stage, allowedBlockTypes, goal, program?, investigationQuestion?,
  predictQuestion?, editableFields? }`. `stage` é o estágio Use-Modify-Create
  do desafio (regra não-negociável 2/3, ver nota de pesquisa completa no
  próprio arquivo de tipos); `allowedBlockTypes` é a lista de `blockType`
  permitidos, resolvida contra o catálogo `blocks` e devolvida já agrupada
  por categoria (AC5 de 3.1 — abas pequenas e nomeadas, nunca uma lista
  única). `predictQuestion`/`editableFields` são o motor PRIMM "Predict"/
  "Modify" — ver "Fase Modify" abaixo e a nota de pesquisa "motor PRIMM" em
  `challenge-config.interface.ts`.
- **`Challenge.position`** (int, nunca `createdAt`) é a ordem pedagógica do
  desafio dentro do tópico — `ChallengesService.findByTopicIdOrdered`
  ordena por ele. Existe especificamente pra permitir inserir uma etapa no
  meio depois sem precisar forjar timestamp — foi assim que o desafio
  `modify` entrou entre os dois desafios seed originais (ver "Sequência
  Use→Modify→Create" abaixo).
- **`program`** (3.3 fase `use`, e 3.4 fase `modify`): quando presente, o
  frontend pré-carrega o workspace com este programa (`initialJson`) — mesmo
  formato de `Blockly.serialization.blocks.save()` (tipado em
  `SerializedBlockState`, espelhado no frontend em
  `apps/web/src/lib/blockProgram.ts`). `locked: true` na resposta (fase
  `use`) trava o Blockly inteiro (`readOnly: true`, sem toolbox) — único
  controle do aluno é Executar/Repetir execução, e a pergunta de
  investigação (`investigationQuestion`, motor PRIMM "Investigate") aparece
  depois da 1ª execução. **`locked` não é `Boolean(program)`** — é
  `stage === 'use'` explicitamente, porque a fase `modify` também nasce com
  `program`, mas com `locked: false` (campos editáveis, ver abaixo).
- **`nextChallengeId`**: resolvido andando `findByTopicIdOrdered` a partir do
  desafio atual — é pra onde o botão "Avançar" (3.3 AC4) navega depois do
  aluno executar ao menos uma vez. `null` quando não há próximo desafio
  cadastrado ainda.
- **`block-progression.ts`** (`findBlockProgressionViolations`) é a
  implementação de AC2 (3.1): nenhum `blockType` pode "estrear" (aparecer
  pela primeira vez, na ordem de `position`) fora do estágio `use`. É uma
  checagem de autoria de currículo, testada contra o seed real em
  `block-progression.spec.ts` — não uma trava em runtime por aluno (só faz
  sentido travar por aluno quando existir um desafio `modify`/`create` de
  verdade pra travar contra).
- **Sem autoria de toolbox LIVRE pelo professor.** O backlog original da
  feature de blocos cita "config JSON gerada pelo professor via camada
  visual" como dependência — decisão explícita à época: em vez de construir
  essa camada, o conteúdo (`blocks` + `Challenge.config`) era curado 100%
  via seed/migration. **Isso mudou parcialmente em 4.2** (ver seção
  "Configuração de desafio via formulário guiado — Modo Template" abaixo):
  o professor agora cria desafio escolhendo um TEMPLATE pré-montado e
  ajustando parâmetros pedagógicos num formulário — nunca escrevendo/vendo
  `Challenge.config`, XML ou JSON do Blockly diretamente. A sequência
  Use→Modify→Create de um tópico (curada via seed) continua fixa e igual
  pra todo aluno; um desafio criado via template é um desafio adicional,
  autoral do professor, fora dessa sequência forçada (ver
  `findByTopicIdOrdered` na seção nova). "Modo Customizado" (liberdade
  total sobre a estrutura do bloco-alvo, sem template) continua não
  implementado — fora do escopo de 4.2 por decisão explícita do card.

### Sequência Use→Modify→Create completa (3.4)

O seed do tópico `angulos_formas` (migrations `SeedSquareChallengeToolbox`,
`SeedUseModifyCreateSequence`, `AddAngleFieldToTurnBlock`,
`SeedModifyChallenge`) tem hoje os 3 desafios do ciclo completo:

| position | title | stage | Comportamento |
|---|---|---|---|
| 1 | Monte o quadrado | `use` | 3.3 — programa pré-montado, travado, só Executar/Repetir + pergunta de investigação |
| 2 | Monte o quadrado — agora mude! | `modify` | 3.4 — mesmo programa, campos TIMES/ANGLE editáveis dentro de limites, previsão antes de cada execução |
| 3 | Monte o quadrado — sua vez! | `create` | editor livre (3.1), com botão de Ajuda mostrando a forma-alvo sem entregar os blocos |

RQ2 do mapeamento sistemático (21,74% dos estudos primários) dá respaldo
empírico ao ciclo **completo** de 3 etapas — este é o primeiro tópico com o
trio inteiro, use-o como referência ao desenhar um tópico novo (ver "Desafio
novo..." em `docs/ai/rules/coding-rule.md`).

### Trilha "Estados da Matéria" — bloco condicional (3.12)

Segundo tópico com o ciclo Use→Modify→Create completo (domínio
`water_state`, `Topic.domain` — ver "Adição de domínio a tópicos" abaixo),
seedado em `SeedEstadosDaMateriaTopic` (desafios 1/2) +
`SeedEstadosDaMateriaCreateChallenge` (desafio 3, adicionado nesta revisão
pra fechar o ciclo — os dois primeiros já existiam, o terceiro faltava):

| position | title | stage | Comportamento |
|---|---|---|---|
| 1 | Como a água muda de estado? | `use` | programa pré-montado (`conditional_if` com limiar de ebulição 100°C) e travado, só Executar/Repetir + Predict antes de cada execução |
| 2 | Como a água muda de estado? — agora mude! | `modify` | mesmo programa, campo `THRESHOLD` editável (80–120°C) inline no bloco, Predict antes de cada execução |
| 3 | Como a água muda de estado? — crie o seu! | `create` | editor livre, mesma paleta completa (`conditional_if` + `set_water_state`) que Use/Modify já usam via `allowedBlockTypes`, sem `program` pré-montado |

O bloco `conditional_if` (migration `CreateConditionalBlock`) é o primeiro
bloco do catálogo com ramificação real — `DO_THEN`/`DO_ELSE`, comparação
`temperatureC > THRESHOLD`. Cada ramo é rotulado com ícone **e** texto
(`✅ ENTÃO`/`❌ SENÃO`) direto no `message0` do bloco Blockly — nunca só a
cor diferencia os caminhos (AC4 de 3.12; `colour: 210` é igual pros dois
ramos, comprovando que não é o diferenciador). `set_water_state`
(migration `CreateSetWaterStateBlock`) é a ação folha — "definir estado
como X" — usada dentro de cada ramo.

A fase Modify **não** ganhou uma toolbox própria de "blocos numéricos
avulsos" (como o texto do card 3.12 sugere): não existiria onde um bloco
numérico solto se encaixaria, já que `THRESHOLD` é um `FieldNumber` do
próprio `conditional_if`, não um input de valor separado. Mesmo mecanismo
de `editableFields`/`applyModifyFieldLocking` que a fase Modify de
Geometria já usa (ver "Fase Modify (3.4)" acima) — só o parâmetro numérico
fica manipulável, o bloco condicional em si nunca é destacável/removível
nem aparece numa paleta pra recompor a estrutura, o que satisfaz a intenção
do AC ("só o valor-limiar é editável, o condicional completo não aparece
pra montar") por um caminho já estabelecido no resto da plataforma, em vez
de introduzir um segundo mecanismo (toolbox restrita) só pra esta trilha.

O intérprete (`waterProgram.ts#interpretWaterProgram`, frontend) é puro e
com ramificação de verdade — ao contrário do intérprete de tartaruga
(`blockProgram.ts`, achata tudo numa lista sequencial), aqui só um dos dois
ramos do `conditional_if` é percorrido por chamada. Ver "Trilha 'Estados da
Matéria'" em `frontend.md` para a UI (toolbox por fase, componente de
transição sensorial 3.16).

**Eventos dos desafios 2.1/2.2/2.3 (3.13/3.14/3.15)** — todos escopados ao
aluno, mesmo schema RD-I/RD-P/RD-C/RD-E do resto da plataforma, nenhuma
categoria nova:

| Evento | Categoria | Desafio | Quando |
|---|---|---|---|
| `temperature_slider_changed` | RD-I | 2.1/2.2 | ao soltar o slider (`onValueCommit`), nunca a cada pixel do arrasto |
| `predict_to_run_duration` | RD-I | 2.1/2.2 | ao Executar, se havia predição pendente — `duration_ms` desde `handlePredict` |
| `thresholdChanged` | RD-I | 2.2 | a cada edição do campo `THRESHOLD` destravado — `previous_value`/`new_value` |
| `program_executed` | RD-P | 2.1/2.2/2.3 | a cada Executar/Repetir execução — snapshot do programa serializado; em 2.1 (Use) carrega também `prediction_given`/`result_matched_prediction`, mesmo formato opcional de `ChallengePage`, pra `findExecutionsWithPrediction` enxergar |
| `water_state_prediction` | RD-C | 2.1/2.2 | a cada Executar com predição pendente — predição declarada × resultado real (a predição em si nunca loga sozinha, mesma decisão de `ChallengePage.handlePredict` pra Geometria); nunca dispara em 2.3, que não tem predição |
| `water_states_coverage` | RD-C | 2.3 | a cada Executar — `covered_states`/`missing_states`/`all_covered`, fallback de corretude client-side (ver 3.17 abaixo pra corretude AUTORITATIVA) |
| `challenge.completed` | RD-C | 2.3 | quando `water_states_coverage.all_covered` — mesmo `type` que o Create de Geometria usa, contado por `StudentHome`/`HomeService` |
| `water_program_validated` | RD-C | 2.3 | gravado pelo BACKEND (nunca pelo frontend), a cada `submit-program`, só quando o desafio tem `expectedModel` — ver "Validador de lógica condicional vs. modelo esperado (3.17)" abaixo |
| `challenge_use_completed` | RD-P + RD-C | 2.1 | ao "Avançar" saindo da fase Use (`attempts >= 1`) — faltava, corrigido nesta revisão; sem ele `findUseCompletions` nunca via a fase Use da água |
| `feedback_shown` | RD-I | 2.1/2.2/2.3 | toda vez que o feedback (sempre descritivo, nunca punitivo) é exibido |
| `challenge_time_in_phase` | RD-E | 2.1/2.2/2.3 | ao "Avançar" — tempo na fase + nº de tentativas |

### Validador de lógica condicional vs. modelo esperado (3.17)

Corretude AUTORITATIVA do desafio 2.3 — nunca confiada ao frontend (o
aluno poderia, em tese, forjar uma requisição alegando ter acertado) e
NUNCA visível a ele em nenhuma forma (AC2 de 3.17: "visível apenas ao
professor", nunca "erro"/"nota" individual pro aluno).

- **Sem "rodar o JS gerado pelo Blockly" — decisão deliberada.** O texto
  do card sugere `Blockly.JavaScript.workspaceToCode` + `eval`/`new
  Function` no servidor. Isso seria a PRIMEIRA superfície de execução de
  código dinâmico gerado a partir de input do aluno em todo o backend
  (confirmado: nenhum `eval`/`new Function` existe hoje em `apps/api`,
  `blockly` não é dependência do backend). Em vez disso,
  `apps/api/src/challenges/water-program.ts` é uma PORTA em TypeScript
  puro de `apps/web/src/lib/waterProgram.ts` (mesmo algoritmo, mesma
  árvore `SerializedBlockState`) — um tree-walker que só compara
  `type`/`fields`, nunca executa nada. Mesma decisão de duplicar tipos
  entre frontend/backend já documentada em `SerializedBlockState`
  (`challenge-config.interface.ts`) — não há pacote compartilhado neste
  monorepo.
- **`WaterExpectedModel`** (`challenge-config.interface.ts`) —
  `{ scenarioLabel, testCases: { temperatureC, expectedState }[] }`,
  campo opcional `Challenge.config.expectedModel`. Curado via migration
  hoje (`AddExpectedModelToWaterCreateChallenge`, cenário "Dia muito
  quente": 7 temperaturas cobrindo os 3 estados, evitando os limiares
  exatos 0°C/100°C de propósito — mede cobertura física, não uma
  ambiguidade de comparação `>`/`>=`). Um handler de template pro domínio
  `water_state` (professor escolhendo limiares numa tela, em vez de
  migration) é possível com a MESMA arquitetura de
  `ChallengeTemplateHandler` que `RegularPolygonTemplateHandler` já usa —
  não construído nesta revisão (o preview "Visualizar como aluno" de
  `TemplateChallengeForm.tsx` é hoje hardcoded pro motor Pixi/tartaruga;
  um template de água precisaria de um preview alternativo, trabalho à
  parte).
- **`validateWaterProgramAgainstTestCases(topBlock, testCases)`**
  (`water-program.ts`) — roda `interpretWaterProgram` uma vez por caso de
  teste, compara com `expectedState`, devolve `caseResults`/
  `correctCount`/`totalCount`/`allPassed`. Pura, sem I/O, testada em
  `water-program.spec.ts` (9 casos, incluindo aninhamento e limite de
  profundidade).
- **`ChallengeValidationModule`** (`apps/api/src/challenge-validation/`)
  — módulo pequeno e dedicado, mesmo padrão de granularidade de
  `ChallengeDraftsModule`:
  - `POST /students/me/challenges/:challengeId/submit-program`
    (`ChallengeValidationController`, `Roles(Role.STUDENT)`, mesmo
    prefixo/racional de `ChallengeDraftsController` — sempre escopado ao
    PRÓPRIO aluno via `req.user`, nunca um id do corpo). Corpo:
    `{ program: SerializedBlockState | null }` — a MESMA árvore já
    enviada em `program_executed.block_sequence_json`, reenviada porque a
    validação precisa da autoridade do backend.
  - `ChallengeValidationService.submitWaterProgram` — no-op silencioso
    (`{ validated: false }`, sem erro) quando o desafio não tem
    `expectedModel` (cobre "não é o 2.3 de água" e "professor não
    configurou cenário ainda", ambos fluxos normais); senão roda a
    validação e grava `water_program_validated` (RD-C) via
    `EventsService.record`, com `case_results` completo. **Resposta
    SEMPRE só `{ validated: boolean }`** — nunca corretude.
- **Leitura — só pelo relatório do admin.** `MetricsAdminChallengeService.
  buildCreateInsights(challengeId, expectedModel)`, chamado em
  `getChallengeReport` quando `stage === 'create' && expectedModel`
  existe: agrega `allCasesPassedRate` (mesmo formato `RateReport` de
  `predictionMatchRate`, aggregate + perStudent + histograma) e `perCase`
  (passes/submissions POR temperatura configurada — nunca por aluno
  nomeado; lista TODOS os casos do cenário, mesmo com 0 submissões, nunca
  esconde qual caso o cenário define). `EventsService.
  findWaterProgramValidations` é a query nova, mesmo padrão de
  `findModifyAttempts`. `ChallengesController` (rota do aluno) nunca lê
  `expectedModel` nem os eventos de validação — isolamento por "endpoint
  nunca inclui o campo", mesmo mecanismo que já garante que nenhum campo
  interno vaza pro aluno por acidente (ver "Blocos por desafio" acima).
- **Frontend**: `WaterStateChallengePage.handleRun` dispara o `submit-
  program` fire-and-forget (`.catch(() => {})`, mesmo padrão do POST de
  `.../viewed`) sempre que `isCreate`, mesmo quando não há `expectedModel`
  configurado (o backend decide se há algo a validar). A resposta nunca é
  lida além do ack — nenhuma UI de aluno reage a ela.
- **Reaproveitamento do motor de "casos de teste" da Geometria**: não
  existe — confirmado na investigação que precedeu esta implementação.
  Geometria avalia sucesso via `evaluateSquareGoal` (uma checagem de
  fechamento geométrico único, não uma lista de casos de teste). 3.17 é a
  PRIMEIRA implementação de um motor de "N casos de teste vs. resultado
  esperado" na plataforma — nasceu deliberadamente genérica na FORMA
  (`WaterProgramTestCase`/`WaterProgramValidationResult` não têm nada
  Blockly-específico além da árvore `SerializedBlockState`), mas o
  intérprete em si (`water-program.ts`) é específico do domínio
  `water_state` (mesmo racional de `blockProgram.ts`/`waterProgram.ts`
  serem intérpretes SEPARADOS por domínio no frontend) — um domínio
  condicional futuro reaproveitaria o padrão (módulo dedicado + porta
  backend do intérprete + `expectedModel` no config), não o código.

**`predictionAccuracy`/`predictionMatchRate` (RD-L)** — calculado em
`MetricsAdminChallengeService.buildUseInsights`/`buildModifyInsights`
(`apps/api/src/metrics/metrics-admin-challenge.service.ts`), genérico por
TYPE/formato de payload de evento, não por domínio. `buildModifyInsights`
(`challenge_modify_attempt`) já funcionava pra água desde 3.14 — o desafio
2.2 reaproveita o evento sem mudança de forma. `buildUseInsights`
(`findExecutionsWithPrediction` + `findUseCompletions`) **não** enxergava
o desafio 2.1 antes desta revisão — corrigido pelos dois ajustes de evento
na tabela acima (`program_executed` com `prediction_given`, e
`challenge_use_completed` passando a existir).

**`modifyExitedAt`** — não existe campo com esse nome; o equivalente
funcional é `MetricsService.resolveCompletedStudents` (`stage ===
'modify'`, linha ~70-83): um aluno "saiu" do Modify quando tem QUALQUER
evento no `nextChallengeId` da sequência (`EventsService.
findStudentsWithEvent`), resolvido genericamente por `ChallengeStage` +
posição na sequência — funciona pra água automaticamente, já que o 2.3
(criado nesta revisão) tem `position`/`topicId` corretos. É um booleano de
conclusão, não um timestamp — se o AC exigir literalmente um campo
`*ExitedAt` (não só a lógica derivada), falta reaproveitar
`EventsService.findEarliestEventTimestamps` (já existe, usado hoje só pra
`earliestAnyEvent`/`earliestExecution` DENTRO do próprio desafio) contra o
`nextChallengeId`.

### Fase Modify (3.4)

O desafio `modify` reaproveita o mecanismo de `program` pré-montado da fase
`use` (mesma árvore serializada), mas com `locked: false` — o Blockly não
fica `readOnly`, senão os campos não dariam pra editar. Dois campos novos em
`Challenge.config` sustentam isso:

- **`editableFields: EditableFieldConfig[]`** — `{ blockType, fieldName,
  label, min, max }[]`, os campos do `program` que ficam destravados e os
  limites "definidos pelo professor" pra este desafio (AC de 3.4: "não
  deixar ângulo negativo ou maior que 360°" etc.). Curado via seed, mesma
  decisão já tomada pra toolbox ("Sem autoria de toolbox pelo professor
  nesta versão" acima) — o professor não escreve isso numa tela, mas o
  valor é por-desafio, não fixo no bloco, então um `modify` futuro noutro
  tópico pode usar limites diferentes sem tocar na definição do bloco.
  O frontend aplica isso travando estrutura (bloco não-móvel/não-deletável)
  e habilitando só os campos listados — ver `applyModifyFieldLocking` em
  `ChallengePage.tsx`.
- **`predictQuestion`** — motor PRIMM "Predict" (ver "Como desafios futuros
  adotam PRIMM" abaixo).
- **Campo `ANGLE` no bloco `turn`** (migration `AddAngleFieldToTurnBlock`):
  o ângulo de giro era um valor fixo (90°) no executor, nunca um campo do
  bloco — sem isso não dava pra "mudar o ângulo" (AC de 3.4). O limite
  técnico do próprio bloco (1–359°) é o piso de segurança; o limite
  específico deste desafio vem de `editableFields`, por cima. Efeito em
  desafios existentes: o bloco `turn` passa a mostrar o valor do ângulo em
  toda tela que o usa (fase `use` só exibe, travado; fase `create` passa a
  exigir que o aluno defina o ângulo, antes implícito) — decisão aceita,
  correta pro tópico geometria.
- **Sem avaliação de sucesso/fracasso**, mesmo racional da fase `use`: o
  objetivo é observar a transformação, não bater uma meta fixa. O `goal`
  ainda vai no config (tipagem exige), mas o frontend não o usa pra
  sucesso/fracasso nesta fase.

### Como desafios futuros adotam PRIMM (3.6)

PRIMM (Predict-Run-Investigate-Modify-Make) é modelado como **vocabulário de
`Challenge.config`**, nunca como uma máquina de 5 estados hardcoded numa
tela ou numa `Challenge`. Cada estágio "existe" só quando o campo
correspondente está presente:

| Estágio | Campo de config | Onde vive hoje |
|---|---|---|
| Predict | `predictQuestion` | desafio `modify` |
| Run | (sempre — todo desafio tem Executar) | todos |
| Investigate | `investigationQuestion` | desafio `use` |
| Modify | `editableFields` | desafio `modify` |
| Make | ausência de `program` | desafio `create` |

Um tópico novo (de qualquer disciplina) adota PRIMM só preenchendo os campos
relevantes em `Challenge.config` ao cadastrar cada desafio — nunca
escrevendo lógica de tela nova nem expondo os rótulos técnicos ao aluno
(regra não-negociável 3). Ver a nota de pesquisa "motor PRIMM" completa em
`challenge-config.interface.ts` e a implementação do lado do frontend em
`docs/ai/modules/frontend.md`.

### Rastreabilidade PRIMM × Use-Modify-Create (tópico `angulos_formas`)

Tabela de rastreabilidade — qual estágio de qual framework cada desafio
seedado satisfaz hoje, verificada por leitura direta do `config` real (não
só pela intenção documentada acima):

| Estágio | Desafio(s) | Cadência | Framework(s) satisfeito(s) |
|---|---|---|---|
| Predict | 3.3 (Desafio 1, `use`, position 1) **e** 3.4 (Desafio 2, `modify`, position 2) | 3.3: só antes da 1ª execução (o programa nunca muda ali) · 3.4: antes de **cada** execução (os valores editáveis mudam a cada rodada) | PRIMM |
| Run | 3.3, 3.4, 3.5 | sempre | PRIMM |
| Investigate | 3.3 | depois da 1ª execução | PRIMM |
| Modify | 3.4 | — | PRIMM + Use-Modify-Create |
| Make/Create | 3.5 (Desafio 3, `create`, position 3) | — | PRIMM + Use-Modify-Create |

**Use-Modify-Create**: as 3 etapas cobertas por 3 desafios distintos em
sequência (position 1→2→3), sem lacuna — RQ2 (21,74% dos estudos) atendido
por completo pela primeira vez neste tópico.

**PRIMM**: os 5 estágios cobertos, sem lacuna — P-R-I unificados em 3.3
(mais próxima da formulação clássica de PRIMM na literatura), com Predict
também presente em 3.4 numa cadência própria (repetido a cada rodada, já
que ali os valores editáveis mudam — em 3.3 o programa é fixo, então prever
de novo a cada reexecução não agregaria nada). O mecanismo de tela
(`challenge.predictQuestion` presente → mostra o widget de previsão antes
do Executar) já era genérico desde a implementação de 3.4 — adicionar
Predict a 3.3 foi só uma linha de config nova (migration
`AddPredictQuestionToUseChallenge`), nenhuma tela nova.

**Duas condições verificadas nos dados reais (não só na intenção
documentada):**

1. **Identidade do programa entre Investigate (3.3) e Modify (3.4).** O
   PRIMM pressupõe que o aluno modifica o mesmo programa que investigou, não
   uma cópia divergente. Confirmado por query direta em produção/dev: os
   `config.program` dos dois desafios são **byte-a-byte idênticos**
   (`repeat_times{TIMES:4}` → `move_forward` → `turn{DIR:RIGHT,ANGLE:90}`).
   Não eram idênticos por padrão — o `program` de 3.3 foi seedado antes do
   campo `ANGLE` existir no bloco `turn` (ver migration
   `AddAngleFieldToTurnBlock`), então carregava o valor por default do
   Blockly em vez de um valor explícito; a migration
   `AlignUseProgramAngleField` fecha essa lacuna explicitamente, pra a
   igualdade ser verificável por comparação direta do jsonb, não só "dá o
   mesmo resultado visual". Isso é uma checagem manual de autoria de
   currículo (mesma categoria de `block-progression.spec.ts`) — não existe
   hoje um teste automatizado que trave essa igualdade se um dos dois
   `program` for editado no futuro sem tocar o outro; ver "Próximos passos".
2. **Cobertura agregada de PRIMM (checagem "4.7"/campo `primm_stages_covered`
   de autoria "4.5").** Nenhum dos dois existe nesta base de código — nem
   um campo `primm_stages_covered` por desafio nem um verificador agregado
   de cobertura PRIMM em runtime (4.7). Note que "autoria de desafio pelo
   professor" citada aqui como "4.5" é uma numeração de backlog distinta
   de "4.2" (Modo Template, ver seção própria acima) — 4.2 implementa
   CRIAÇÃO de desafio via template, não a checagem de cobertura PRIMM que
   este item descreve; os dois continuam não implementados. A cobertura
   documentada nesta seção é garantida pela estrutura do seed/config,
   verificável por leitura direta — não por um mecanismo de aviso que
   "fecha sozinho". Quando 4.5/4.7 forem implementados: o valor certo de
   `primm_stages_covered` pro desafio 3.3 é `['predict', 'run',
   'investigate']`, e pro 3.4 é `['predict', 'run', 'modify']` (cada um
   cobre os três — Run é implícito em toda execução — não só o nome que dá
   título ao desafio).

### Eventos desta feature

Além de `toolbox_rendered`/`block_dragged` (3.1, RD-I), `program_executed`
(3.2, RD-P — `block_sequence_json` é o programa serializado, o mesmo formato
de `program`), `challenge_use_completed` (3.3 — logado duas vezes, uma
`RD-P` e uma `RD-C`, seguindo literalmente a notação "RD-P + RD-C" do
backlog da feature, já que uma linha de `interaction_events` só tem uma
`category`) e `challenge.help_viewed` (3.5, RD-I — clique no botão de Ajuda
da fase `create`, sem payload além do `challengeId`; ver
`ChallengePage.handleHelp` no frontend). Este último é o dado por trás de
`helpButtonUsageRate` no painel do professor (6.4, ver "Painel do professor:
progresso por turma" abaixo) — a única leitura agregada que existe hoje
sobre esse evento; não há tela ainda que mostre o clique individual (isso
seria M5, profundidade por desafio, no backlog do admin).

`program_executed` ganha dois campos opcionais — `prediction_given`/
`result_matched_prediction` — só quando o desafio pede previsão (motor
PRIMM "Predict", 3.6) e não é a fase `modify` (que já tem seu próprio
evento mais detalhado, ver abaixo, sem duplicar). Hoje isso cobre o desafio
`use` (3.3): a previsão feita antes da 1ª execução é comparada contra
quantos lados o traçado fechou com, em todo `program_executed` daquele
desafio (inclusive reexecuções — o valor não muda porque o programa é
fixo, então repetir o comparativo é intencional, não estado sujo).

`challenge_modify_attempt` (3.4, RD-P) — logado a cada Executar dentro do
desafio `modify` (além do `program_executed` genérico, que continua saindo
igual): `{ challenge_id, changed_values, prediction_given,
result_matched_prediction, timestamp }`. `changed_values` só lista os campos
de `editableFields` cujo valor diverge do `program` original (calculado no
frontend via `lib/editableFields.ts`); `result_matched_prediction` compara a
previsão do aluno (motor PRIMM "Predict") contra quantos lados o traçado
realmente fechou com (`turtleWorld.closedPolygonSides`) — `false` quando o
traçado nem fecha, sem virar mensagem de erro na tela (regra 4).

## Feedback de erro não-punitivo (3.7)

Regra não-negociável 4 (nunca "errado"/X vermelho/comparação entre alunos)
já estava implementada no texto fixo de `ChallengePage.tsx` desde o MVP —
o que faltava era (AC4) deixar essas mensagens **configuráveis pelo
professor por desafio, com um conjunto de mensagens-padrão sugeridas**.

`ChallengeConfig.feedbackMessages?: { retry?: string; success?: string }`
(`challenge-config.interface.ts`) — só se aplica a desafios `stage:
'create'` (`use` nunca avalia sucesso/falha; `modify` compõe a própria
reflexão dinamicamente, nunca um texto estático, ver "Blocos por desafio"
acima). `apps/api/src/challenges/feedback-messages.ts` concentra:

- **`DEFAULT_FEEDBACK_MESSAGES`** — literalmente as strings que já
  estavam hardcoded em `ChallengePage.tsx` antes desta feature
  ("Quase lá — quer tentar de novo?"/"Você montou o desafio! ✅"). Um
  desafio sem `feedbackMessages` (todo currículo semeado) continua se
  comportando exatamente igual — o frontend resolve o default (ver
  `lib/feedbackMessages.ts`, frontend.md), o backend só passa `null`
  adiante quando ausente (mesmo padrão de `snapTolerancePercent`).
- **`validateFeedbackMessages`** — rejeita mensagem customizada com
  linguagem punitiva (`"errad"`, `"errou"`, `"falh"`, `"incorret"`, busca
  simples por substring, não um filtro de linguagem genérico) ou maior que
  200 caracteres. Chamada por `ChallengeTemplatesService.
  validateAndBuildConfig` (ver "Configuração de desafio via formulário
  guiado" abaixo) junto com a validação pedagógica do handler do template
  — um professor não consegue salvar "Isso está errado, tente de novo."
  como mensagem de retry, a regra não-negociável 4 é aplicada na ORIGEM,
  não só confiada à tela.
- **`sanitizeFeedbackMessages`** — trim + descarta campo vazio (nunca
  persiste string vazia; o formulário de edição precisa distinguir "sem
  valor" de "professor apagou o texto", ver frontend.md).

`ChallengesController` devolve `feedbackMessages: ChallengeFeedbackMessages
| null` em `ChallengeDetail` (`null` pro currículo semeado, mesmo padrão de
`snapTolerancePercent`/`editableFields`). Configurado pelo professor via
`SaveTemplateChallengeDto.feedbackMessages` (opcional, `POST
/challenge-templates/:id/challenges` e `PATCH /teacher/challenges/:id`) —
ver "Endpoints" na seção 4.2 abaixo. `TeacherChallengeDetail.feedbackMessages`
(nunca `undefined`, `{}` quando o professor nunca customizou) alimenta o
formulário de edição com o que já foi salvo.

### `feedback_shown` (RD-I) — evento escopado ao aluno

Emitido pelo frontend (`ChallengePage.tsx`) toda vez que um feedback é
exibido — Use/Create (`evaluation.success` decide `feedback_type`) e
Modify (`actualSides !== null` decide, já que ali não há meta fixa) —
`{ challenge_id, feedback_type: 'neutral' | 'success', stage, timestamp }`.
Cabe em `interaction_events` sem ressalva (diferente do racional de
`AdminActionLog`/`ExportAuditLog` documentado alhures): é literalmente
sobre a experiência do PRÓPRIO aluno vendo feedback, o caso central que o
schema RD-I existe pra cobrir — nenhuma decisão de arquitetura nova aqui.

### Testes

`feedback-messages.spec.ts` (backend, função pura) cobre a lista de
palavras punitivas, o limite de tamanho, o sanitize de string vazia/
whitespace, e que os próprios defaults sugeridos passam na validação (não
seria bom sugerir por padrão uma mensagem que o próprio validador
rejeitaria). `ChallengeTemplatesService`/`ChallengesController` ganharam
casos cobrindo o merge de `feedbackMessages` no `config`, a rejeição de
mensagem punitiva tanto na criação quanto na edição, e o passthrough pro
aluno. Do lado do frontend, `lib/feedbackMessages.spec.ts` (resolução de
default) e `ChallengePage.spec.tsx` (primeiro teste de componente desta
tela — ver frontend.md) cobrem o comportamento visível.

## Configuração de desafio via formulário guiado — Modo Template (4.2)

RQ4 — barreira institucional/formação docente (17,39%): o professor cria um
desafio novo escolhendo um **template pré-montado de uma biblioteca
curada** (hoje 1, geometria: "Desenhar um polígono regular") e ajustando só
parâmetros pedagógicos expostos como campos de formulário simples (nº de
lados, ângulo de giro, tolerância de encaixe, paleta de blocos habilitada).
**Em nenhum momento — galeria, formulário, erro de validação, preview —
o professor vê/edita XML, JSON ou qualquer estrutura interna do Blockly**
(regra não-negociável 9). Este card implementa exclusivamente o Modo
Template; "Modo Customizado" (liberdade total sobre a estrutura do
bloco-alvo, sem template) é outro card, não implementado.

### Nota de pesquisa: por que dado+handler-por-key, não 100% dado

`ChallengeTemplate` (a linha de catálogo — nome, ícone, descrição,
`parameterSchema`) segue o mesmo padrão de `blocks`/`subjects` (tabela, não
enum fixo). Mas VALIDAÇÃO pedagógica ("3 lados com 200° de giro não fecha
um polígono") e a TRADUÇÃO parâmetros→`Challenge.config` não podem ser
100% dado sem reinventar uma linguagem de regras genérica — o tipo de
complexidade que este projeto já decidiu evitar (mesma lógica de "sem
autoria de toolbox LIVRE pelo professor", ver seção "Blocos por desafio"
acima). Por isso o desenho tem duas metades:

- **Metadata é dado**, cresce sem deploy: `ChallengeTemplate.parameterSchema`
  (`challenge-template-parameter.interface.ts`) descreve cada campo do
  formulário — `type` (`integer | percentage | boolean | blockSelection`),
  `label`/`icon` (sempre os dois — rotulagem redundante, RQ4), `min`/`max`,
  `defaultValue`, `visualPreview` (qual miniatura mostrar, ver frontend.md)
  e, só pra `blockSelection`, `candidateBlockTypes`.
- **Lógica é uma classe pequena por `key`** — `ChallengeTemplateHandler`
  (`handlers/challenge-template-handler.interface.ts`): `validateParameters`
  (linguagem pedagógica, nunca "erro de schema"), `buildChallengeConfig`
  (a única "tradução" formulário→estrutura interna, feita SÓ aqui) e
  `buildPreviewGoal` (o suficiente pro preview no Pixi). Registrada em
  `handlers/template-registry.ts` — **cadastrar um template novo é 1 linha
  na tabela + 1 classe + 1 entrada no registry; nenhum outro arquivo deste
  módulo, do `ChallengesModule` ou do frontend muda.** É o que responde
  literalmente ao pedido de "reutilizável/escalável… sem refazer tudo do
  zero pra cada novo desafio" — geometria é só o primeiro template, não uma
  suposição embutida em nenhum service/controller/tela.

### `RegularPolygonTemplateHandler` — único template do MVP

Parâmetros: `sides` (3-12), `turnAngleDeg` (1-359), `snapTolerancePercent`
(10-100), `closureTolerancePx` (1-40, 7.4 AC3 — ver seção própria abaixo),
`enabledBlockTypes` (subconjunto do catálogo `blocks`). Validação real, não
decorativa:

- **Fechamento geométrico** — `sides × turnAngleDeg` precisa ser múltiplo
  de 360°; senão, mensagem pedagógica com sugestão de ângulo válido
  (`360 ÷ sides`) — é literalmente o exemplo do card ("3 lados com 200° não
  fecha um polígono").
- **Tolerância de encaixe nunca 0%** (mínimo 10%) — 0% impediria o aluno de
  encaixar qualquer bloco (RQ4, coordenação motora fina); ver
  `snapTolerancePercent` abaixo pra como isso vira efeito real no editor,
  não só um número guardado.
- **Regra de progressão Use-Modify-Create também vale pro desafio do
  professor**: `enabledBlockTypes` só pode conter blocos já introduzidos
  num desafio `stage: 'use'` do MESMO tópico (`ChallengeTemplatesService.
  getIntroducedBlockTypes`, reaproveitando `ChallengesService.
  findByTopicIdOrdered`) — um professor não pode habilitar um bloco que o
  aluno nunca viu introduzido, mesma regra de currículo de
  `block-progression.ts`, só que verificada em runtime aqui (lá é só
  checagem de autoria de seed).
- Sem parâmetro de "ângulos negativos": decisão deliberada, não uma lacuna
  esquecida — o bloco `turn` (ver "Blocos por desafio" acima) já expõe
  `DIR` (LEFT/RIGHT) mas não tem hoje um jeito de restringir esse campo
  por-desafio (diferente de `editableFields`, que é só pra fase `modify`
  sobre um `program` pré-montado, não pra toolbox livre da fase `create`).
  Adicionar o toggle sem um jeito real de aplicá-lo seria expor uma
  configuração que não faz nada — contradiz a persona do projeto (não
  fabricar parâmetro decorativo). Documentado aqui pra quem for adicionar
  suporte real no futuro, não implementado como placeholder.

`buildChallengeConfig` sempre produz `stage: 'create'` (editor livre — o
template não autora Use/Modify, só o desafio de "mão na massa" final) com
`goal: { shape: 'regular_polygon', sides, turnAngleDeg, closureTolerancePx }`
— reaproveita 100% do motor geométrico já existente (`turtleWorld.ts`:
`evaluateSquareGoal`/`closedPolygonSides`/`buildGoalPreviewPath`), sem
nenhuma mudança de engine além de aceitar a tolerância como parâmetro (ver
seção 7.4 abaixo). `SquareGoalConfig.shape` foi ampliado de `'square'`
(literal) pra `string` só por causa disso — a matemática de fechamento já
era genérica por `sides`/`turnAngleDeg` desde sempre.

### `snapTolerancePercent` — parâmetro que afeta o editor de verdade

`Challenge.config` ganhou `snapTolerancePercent?: number`, devolvido em
`ChallengeDetail.snapTolerancePercent` (`ChallengesController`, `null` pro
currículo seedado). O frontend (`blocklyToolbox.applyGenerousSnapTolerance`)
passou a aceitar um percentual e reescala `dragRadius`/`snapRadius`/
`connectingSnapRadius` a partir dele, reaplicado a cada desafio carregado
(não só uma vez no load do módulo) — ver frontend.md. Existe
especificamente pra AC3 não virar teatro: rejeitar "0% de tolerância" no
formulário só tem sentido pedagógico se um valor válido REALMENTE mudar o
comportamento do editor pro aluno.

### `closureTolerancePx` — critério de sucesso configurável (7.4, AC3)

`SquareGoalConfig.closureTolerancePx?: number` (`challenge-config.interface.ts`)
é a margem de erro, em pixels, que `evaluateSquareGoal`/`closedPolygonSides`
(frontend, `lib/turtleWorld.ts`) usam pra decidir "o traçado fechou a
forma" — RQ4, mitigar imprecisão de coordenação motora fina na execução
dos blocos, mesmo racional de `snapTolerancePercent`, mas um conceito
DIFERENTE: aquele é tolerância de ENCAIXE de bloco no editor, este é
tolerância de FECHAMENTO GEOMÉTRICO do traçado desenhado. Ausente
(currículo semeado) usa o default do motor (`CLOSE_TOLERANCE_PX = 5`);
escolhido pelo professor num desafio criado via template — validado no
handler (`MIN/MAX_CLOSURE_TOLERANCE_PX = 1/40`, nunca 0 pelo mesmo motivo
de `snapTolerancePercent` nunca 0%) e propagado no `goal` (`ChallengesController`
devolve `goal` por inteiro, sem campo novo — `closureTolerancePx` chega ao
frontend "de graça").

Isto é a peça que faltava do card 7.4 ("Critério de sucesso suporta
tolerância... necessário para mitigar imprecisão de coordenação motora
fina"). O resto do card já estava coberto por 4.2 antes mesmo deste
trabalho começar — ver "Seletores visuais pré-definidos" logo abaixo.

### Seletores visuais pré-definidos e preview (7.4, AC1/AC2/AC4) — já cobertos por 4.2

O card pede "seletores visuais pré-definidos (nº de lados, ângulo final,
figura fechada?) em vez de expressões/código" (AC1) e "testar o critério
de sucesso imediatamente usando o modo de pré-visualização (4.6) antes de
publicar" (AC4) — **os dois já eram verdade antes desta sessão**, via o
formulário guiado de 4.2 (`parameterSchema`/`TemplateParameterField`,
`POST /challenge-templates/:id/preview`, ver seções acima). Nenhuma
mudança de código foi necessária pra essas duas ACs — só documentar a
correspondência:

- "Número de lados"/"Ângulo final" → os parâmetros `sides`/`turnAngleDeg`
  do template, exatamente como pedido.
- "Figura fechada?" não existe como toggle independente pro polígono
  regular — é GARANTIDO pela validação geométrica (`sides × turnAngleDeg`
  múltiplo de 360°), não um critério configurável à parte. Um template
  futuro cujo critério de fechamento não seja implícito por construção
  precisaria de um seletor próprio; não fabricado aqui sem caso de uso.
- "Modo de pré-visualização" → `POST .../preview`, já cobre "valida os
  parâmetros" (AC3 de 4.2) e "mostra a forma-alvo animada" (AC4 de 4.2) —
  a mesma coisa que 7.4-AC4 pede, sob outro número no backlog original.
- AC2 de 7.4 (min/max configurável por campo editável, fase Modify,
  validado no client antes da execução) — **já implementado como
  capacidade de dado** desde antes de 4.2: `EditableFieldConfig.min/max`
  (ver "Blocos por desafio" acima) é aplicado via `Blockly.FieldNumber.
  setConstraints` no client. O que NÃO existe é uma tela onde o professor
  autora um desafio `stage: 'modify'` via template (`RegularPolygonTemplateHandler.
  buildChallengeConfig` sempre produz `stage: 'create'`) — mesma decisão já
  documentada de "sem autoria de toolbox LIVRE pelo professor", nunca
  revisitada nesta sessão por ser um escopo bem maior (autoria de fase
  Modify inteira) que o card não pedia explicitamente.

### Autorização e escopo — desafio do professor nunca entra na sequência forçada

`Challenge` ganhou três colunas (`templateId`, `templateParams` jsonb,
`createdByUserId`) — ver database.md. Duas decisões de escopo, ambas em
`ChallengesService`:

- **`findByTopicIdOrdered` (a sequência OFICIAL Use→Modify→Create de um
  tópico, usada por `ChallengesController.getByTopic`/resolução de
  `nextChallengeId`, e por `MetricsTeacherService`/
  `MetricsAdminChallengeService`) agora filtra `createdByUserId IS NULL`.**
  Não existe hoje mecanismo de "atribuir/publicar desafio pra turma" (fora
  do escopo de 4.2) — seria um risco real inserir automaticamente conteúdo
  não curado no fluxo obrigatório de TODOS os alunos do tópico só porque um
  professor criou um desafio novo. Um desafio de professor continua
  acessível por link direto (`GET /challenges/:id`, sem filtro — a rota de
  acesso direto do aluno não muda), só não participa do "Avançar"
  automático nem aparece na sequência forçada. `findMaxPositionInTopic`
  (nova, sem esse filtro) garante que a `position` de um desafio novo nunca
  colide com a de outro, currículo ou professor.
- **`findByIdForOwner(id, teacherId)`** é a checagem de posse usada por
  toda rota de edição/exclusão (AC5/AC6) — devolve `null` tanto pra desafio
  inexistente quanto pra desafio de outro professor/do currículo, nunca
  vazando "existe mas não é seu".

### Endpoints (`ChallengeTemplatesModule`, sempre `@Roles(Role.TEACHER)`)

- `GET /challenge-templates` (AC1, galeria) — `{ id, key, name, description,
  icon }[]`, nunca o nome técnico do bloco Blockly.
- `GET /challenge-templates/:id` (AC2, formulário) — `parameterSchema`
  já resolvido: pra `blockSelection`, `options` vem filtrado pelos blocos
  já introduzidos no tópico (ver acima) com `label` do catálogo `blocks`
  (nunca `blockType` cru como rótulo).
- `POST /challenge-templates/:id/preview` (AC3 + AC4, um endpoint só pras
  duas coisas) — sempre `200`, nunca lança pra validação pedagógica:
  `{ valid, errors: [{ parameterKey, message }], goal }` — `goal` só
  presente quando `valid`. O frontend chama isto tanto pro botão
  "Visualizar como aluno" quanto como pré-checagem antes de "Salvar" (ver
  frontend.md) — o mesmo mecanismo de validação nunca diverge entre as duas
  telas.
- `POST /challenge-templates/:id/challenges` — cria o desafio
  (`stage: 'create'`, `position` = máxima do tópico + 1, `templateParams`
  = os parâmetros exatamente como o professor preencheu). Revalida
  server-side (defesa em profundidade — a tela sempre chama `/preview`
  antes) com `400 BadRequestException` cuja mensagem é a junção das
  mensagens pedagógicas do handler, nunca "erro de validação" genérico.
  Aceita `feedbackMessages` opcional (3.7, AC4) — validado (linguagem
  punitiva/tamanho, ver `feedback-messages.ts`) e mesclado no `config`
  antes de persistir, mesma revalidação server-side de propósito.
- `GET/PATCH/DELETE /teacher/challenges/:id` + `GET /teacher/challenges`
  (`TeacherChallengesController`, AC5/AC6) — "Meus desafios": mesmos dois
  campos (título + parâmetros) tanto pra criar quanto editar, nunca
  `Challenge.config` bruto na resposta. Duplicar (AC6) não é um endpoint
  próprio — o frontend busca o desafio de origem via `GET
  /teacher/challenges/:id` e reabre a tela de criação com os mesmos valores
  pré-preenchidos + `POST .../challenges` com um título novo, nunca clona
  `config` diretamente.

### RD-C — parâmetros nunca descartados (RQ5)

`Challenge.templateParams` persiste exatamente os parâmetros que o
professor escolheu (nº de lados, ângulo, tolerância, blocos) — nunca
descartado depois de virar `config` (a AC de rastreabilidade do card, "RD-C
… necessários pra RQ5: qual configuração curricular foi usada por qual
turma"). Diferente de todo outro dado desta feature, isto NÃO vira um
`interaction_event`: ações de professor/admin não emitem evento RD-* (ver
"Padrão: eventos RD-* são escopados ao aluno" acima) — a coluna no próprio
`Challenge` é o mecanismo de persistência aqui, correlacionável depois via
`interaction_events.challengeId` (já FK real) pra qualquer análise
longitudinal que precise saber "com que configuração curricular este aluno
interagiu".

### Testes

`regular-polygon.handler.spec.ts` — a peça com regra de negócio de
verdade: fechamento geométrico (inclusive o exemplo literal do card),
tolerância mínima, regra de progressão de blocos, e que `buildChallengeConfig`/
`buildPreviewGoal` nunca expõem `allowedBlockTypes`/estrutura de blocos no
preview. `challenge-templates.service.spec.ts` cobre a resolução de
`blockSelection.options` filtrada, o bloqueio de criação/edição inválida
sem chamar `ChallengesService`, e a persistência de `templateParams`.
`challenges.service.spec.ts` ganhou casos pro escopo `createdByUserId IS
NULL` de `findByTopicIdOrdered` e pro CRUD novo.

## Alocação de desafio a uma turma (4.3)

Um desafio criado via 4.2 nasce só na biblioteca do professor — nenhum
aluno alcança nada até o professor ALOCAR o desafio a uma turma. Sem essa
alocação, o desafio existe como rascunho, nunca vaza pra área de nenhum
aluno (AC3). Feature pequena e cirúrgica: 1 tabela de associação + 2
controllers, nenhuma mudança nas features de 4.2.

### Schema: `challenge_classroom_allocations`, N:N de propósito

`ChallengeClassroomAllocation` (`challengeId`, `classroomId`,
`allocatedByUserId`, `allocatedAt`, `UNIQUE(challengeId, classroomId)`) é
uma tabela de associação clássica — a cardinalidade N:N que a AC6 pede (um
desafio pode ir a várias turmas, uma turma pode ter vários desafios) é a
FORMA NATURAL desse desenho, não uma concessão especial pro futuro. O MVP
só valida 1 turma por desafio na UI/testes (ambiente de teste real: 1
professor, 1 turma "Turma Demo"/`AZUL-1`, 1 aluno matriculado — conferido
contra o banco seedado), mas nada no schema impede um professor real
alocar o mesmo desafio a duas turmas simultaneamente.

O vínculo aluno↔turma (a outra metade da cardinalidade N:N citada na AC6)
**já existia** antes de 4.3 — é a `Enrollment` (1.5, ver "Modelagem de
domínio" abaixo e `database.md`): histórico (`active`/`unenrolledAt`),
schema já N:N-capaz (um aluno pode ter várias matrículas ao longo do
tempo). 4.3 não mexe nela, só LÊ (`SchoolsService.
findActiveEnrollmentsByStudent`, já existente) pra resolver a turma ativa
do aluno. **Nota histórica**: à época da implementação de 4.3, 1.5 (User
Story "Vínculo aluno↔turma↔professor", telas de matrícula/transferência)
ainda não tinha endpoint/UI própria — só o MODELO de dado já suportava o
histórico. Isso mudou nas duas sessões seguintes: `EnrollmentsModule`
("Matrícula/transferência de turma (1.5)" abaixo) e o CRUD administrativo
de `schools`/`classrooms` ("Gestão de escolas e turmas (admin)" abaixo)
fecharam os dois gaps.

### Nota de arquitetura: por que a alocação NÃO vira um `interaction_event`

A AC7 pede "log RD-C: desafio_id, turma_id, professor_id,
timestamp_alocacao". `interaction_events.studentPseudoId` é `NOT NULL` de
propósito — o schema RD-* existe pra avaliar Pensamento Computacional do
ESTUDANTE (RQ5), não telemetria de ação de professor (regra já aplicada a
login de professor, a `templateParams` de 4.2, e agora aqui — ver "Padrão:
eventos RD-* são escopados ao aluno" acima). A PRÓPRIA LINHA de
`ChallengeClassroomAllocation` já contém os 4 campos que a AC pede — é o
registro em si, não precisa duplicar num evento fake de aluno. RQ5 fica
igualmente servido: cruzar `interaction_events.challengeId` com
`challenge_classroom_allocations` responde "qual configuração curricular
foi usada por qual turma, e desde quando" sem forçar um pseudônimo de
staff onde o schema não prevê. Mesmo padrão de `templateParams` (4.2) e
`ExportAuditLog` (6.6).

### Autorização — professor só mexe no que é seu

`ChallengeAllocationsService` checa DUAS posses antes de qualquer
alocação/desalocação, nunca uma só: `ChallengesService.findByIdForOwner`
(o desafio é deste professor — mesmo método que 4.2 já usa pra editar/
excluir) e uma checagem de titularidade de turma (`classroom.teacherId ===
teacherId`, mesmo racional de `MetricsTeacherService.assertOwnClassroom`,
reimplementada aqui porque vive em módulo diferente). AC1 — "nunca todas
as turmas da escola" — é garantido assim: a lista de turmas SELECIONÁVEIS
na tela do professor vem de `GET /home/teacher` (2.1, já existente, já
escopado ao professor autenticado — nenhum endpoint novo só pra listar
"minhas turmas").

### Endpoints

- `GET/POST /teacher/challenges/:challengeId/allocations` +
  `DELETE .../:classroomId` (`TeacherChallengeAllocationsController`,
  `@Roles(TEACHER)`) — listar/ligar/desligar o vínculo. `POST` com
  `classroomId` duplicado devolve `409 ConflictException` (mensagem clara,
  nunca erro de constraint cru). `DELETE` remove só a linha de associação
  (AC5) — `Challenge` e qualquer `interaction_events` já registrado
  continuam intactos, porque nunca dependeram da alocação pra existir.
- `GET /students/me/classroom-challenges` (`StudentClassroomChallengesController`,
  `@Roles(STUDENT)`) — a "trilha" de desafios alocados à turma ATIVA do
  aluno autenticado (AC2/AC3/AC4). Rota própria (`students/me/...`), não
  `GET /challenges/...`: evita colidir com `ChallengesController` (`GET
  /challenges/:id`, aluno-só, módulo diferente) — duas rotas dinâmicas
  competindo pelo mesmo prefixo em módulos diferentes seria frágil de
  manter correto conforme o projeto cresce.

`ChallengeAllocationsService.findAvailableForStudent` resolve a turma via
`SchoolsService.findActiveEnrollmentsByStudent` e usa só a PRIMEIRA
matrícula ativa (MVP: 1 aluno = 1 turma, AC6) — decisão de leitura, não uma
restrição imposta ao schema (`Enrollment` já suporta N:N, ver acima). Aluno
sem matrícula ativa devolve lista vazia, nunca erro.

### Testes

`challenge-allocations.service.spec.ts` cobre as duas checagens de posse
(desafio de outro professor, turma de outro professor — nunca "turma
qualquer da escola"), o `409` de alocação duplicada, que `deallocate`
nunca remove o `Challenge` em si, e que `findAvailableForStudent` escopa
corretamente pela turma ativa e devolve `[]` sem matrícula. Os dois
controllers (`teacher-challenge-allocations.controller.spec.ts`,
`student-classroom-challenges.controller.spec.ts`) confirmam que o
id de professor/aluno usado em toda chamada vem sempre do JWT
(`req.user.sub`), nunca de um parâmetro manipulável pelo cliente.

## Modelagem de domínio (usuários, disciplinas, escola/turma)

- **`users` é uma tabela única com `role`** (`student | teacher | admin`),
  não três tabelas separadas. Permissão é sempre derivada do papel via
  `RolesGuard` + `@Roles()` — nunca hardcoded tela a tela. Isso existe para a
  barreira institucional/formação docente (RQ4, 17,39%): o professor nunca
  precisa entender a estrutura técnica, e a UI pode abstrair o papel sem
  reescrever regra de permissão em cada lugar.
- **`subjects`/`topics` são tabelas, não enum fixo.** O MVP cadastra uma
  única linha de cada (`geometria` / `angulos_formas`, via seed na migration
  `CreateSubjectsAndTopics`), mas a estrutura já suporta N disciplinas sem
  migration destrutiva quando o catálogo crescer.
- **`schools` / `classrooms` / `enrollments`** modelam escola, turma e
  matrícula. `Enrollment` é histórico (`active` + `unenrolledAt`), não um
  vínculo fixo — um aluno pode trocar de turma/professor sem perder o
  histórico de matrículas anteriores. `Classroom.teacherId` é o professor
  titular atual e pode ser reatribuído com um `UPDATE` simples.
- **Nenhuma dessas FKs valida papel no banco** (ex.: nada impede um `User`
  com `role=admin` de ser inserido como `Classroom.teacherId`, ou um
  `role=teacher` como `Enrollment.studentId`). É invariante de aplicação —
  validar na camada de serviço quando os endpoints forem implementados.
- **Pseudonimização é automática, não uma etapa que o código de registro
  precisa lembrar de fazer.** `User.pseudonymId` é gerado por um
  `@BeforeInsert()` (`randomUUID()`) direto na entidade — qualquer caminho
  que crie um `User` (endpoint de registro futuro, seed, import em lote)
  ganha o pseudônimo de graça. A identidade real (referência da escola) fica
  em `StudentIdentityReversal`, tabela **separada**, em módulo próprio
  (`src/identity/`) que **o `EventsModule` nunca importa** — assim o backend
  de eventos fisicamente não tem acesso de código à reversão, não é só uma
  política de acesso em nível de rota. Regra não-negociável 8.
- **`challenges`** é modelagem mínima (título, enunciado, `config` jsonb —
  ver "Blocos por desafio" acima pro que `config` guarda hoje). O suficiente
  para existir os 3 desafios do tópico de geometria e para
  `interaction_events.challengeId` ser uma FK real. O ciclo PRIMM interno
  (Predict-Run-Investigate-Modify-Make) é modelado como vocabulário de
  `config`, não uma máquina de estado própria em `Challenge` — ver "Como
  desafios futuros adotam PRIMM" acima.

## Eventos de interação

`POST /events` grava um `InteractionEvent` (tabela append-only, nunca
atualizada/apagada). Todo novo módulo de feature que representa interação do
aluno relevante (bloco encaixado, desafio resolvido, tempo de inatividade,
etc.) deve emitir um evento com a categoria RD-* correta — não é opcional,
ver regra não-negociável 6 em `coding-rule.md`.

`payload` é `jsonb` livre por tipo de evento, mas o campo `type` deve ser um
vocabulário controlado por feature (ex.: `block.snap`, `challenge.predict`),
nunca texto livre vindo direto do frontend sem validação.

`challengeId` já é FK real para `challenges.id` (`ON DELETE SET NULL`,
nullable — nem todo evento é escopado a um desafio, ex.: login).

## Painel do professor: progresso por turma (6.3/6.4)

Plano completo em `docs/ai/backlog/metricas-professor-admin.md` (M2/M3,
"Status: ✅ Implementado" em cada seção). `MetricsTeacherModule`
(`apps/api/src/metrics/metrics-teacher.{service,controller}.ts`) expõe duas
rotas — sempre `@Roles(Role.TEACHER)`, sempre escopadas pelas turmas onde o
professor autenticado é `Classroom.teacherId`, nunca a escola inteira:

- `GET /metrics/teacher/classrooms/:classroomId/students` (6.3) — progresso
  de cada aluno matriculado ativo da turma, desafio a desafio, em toda a
  sequência Use→Modify→Create de todo tópico cadastrado (não só o tópico
  "atual" — o MVP só tem `angulos_formas`, mas o serviço já percorre
  `SubjectsService.findAllTopics()` × `ChallengesService.
  findByTopicIdOrdered`, mantendo cada sequência de tópico independente
  pra `nextChallengeId` nunca vazar de um tópico pro outro).
- `GET /metrics/teacher/classrooms/:classroomId/summary` (6.4) — a mesma
  base de dado agregada por estágio (`byStage: [{ stage, studentsCompleted,
  studentsInProgress, studentsNotStarted }]`), mais `activeStudentsToday` e
  `helpButtonUsageRate` — nunca um nome de aluno nesta rota (AC de 6.4: o
  detalhe individual é sempre a rota de 6.3).

Ambas as rotas reusam o motor 6.1 (`MetricsService.
getChallengeProgressForStudents`) — nenhuma query nova de status/tentativas
é escrita aqui, só a orquestração "quais desafios existem" +
"quais alunos estão matriculados" em cima do motor já existente.

**Titularidade de turma, checada antes de qualquer query de aluno**
(`MetricsTeacherService.assertOwnClassroom`, chamado no início dos dois
métodos públicos do serviço): turma inexistente → `404 NotFoundException`;
turma de outro professor (mesma escola ou não) → `403 ForbiddenException`.
É o primeiro lugar do backend que implementa a autorização "só o professor
*daquela* turma" citada como gap em `PATCH /users/:id/sensory-profile` (ver
"Perfil sensorial persistente e Home por papel" acima) — aquele endpoint
continua sem essa checagem fina, não foi retroativamente alinhado por esta
feature.

**`helpButtonUsageRate` (6.4)** conta, entre os alunos ativos da turma,
quantos têm ao menos um evento `challenge.help_viewed` (RD-I, ver "Eventos
desta feature" acima) em qualquer desafio `stage: 'create'` da sequência —
arredondado com `Math.round`, exposto como número puro (`42`, não `0.42` /
"42% de dificuldade"), seguindo a regra não-negociável 7 (RD-E/sinal
observável nunca vira inferência na resposta da API).

**Ordenação nunca é por desempenho** (regra não-negociável 5): a rota de
6.3 devolve os alunos ordenados por `enrolledAt` ascendente por padrão — a
tela permite alternar pra ordenação por nome, nunca por status/tentativas.

## Relatório de profundidade por desafio (6.5)

Plano completo em `docs/ai/backlog/metricas-professor-admin.md` (M5,
"Status: ✅ Implementado" — a especificação real acabou bem mais rica que o
rascunho original do documento, ver a nota lá). `GET /metrics/admin/
challenges` (seletor — todo desafio cadastrado, qualquer tópico) e
`GET /metrics/admin/challenges/:challengeId` (o relatório), ambas
`@Roles(Role.ADMIN)`, sem escopo de turma/escola — é a plataforma inteira
(visão de pesquisa do admin), nunca nome de aluno em lugar nenhum da
resposta.

**Decisão técnica não-negociável desta feature: todo cálculo estatístico
(média, mediana, desvio padrão, quartis, histograma) é feito em código, a
partir de valores brutos por aluno, nunca em SQL agregado**
(`apps/api/src/metrics/statistics.ts` — funções puras, sem I/O, 28 testes
com dataset canônico `[1..10]` conferido contra `numpy`). Duas razões:
mantém a lógica testável sem depender de `PERCENTILE_CONT`/`STDDEV` do
dialeto do banco, e reproduzível — os quartis usam interpolação linear
(método R "type 7" / default de `numpy.percentile`) especificamente pra
que o mesmo `p` aplicado ao mesmo dado bruto (exportável via 6.6, ver
"Exportação de dados brutos pra pesquisa" abaixo) reproduza exatamente o
número em R/Python.

`MetricsAdminChallengeService` (`apps/api/src/metrics/
metrics-admin-challenge.service.ts`) é o orquestrador: busca dado bruto via
métodos novos de `EventsService` (`findDistinctStudentsForChallenge`,
`findEarliestEventTimestamps`, `countEventsByCategoryForChallenge`,
`countEventsByTypeForChallenge`, `findModifyAttempts`,
`findExecutionsWithPrediction`, `findUseCompletions` — todos escopados só
por `challengeId`, sem `pseudoIds` pré-filtrado, porque aqui a população é
"todo aluno que já teve algum evento neste desafio", não uma turma) e
delega todo cálculo a `statistics.ts`. Reaproveita o motor 6.1
(`MetricsService.getChallengeProgressForStudents`) pra status/tentativas
por aluno — mesma fonte que 6.3/6.4, nenhuma query de status duplicada.

Pontos de desenho que valem registrar:

- **Histograma de tentativas (`1`/`2`/`3`/`4+`) exclui alunos com 0
  tentativas** — não existe bucket "0" no AC, e forçar um aluno que nunca
  executou pro bucket "1" misrepresentaria o dado. `attemptsPerStudent`
  (estatística descritiva) continua incluindo o zero — cada card carrega
  seu próprio N implícito, podem divergir entre si de propósito.
- **Desvio padrão é sempre amostral** (denominador n-1) e `null` (nunca 0)
  quando N&lt;2 — indefinido matematicamente nesse caso, não um "sem
  variação".
- **Taxa de acerto de previsão nunca funde agregada com por-aluno**: a
  primeira (`aggregate`) é sobre TENTATIVAS (todas juntas, de todos os
  alunos), a segunda (`perStudent`) é sobre ALUNOS (média das taxas
  individuais) — os dois `n` reportados são propositalmente diferentes.
  `attemptsVsMatchRateScatter` (só no estágio `modify`) é 1 ponto por aluno,
  sem nenhum identificador (nem pseudônimo) — o gráfico não precisa disso.
- **"Tentativas até a previsão bater" (estágio `modify`) só conta alunos
  que eventualmente bateram** — quem nunca bateu fica de fora dessa
  distribuição específica (o `n` do card já comunica isso), não é forçado a
  `null`/infinito nem contado como 0.
- **`useCompletions`/`attemptsBeforeProceed` usa só a cópia RD-P de
  `challenge_use_completed`** (a que carrega `attempts_before_proceed`/
  `investigation_answer`) — a cópia RD-C é bookkeeping curricular duplicado,
  contar as duas dobraria o N (ver "Eventos desta feature" acima, onde esse
  evento é logado 2× por "Avançar").
- **Estágio `create` não tem `modifyInsights` nem `useInsights`** — chave
  ausente da resposta (não `null` forçado), a própria forma do JSON já
  comunica o estágio (AC de 6.5: "ausência comunica o estágio").
- **RD-E nunca interpretado** — só `eventsByCategory['RD-E']`, um número
  puro, em qualquer parte da resposta (regra não-negociável 7 — o princípio
  vale pro admin tanto quanto pro professor, mais dado bruto não é mais
  interpretação).

### N mínimo configurável (`SettingsModule`)

`apps/api/src/settings/` — `PlatformSetting` é uma tabela singleton (1
linha só, `getOrCreate` materializa o default na primeira leitura se
ninguém alterou nada ainda) com `minSampleSizeThreshold` (default 5).
`GET/PATCH /admin/settings`, admin only. Puramente de apresentação — mudar
o valor nunca recalcula dado histórico nem afeta a resposta de
`/metrics/admin/challenges/:challengeId` além de fazer o frontend decidir
se mostra o aviso de amostra pequena (AC de 6.5). Não vive dentro de
`MetricsModule` — é config de plataforma, não métrica; `MetricsModule`
importa `SettingsModule` pra `MetricsAdminChallengeService` poder ler o
threshold.

## Exportação de dados brutos pra pesquisa (6.6)

Plano completo em `docs/ai/backlog/metricas-professor-admin.md` (M6,
"Status: ✅ Implementado"). Diferente de 6.2/6.5 (agregados prontos pra
virar gráfico), aqui o admin escolhe um recorte (escola e/ou desafio e/ou
período) e recebe as linhas de `interaction_events` quase cruas — RQ5 por
completo: é o que efetivamente viabiliza usar o dado coletado desde o MVP
num artigo/análise fora da plataforma, não só guardar num banco que
ninguém consulta.

`GET /metrics/admin/export?schoolId=&challengeId=&from=&to=&format=json|csv&page=&pageSize=`
(`MetricsAdminController.exportEvents`, `@Roles(Role.ADMIN)`) —
`MetricsAdminExportService` (`apps/api/src/metrics/
metrics-admin-export.service.ts`) faz toda a validação e orquestração:

- **Ao menos um filtro é obrigatório** (escola, desafio ou período — AC
  explícita): nenhum dos três presentes é `400 BadRequestException` antes
  de tocar o banco. Período é sempre os dois extremos juntos (`from` E
  `to`) — só um dos dois também é `400`, nunca um intervalo aberto.
- **Limite de 90 dias no período** (`MAX_PERIOD_DAYS`, `to` tratado como
  fim do dia em UTC): acima disso, `400` com mensagem clara pedindo pra
  reduzir o intervalo — nunca trunca silenciosamente nem deixa a query
  correr contra o histórico inteiro (AC explícita, testada em
  `metrics-admin-export.service.spec.ts`).
- **Escola resolve pra pseudônimo antes de filtrar eventos**
  (`SchoolsService.findAllStudentPseudoIdsBySchool`, novo) — TODO aluno já
  matriculado na escola (qualquer turma, matrícula ativa ou encerrada), não
  só os ativos de hoje (diferente de `findActiveStudentsBySchool`, 6.2): a
  exportação de pesquisa quer o histórico completo, um aluno que trocou de
  turma não deveria sumir do dado exportável. Escola sem nenhum aluno
  matriculado devolve resultado vazio (não erro) — ainda assim conta como
  "uma exportação realizada" e é auditada.
- **Nunca um join que reintroduza `displayName`** (regra não-negociável
  8, aplicada mesmo pro admin): a linha exportada é exatamente
  `{ id, studentPseudoId, category, type, payload, sessionId, challengeId,
  createdAt }` — as colunas de `InteractionEvent`, ponto. Quem precisar
  cruzar pseudônimo↔turma faz isso numa exportação separada (dado de
  `enrollments`), nunca na mesma planilha.
- **Paginação sempre ativa** (`page`/`pageSize`, máximo 500 por página —
  `ExportEventsQueryDto`) — não é uma rota de "baixar a tabela inteira de
  uma vez", mesmo pra um recorte por escola/desafio sem período (que
  sozinho não tem limite de intervalo). `EventsService.findEventsForExport`
  pede `pageSize + 1` linhas de propósito: a resposta usa a linha extra só
  pra calcular `hasMore`, sem precisar de um `COUNT(*)` separado.
- **`format=csv`** monta o corpo via `metrics/csv.ts` (`toCsv`, função pura
  RFC 4180 — sem lib nova) e escreve `Content-Type`/`Content-Disposition`
  na mão via `@Res({ passthrough: true })`, porque só este formato precisa
  de headers diferentes do JSON default do Nest.

### Auditoria (`AuditModule`, `export_audit_logs`)

**Primeiro registro de auditoria de admin/professor do projeto** — não
existia tabela nenhuma pra "quem fez o quê, quando" antes de 6.6 (ver nota
em "Padrão: eventos RD-* são escopados ao aluno" acima). Módulo próprio
(`apps/api/src/audit/`, não dentro de `MetricsModule`) de propósito:
telemetria de staff é uma preocupação transversal, qualquer feature futura
de admin/professor que precise do mesmo padrão reaproveita
`AuditService.recordExport` em vez de inventar a própria tabela.
`ExportAuditLog` é append-only (mesma filosofia de `interaction_events`,
nunca `UPDATE`/`DELETE`), com `adminUserId` (FK nullable `ON DELETE SET
NULL` — defesa em profundidade, hoje não existe endpoint de exclusão de
usuário), `filters` (jsonb — o recorte exatamente como pedido, strings
originais do DTO) e `rowCount` (quantas linhas saíram NESTA resposta, não
o total do recorte). Gravado uma vez por chamada bem-sucedida —
inclusive quando o resultado é vazio (escola sem aluno), porque a
exportação em si aconteceu; nunca gravado quando a validação rejeita o
pedido antes de qualquer query (nenhum filtro, período > 90 dias, escola/
desafio inexistente).

### Rate limiting (`@nestjs/throttler`)

Primeiro rate limit do projeto (gap geral ainda documentado em "Próximos
passos" pros 3 endpoints de login) — aqui é pré-requisito, não
nice-to-have, dado o volume de dado exposto por request (AC explícita:
"não é uma rota pra baixar a tabela inteira repetidamente sem controle").
`ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }])` importado em
`MetricsModule` (`@Global()`, então basta importar uma vez — não precisa
tocar `AppModule`) — 5 requisições por admin por minuto. `ThrottlerGuard`
só no método `exportEvents` (`@UseGuards(ThrottlerGuard)` na rota, não na
classe inteira) — `schools`/`challenges`/`challenges/:id` continuam sem
limite, só a rota que expõe volume grande de dado por requisição precisa
disso. Por IP (comportamento default da lib), não por admin autenticado —
suficiente pro MVP, sem tracker customizado.

## Mini jogo "Fábrica de Pedaços Iguais" — configuração e métricas (MJ2-MJ5, MJ8)

1º mini jogo de CONTEÚDO da plataforma (MJ1/MJ7 já eram infraestrutura),
plano completo em `docs/ai/backlog/mini-jogo-fabrica-pedacos-iguais.md`.
Módulo novo `apps/api/src/minigames/` — mesma modelagem de `Challenge`
(`stage`+`position` explícitos, `config` jsonb tipado em
`mini-game-level-config.interface.ts`, nunca gabarito oculto: tudo em
`config` é visível ao aluno). `MinigamesController` (`GET
/minigames/levels?conceptId=`, `@Roles(Role.STUDENT)`) serve o catálogo;
`TeacherMinigamesController` (`GET/PATCH /teacher/minigames/levels`,
`@Roles(Role.TEACHER)`) é o painel de configuração pedido pelo produto —
tema + fração-alvo por nível, validação semântica no service (denominador
2-8, numerador 1..denominador-1), nunca "edite o JSON de config" (regra
não-negociável 9). Sem sistema de template plugável (ao contrário de
`challenge-templates`) — só existe 1 jogo, uma abstração de handler seria
prematura.

`interaction_events` ganhou `miniGameLevelId` (uuid nullable, FK `ON DELETE
SET NULL`, migration `AddMiniGameLevelIdToInteractionEvents`) — mesmo
padrão de `challengeId`, permite ao admin cruzar sem parsear `scene_id`
como string do payload. `EventsService` ganhou um bloco de métodos
`*ForMiniGameLevel` dedicados (não generalizados com os `*ForChallenge` —
convenção já estabelecida no arquivo: métodos dedicados por concern).

`MetricsAdminMiniGameService` (`apps/api/src/metrics/
metrics-admin-minigame.service.ts`) espelha `MetricsAdminChallengeService`
(6.5) — mesma orquestração (busca bruta por aluno, delega todo cálculo a
`statistics.ts`, zero fórmula duplicada), rotas `GET /metrics/admin/
minigames` (lista) e `GET /metrics/admin/minigames/:levelId` (relatório
completo: alunos alcançados/concluídos, rodadas por aluno, tempo até 1ª
execução, eventos por categoria/tipo, abandono RD-E sempre como número
bruto — regra não-negociável 7, taxa de resposta da predição opcional).

### MJ8 — vínculo conceito-currículo (desafio de blocos × mini jogo)

`Topic.conceptId` (varchar nullable, migration `AddConceptIdToTopics`) é o
mesmo `conceptId` livre já usado em `MiniGameLevel.conceptId` (MJ7) — vive
no TÓPICO (o assunto), nunca em `Challenge` (um desafio individual dentro
da sequência Use→Modify→Create), porque o conceito é uma propriedade do
assunto inteiro. `SubjectsService.findTopicByConceptId(conceptId)` devolve
`null` quando nenhum tópico usa esse conceito ainda — estado normal hoje
(nenhum tópico de blocos cobre frações), não um erro.

`MetricsTeacherService.getConceptComparison(classroomId, teacherId,
conceptId)` (`GET /metrics/teacher/classrooms/:classroomId/
concept-comparison?conceptId=`, mesmo guard de titularidade de turma que
6.3/6.4) devolve os dois sinais lado a lado por aluno: `blocks` (reusa o
motor 6.1, `MetricsService.getChallengeProgressForStudents`, pro(s)
desafio(s) do tópico que casa com `conceptId`) e `miniGame` (usa
`EventsService.findStudentsWithMiniGameEvent`, equivalente de
`findStudentsWithEvent` pro lado do mini jogo — mesmo vocabulário de
status `not_started`/`in_progress`/`completed` dos dois lados, pra caber
na mesma tela sem o professor aprender dois jeitos de ler). `
hasBlocksChallenge`/`hasMiniGame` são flags explícitas na resposta (nunca
inferidas de um array vazio) — hoje `hasBlocksChallenge` é sempre `false`,
porque não existe tópico de blocos de frações ainda; a tela (`
TeacherMetrics.tsx`, aba "Blocos × jogo") mostra um aviso descritivo
nesse caso, nunca erro, e ainda renderiza o sinal do mini jogo. Nenhuma
interpretação clínica é derivada da comparação (regra não-negociável 7) —
só o vocabulário de status já usado no resto do painel do professor.

## Banco de dados

Ver `docs/ai/modules/database.md` para o fluxo completo de migrations. Regra
central: `synchronize: false` sempre — qualquer mudança de schema é uma
migration nova em `src/database/migrations/`.

## Testes

Jest, já configurado no `package.json` do app (`npm run test --workspace
apps/api`, ou `npm run test:api` na raiz). Todo `*.service.ts` tem um
`*.service.spec.ts` ao lado, testando a classe com repositórios mockados
(`jest.Mocked<Repository<T>>`) — sem `TestingModule`/Postgres real. Ver regra
"Testes" em `docs/ai/rules/coding-rule.md` para o padrão esperado em módulos
novos.

## Gestão de contas — criação de aluno, CRUD de usuários, matrícula (1.2/1.4/1.5)

Três features de gestão de conta, implementadas juntas por dependerem do
mesmo alicerce (`users.active`, ver abaixo). Cobrem o que "Próximos passos"
citava como gap (`POST /auth/register`, CRUD de `enrollments`) — resolvido
por três endpoints com escopo próprio, não um registro genérico.

### `users.active` + link de definição de senha (suporte a 1.4)

Migration `AddUserStatusAndAdminActionLogs` acrescenta `users.active`
(boolean, default `true`) e `users.passwordSetupToken` +
`passwordSetupTokenExpiresAt` (uuid/timestamp, nullable). `AuthService`
passa a checar `active` nas três rotas de login (`assertPassword` pro fluxo
professor/admin, checagem equivalente em `loginStudent`) — desativar um
usuário bloqueia login no próximo request, mesma mensagem genérica de
credencial inválida (nunca "conta desativada", pra não vazar existência da
conta). `POST /auth/set-password` (sem guard — a conta recém-criada ainda
não tem senha) consome o token via `UsersService.findByPasswordSetupToken`/
`setPasswordHash`.

**Gap conhecido: transporte de e-mail.** A AC de 1.4 pede "sistema envia
e-mail de definição de senha". Não existe integração de e-mail (SMTP/
provedor) neste projeto — `AdminUsersService.create` devolve o token/link
diretamente na resposta HTTP (uma vez só, nunca de novo em `GET
/admin/users`) e a tela do admin (`apps/web/src/routes/admin/AdminUsers.tsx`)
mostra pra copiar/repassar manualmente. Resolver isso de verdade é
integrar um provedor de e-mail — não implementado de propósito (decisão de
infraestrutura fora do escopo desta sessão, não um bug).

### CRUD de usuários — admin (1.4)

`UsersModule` ganhou `AdminUsersController`/`AdminUsersService`
(`@Roles(Role.ADMIN)`, prefixo `admin/users`):

- `GET /admin/users?role=&active=&page=&pageSize=` — lista paginada.
- `POST /admin/users` — cria professor/admin (`displayName`/`email`/`role`,
  nunca senha). `role=admin` gera `totpSecret` (`otplib.generateSecret`) +
  devolve `totpOtpauthUri` (`otplib.generateURI`) — mesmo mecanismo de
  segundo fator já usado em `AuthService.loginAdmin`, só que gerado aqui em
  vez de semeado.
- `PATCH /admin/users/:id` — edita `displayName`/`email`/`role`. Bloqueia
  `email` em usuário `role=student` (`BadRequestException` — aluno não tem
  e-mail) e só aceita `role` como `teacher`/`admin` (nunca rebaixa/promove
  de/pra `student` por aqui — mudar o papel de um aluno pra staff ou
  vice-versa não é uma "edição cadastral", precisaria de fluxo próprio).
- `PATCH /admin/users/:id/status` — `{ active }`, soft delete (AC: "nunca
  hard delete na interface do MVP"). Sem `DELETE` nesta classe de
  propósito.

Toda `create`/`edit`/`activate`/`deactivate` grava um `AdminActionLog`
(`AuditService.recordUserAction`) — ver "Por que `AdminActionLog`, não um
`interaction_event`" abaixo.

### Criação de conta de aluno pelo professor/admin (1.2/A2)

`StudentAccountsModule` (`@Roles(TEACHER, ADMIN)`) — o aluno nunca cria a
própria conta. Desde A2 ("Consentimento do responsável legal no cadastro do
aluno"), a criação virou 2 chamadas reais (não só uma validação a mais no
mesmo request) — ver "Consentimento do responsável legal (A2)" logo abaixo
pro racional completo de por que isso precisou virar um estado "pendente"
de verdade, não só uma checagem a mais.

1. **`POST /teacher/students`** (`StudentAccountsService.createPending`) —
   cria a conta MATRICULADA, com avatar, mas **sem credencial utilizável**:
   1. Resolve a turma (`SchoolsService.findClassroomById`) e autoriza:
      professor só na própria turma (`classroom.teacherId === actor.id`,
      mesmo padrão de `ChallengeAllocationsService.assertOwnClassroom`),
      admin sem restrição.
   2. `SchoolsService.hasActiveStudentWithNameInClassroom` — checagem
      case/trim-insensitive pro alerta de duplicado (AC: "não bloqueante,
      não erro fatal" — a conta é criada de qualquer forma, o response só
      carrega `duplicateWarning: true`).
   3. Resolve o avatar — o escolhido pelo professor (validado contra o
      catálogo `illustrations`, kind `avatar`) ou um sorteio
      (`IllustrationsService.pickRandomAvatar`) se nenhum for informado.
   4. `UsersService.createPendingStudent` (`active: false`,
      `loginImageSequence` fica `null`) + `SchoolsService.createEnrollment`
      — matrícula já acontece aqui; só a CREDENCIAL de acesso é que fica
      pendente.

   Resposta: `{ student, classroom, avatar, duplicateWarning }` — **sem**
   `credential` (não existe ainda).

2. **`POST /teacher/students/:id/guardian-consent`** (A2, ver seção
   própria abaixo) — registra o consentimento do responsável legal e só
   então libera a credencial.

3. **`POST /teacher/students/:id/activate-credential`** — reaproveitado
   internamente pelo passo 2 (`StudentAccountsService.activateCredential`,
   chamado de dentro de `registerGuardianConsent`) e também exposto como
   endpoint próprio, pra nova tentativa caso a ativação em si falhe depois
   do consentimento já ter sido gravado. Sorteia a sequência de login
   (`IllustrationsService.pickRandomLoginImageSequence`, 3
   `Illustration(kind=login_image)` distintas — **reaproveita 100% o
   mecanismo de login por sequência de imagens já implementado em 1.1**,
   `AuthService.loginStudent`) e `UsersService.activateStudentCredential`
   (`active: true` + a sequência gravada) — nunca deriva a credencial de
   `displayName` (AC: "nome em texto livre nunca é usado como parte da
   credencial"). Rejeita com `ConflictException` se a credencial já está
   ativa (nunca regenerar em silêncio — invalidaria uma sequência já
   impressa/entregue ao aluno).

Resposta dos passos 2/3: `{ student, classroom, credential: { avatar,
loginImages } }` — vira a tela imprimível do professor
(`apps/web/src/routes/teacher/TeacherAddStudent.tsx`, `window.print()`
filtrando só o cartão de credencial via CSS `@media print`), agora a
TERCEIRA tela de um wizard de 3 passos (dados do aluno → responsável legal
→ credencial), não mais a única.

## Consentimento do responsável legal no cadastro do aluno (A2)

Requisito não-negociável de compliance ECA: nenhuma credencial de acesso de
aluno pode existir sem o consentimento do responsável legal ter sido
registrado antes — de forma auditável (quem coletou, quando).

### `GuardianConsent` — módulo próprio, 1 registro por aluno

`GuardianConsentsModule` (`apps/api/src/guardian-consents/`) — entidade
`GuardianConsent` (`studentId` `UNIQUE` — um consentimento por aluno, o MVP
não modela revogação/renovação): `guardianName`, `guardianRelationship`
(texto livre, ex.: "mãe"/"tutor legal" — nunca um enum fixo, mesmo racional
de `Classroom.name`), `guardianContact`, `consentedAt`,
`collectedByUserId` (quem registrou — professor ou admin). Sem método de
edição/remoção de propósito: nasce como registro histórico, uma correção
de verdade precisaria de rastreabilidade própria, fora do escopo do MVP.

**Por que módulo/tabela própria, não `AdminActionLog`** — cogitado e
descartado: `AdminActionLog` (1.4) é especificamente sobre CRUD de
USUÁRIO, com `metadata: jsonb` solto pra detalhe livre; o consentimento
tem campos fixos com significado legal próprio (nome/vínculo/contato do
responsável) que merecem colunas reais, não um blob genérico — e a tela de
auditoria (AC4) precisa consultá-los estruturadamente, não fazer parsing
de `metadata`.

**Por que não é um `interaction_event`** — mesmo racional já documentado
pra `ChallengeClassroomAllocation`/`AdminActionLog`: o SUJEITO aqui é uma
ação administrativa sobre um cadastro (dado de identidade REAL de um
terceiro, o responsável — nunca pseudonimizado, porque não é dado de
avaliação de Pensamento Computacional do aluno, é dado de conformidade
legal), não uma interação pedagógica do aluno com o Blockly.
`interaction_events.studentPseudoId` é `NOT NULL` de propósito pro schema
RD-* (RQ5) — forçar isso aqui seria o mesmo erro de categoria já evitado
alhures.

### Bloqueio de ativação — `StudentAccountsService.activateCredential`

```
GuardianConsentsService.hasConsent(studentId) === false
  → BadRequestException('Consentimento do responsável legal pendente —
     registre-o antes de ativar a credencial do aluno.')
```

Esta é a checagem que dá substância real à AC3 ("bloqueia a ativação e
indica claramente qual etapa está pendente") — não uma mensagem genérica
de segurança (como as de `AuthService`, que deliberadamente não revelam o
motivo de uma falha de login): aqui quem recebe o erro já é STAFF
autenticado tentando administrar um cadastro que ele mesmo iniciou, então
ser específico não vaza nada sensível — é o oposto de um vetor de
enumeração.

### Admin nunca escopado por escola aqui (mesma decisão de "Gestão de
escolas e turmas")

`GuardianConsentsAdminController` (`GET
/admin/students/:id/guardian-consent`, `@Roles(Role.ADMIN)`) — sempre
`200`, `{ recorded: false, ... null }` pra "ainda pendente" (não um erro).
Resolve `collectedByDisplayName` via relation já carregada
(`GuardianConsentsService.findByStudentId` — `relations: { collectedBy:
true }`), nunca uma segunda query.

### Backfill do aluno demo — grandfathering explícito, nunca atalho de teste

A migration `CreateGuardianConsents` faz backfill de um `GuardianConsent`
pro aluno demo semeado em `AddLoginMechanisms` (antes de A2 existir) — sem
isso, a conta demo documentada em `database.md` ficaria "com pendência"
numa tela de auditoria que só existe desde agora, mesmo já sendo
utilizável há sessões. **Isto é diferente de pular o fluxo em ambiente de
teste (AC5 proíbe isso explicitamente)**: o backfill só cobre uma conta
que já existia ANTES da feature nascer; a validação ponta a ponta desta
sessão usou um aluno NOVO passando pelos 2 passos reais (criar pendente →
registrar consentimento → credencial liberada), nunca reaproveitando o
backfill como um caminho mais curto.

### Testes

`student-accounts.service.spec.ts` cobre os 3 métodos separadamente:
`createPending` nunca chama `pickRandomLoginImageSequence` (prova de que
nenhuma credencial nasce nesse passo); `registerGuardianConsent` registra
o consentimento ANTES de ativar (ordem de chamada verificada
explicitamente), rejeita aceite não-explícito e consentimento duplicado;
`activateCredential` bloqueia sem consentimento com a mensagem de AC3,
rejeita reativar uma conta já ativa (nunca regenerar credencial em
silêncio). `guardian-consents.service.spec.ts` cobre o CRUD mínimo
(`hasConsent`/`findByStudentId`/`recordConsent`). Frontend:
`TeacherAddStudent.spec.tsx` cobre os 3 passos (conta pendente sem
credencial → bloqueio sem aceite explícito → credencial só depois do
consentimento) e `AdminUsers.spec.tsx` cobre a tela de auditoria (AC4):
"Consentimento" só aparece pra linha de aluno, estado pendente vs.
registrado (quem/quando).

### Recuperação de acesso via professor/admin (1.3)

Aluno não tem e-mail/senha (login por turma+avatar+sequência de imagens,
ver "Login por papel..." em `coding-rule.md`) — não existe "esqueci minha
senha" autoatendido possível pra esse papel. Quando o aluno esquece a
sequência de login, quem recupera é sempre professor titular da turma ou
admin, nunca o próprio aluno.

`StudentAccountsService.resetCredential(studentId, actor)` — `POST
/teacher/students/:id/reset-credential` (mesmo controller/prefixo de
1.2/A2, mesmo guard `@Roles(TEACHER, ADMIN)`):

1. Exige credencial JÁ ativa (`student.active === true`) — distinto de
   `activateCredential` (A2, passo 3), que libera a credencial pela
   PRIMEIRA vez; usar o endpoint errado devolve `BadRequestException`
   apontando pro fluxo certo.
2. Mesma checagem de ownership de `createPending`: professor só reseta
   credencial de aluno matriculado na PRÓPRIA turma
   (`classroom.teacherId === actor.id`); admin sem restrição.
3. `IllustrationsService.pickRandomLoginImageSequence` sorteia uma
   sequência NOVA e `UsersService.resetLoginImageSequence` grava — método
   dedicado, não uma chamada a `activateStudentCredential`, porque este
   nunca deve tocar `active`/reabrir onboarding, só a credencial em si. A
   sequência antiga para de funcionar imediatamente (nunca as duas
   coexistindo) — mesmo racional de "nunca regenerar em silêncio" de A2,
   só que aqui a regeneração é o objetivo explícito da ação, não um erro a
   evitar.
4. Registrado em `AdminActionLog` (`actionType: 'reset_student_credential'`,
   ver A4/1.4 abaixo) — nunca em `interaction_events`: é telemetria de
   ação de STAFF sobre outro usuário, mesmo racional de
   `AdminUsersService.setActive`/`create`/`update`, não uma interação
   pedagógica do aluno.

Resposta: mesma forma de `StudentAccountCredential` (passo 3 de A2) —
`{ student, classroom, credential: { avatar, loginImages } }`. Frontend
reaproveita o MESMO endpoint em dois lugares: `TeacherStudents.tsx`
("Recuperar acesso" na lista de alunos da turma) e `AdminUsers.tsx`
(mesmo botão, só pra linha de aluno já ativo — `AdminUsersService` não
ganhou um endpoint espelhado próprio de propósito, evitar duas
implementações divergentes do que significa "resetar credencial").

Testes: `student-accounts.service.spec.ts` (`describe('resetCredential
(1.3)')`) cobre aluno inexistente, aluno ainda não ativado (aponta pro
fluxo de ativação), ownership de turma (professor de outra turma rejeitado,
admin sem restrição), geração de sequência nova sem regenerar avatar, e o
registro em `AdminActionLog` (nunca em `interaction_events`). Frontend:
`TeacherStudents.spec.tsx`/`AdminUsers.spec.tsx` cobrem o fluxo de UI
(botão só aparece pra aluno ativo em `AdminUsers`, chamada ao endpoint,
exibição da sequência nova).

### Matrícula/transferência de turma (1.5)

`EnrollmentsModule` — dois controllers (`EnrollmentsController` em
`teacher/students/:studentId/enrollments`, `ClassroomRosterController` em
`teacher/classrooms/:classroomId/students`; prefixos deliberadamente
distintos dos de 1.2, mesmo racional de
`StudentClassroomChallengesController` vs `ChallengesController`).

`EnrollmentsService.transfer` cobre matrícula E transferência com o MESMO
método — só existe "tem vínculo anterior" ou não:

- Sem vínculo ativo anterior → só cria (AC1).
- Com vínculo ativo anterior → encerra (`SchoolsService.endEnrollment`,
  `active: false` + `unenrolledAt`, nunca `DELETE`) e cria o novo (AC2).
  Autorização checada nos DOIS lados (turma de origem e destino) quando o
  ator é professor — não pode puxar aluno de turma alheia nem empurrar pra
  turma alheia; admin sem essa restrição.
- Mesma turma origem=destino → `409 ConflictException` (evita um "não-
  evento" silencioso).
- Nunca duas turmas ativas simultaneamente (AC5) — garantido por
  construção: o método sempre encerra a anterior antes de criar a nova,
  nunca acumula.

`student_pseudo_id` nunca muda nessa operação — `Enrollment` só referencia
`studentId`/`classroomId`, o `User.pseudonymId` do aluno é o mesmo antes e
depois (era esse o requisito real da AC "permanece idêntico").

### Por que `AdminActionLog`, não um `interaction_event`

Duas das três features acima geram evento — mas em tabelas diferentes, e a
diferença não é arbitrária:

- **`student_account_created` (RD-I) e `class_enrollment_changed` (RD-L)
  vão pra `interaction_events`.** Apesar de a AÇÃO ser de professor/admin,
  o EVENTO é sobre um aluno específico que passa a existir com
  `studentPseudoId` real — mesmo raciocínio de `login_attempt` (o aluno é
  o sujeito do dado, não quem apertou o botão). `student_account_created`
  carrega `{ created_by_role, class_id }`; `class_enrollment_changed`
  carrega `{ previous_class_id, new_class_id }` — ambos com o
  `studentPseudoId` do aluno afetado.
- **`user_admin_action` (CRUD de 1.4) vira `AdminActionLog`, não
  `interaction_events`.** Diferente dos dois acima, a maioria das chamadas
  de 1.4 não tem NENHUM aluno envolvido (criar/editar/desativar um
  professor não tem `studentPseudoId` nenhum pra carregar) —
  `interaction_events.studentPseudoId` é `NOT NULL` de propósito (ver
  "Padrão: eventos RD-* são escopados ao aluno" acima). Mesmo padrão já
  estabelecido por `ChallengeClassroomAllocation` (4.3) e `ExportAuditLog`
  (6.6): telemetria de ação de STAFF sobre outro registro (não sobre "a
  experiência de um aluno") ganha tabela própria. `AdminActionLog`
  (`apps/api/src/audit/entities/admin-action-log.entity.ts`) segue a MESMA
  forma de `ExportAuditLog` (append-only, `actorUserId`/`targetUserId`
  nullable + `ON DELETE SET NULL`) — `AuditModule` agora exporta os dois.

### Testes

`admin-users.service.spec.ts`, `student-accounts.service.spec.ts`,
`enrollments.service.spec.ts` (mocks de repositório/serviço colaborador,
mesmo padrão do resto do projeto) — cobrem as três checagens de
autorização (professor só na própria turma, admin sem restrição), o
alerta de duplicado não-bloqueante, o bloqueio de login pra `active:
false`, e que a credencial gerada nunca deriva do nome digitado. Validado
ponta a ponta via `curl` contra o Postgres local com as contas demo: criar
professor → `set-password` → login; criar aluno → duplicar nome (alerta,
não erro) → login do aluno com a credencial gerada; desativar aluno →
login rejeitado; listar/filtrar `GET /admin/users`.

## B1 — Soft delete como infraestrutura transversal

`SoftDeletableEntity` (`apps/api/src/common/entities/soft-deletable.entity.ts`)
é uma classe abstrata (`deletedAt: Date | null` via `@DeleteDateColumn()` +
`deletedByUserId: string | null`) que qualquer entidade nova que representa
dado de aluno/turma/alocação/desafio deve estender, em vez de inventar a
própria coluna a cada feature. `School`/`Classroom` são os dois primeiros
casos reais (ver "Gestão de escolas e turmas" logo abaixo).

### Por que `@DeleteDateColumn`, não uma coluna `deletedAt` comum

O TypeORM já resolve as duas partes mais chatas de reimplementar à mão
(verificado lendo o código-fonte do TypeORM instalado —
`QueryBuilder.js`/`SelectQueryBuilder.js` — não só a documentação):

- Toda query `select` padrão (`find`/`findOne`/`count`, e QUALQUER
  `createQueryBuilder` — inclusive um JOIN pra uma entidade soft-deletable,
  seja manual ou via `relations: {...}` de um `find()`) ganha `deletedAt IS
  NULL` automaticamente, a menos que `withDeleted: true` (repository) ou
  `.withDeleted()` (query builder) seja passado explicitamente.
- `repository.update(id, { deletedAt: ..., deletedByUserId: ... })` — usado
  no lugar do `softDelete()`/`restore()` prontos do TypeORM, que não deixam
  setar `deletedByUserId` no mesmo UPDATE — NÃO é filtrado por `deletedAt
  IS NULL` (esse filtro automático só existe pra `select`, nunca pra
  `update`/`delete`). É o que permite reativar um registro já desativado
  sem um caminho especial: `findOne`+`save` já sairia filtrado pelo próprio
  `deletedAt` que se está tentando limpar.

### Cuidado: `createQueryBuilder` manual sobre uma entidade já soft-deletable

Na maioria dos casos o filtro automático em JOIN é o comportamento CERTO
(ex.: `findActiveStudentsBySchool` já queria só turma ativa, de graça). A
exceção real encontrada nesta sessão foi
`SchoolsService.findAllStudentPseudoIdsBySchool` (6.6, export de
pesquisa): depois de `Classroom` ganhar `deletedAt`, o join
`enrollment→classroom` passou a excluir silenciosamente o histórico de
alunos de uma turma arquivada — corrigido com `.withDeleted()` explícito
nesse queryBuilder, o único lugar do código que de propósito quer o
histórico completo (arquivada ou não), mesmo racional que já o fazia
incluir matrícula encerrada. Qualquer `createQueryBuilder` NOVO sobre
`Classroom`/`School` precisa da mesma pergunta: "este caso quer só o ativo
(comportamento padrão, não precisa fazer nada) ou o histórico completo
(`.withDeleted()` explícito)?"

### O "quem" da exclusão — sem tabela de auditoria nova

`deletedByUserId` (uuid solto, sem FK/relation formal — mesma defesa em
profundidade de `ExportAuditLog.adminUserId`/`AdminActionLog.actorUserId`;
a entidade base também não conhece `User`, o que obrigaria todo soft
deletable a importar `UsersModule` só por causa de uma auditoria) já
responde "quem/quando excluiu" direto na própria linha — mesmo racional já
documentado pra `ChallengeClassroomAllocation` ("a própria linha já contém
os campos que a AC pede"). Não foi criada uma tabela de auditoria genérica
tipo `AdminActionLog` pra isso: aquela é especificamente sobre CRUD de
USUÁRIO (1.4, `targetUserId`/`targetRole` obrigatórios), não encaixa em
"admin desativou uma escola" sem forçar campos que não fazem sentido ali.

### Escopo desta sessão: `School`/`Classroom`, não `Challenge`/alocação ainda

O card original de B1 cita "aluno, turma, alocação e desafio" como escopo
final, mas a própria AC5 do card antecipa que a conversão do hard delete
de `Challenge` (`TeacherChallengesController.removeMine`, card #42) fica
pra QUANDO #42 for reaberto — "a mudança nele é restrita a trocar hard
delete por soft delete usando a infraestrutura aqui criada [...] sem
reinventar". Por isso `Challenge`/`ChallengeClassroomAllocation` NÃO
ganharam `deletedAt` nesta sessão — nenhum fluxo de exclusão deles estava
sendo tocado, e adicionar a coluna sem um fluxo que a use seria expor
schema morto. `SoftDeletableEntity` já está pronta pra quando isso
acontecer: estender a classe + 1 migration, sem reabrir a decisão de
design.

### Testes

`schools.service.spec.ts` cobre o par completo — `setSchoolActive`/
`setClassroomActive` gravando via `update` direto (nunca `findOne`+`save`,
ver acima) e a correção de `.withDeleted()` em
`findAllStudentPseudoIdsBySchool`.

## Gestão de escolas e turmas (admin)

CRUD administrativo sobre `School` (container multi-tenant) e `Classroom`
(turma como container) — User Story: "Como admin, quero cadastrar e
gerenciar escolas e suas turmas, para que múltiplas escolas operem na
mesma plataforma de forma isolada." O vínculo aluno↔turma em si (matrícula)
já tinha endpoint próprio desde 1.5 (`EnrollmentsModule`, ver acima) — esta
feature cobre só os dois containers que faltavam (fecha o gap que "Próximos
passos" apontava desde antes de 4.3 existir).

### Admin é global, não escopado por escola

Decisão explícita (perguntada ao usuário durante a sessão que implementou
isto, dado o tamanho da mudança): o admin desta plataforma continua
ÚNICO/GLOBAL — vê e gerencia TODAS as escolas, mesmo desenho já usado por
`MetricsAdminService` (6.2, painel institucional cross-escola). A AC
original do card ("um admin de uma escola não visualiza dados de outra
escola") descreveria um admin ESCOPADO por escola — implementar isso de
verdade exigiria `schoolId` no usuário admin, mudança no payload do JWT e
re-escopar TODOS os endpoints de admin já existentes (metrics-admin,
admin-users, audit, settings), com risco real de regressão no painel
institucional que já funciona. O isolamento cross-escola que existe de
verdade nesta plataforma é o do PROFESSOR, já naturalmente escopado via
`Classroom.teacherId` — não revisitado aqui.

### `SchoolsAdminService`/`SchoolsAdminController` — mesma forma de 1.4

`SchoolsAdminService` (`apps/api/src/schools/schools-admin.service.ts`) é a
camada de validação/formato de resposta sobre `SchoolsService` (que ganhou
os métodos de escrita crus — `createSchool`/`updateSchool`/
`setSchoolActive`/`createClassroom`/`updateClassroom`/`setClassroomActive`
— mesmo racional de `UsersService` vs `AdminUsersService`, 1.4).
`SchoolsAdminController`, `@Controller('admin')` + `@Roles(Role.ADMIN)`:

- `GET/POST /admin/schools`, `GET/PATCH /admin/schools/:id`, `PATCH
  /admin/schools/:id/status` (desativar/reativar — B1, nunca hard delete).
- `GET/POST /admin/schools/:schoolId/classrooms`, `PATCH
  /admin/classrooms/:id`, `PATCH /admin/classrooms/:id/status`.

Nenhum endpoint DELETE — mesma decisão já tomada em 1.4 pro CRUD de
usuários ("nunca hard delete", AC explícita).

### Validações reais, não decorativas

- **`name` é o único campo obrigatório de escola** (`externalId`, ex.:
  código INEP, é opcional — AC "sem campos obrigatórios que exijam
  conhecimento técnico"). `externalId` é `UNIQUE` no banco mas nullable
  (Postgres permite múltiplos `NULL`, mesmo padrão de `User.email`); string
  vazia enviada pelo formulário vira `null` no service
  (`normalizeExternalId`), nunca persiste whitespace.
- **Escola desativada não recebe turma nova** —
  `SchoolsAdminService.createClassroom` resolve a escola via
  `SchoolsService.findSchoolById` (o método "padrão", já filtrado por
  `deletedAt IS NULL` automaticamente pelo TypeORM) e rejeita com
  `NotFoundException` se ela não existir OU estiver desativada — mas
  EDITAR uma escola já desativada continua permitido
  (`findSchoolByIdIncludingInactive`, `withDeleted: true`): corrigir o
  nome antes de reativar não deveria exigir reativar primeiro.
- **`teacherId` (opcional, tanto em criar quanto editar turma) precisa
  apontar pra um usuário `role=teacher` de verdade** —
  `resolveTeacherOrThrow` (`UsersService.findById` + checagem de `role`)
  rejeita com `BadRequestException` senão; mesma classe de invariante já
  documentada em `Classroom.teacherId` ("FK não valida isso no banco", ver
  "Modelagem de domínio" abaixo) — agora validada no primeiro endpoint que
  realmente escreve nesse campo.
- **Desvincular o professor é `teacherId: null` explícito, distinto de
  campo omitido** — `UpdateClassroomDto.teacherId?: string | null`;
  `@IsOptional()` sozinho já cobre os dois casos (ignora os demais
  validadores quando o valor é `null` OU `undefined`, verificado no
  código-fonte do `class-validator` instalado — não precisou de
  `@ValidateIf` extra). No frontend, o `<Select>` (Radix) não aceita
  `value=""` como item real (reservado pro estado de placeholder) — o
  formulário usa um sentinel não-vazio (`'none'`) convertido pra
  `null`/omitido só na hora de montar o corpo da requisição.
- **Sem cascata automática "desativar escola → desativar turmas".**
  Decisão deliberada, não uma lacuna: a AC pedia só "não apagar dados
  históricos", nunca "desativar turmas junto". Efeito prático: uma turma
  de uma escola desativada continua com login por `joinCode` funcionando
  até ser desativada individualmente — se isso for indesejado no futuro, é
  uma decisão de produto nova, não implementada por suposição aqui.

### Sem endpoint de criação de turma pelo professor

O User Story original é "CRUD administrativo" — só o admin cria/edita
escola e turma aqui (`@Roles(Role.ADMIN)`). O AC "professor só cria turma
dentro de uma escola à qual está vinculado" descreveria um fluxo de
autoatendimento do PROFESSOR que não existe nesta plataforma hoje (não há
`schoolId` no usuário professor — o único jeito de saber a escola de um
professor é indiretamente, via `Classroom.teacherId` de uma turma que ele
JÁ tem) — implementar isso seria uma feature nova e maior (autoatendimento
de turma pelo professor), fora do escopo de "CRUD administrativo" que o
card pediu. Documentado aqui pra não ser perdido, não implementado como
placeholder.

### Testes

`schools.service.spec.ts` cobre os métodos de escrita crus (inclusive o
`update` direto pra soft delete/restore, ver B1 acima).
`schools-admin.service.spec.ts` cobre a camada de validação: rejeição de
`teacherId` que não é professor, bloqueio de turma nova em escola
desativada, `NotFoundException` em cada `get*`/`update*` quando o registro
não existe, e a distinção `null`/`undefined` de `teacherId` no update
(`null` explícito nunca dispara lookup em `UsersService`). Frontend:
`AdminSchools.spec.tsx`/`AdminSchoolClassrooms.spec.tsx` (Vitest + Testing
Library) cobrem listagem/criação/edição/desativação e o bloqueio de "Criar
turma" quando a escola está desativada.

## Autosave incremental do workspace Blockly do aluno (C2)

RQ4 — sobrecarga cognitiva/abstração (39,13%, maior barreira do
mapeamento): perda de sessão, timeout ou atualização acidental da página
não pode forçar o aluno a remontar a lógica do zero. Diretamente ligado a
#46 (expiração de sessão, ainda não tratada) — este card foi implementado
ANTES/junto, pra que quando a expiração de sessão for tratada, ela nunca
resulte em perda de trabalho do aluno.

### `StudentChallengeDraft` — registro MUTÁVEL de "estado atual", não um evento

`ChallengeDraftsModule` (`apps/api/src/challenge-drafts/`) — decisão de
arquitetura explícita: o rascunho é uma tabela com upsert
(`studentId`+`challengeId` `UNIQUE`), não uma linha nova em
`interaction_events` a cada debounce. `interaction_events` é append-only
por natureza (existe pra reconstituir uma linha do tempo, RQ5) — um
autosave que sobrescreve repetidamente "o estado agora" é um conceito
diferente (recuperar "o rascunho de agora" precisa ser um SELECT direto,
não um `ORDER BY createdAt DESC LIMIT 1` sobre uma tabela que cresce a
cada poucos segundos de edição contínua). Mesmo racional já usado pra
`User.sensoryOnboardingCompletedAt`/`AdminActionLog` (registro mutável)
vs. `interaction_events` (log imutável) — dois padrões que este projeto já
mantém deliberadamente distintos, não uma decisão nova.

`workspaceJson` é o MESMO formato de `Challenge.config.program`
(`Blockly.serialization.blocks.save()`), mas é dado POR ALUNO — nunca
escrito em `Challenge.config`, que é conteúdo curricular compartilhado por
todos os alunos do tópico. Nullable: workspace vazio (aluno apagou tudo) é
um estado válido pra salvar (`workspaceJson: null` na linha); "sem
rascunho nenhum" é a AUSÊNCIA da linha, um conceito diferente — ver
`ChallengeDraftsService.findByStudentAndChallenge`.

### Endpoints — sempre escopados ao próprio aluno autenticado

`ChallengeDraftsController`, `@Controller('students/me/challenges')` +
`@Roles(Role.STUDENT)` (mesmo prefixo/padrão de
`StudentClassroomChallengesController`, 4.3 — nunca um id de aluno vindo
do corpo/query, sempre `req.user.sub`):

- `GET :challengeId/draft` — `{ workspaceJson }` (`null` se não houver
  rascunho).
- `PATCH :challengeId/draft` — upsert (`ChallengeDraftsService.upsert`:
  `find` + `save`/`create` explícito, não o `.upsert()` mágico do TypeORM
  — mesmo padrão de `SchoolsService.updateSchool`/`updateClassroom`, B1).
- `DELETE :challengeId/draft` — descarta (idempotente: nunca erro se não
  houver nada pra descartar).

### Frontend (`ChallengePage.tsx`) — restaurar, debounce, retry silencioso, descartar

- **Restaurar (AC2)**: um `useEffect` novo busca o rascunho assim que o
  desafio carrega (só em fase não travada — `use` é sempre `readOnly`,
  nunca editada, autosave não faz sentido ali). A tela só monta o
  `<BlocklyWorkspace>` depois que o rascunho resolve (`draftLoaded`) —
  nunca monta com o `program` curricular pra só depois trocar pelo
  rascunho, o que reiniciaria o Blockly de forma perceptível. `initialJson`
  prioriza o rascunho sobre `challenge.program` quando presente (fase não
  travada) — ele representa progresso MAIS recente do aluno.
- **Debounce (AC1)**: `handleWorkspaceAutosave`, um SEGUNDO listener
  registrado via `workspace.addChangeListener` (ao lado do
  `handleWorkspaceEvent` já existente, que só reage a `BlockDrag`) — filtra
  só eventos de CONTEÚDO (`BlockCreate`/`BlockDelete`/`BlockChange`/
  `BlockMove`), nunca eventos de UI (seleção, clique, scroll, que
  `addChangeListener` também emite). 1.5s de debounce (`setTimeout`
  manual, `clearTimeout` a cada novo evento — sem dependência de debounce
  nova, mesmo racional de "não fabricar dependência sem necessidade
  concreta" já citado no backlog pra QR code/e-mail transacional).
- **Falha silenciosa + 1 retentativa (AC5)**: `saveDraftSilently` nunca
  lança nem mostra erro — no `.catch()`, agenda UMA retentativa 4s depois;
  falhas subsequentes são engolidas (o próximo debounce tick, se o aluno
  continuar editando, já tenta salvar de novo com o estado mais recente —
  uma fila de retentativa persistente não agregaria nada aqui).
- **Sem UI nenhuma (AC4)**: nenhum estado/indicador de "salvando…" existe
  no componente — o autosave é literalmente invisível, não só
  "discreto"; regra não-negociável 1 (nada visual sem respaldo em
  evidência liga por padrão) aplicada ao extremo — aqui nem existe o
  elemento.
- **Descartar na conclusão (AC3)**: `discardDraftSilently()` chamado no
  branch de sucesso de `handleRun` (fase `create`, `evaluation.success`),
  logo depois do evento `challenge.completed` — fire-and-forget, mesma
  filosofia silenciosa do save.

### `workspace_autosaved` (RD-P) — evento escopado ao aluno

Emitido a cada autosave bem-sucedido (nunca a cada debounce TICK, só
quando o `PATCH` de fato completa) — mesma forma de `program_executed`
(`block_sequence_json` + `challenge_id` + `timestamp`), regra não-
negociável 6 (nenhuma feature nasce sem log estruturado desde o primeiro
commit) aplicada aqui: o autosave em si é uma interação relevante pro RQ5
(estado intermediário de montagem, não só o resultado final submetido),
mesmo que a UI nunca mostre nada sobre isso ao aluno.

### Testes

`challenge-drafts.service.spec.ts` cobre o upsert (cria vs. atualiza,
nunca duas linhas pro mesmo par aluno+desafio) e o descarte idempotente.
`ChallengePage.spec.tsx` ganhou uma seção própria (`vi.useFakeTimers()` +
`vi.advanceTimersByTimeAsync`, mock de `react-blockly`/`blockly/core`
exposto via `vi.hoisted` pra disparar os listeners registrados
diretamente): restauração prioriza o rascunho sobre o `program`
curricular, nunca busca rascunho na fase travada, debounce (não salva
antes de 1.5s, salva depois, um burst de mudanças reseta o timer e salva
só uma vez), retentativa silenciosa após falha, nenhum indicador de
"salvando" na tela, e descarte do rascunho ao concluir o desafio.

## Indicação visual de desafio novo/recém-alocado (E1)

Regra não-negociável de feedback não-punitivo/não-ansiogênico; complementa
RQ4 — ansiedade social/RSD (13,04%). "Novo" aqui é sempre relativo ao
ALUNO ("nunca aberto por ele"), nunca ao tempo de alocação — evita um
parâmetro de janela arbitrário (ex.: "novo = alocado nos últimos N dias")
e casa exatamente com a AC2 ("o marcador é removido automaticamente
quando o aluno abre pela primeira vez, nunca reaparece").

### `StudentChallengeView` — existência da linha É o estado

`ChallengeViewsModule` (`apps/api/src/challenge-views/`) — tabela
`student_challenge_views` (`studentId`+`challengeId` `UNIQUE`). Mesmo
racional já estabelecido pra `StudentChallengeDraft` (C2) e
`ChallengeClassroomAllocation` (4.3): estado do PRÓPRIO aluno sobre um
desafio, nunca um `interaction_event` fake — aqui a decisão é ainda mais
direta que nos outros dois casos, porque a pergunta é literalmente
binária ("existe a linha?"), sem nenhum dado adicional pra carregar. Sem
`updatedAt`/revogação — "visto" nunca volta a "não visto".

`ChallengeViewsService.markViewed` é idempotente por construção (checa
existência antes de inserir, e ainda assim engole uma falha de UNIQUE
numa corrida rara — ex.: duas abas no mesmo desafio) — a AC2 exige "sem
exigir ação extra de marcar como lido", o que só faz sentido se a segunda
chamada (aluno reabre o mesmo desafio depois) nunca vira erro.

### `findAvailableForStudent` ganha `isNew` — sem N+1

`ChallengeAllocationsService.findAvailableForStudent` (4.3) passou a
computar `isNew` pra cada desafio da lista com UMA chamada a
`ChallengeViewsService.findViewedChallengeIds` (recebe a lista inteira de
`challengeId`, devolve um `Set` dos já vistos) — nunca uma query por
item, mesmo com vários desafios alocados de uma vez (AC3: "cada desafio é
sinalizado individualmente", mas isso é sobre a EXIBIÇÃO, não sobre custo
de query).

### Endpoint — `POST /students/me/classroom-challenges/:challengeId/viewed`

Adicionado a `StudentClassroomChallengesController` (mesmo controller de
`GET .../classroom-challenges`, 4.3) — sempre escopado ao próprio aluno
autenticado (`req.user.sub`), `204` sem corpo, chamado pelo frontend
assim que `ChallengePage` abre (mesmo efeito que já loga `toolbox_rendered`,
ver "Blocos por desafio"), nunca uma ação explícita de "marcar como lido"
do aluno.

### Frontend — marcador discreto, nunca contagem

`SubjectSelector.tsx` (a tela onde "a trilha" do aluno vive, 4.3) renderiza
`<Badge variant="info">Novo</Badge>` ao lado do link de cada desafio com
`isNew: true` — `variant="info"` usa `--color-primary` (cor de marca calma,
nunca `--color-warning`/vermelho de alerta — AC1: "sem cor de
alerta/urgência"). Nenhum contador agregado em lugar nenhum da tela (AC3)
— cada `<Badge>` é independente, texto estático "Novo" sem prazo/contagem
regressiva (AC4). `ChallengePage.tsx` chama o endpoint de "visto" no mesmo
efeito que já loga `toolbox_rendered`, fire-and-forget (uma falha de rede
aqui nunca deve impedir o aluno de usar o desafio — mesma filosofia de
`logEvent`).

### Testes

`challenge-views.service.spec.ts` cobre a idempotência de `markViewed`
(inclusive a corrida de UNIQUE engolida) e `findViewedChallengeIds`
(lista vazia não dispara query). `challenge-allocations.service.spec.ts`
ganhou casos pra `isNew` (misto visto/não visto na mesma lista) e pro
passthrough de `markChallengeViewed`. Frontend:
`SubjectSelector.spec.tsx` cobre o marcador aparecendo/sumindo e a
ausência de contador agregado com 3 desafios novos de uma vez;
`ChallengePage.spec.tsx` cobre a chamada do endpoint de "visto" ao abrir
e que uma falha nele nunca bloqueia a tela.

## Logout e expiração de sessão (1.5.1)

Duas lacunas reais que existiam desde o MVP: (1) `useAuthStore.clearSession()`
já existia mas nenhum componente chamava — não havia botão de logout em
lugar nenhum da UI; (2) nenhum tratamento de token JWT expirado —
`RequireAuth` só checava se havia uma sessão salva, nunca se o token
ainda era válido, e `apiClient` tratava um 401 igual a qualquer outro
erro HTTP.

### Logout é sempre local — JWT stateless, sem endpoint de revogação

`lib/logout.ts` (`performLogout`) — chama `useAuthStore.getState().clearSession()`
direto, sem chamada de API: não existe endpoint de logout/revogação no
backend (mesma decisão já tomada pro resto da autenticação deste projeto,
"sem OAuth de terceiros", ver `useAuthStore.ts`) — um JWT válido continua
válido no backend até expirar sozinho, mesmo depois do "logout" no
cliente; isso é uma limitação aceita de JWT stateless, não um bug (e não
há infraestrutura de blacklist de token no MVP, fora de escopo aqui).

`logout` (RD-L) só é logado pro ALUNO — mesmo padrão de
`login_success`/`login_attempt` (`interaction_events.studentPseudoId` é
escopado a aluno de propósito; professor/admin não geram evento aqui, ver
"Padrão: eventos RD-* são escopados ao aluno"). Não é possível logar isso
DEPOIS que a sessão expira (o próprio evento exigiria um JWT válido pra
passar por `JwtAuthGuard`), então esse evento só cobre logout VOLUNTÁRIO
(clique em "Sair"), nunca expiração.

### Sem endpoint de refresh token — decisão de escopo, não gap esquecido

`JwtModule` já configura `JWT_EXPIRES_IN` (8h em `.env.example`) desde o
início do projeto, mas não existe (e este card não adiciona) um endpoint
de renovação silenciosa de token. Quando o token expira, a única saída é
logar de novo — decisão de escopo deliberada (o ticket original só pede
"tratamento de expiração", não "sessão nunca expira") — documentada aqui
pra não ser confundida com uma lacuna esquecida.

### `apiClient.ts` — 401 só derruba sessão que EXISTIA

`authorizedFetch` agora checa `response.status === 401 && token` — o
`&& token` é o detalhe que importa: um 401 numa tentativa de LOGIN (que
nunca carrega token, `Authorization` header ausente) é só "credenciais
erradas", tratado como sempre por `throwForErrorResponse` — nunca
dispara `clearSession()`/redirect (isso destruiria a tela de login no
meio de mostrar a mensagem de erro pro aluno/professor/admin). Só um 401
numa requisição que JÁ tinha um Bearer token significa "sessão que
achávamos válida foi rejeitada pelo backend" — aí sim `clearSession()` +
`window.location.href = '/login'` (navegação de página inteira, não
`useNavigate` — `apiClient` é um módulo puro, fora de contexto React).

### `RequireAuth.tsx` — checagem proativa, não só reativa

`lib/jwt.ts` (`isTokenExpired`) decodifica só o PAYLOAD do JWT (nunca
valida assinatura no cliente — isso é sempre responsabilidade do backend
a cada request) e compara `exp` com a hora atual. `RequireAuth` usa isso
pra redirecionar pro login ANTES de qualquer chamada de API sair — cobre
o caso "abriu uma aba/computador da sala 9h depois", que só o tratamento
de 401 do `apiClient` (reativo, só age depois de uma chamada falhar)
não cobriria de forma tão imediata. As duas camadas são complementares,
não redundantes: proativa (abrir a tela) + reativa (uma chamada em voo
que expira no meio).

### Botão "Sair" — sem header/AppShell compartilhado

As 3 homes (`StudentHome`/`TeacherHome`/`AdminHome`) não tinham (e
continuam sem) nenhum componente de header/navbar comum — cada uma
ganhou seu próprio botão "Sair" (`home__topbar`, fora do grupo
`home__actions`) de propósito: na home do aluno, "Sair" NÃO conta como
uma das "no máximo 2 ações principais" (AC1 de 2.1) — é uma ação de
escape sempre disponível mas visualmente discreta (`variant="ghost"`),
nunca competindo pela atenção do aluno com "Continuar"/"Meu progresso".
Construir um `AppShell`/header compartilhado pras 3 telas foi
considerado e descartado por escopo — o ticket pede "existe um jeito de
sair", não uma reformulação de navegação global.

### Testes

`jwt.spec.ts` cobre token válido/expirado/malformado/sem `exp` (falha
segura — trata como expirado). `apiClient.spec.ts` ganhou os 3 casos que
importam: 401 sem token (login errado) nunca limpa sessão, 401 com token
limpa, 403 (papel errado, não expiração) nunca limpa. `RequireAuth.spec.tsx`
(novo arquivo — não existia teste pra este componente antes) cobre sem
sessão, sessão válida, token expirado (limpa + redireciona), papel
errado. `logout.spec.ts` cobre o evento RD-L só pra aluno. Cada home
ganhou um teste mínimo confirmando que "Sair" limpa a sessão e navega pro
login — sem duplicar cobertura entre os 3 (a lógica em si já está
integralmente coberta por `logout.spec.ts`).

## Comparação opcional entre alunos (4.3/7.3)

Toggle explícito do professor pra habilitar, por turma, uma comparação
agregada/anônima na tela "Meu progresso" do aluno. Regra não-negociável 5
("sem ranqueamento público... salvo ativação explícita pelo professor") e
RQ4 — ansiedade social/RSD (13,04%) — a mitigação definida é literalmente
opt-in explícito, nunca padrão.

- **`Classroom.comparisonEnabled`** (migration `AddClassComparisonSetting`)
  — nasce `false` em toda turma, nova ou já existente (DEFAULT no banco
  cobre o backfill). Só muda via `ClassroomSettingsService`, nunca por CRUD
  administrativo direto de `Classroom`.
- **`ClassroomSettingsModule`** — módulo pequeno e dedicado (mesma
  granularidade de `ChallengeValidationModule`): não é sobre matrícula
  (`EnrollmentsModule`) nem sobre métrica (`MetricsModule`), é configuração
  de turma. `PATCH /teacher/classrooms/:classroomId/comparison-setting`
  (`{ enabled: boolean }`), mesmo prefixo de rota que
  `ClassroomRosterController` (`EnrollmentsModule`) — sufixo literal
  diferente, sem conflito de rota dinâmica. Só professor titular da turma
  ou admin (`ClassroomSettingsService.setComparisonEnabled`, mesmo racional
  de `MetricsTeacherService.assertOwnClassroom`/`EnrollmentsService.
  assertCanManageClassroom` — reimplementado aqui porque nenhum dos dois
  serviços é dependência natural deste módulo pequeno).
- **`ClassComparisonSettingLog`** (`AuditModule`, tabela
  `class_comparison_setting_logs`) — "quem, quando, ligou/desligou",
  gravado a cada `PATCH` bem-sucedido. Deliberadamente FORA de
  `interaction_events`, mesmo racional de `AdminActionLog`/
  `ExportAuditLog`: é ação de PROFESSOR sobre a turma, não uma interação de
  aluno (`interaction_events.studentPseudoId` é NOT NULL por design — ver
  "Padrão: eventos RD-* são escopados ao aluno" acima). O card da feature
  rotula o evento como `class_comparison_setting_changed (RD-I)`; RD-I não
  se aplica aqui (é sobre interação DE ALUNO) — esta feature segue o
  precedente já estabelecido (log de auditoria dedicado) em vez do rótulo
  literal do card.
- **`GET /home/teacher`** (`HomeService.getTeacherHome`) devolve
  `comparisonEnabled` por turma — o professor lê o estado atual do toggle
  sem uma 2ª chamada de rede; `TeacherMetrics` (frontend) atualiza esse
  campo localmente após um `PATCH` bem-sucedido, também sem refazer a
  busca.
- **`GET /home/student`** (`HomeService.getStudentHome`) ganha
  `classComparison: { amongMostActiveThisWeek: boolean } | null`. `null`
  cobre TODOS os casos de "não mostrar nada" (turma nunca ativou, aluno sem
  matrícula ativa, turma com só 1 aluno ativo — nada pra comparar contra)
  sem o frontend precisar adivinhar qual foi. `computeClassComparison`
  (privado) resolve turma via `SchoolsService.findSingleActiveEnrollment` +
  `findClassroomById`, e só segue adiante se `comparisonEnabled` e há ≥ 2
  colegas ativos.
- **`amongMostActiveThisWeek`** — nunca um número/rank/nome de colega (AC
  de 7.3: "sempre agregada e anônima"). `EventsService.
  countEventsByStudentsSince(pseudoIds, since)` conta TODO evento RD-* por
  aluno desde `since` (proxy de engajamento RD-E, não de acerto/desempenho
  — mesmo racional neutro de `countDistinctStudentsActiveSince`).
  `class-comparison.ts` (função pura, testada isoladamente):
  - `startOfCurrentWeek(reference)` — segunda-feira 00:00 da semana de
    `reference`, fuso local do servidor (mesmo racional de `startOfToday`
    já usado em `HomeService`/`MetricsTeacherService`, sem UTC explícito).
  - `computeAmongMostActiveThisWeek(classroomActivityCounts,
    ownActivityCount)` — "entre os que mais praticaram" = metade de cima da
    turma por contagem de atividade, empate a favor do aluno (`>=`
    threshold, não `>` estrito — numa turma pequena/homogênea, ninguém
    ficaria "entre os que mais praticaram" só por causa de um empate).
    Nunca `true` se `ownActivityCount === 0` nem se a turma inteira tem 0
    atividade (não há prática nenhuma pra estar "entre").
- **Confirmação antes de ativar (AC de 7.3)** — responsabilidade do
  FRONTEND (`TeacherMetrics.tsx`, ver frontend.md): `Dialog` explicando o
  que muda na experiência do aluno, só exigido pra LIGAR (desligar é
  imediato, sem confirmação — só remove um elemento da tela do aluno, não
  introduz um novo).
- **"Sem precisar recarregar sessão" (AC de 7.3)** — não existe push/
  websocket nesta plataforma; o que garante isso na prática é
  `StudentHome` já refazer `GET /home/student` a cada visita à tela (não
  há cache local do `classComparison`), então desligar no painel do
  professor reflete no aluno na próxima vez que a home carrega, sem exigir
  logout/login.

### Testes

`classroom-settings.service.spec.ts` cobre: liga com sucesso + audita quem
mudou, `ForbiddenException` pra professor mexendo em turma alheia, admin
sem essa restrição, `NotFoundException` pra turma inexistente.
`class-comparison.spec.ts` (função pura) cobre zero atividade própria,
turma inteira sem atividade, aluno no topo/na base da metade, empate a
favor do aluno, turma de 1 só, e os dois lados de `startOfCurrentWeek`
(meio de semana, domingo). `home.service.spec.ts` ganhou os 4 casos de
`classComparison` (sem matrícula, sem ativação, sem colega, e o caso
positivo — com asserção explícita de que o pseudônimo do colega nunca
aparece na resposta serializada). `events.service.spec.ts` ganhou
`countEventsByStudentsSince` (short-circuit com lista vazia + contagem
agrupada). `audit.service.spec.ts` ganhou
`recordClassComparisonSettingChange`.

## Categorização do catálogo — Informática Educacional × Educação em Computação (CC1)

Classificação explícita, ortogonal ao motor de renderização (blocos vs.
mini jogo) e a `Topic.domain` (que só decide qual TELA abre) — depende do
ASSUNTO ensinado. Plano completo em `docs/ai/backlog/categorizacao-
informatica-educacional-x-educacao-computacao.md`.

- **`ContentCategory`** (`common/enums/content-category.enum.ts`) —
  `informatica_educacional | educacao_computacao`, mesmo padrão de
  `Role`/`EventCategory` (enum compartilhado, coluna pequena e fechada).
- **`Topic.category`** e **`MiniGameLevel.category`** (migration
  `AddContentCategoryToCatalog`) — `DEFAULT 'informatica_educacional'`
  classifica corretamente TODO conteúdo pré-existente
  (`angulos_formas`/`water_state`/"Fábrica de Pedaços Iguais" são todos
  Informática Educacional), sem UPDATE explícito necessário. As 3 linhas de
  um mesmo `MiniGameLevel.conceptId` sempre compartilham categoria —
  redundância barata, evita uma tabela "família de jogo" só pra isto.
- **`GET /subjects/topics`** devolve `category` por tópico (mesma resposta
  já usada pelo `SubjectSelector`, ver frontend.md).
- **`ChallengeTemplatesService.toSummary`** devolve `category` derivada de
  `template.topic.category` — `listTemplates`/`findTemplateOrThrow` passam
  a carregar `relations: { topic: true }`. Só leitura pro professor
  (categoria é do TÓPICO, curada via seed — nunca escolhida ao criar um
  desafio via template).
- **Sem tabela nova, sem evento novo** — é metadado de catálogo curricular,
  não interação de aluno; nenhuma emissão em `interaction_events` muda.

### Testes

`subjects.controller.spec.ts` cobre `category` no mapeamento de
`GET /subjects/topics`. `challenge-templates.service.spec.ts` cobre
`category` derivada do `topic` carregado em `listTemplates`.

## Suporte a múltiplos jogos de conteúdo no motor de mini jogos (MJ9)

Pré-requisito pro 2º jogo de conteúdo (MJ10, "Ferramentas do Mundo do
Trabalho", ver `docs/ai/backlog/mini-jogo-ferramentas-mundo-trabalho.md`).
Antes desta feature, `MinigamesService.updateLevelConfig` estava hardcoded
pro shape de `FractionsFactoryLevelConfig` — funcionava porque só existia 1
jogo. Mesmo ponto de inflexão que já motivou o handler-registry de
`challenge-templates` (4.2, "por que dado+handler-por-key, não 100% dado").

- **`MiniGameLevel.gameKey`** (`MiniGameKey`, hoje só `'fractions_factory'`
  — ver `mini-game-level-config.interface.ts`; migration
  `AddGameKeyToMiniGameLevels`) — mesmo racional de `Topic.domain`. Coluna
  nasce nullable, migration faz `UPDATE` explícito classificando as 3
  linhas de frações existentes, só então vira `NOT NULL` — **sem
  `DEFAULT`** de propósito (diferente de `category`/CC1 acima, onde o
  default sozinho já classificava certo todo dado existente): aqui um
  default seria só um acidente de sorte por só existir 1 jogo hoje: o
  próximo jogo/migration precisa gravar o valor explicitamente, nunca cair
  num implícito.
- **`validators/` (`apps/api/src/minigames/validators/`)** — registry
  MUITO mais simples que `ChallengeTemplateHandler`: não existe aqui uma
  etapa de "traduzir parâmetros de formulário em config" (o professor edita
  campos que já SÃO o formato final), só validar e aplicar a mudança.
  - `MiniGameLevelValidator` (interface): `applyUpdate(currentConfig, dto)
    → novo config`, lança `BadRequestException` com mensagem pedagógica
    descritiva pra qualquer valor inválido — mesmo contrato que já existia
    solto dentro de `MinigamesService` antes desta refatoração.
  - `FractionsFactoryValidator` — a validação de tema/fração/pool
    extraída de `MinigamesService`, comportamento idêntico (mesmos casos
    de teste, agora isolados em `fractions-factory.validator.spec.ts`, sem
    precisar de repositório mockado).
  - `validator-registry.ts` (`getMiniGameLevelValidator(gameKey)`) — único
    arquivo que muda ao cadastrar um jogo novo (+ a classe do validador) —
    nenhum outro arquivo do módulo (`service`/`controller`) muda.
- **`MinigamesService.updateLevelConfig`** passa a resolver o validador
  pelo `gameKey` da linha e delegar a ele — o service nunca mais precisa
  saber o shape de config de nenhum jogo específico. Linha de catálogo sem
  validador correspondente (erro de dado/deploy, nunca causado pelo
  professor) lança `InternalServerErrorException`, mesmo racional de
  `ChallengeTemplatesService.loadTemplateAndHandler`.
- **`GET /metrics/admin/minigames[/:levelId]` não muda** — já era
  inteiramente genérico sobre `mini_game_levels`/eventos (confirmado por
  leitura direta do código antes de implementar esta feature); este
  trabalho é só sobre a validação de config do professor.

### Testes

`fractions-factory.validator.spec.ts` cobre a validação semântica
(tema/fração/pool) isoladamente, sem repositório. `validator-registry.
spec.ts` cobre resolução por `gameKey` conhecido e `undefined` pra um
`gameKey` sem validador registrado. `minigames.service.spec.ts` foi
reduzido pra cobrir só o DISPATCH: delega ao validador certo preservando
campos não tocados, propaga a mensagem de erro do validador sem
regressão, e lança `InternalServerErrorException` (sem chamar
`repository.save`) pra um `gameKey` não registrado.

## Mini jogo "Ferramentas do Mundo do Trabalho" (MJ10)

2º mini jogo de CONTEÚDO da plataforma (1º foi "Fábrica de Pedaços
Iguais"), plano completo em `docs/ai/backlog/
mini-jogo-ferramentas-mundo-trabalho.md`. Combina "ligar" (cenário do
mundo do trabalho ↔ ferramenta digital correta) com verdadeiro-ou-falso
(afirmações de uso/custo-benefício), BNCC EM13CO09. Categoria **Educação
em Computação** (CC1) — ensina sobre tecnologia, não uma disciplina da
educação básica, diferente de frações/geometria/estados da matéria.

- **`WorkToolsScenario`/`WorkToolsTool`/`WorkToolsMatchPair`/
  `WorkToolsStatement`/`WorkToolsLevelConfig`** (`mini-game-level-config.
  interface.ts`) — mesmo racional de nada-oculto de frações:
  `correctMatches`/`isTrue` são exatamente o que a validação no cliente
  compara contra, o backend só guarda e serve `config` inteiro.
  `WorkToolsStatement.explanation` é o texto de apoio do feedback
  não-punitivo (regra não-negociável 4) — nunca só "certo"/"errado".
- **`MiniGameKey`** ganha `'work_tools_match'` — mas **sem validador
  registrado ainda** (MJ11, configuração pelo professor, é quem vai
  precisar disso; `PATCH /teacher/minigames/levels/:id` continua não
  suportando este jogo até lá — `getMiniGameLevelValidator('work_tools_
  match')` devolve `undefined` de propósito).
- **Seed** (`CreateWorkToolsMiniGame`, `conceptId: 'digital_tools_
  workplace'`) — 3 linhas Use→Modify→Create, `gameKey`/`category`
  gravados explicitamente (nem `gameKey` tem default, nem faz sentido
  confiar no default `informatica_educacional` de `category` aqui).
  `correctMatches` é o gabarito COMPLETO (cobre também os cenários do
  `scenarioPool` do Create, não só os 4 do Use/Modify). Nível Modify tem 1
  par errado + 1 afirmação errada de propósito (aluno cenário
  "brainstorm" ligado à ferramenta errada de propósito, mesma técnica do
  "cartão errado" de frações).
- **Zero mudança em `MinigamesController`/`TeacherMinigamesController`/
  `MetricsAdminMiniGameService`** — endpoints genéricos já servem o novo
  `conceptId` sem nenhum código novo (confirmado por leitura: nenhum dos
  três tem lógica específica de jogo).

### Testes

`mini-game-level-config.interface.spec.ts` cobre `isWorkToolsLevelConfig`
(shape mínimo válido, rejeição de cada um dos 4 arrays obrigatórios
ausente, aceitação dos campos opcionais).

## Próximos passos (fora do escopo já implementado)

- Transporte de e-mail de verdade pro link de definição de senha de 1.4
  (hoje devolvido na resposta da API, ver "Gap conhecido" acima) — decisão
  de infraestrutura (provedor SMTP/transacional), não implementada.
- **CRUD de `schools`/`classrooms`: ✅ implementado** ("Gestão de escolas e
  turmas (admin)" acima, `SchoolsAdminController`/`SchoolsAdminService`) —
  resolve o gap que este bullet descrevia antes: admin agora cria/edita
  escola e turma (inclusive atribuir/reatribuir professor titular) pela UI,
  sem depender de seed. Escopo restante fora desta feature (não
  implementado, ver "Sem endpoint de criação de turma pelo professor"
  acima): autoatendimento do PROFESSOR criando turma na própria escola.
- `POST /teacher/students`/`GET /admin/users` cobrem a criação/gestão —
  falta a mesma teste de autorização "admin" no FRONTEND: a tela de
  "Adicionar aluno" (`TeacherAddStudent.tsx`) só resolve a turma via `GET
  /home/teacher` (escopado a professor); um admin que acesse a rota
  autenticado como admin vê a lista de turmas vazia (backend já aceita
  `role=admin` sem restrição de turma, só falta o seletor de escola/turma
  no frontend pro admin usar de verdade).
- Segundo fator (TOTP) de um admin criado via 1.4 é devolvido só como
  `otpauthUri` em texto — sem QR code renderizado na tela (precisaria de
  uma lib de geração de QR, não adicionada de propósito nesta sessão,
  mesmo racional de "não fabricar dependência nova sem necessidade
  concreta").
- Ingestão de eventos pré-login (ver "Gap conhecido" acima).
- Motor PRIMM ainda não cobre um ciclo Predict→Run→Investigate→Modify→Make
  **dentro de um único desafio** — hoje ele se distribui pela sequência de 3
  desafios do tópico (ver "Como desafios futuros adotam PRIMM" acima). Isso
  é suficiente pro MVP e pro que 3.6 pede, mas um desafio futuro que precise
  de Investigate *depois* de Modify (não só depois de Use) exigiria estender
  `Challenge.config` com uma segunda pergunta de investigação — não
  implementado, sem caso de uso concreto ainda.
- Checagem automatizada de identidade de programa entre desafios `use`/
  `modify` do mesmo tópico (ver "Rastreabilidade PRIMM × Use-Modify-Create"
  acima) — hoje é uma verificação manual feita ao seedar; um teste que
  compare `config.program` de desafios adjacentes por `position` dentro do
  mesmo `topicId` evitaria uma divergência silenciosa se um dos dois for
  editado no futuro sem tocar o outro.
- **Painel de métricas pro professor/admin** — plano detalhado, dividido em
  features com critérios de aceite, em
  `docs/ai/backlog/metricas-professor-admin.md`. Implementado até agora:
  motor de status/progresso (6.1, `MetricsService`), o painel institucional
  do admin (6.2, `GET /metrics/admin/schools[...]` +
  `apps/web/src/routes/metrics/AdminMetrics.tsx`), o painel do professor
  por turma (6.3/6.4, `GET /metrics/teacher/classrooms/:classroomId/
  {students,summary}` + `MetricsTeacherService` — ver "Painel do professor:
  progresso por turma" abaixo) e o relatório de profundidade por desafio do
  admin (6.5, `GET /metrics/admin/challenges[/:challengeId]` +
  `MetricsAdminChallengeService`/`statistics.ts` — ver "Relatório de
  profundidade por desafio" abaixo) e a exportação bruta pra pesquisa (6.6,
  `GET /metrics/admin/export` + `MetricsAdminExportService`/`AuditModule` —
  ver "Exportação de dados brutos pra pesquisa" abaixo). As 6 features do
  documento (M1–M6) estão implementadas.
- **Autoria de desafio pelo professor — Modo Template: ✅ implementado**
  (4.2, ver "Configuração de desafio via formulário guiado" acima). Modo
  Customizado (liberdade total sobre a estrutura do bloco-alvo, sem
  template pré-montado) continua não implementado — fora do escopo de 4.2
  por decisão explícita do próprio card, tratado num card separado se/quando
  for priorizado.
- **Alocação de desafio a uma turma: ✅ implementado** (4.3, ver
  "Alocação de desafio a uma turma" acima) — resolve o gap que este bullet
  descrevia antes (desafio criado via template não tinha como chegar a
  nenhum aluno automaticamente).
- Um segundo template de geometria (ex.: "Girar até formar um ângulo
  específico", citado como exemplo no card) validaria de verdade que o
  registry (`handlers/template-registry.ts`) escala sem tocar
  service/controller/frontend — hoje só há 1 template implementado
  (`regular_polygon`), então essa promessa de extensibilidade está
  verificada pela arquitetura/testes, não por um segundo caso real ainda.
- Trava em runtime da progressão Use-Modify-Create por aluno (hoje
  `block-progression.ts` só valida a ordem de autoria dos desafios, não
  bloqueia um aluno específico de pular pra `/challenge/:id` de um desafio
  modify/create sem ter passado pelo use correspondente — a rota não checa
  isso ainda).
- **1.5 ("Vínculo aluno↔turma↔professor" — matricular/transferir aluno
  entre turmas): ✅ implementado** (`EnrollmentsModule`, ver "Matrícula/
  transferência de turma (1.5)" acima) — resolve o gap que este bullet
  descrevia antes. `schools`/`classrooms` (criar escola, criar turma,
  atribuir professor titular): **✅ também implementado** desde então, ver
  "Gestão de escolas e turmas (admin)" acima.
- Endpoint de reversão de identidade (`IdentityService.reveal`) — hoje só
  existe o service, sem controller/guard de role ainda.
- Rotas de leitura de eventos para o painel do professor (agregando RD-E como
  sinal observável, nunca como inferência clínica — regra 7).
- Rate limiting / bloqueio após N tentativas nos 3 endpoints de login — hoje
  não existe (o `retryCount` do fluxo aluno é só o que o frontend observa e
  manda no payload, o backend não impõe limite nenhum). `@nestjs/throttler`
  já está instalado e configurado (`ThrottlerModule.forRoot`, ver 6.6) —
  aplicar `ThrottlerGuard` nas 3 rotas de login seria só repetir o mesmo
  padrão (`@UseGuards(ThrottlerGuard)` no método), não uma dependência
  nova.
