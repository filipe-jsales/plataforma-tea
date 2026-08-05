# Banco de dados — PostgreSQL

Para o passo a passo de "como rodar", ver o `README.MD` na raiz. Este arquivo
documenta a arquitetura e as decisões por trás do schema.

## Por que Postgres + migrations (não `synchronize`)

O log de interação do aluno (`interaction_events`) é essencialmente uma série
temporal de eventos — o schema foi desenhado pensando nisso desde o início
(RQ5 do mapeamento: ausência de instrumento padronizado de avaliação de CT e
escassez de estudos longitudinais). `synchronize: true` do TypeORM foi
descartado deliberadamente: qualquer mudança de schema — inclusive em
desenvolvimento — passa por uma migration versionada em
`apps/api/src/database/migrations/`, para o schema real do banco ficar sempre
rastreável e revisável em code review, nunca "mágico".

## Como o CLI do TypeORM funciona aqui

`apps/api/src/database/data-source.ts` define um `DataSource` standalone,
usado **apenas pelo CLI** (`migration:generate`, `migration:run`,
`migration:revert`) — carrega `.env` manualmente via `dotenv`, porque o CLI
roda fora do processo Nest (que usa `TypeOrmModule.forRootAsync` +
`ConfigService` em `app.module.ts`, um caminho de configuração separado).

**Atenção:** o arquivo precisa ter **uma única exportação** de instância de
`DataSource` (só `export default`, por exemplo). Se houver uma exportação
nomeada e uma `default` apontando para o mesmo objeto, o CLI do TypeORM 1.x
falha com `Given data source file must contain only one export of DataSource
instance` — já aconteceu neste projeto.

Os scripts em `apps/api/package.json`:

```jsonc
"typeorm": "typeorm-ts-node-commonjs",
"migration:create": "npm run typeorm -- migration:create",
"migration:generate": "npm run typeorm -- migration:generate -d src/database/data-source.ts",
"migration:run": "npm run typeorm -- migration:run -d src/database/data-source.ts",
"migration:revert": "npm run typeorm -- migration:revert -d src/database/data-source.ts",
```

- `migration:create <caminho>` — cria um arquivo de migration vazio (não
  precisa de conexão com o banco). Usar quando a migration é escrita à mão
  (ex.: um `ALTER TABLE` específico, um backfill de dado).
- `migration:generate <caminho>` — **precisa do Postgres rodando**; compara o
  schema atual do banco com as entidades TypeORM e gera o SQL de diferença
  automaticamente. Preferir este comando sempre que possível — é mais
  confiável que escrever à mão.
- `migration:run` / `migration:revert` — aplicam / desfazem a última
  migration pendente contra o banco configurado no `.env`.

## Schema atual

### `users`

Ver `apps/api/src/users/entities/user.entity.ts`. `pseudonymId` é o
identificador usado em qualquer log/relatório — gerado automaticamente
(`@BeforeInsert`, `randomUUID()`), nunca escolhido/derivado de dado real. A
tabela **não tem mais** a referência real da escola (isso saiu daqui, ver
`student_identity_reversals` abaixo).

`email`/`passwordHash` são **nullable** — só preenchidos para
`role=teacher|admin` (Postgres permite múltiplos `NULL` num `UNIQUE`, então
isso não quebra a constraint). Alunos não têm e-mail/senha: autenticam por
turma + avatar + sequência de imagens (`avatarId`, `loginImageSequence`).
`totpSecret` é só para `role=admin` (segundo fator). Nenhum desses campos é
validado por `role` no banco — é invariante de aplicação (ver
`AuthService`).

### `student_identity_reversals`

Ver `apps/api/src/identity/entities/student-identity-reversal.entity.ts`.
Tabela de reversão pseudônimo → identidade real, separada de `users` de
propósito: fica num módulo (`src/identity/`) que o `EventsModule` nunca
importa, então o backend de eventos não tem acesso de código a essa reversão
— não é só uma checagem de permissão em nível de rota. `schoolReversibleRef`
é a referência com sentido pro sistema da própria escola (SIS); reversível
só pela escola/admin, nunca exposta em UI/relatório do professor (regra
não-negociável 8).

