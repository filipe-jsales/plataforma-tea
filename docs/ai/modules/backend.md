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
`studentPseudoId`.

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
  guarda `{ stage, allowedBlockTypes, goal, program?, investigationQuestion?
  }`. `stage` é o estágio Use-Modify-Create do desafio (regra não-negociável
  2/3, ver nota de pesquisa completa no próprio arquivo de tipos);
  `allowedBlockTypes` é a lista de `blockType` permitidos, resolvida contra
  o catálogo `blocks` e devolvida já agrupada por categoria (AC5 de 3.1 —
  abas pequenas e nomeadas, nunca uma lista única).
- **`Challenge.position`** (int, nunca `createdAt`) é a ordem pedagógica do
  desafio dentro do tópico — `ChallengesService.findByTopicIdOrdered`
  ordena por ele. Existe especificamente pra permitir inserir uma etapa no
  meio depois (ex.: o desafio `modify` que falta hoje, ver "Estado
  intermediário" abaixo) sem precisar forjar timestamp.
- **`program` + `investigationQuestion`** (3.3, fase `use`): quando
  presentes, `locked: true` na resposta — o frontend renderiza o workspace
  com `readOnly: true` e **sem toolbox**, pré-carregado com este programa
  (`initialJson`). Único controle do aluno é Executar/Repetir execução; a
  pergunta de investigação aparece depois da 1ª execução (motor PRIMM
  "Investigate", ainda sem estrutura própria — ver "Próximos passos").
  `program` usa o mesmo formato de `Blockly.serialization.blocks.save()`
  (tipado em `SerializedBlockState`, espelhado no frontend em
  `apps/web/src/lib/blockProgram.ts`).
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

### Estado intermediário: Use → Create, sem o `Modify` do meio

O seed atual (migrations `SeedSquareChallengeToolbox` +
`SeedUseModifyCreateSequence`) tem 2 desafios no tópico `angulos_formas`:

| position | title | stage | Comportamento |
|---|---|---|---|
| 1 | Monte o quadrado | `use` | 3.3 — programa pré-montado, travado, só Executar/Repetir + pergunta de investigação |
| 2 | Monte o quadrado — sua vez! | `create` | editor livre (3.1), com botão de Ajuda mostrando a forma-alvo sem entregar os blocos |

**Isso é um estado intermediário, não a sequência desenhada.** RQ2 do
mapeamento sistemático (21,74% dos estudos primários) dá respaldo empírico
ao ciclo **completo** Use→Modify→Create, não a Use+Create pulando o meio —
falta o desafio `modify` (o mesmo programa do Desafio 1, mas editável, ex.:
mudar `TIMES`/`DIR` pra virar triângulo/pentágono) que conecta
pedagogicamente "só observar" a "criar do zero". Ver a nota de pesquisa
completa (e as regras de como inserir esse desafio no meio via `position`)
em `challenge-config.interface.ts` e em "Modelagem de domínio (backend)" →
"Desafio novo..." em `docs/ai/rules/coding-rule.md`. **Não tratar esta
sequência de 2 desafios como validada/completa** para fins de pesquisa com
usuários reais ou de qualquer alegação de aderência ao framework
Use-Modify-Create até o `modify` existir.

### Eventos desta feature

Além de `toolbox_rendered`/`block_dragged` (3.1, RD-I), `program_executed`
(3.2, RD-P — `block_sequence_json` é o programa serializado, o mesmo formato
de `program`) e `challenge_use_completed` (3.3 — logado duas vezes, uma
`RD-P` e uma `RD-C`, seguindo literalmente a notação "RD-P + RD-C" do
backlog da feature, já que uma linha de `interaction_events` só tem uma
`category`).

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
  para existir "1 desafio de geometria" e para `interaction_events.challengeId`
  ser uma FK real. O ciclo PRIMM interno (Predict-Run-Investigate-Modify-Make
  como estrutura de estado do desafio, não só a paleta Use-Modify-Create)
  ainda não está modelado — ver "Próximos passos".

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
- **Desafio 3 (fase `modify`) entre os 2 desafios seed atuais** — a peça que
  falta pra fechar o ciclo Use→Modify→Create com respaldo empírico completo
  (RQ2), ver "Estado intermediário" em "Blocos por desafio" acima. Cadastrar
  com `position: 2` (empurrando o atual "Desafio 2" pra `position: 3`) — o
  workspace nasceria com o mesmo `program` do Desafio 1, mas **editável**
  (`readOnly: false`, sem toolbox de blocos novos — só os campos dos blocos
  já existentes, ex.: `TIMES`/`DIR`), pra virar triângulo/pentágono.
- Ciclo PRIMM interno (Predict-Run-Investigate-Modify-Make como estrutura de
  estado do desafio) — a paleta de blocos por estágio Use-Modify-Create já
  existe (ver "Blocos por desafio"), e a pergunta de investigação do Desafio
  1 é um placeholder mínimo do estágio "Investigate" (resposta livre, só
  logada, nunca corrigida) — o motor PRIMM completo (Predict/Run como
  estágios próprios de tela) ainda não existe.
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
  manda no payload, o backend não impõe limite nenhum).
