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

`soundEnabled`/`animationEnabled` (default `false`) e
`sensoryOnboardingCompletedAt` (nullable) são o perfil sensorial
persistente — setados pelo onboarding (2.2) via `PATCH
/users/:id/sensory-profile`, nunca por `synchronize`/UI direta no banco.

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

### `blocks`

Ver `apps/api/src/blocks/entities/block-definition.entity.ts`. Catálogo dos
blocos Blockly disponíveis (tabela, mesmo padrão de `subjects`/
`illustrations`) — `blockType` é o `type` que o Blockly usa em runtime
(`UNIQUE`), `category`/`categoryLabel` agrupam a paleta em abas (texto livre,
não enum), `blocklyJson` é a definição completa no formato de
`Blockly.defineBlocksWithJsonArray`. Seed do MVP: `move_forward` (mover),
`turn` (girar, com campo `DIR`) e `repeat_times` (repetir, com campo `TIMES`
+ input de estatuto `DO`) — ver `docs/ai/modules/backend.md#blocos-por-desafio`.

### `challenges`

Ver `apps/api/src/challenges/entities/challenge.entity.ts`. `config` guarda
`{ stage, allowedBlockTypes, goal, program?, investigationQuestion? }`
(tipado em `challenge-config.interface.ts`, que também documenta o respaldo
de pesquisa do ciclo Use-Modify-Create — RQ2, 21,74% dos estudos) — nasceu
`{}` na migration original (`CreateChallenges`), preenchido depois em
migrations separadas (nunca editando a original já rodada). FK `CASCADE`
para `topics`.

`position` (int, adicionado em `AddPositionToChallenges`) é a ordem
pedagógica do desafio **dentro do tópico** — nunca `createdAt`. Permite
inserir uma etapa no meio depois (ex.: um desafio `modify` entre um `use` e
um `create` já existentes) sem forjar timestamp; mesmo raciocínio de
`Illustration.position`/`BlockDefinition.position`. Seed atual do tópico
`angulos_formas` (ver `docs/ai/modules/backend.md#blocos-por-desafio` para o
porquê disso ser um estado intermediário, não a sequência final):

| position | title | stage |
|---|---|---|
| 1 | Monte o quadrado | `use` (`program` pré-montado + travado) |
| 2 | Monte o quadrado — sua vez! | `create` (editor livre) |

### `interaction_events`

Ver `apps/api/src/events/entities/interaction-event.entity.ts`. Tabela
append-only (nunca `UPDATE`/`DELETE` de evento já gravado), indexada por
`(studentPseudoId, createdAt)` e por `challengeId` para consultas de
histórico/longitudinais. `category` é o enum RD-I/RD-P/RD-C/RD-E/RD-L — ver
`event-category.enum.ts` e a regra 6/7 em `coding-rule.md` antes de adicionar
um novo `type` de evento. `challengeId` é nullable (nem todo evento é
escopado a um desafio) e **é FK real** para `challenges.id`
(`ON DELETE SET NULL`).

### `platform_settings`

Ver `apps/api/src/settings/entities/platform-setting.entity.ts`. Tabela
singleton — sempre exatamente 1 linha, nunca por escola/turma/desafio.
Hoje só `minSampleSizeThreshold` (default 5, o N mínimo abaixo do qual o
relatório de profundidade por desafio de 6.5 mostra aviso de amostra
pequena), mas a tabela nasce genérica o suficiente pra acumular outro
campo de config de plataforma futuro sem precisar de uma tabela nova por
configuração. A linha é materializada em runtime (`SettingsService.
getOrCreate`, lazy init na primeira leitura), não semeada na migration.

### `export_audit_logs`

Ver `apps/api/src/audit/entities/export-audit-log.entity.ts`. Primeira
tabela de auditoria de admin/professor do projeto (6.6) — deliberadamente
fora de `interaction_events` (aquela é escopada a aluno, `studentPseudoId
NOT NULL` de propósito, ver "Padrão: eventos RD-* são escopados ao aluno"
em `backend.md`). Append-only, mesma filosofia de `interaction_events`
(nunca `UPDATE`/`DELETE` de um log já gravado). `adminUserId` é FK
nullable pra `users` (`ON DELETE SET NULL`) — defesa em profundidade, hoje
não existe endpoint de exclusão de usuário, então esse caminho nunca é
exercitado na prática. `filters` (jsonb) guarda o recorte exatamente como
pedido (schoolId/challengeId/from/to/format/page/pageSize); `rowCount` é
quantas linhas saíram NAQUELA resposta, não o total do recorte. Índice em
`(adminUserId, createdAt)`, mesmo padrão de `interaction_events`.

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
8. `1786019220885-AddSensoryProfileToUsers.ts` — adiciona `soundEnabled`
   (default `false`), `animationEnabled` (default `false`) e
   `sensoryOnboardingCompletedAt` (nullable) em `users`. Gerada com
   `migration:generate`, sem seed (as 3 contas demo já existentes ficam com
   os defaults).