### `subjects` / `topics`

Ver `apps/api/src/subjects/entities/`. Tabelas, não enum fixo — o MVP tem uma
única linha de cada (`geometria` / `angulos_formas`, inseridas via seed na
própria migration), mas o catálogo cresce sem migration destrutiva. `topics`
tem FK `CASCADE` para `subjects` e unicidade de `slug` só dentro da mesma
disciplina (`UNIQUE(subjectId, slug)`).

### `schools` / `classrooms` / `enrollments`

Ver `apps/api/src/schools/entities/`. `classrooms.teacherId` (FK → `users`,
`ON DELETE SET NULL`) é o professor titular atual — reatribuível com
`UPDATE`. `enrollments` é o histórico de matrícula aluno↔turma (`active` +
`unenrolledAt`, nunca `DELETE` de uma matrícula encerrada), para um aluno
poder trocar de turma/professor sem perder o rastro anterior. Nenhuma FK
valida `role` no banco (ex.: nada impede um `teacherId` apontar para um user
com `role=student`) — é invariante de aplicação, a validar na camada de
serviço quando os endpoints existirem.

`classrooms.joinCode` (ex.: `"AZUL-1"`) é gerado por `@BeforeInsert`
(`generateJoinCode()`, palavra de uma lista curta + dígito — ver
`src/schools/join-code.ts`) — é o código que o aluno usa no passo 1 do
login. **Não garante unicidade global sozinho**: só a `UNIQUE` do banco
garante isso, e uma colisão rara faria o `INSERT` falhar. Aceitável no MVP
dado o volume esperado; se turmas simultâneas crescerem muito, aumentar o
espaço de códigos (mais palavras, mais dígitos) antes de qualquer outra
mudança.

### `illustrations`

Ver `apps/api/src/illustrations/entities/illustration.entity.ts`. Catálogo
(tabela, mesmo padrão de `subjects`), com `kind` (`avatar` | `login_image`) e
`position` — a posição de exibição é fixa e **nunca deve mudar entre
sessões** (requisito explícito do login por sequência de imagens: layout
previsível, sem elemento decorativo concorrente). Os pools de `avatar` e
`login_image` são propositalmente separados: avatar é "quem eu sou" (visível
pra colegas no roster), login_image é a credencial (nunca deveria aparecer
fora da tela de login da própria pessoa) — misturar os dois pools seria
confundir identidade com segredo.

### `challenges`

Ver `apps/api/src/challenges/entities/challenge.entity.ts`. Modelagem
mínima (`title`, `prompt`, `config` jsonb vazio) — o suficiente para existir
"1 desafio de geometria" (seed do MVP) e para `interaction_events.challengeId`
ser FK real. FK `CASCADE` para `topics`.

### `interaction_events`

Ver `apps/api/src/events/entities/interaction-event.entity.ts`. Tabela
append-only (nunca `UPDATE`/`DELETE` de evento já gravado), indexada por
`(studentPseudoId, createdAt)` e por `challengeId` para consultas de
histórico/longitudinais. `category` é o enum RD-I/RD-P/RD-C/RD-E/RD-L — ver
`event-category.enum.ts` e a regra 6/7 em `coding-rule.md` antes de adicionar
um novo `type` de evento. `challengeId` é nullable (nem todo evento é
escopado a um desafio) e **é FK real** para `challenges.id`
(`ON DELETE SET NULL`).

### Migrations aplicadas

1. `1785866463111-CreateUsersAndInteractionEvents.ts` — cria `users` e
   `interaction_events`, os enums Postgres (`users_role_enum`,
   `interaction_events_category_enum`) e a extensão `uuid-ossp` (necessária
   para `uuid_generate_v4()` nas chaves primárias). Escrita à mão (via
   `migration:create`).
