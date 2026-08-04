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

## Eventos de interação

`POST /events` grava um `InteractionEvent` (tabela append-only, nunca
atualizada/apagada). Todo novo módulo de feature que representa interação do
aluno relevante (bloco encaixado, desafio resolvido, tempo de inatividade,
etc.) deve emitir um evento com a categoria RD-* correta — não é opcional,
ver regra não-negociável 6 em `coding-rule.md`.

`payload` é `jsonb` livre por tipo de evento, mas o campo `type` deve ser um
vocabulário controlado por feature (ex.: `block.snap`, `challenge.predict`),
nunca texto livre vindo direto do frontend sem validação.

## Banco de dados

Ver `docs/ai/modules/database.md` para o fluxo completo de migrations. Regra
central: `synchronize: false` sempre — qualquer mudança de schema é uma
migration nova em `src/database/migrations/`.

## Próximos passos (fora do escopo de instalação)

- `POST /auth/login` e `POST /auth/register` (hash de senha com `bcrypt`,
  emissão de JWT com `sub`/`pseudonymId`/`role`).
- Módulos de domínio pedagógico: turmas, desafios, disciplina/assunto do MVP.
- Rotas de leitura de eventos para o painel do professor (agregando RD-E como
  sinal observável, nunca como inferência clínica — regra 7).
