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

Ver `apps/api/src/users/entities/user.entity.ts`. Ponto de atenção:
`pseudonymId` é o identificador usado em qualquer log/relatório;
`schoolReversibleRef` existe só para a escola conseguir reverter a
pseudonimização fora do software — nunca é exposto em UI/relatório do
professor (regra não-negociável 8 em `docs/ai/rules/coding-rule.md`).

### `interaction_events`

Ver `apps/api/src/events/entities/interaction-event.entity.ts`. Tabela
append-only (nunca `UPDATE`/`DELETE` de evento já gravado), indexada por
`(studentPseudoId, createdAt)` para consultas de histórico/longitudinais.
`category` é o enum RD-I/RD-P/RD-C/RD-E/RD-L — ver `event-category.enum.ts`
e a regra 6/7 em `coding-rule.md` antes de adicionar um novo `type` de evento.

### Migration inicial

`1785866463111-CreateUsersAndInteractionEvents.ts` — cria as duas tabelas
acima, os enums Postgres (`users_role_enum`,
`interaction_events_category_enum`) e a extensão `uuid-ossp` (necessária para
`uuid_generate_v4()` nas chaves primárias). Foi escrita à mão (via
`migration:create`), e já foi validada rodando `npm run migration:run` contra
um Postgres real (`\d users` / `\d interaction_events` conferidos no `psql`).

## Adicionando uma migration nova

1. Alterar/criar a entidade TypeORM.
2. Com o Postgres do `docker-compose.yml` rodando:
   `npm run migration:generate -- src/database/migrations/NomeDescritivo --workspace apps/api`
   (ou `cd apps/api` e rodar sem `--workspace`).
3. Revisar o SQL gerado — TypeORM às vezes gera índices/constraints a mais ou
   a menos do que o pretendido.
4. `npm run migration:run --workspace apps/api` para aplicar localmente.
5. Commitar a migration junto com a mudança de entidade, no mesmo PR.

Nunca editar uma migration já commitada (e possivelmente já rodada em algum
ambiente) — criar uma nova.