2. `1785938679870-CreateSubjectsAndTopics.ts` — cria `subjects`/`topics` +
   seed do MVP (`geometria`/`angulos_formas`). Gerada com `migration:generate`
   — inclui também um rename de índice em `users`/`interaction_events` sem
   relação com subjects/topics (comentado no arquivo): reconcilia o nome que
   a migration 1 (hand-written) usou com a convenção auto-gerada do TypeORM,
   mesmo schema, sem mudança de comportamento.
3. `1785938810043-CreateSchoolsClassroomsAndEnrollments.ts` — cria `schools`,
   `classrooms`, `enrollments`. Gerada com `migration:generate`.
4. `1785938848017-AddChallengeIdToInteractionEvents.ts` — adiciona a coluna
   `challengeId` (nullable) + índice em `interaction_events`. Gerada com
   `migration:generate`.
5. `1785940075961-CreateStudentIdentityReversals.ts` — cria
   `student_identity_reversals` e remove `schoolReversibleRef` de `users`.
   Gerada com `migration:generate`.
6. `1785940824460-CreateChallenges.ts` — cria `challenges`, adiciona a FK
   `interaction_events.challengeId → challenges.id`, e semeia (0.6) 1 desafio
   de geometria (`Monte o quadrado`, no topic `angulos_formas`) + 1 escola de
   exemplo (`Escola Exemplo`). Gerada com `migration:generate` + seed manual.
7. `1785942128821-AddLoginMechanisms.ts` — cria `illustrations`; adiciona
   `totpSecret`/`avatarId`/`loginImageSequence` em `users` e `joinCode` em
   `classrooms`; torna `users.email`/`passwordHash` nullable. Semeia (1.1) o
   catálogo de ilustrações (4 avatares + 4 imagens de login) e **3 contas de
   desenvolvimento** — nunca usar fora de ambiente local:

   | Papel | Login | Credencial |
   |---|---|---|
   | Professor | `professor.demo@escolaexemplo.test` | senha `demo-professor-2026` |
   | Admin | `admin.demo@plataforma-tea.test` | senha `demo-admin-2026` + TOTP (secret `4PQTUDCGD7VD7ZMXKB5YLDAO5WO2QY6W`, ex.: importar num app authenticator) |
   | Aluno | turma `AZUL-1`, avatar "Gato" | sequência de login: Sol → Lua → Estrela |

   Gerada com `migration:generate` + seed manual (via SQL puro — `INSERT`
   direto não passa pelos `@BeforeInsert` das entidades, então `pseudonymId`
   e `joinCode` precisam ser gerados explicitamente na própria query, ver o
   arquivo da migration).

Todas as 7 já foram validadas com `npm run migration:run` contra um Postgres
real, e `\dt` + `\d <tabela>` conferidos no `psql`. Depois da última, um
`migration:generate` extra confirmou "No changes in database schema were
found" — zero diff pendente entre entidades e banco. Os 3 fluxos de login
(`/auth/student/login`, `/auth/teacher/login`, `/auth/admin/login`) foram
testados ponta a ponta via `curl` contra essas contas semeadas — sucesso e
falha (senha/OTP/sequência errados) ambos verificados, e os eventos
`login_attempt`/`login_success` conferidos em `interaction_events`.

## Adicionando uma migration nova

1. Alterar/criar a entidade TypeORM.
2. Com o Postgres rodando (via `docker-compose.yml` ou nativo — ver README
   seção 2b):
   `npm run migration:generate -- src/database/migrations/NomeDescritivo --workspace apps/api`
   (ou `cd apps/api` e rodar sem `--workspace`).
3. Revisar o SQL gerado — TypeORM às vezes gera índices/constraints a mais ou
   a menos do que o pretendido.
4. `npm run migration:run --workspace apps/api` para aplicar localmente.
5. Commitar a migration junto com a mudança de entidade, no mesmo PR.

Nunca editar uma migration já commitada (e possivelmente já rodada em algum
ambiente) — criar uma nova.