9. `1786027226877-CreateBlocks.ts` — cria `blocks` (catálogo de blocos
   Blockly) e semeia os 3 blocos MVP (`move_forward`/`turn`/`repeat_times`).
   Gerada com `migration:generate` + seed manual.
10. `1786027834394-SeedSquareChallengeToolbox.ts` — preenche o `config` do
    desafio seed "Monte o quadrado" (stage `use`, os 3 `blockTypes` acima, e
    a meta de fechar um quadrado de 4 lados/90°) — escrita à mão (só
    `UPDATE`, sem mudança de schema, `migration:generate` não gera diff pra
    isso).
11. `1786032598196-AddPositionToChallenges.ts` — adiciona `challenges.position`
    (int, `NOT NULL`). Coluna nullable primeiro + `UPDATE ... SET position =
    1` (backfill da única linha existente) + `ALTER COLUMN ... SET NOT NULL`
    — não dá pra `ADD COLUMN NOT NULL` direto numa tabela não-vazia sem
    default. Gerada com `migration:generate` (só o `ADD COLUMN`) + backfill
    escrito à mão.
12. `1786032637460-SeedUseModifyCreateSequence.ts` — reclassifica "Monte o
    quadrado" como Desafio 1 da sequência (`position: 1`, `program`
    pré-montado + `investigationQuestion`, ver "Blocos por desafio" em
    `backend.md`) e insere o Desafio 2 "Monte o quadrado — sua vez!"
    (`position: 2`, `stage: 'create'`, mesma paleta/meta, sem `program` —
    editor livre). Escrita à mão (só `UPDATE`/`INSERT`, sem mudança de
    schema).

As migrations 13–16 (`AddAngleFieldToTurnBlock`, `SeedModifyChallenge`,
`AlignUseProgramAngleField`, `AddPredictQuestionToUseChallenge` — a fase
Modify/motor PRIMM, 3.4/3.6) já rodaram contra o banco mas estão
documentadas em detalhe em `docs/ai/modules/backend.md` ("Fase Modify" e
"Sequência Use→Modify→Create completa"), não repetidas aqui pra não
divergir das duas fontes.

17. `1786072013507-CreatePlatformSettings.ts` — cria `platform_settings`
    (tabela singleton, 1 linha só: `minSampleSizeThreshold` int default 5,
    `updatedAt`). Gerada com `migration:generate`, sem seed — a linha é
    materializada em runtime na primeira leitura (`SettingsService.
    getOrCreate`), não via `INSERT` na própria migration, porque não há
    `@BeforeInsert` nem valor "certo" pra forçar antes do admin decidir se
    quer mudar o default (6.5 — configuração de N mínimo pro aviso de
    amostra pequena no relatório de profundidade por desafio).
18. `1786116183224-CreateExportAuditLogs.ts` — cria `export_audit_logs`
    (`adminUserId` FK nullable pra `users` `ON DELETE SET NULL`, `filters`
    jsonb, `rowCount` int, índice em `(adminUserId, createdAt)`). Gerada
    com `migration:generate`, sem seed — primeira tabela de auditoria de
    admin/professor do projeto (6.6 — exportação de dados brutos pra
    pesquisa, ver "Exportação de dados brutos pra pesquisa" em
    `backend.md`).

Todas as 12 primeiras, a 17ª e a 18ª já foram validadas com `npm run
migration:run` contra um Postgres real, e `\dt` + `\d <tabela>` conferidos
no `psql`. Depois da última, um `migration:generate` extra confirmou "No
changes in database schema were found" — zero diff pendente entre entidades
e banco. `GET /metrics/admin/export` (6.6) também foi testado ponta a ponta
via `curl` contra a conta demo de admin: rejeição sem filtro (`400`),
rejeição de período acima de 90 dias (`400`), export JSON e CSV com dado
real de `interaction_events`, `export_audit_logs` conferido com uma linha
por chamada bem-sucedida, e o rate limit (5/min) disparando `429` na 6ª
chamada em sequência. Os 3 fluxos de login
(`/auth/student/login`, `/auth/teacher/login`, `/auth/admin/login`) foram
testados ponta a ponta via `curl` contra essas contas semeadas — sucesso e
falha (senha/OTP/sequência errados) ambos verificados, e os eventos
`login_attempt`/`login_success` conferidos em `interaction_events`. Os dois
desafios (`GET /challenges/by-topic/:topicId` e `GET /challenges/:id`)
também foram testados ponta a ponta via `curl` contra a conta demo de
aluno — Desafio 1 devolve `locked: true` com `program`/
`investigationQuestion` e `nextChallengeId` apontando pro Desafio 2; Desafio
2 devolve `locked: false`, `program: null` e `nextChallengeId: null`.

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
