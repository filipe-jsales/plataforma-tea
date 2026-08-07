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
│   ├── entities/user.entity.ts  # pseudonymId (auto-gerado), role, perfil sensorial...
│   ├── dto/update-sensory-profile.dto.ts
│   ├── users.controller.ts      # GET /users/me, PATCH /users/:id/sensory-profile
│   ├── users.service.ts
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
│   ├── schools.service.ts
│   └── schools.module.ts
├── blocks/
│   ├── entities/block-definition.entity.ts  # catálogo de blocos Blockly (tabela, não enum)
│   ├── blocks.service.ts
│   └── blocks.module.ts
├── challenges/
│   ├── entities/challenge.entity.ts  # config.toolbox — ver seção "Blocos por desafio"
│   ├── challenge-config.interface.ts  # forma tipada de Challenge.config
│   ├── block-progression.ts     # valida a regra Use-Modify-Create (AC2)
│   ├── challenges.service.ts
│   ├── challenges.controller.ts # GET /challenges/{by-topic/:topicId,:id} — aluno só
│   └── challenges.module.ts
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
- **Sem autoria de toolbox pelo professor nesta versão.** O backlog da
  feature cita "config JSON gerada pelo professor via camada visual" como
  dependência — decisão explícita (a pedido de quem propôs a feature): em
  vez de construir essa camada de autoria visual, o conteúdo (`blocks` +
  `Challenge.config`) é curado via seed/migration, e o professor não
  programa nada. Não existe hoje "professor escolhe entre desafios" — a
  sequência de um tópico é fixa (por `position`), a mesma pra todo aluno.

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
   de autoria "4.5").** Nenhum dos dois existe nesta base de código —
   autoria de desafio pelo professor (4.5) foi explicitamente adiada (ver
   "Sem autoria de toolbox pelo professor nesta versão" acima), e não há
   verificador agregado de cobertura PRIMM em runtime (4.7). A cobertura
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

## Próximos passos (fora do escopo já implementado)

- `POST /auth/register` — hoje só existe seed via migration; não há como
  criar aluno/professor/admin em runtime ainda.
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
- Autoria de toolbox pelo professor (a "4.2" citada no backlog da feature de
  blocos) — abstraída de propósito nesta versão, ver "Blocos por desafio".
  Se um dia for necessária de verdade: um endpoint pro professor
  escrever/curar `Challenge.config` (incluindo `program`/`position`) contra
  um catálogo pequeno de `blocks` pré-existente — continua sem o professor
  "programar" nada, só compor conteúdo já existente.
- Trava em runtime da progressão Use-Modify-Create por aluno (hoje
  `block-progression.ts` só valida a ordem de autoria dos desafios, não
  bloqueia um aluno específico de pular pra `/challenge/:id` de um desafio
  modify/create sem ter passado pelo use correspondente — a rota não checa
  isso ainda).
- Endpoints CRUD para `schools`/`classrooms`/`enrollments` (`subjects`/`topics`
  já têm leitura via `GET /subjects/topics`; escrita continua não exposta —
  ver regra 9 antes de expor isso ao professor: nada de formulário que
  exija entender a estrutura de tabelas).
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
