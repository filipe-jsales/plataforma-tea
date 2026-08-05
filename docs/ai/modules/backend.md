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
│   ├── entities/user.entity.ts  # pseudonymId, schoolReversibleRef, role...
│   ├── users.service.ts
│   └── users.module.ts
├── auth/
│   ├── strategies/jwt.strategy.ts
│   ├── guards/jwt-auth.guard.ts
│   ├── guards/roles.guard.ts
│   ├── decorators/roles.decorator.ts
│   └── auth.module.ts           # JwtModule configurado — sem login/register ainda
├── subjects/
│   ├── entities/subject.entity.ts   # disciplina (tabela, não enum) — ex.: "geometria"
│   ├── entities/topic.entity.ts     # assunto dentro da disciplina — ex.: "angulos_formas"
│   ├── subjects.service.ts
│   └── subjects.module.ts
├── schools/
│   ├── entities/school.entity.ts
│   ├── entities/classroom.entity.ts   # turma; teacherId reatribuível, sem vínculo fixo
│   ├── entities/enrollment.entity.ts  # matrícula aluno↔turma, histórico (active/unenrolledAt)
│   ├── schools.service.ts
│   └── schools.module.ts
├── events/
│   ├── entities/interaction-event.entity.ts  # tabela append-only
│   ├── dto/create-event.dto.ts
│   ├── events.service.ts
│   ├── events.controller.ts     # POST /events (protegido por JwtAuthGuard)
│   └── events.module.ts
├── database/
│   ├── data-source.ts           # DataSource p/ CLI de migrations (fora do Nest DI)
│   └── migrations/              # uma migration por mudança de schema
├── app.module.ts                # ConfigModule + TypeOrmModule.forRootAsync + módulos
└── main.ts                      # ValidationPipe global + CORS
```

## Autenticação

`AuthModule` hoje só monta a infraestrutura (`JwtModule`, `JwtStrategy`,
`JwtAuthGuard`, `RolesGuard`, decorator `@Roles()`) — **não há endpoint de
login/registro ainda**. Para proteger uma rota nova:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
@Controller('turmas')
export class TurmasController { ... }
```

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

## Eventos de interação

`POST /events` grava um `InteractionEvent` (tabela append-only, nunca
atualizada/apagada). Todo novo módulo de feature que representa interação do
aluno relevante (bloco encaixado, desafio resolvido, tempo de inatividade,
etc.) deve emitir um evento com a categoria RD-* correta — não é opcional,
ver regra não-negociável 6 em `coding-rule.md`.

`payload` é `jsonb` livre por tipo de evento, mas o campo `type` deve ser um
vocabulário controlado por feature (ex.: `block.snap`, `challenge.predict`),
nunca texto livre vindo direto do frontend sem validação.

`challengeId` existe na tabela desde já (nullable, sem FK) mesmo sem a
entidade `Challenge` (desafio) existir ainda — quando o módulo de desafios for
criado, essa coluna vira FK real via uma migration `ALTER TABLE ... ADD
CONSTRAINT`, sem precisar recriar a tabela de eventos.

## Banco de dados

Ver `docs/ai/modules/database.md` para o fluxo completo de migrations. Regra
central: `synchronize: false` sempre — qualquer mudança de schema é uma
migration nova em `src/database/migrations/`.

## Próximos passos (fora do escopo já implementado)

- `POST /auth/login` e `POST /auth/register` (hash de senha com `bcrypt`,
  emissão de JWT com `sub`/`pseudonymId`/`role`).
- Entidade/módulo `Challenge` (desafio) — quando existir, migrar
  `interaction_events.challengeId` para FK real (ver seção acima).
- Endpoints CRUD para `subjects`/`topics`/`schools`/`classrooms`/`enrollments`
  (hoje só existem como entidades + services de leitura mínimos — sem
  controller ainda; ver regra 9 antes de expor isso ao professor: nada de
  formulário que exija entender a estrutura de tabelas).
- Rotas de leitura de eventos para o painel do professor (agregando RD-E como
  sinal observável, nunca como inferência clínica — regra 7).
