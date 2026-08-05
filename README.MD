# Plataforma TEA

Plataforma web gamificada e interdisciplinar, baseada em blocos (Blockly),
para ensino de lógica de programação e Pensamento Computacional a estudantes
com TEA, integrando conceitos da educação básica. Três áreas: Estudante,
Professor e Admin.

Arquitetura e regras de código: ver [`docs/ai/`](./docs/ai/) (também
referenciado por [`AGENTS.md`](./AGENTS.md) e [`CLAUDE.md`](./CLAUDE.md)).

## Stack

- **Frontend** (`apps/web`): React 18 + TypeScript + Vite, Blockly +
  react-blockly, PixiJS, Zustand.
- **Backend** (`apps/api`): NestJS 11 + TypeORM + PostgreSQL, JWT.
- **Banco**: PostgreSQL 16 via Docker Compose.
- Monorepo com `npm workspaces` (`apps/*`).

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20+ (testado com Node 24) e npm 11+.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para o
  Postgres local) **ou** um PostgreSQL 16 instalado nativamente — ver
  [seção 2b](#2b-alternativa-sem-docker-postgresql-nativo-no-windows) se sua
  máquina não tiver suporte a virtualização (Docker Desktop exige WSL2/Hyper-V).

## 1. Instalar dependências

Na raiz do repositório (instala front e back de uma vez, workspaces
compartilham um único lockfile):

```powershell
npm install
```

Para adicionar uma dependência a um app específico, sempre a partir da raiz:

```powershell
npm install --workspace apps/web <pacote>
npm install --workspace apps/api <pacote>
```

Nunca rode `npm install` de dentro de `apps/web` ou `apps/api` isoladamente.

## 2. Banco de dados (PostgreSQL)

### 2a. Via Docker (padrão)

Suba o Postgres local definido em `docker-compose.yml`:

```powershell
docker compose up -d
```

Isso sobe um Postgres 16 em `localhost:5432` com o banco `plataforma_tea`
(usuário/senha `plataforma_tea` — só para desenvolvimento local, ver
`docker-compose.yml`). Para parar:

```powershell
docker compose down
```

Para apagar também os dados (reset total do banco local):

```powershell
docker compose down -v
```

### 2b. Alternativa sem Docker: PostgreSQL nativo no Windows

Se o Docker Desktop não conseguir iniciar com o erro **"Virtualization
support not detected"**, sua máquina (ou uma política de TI) não tem
virtualização de hardware habilitada — Docker Desktop no Windows depende de
WSL2/Hyper-V. Nesse caso, instale o PostgreSQL 16 direto no Windows:

```powershell
winget install --id PostgreSQL.PostgreSQL.16 -e --silent `
  --accept-package-agreements --accept-source-agreements `
  --override "--mode unattended --superpassword <SENHA_ADMIN_LOCAL> --serverport 5432"
```

Isso instala o serviço `postgresql-x64-16` (inicia automaticamente) e o
`psql` em `C:\Program Files\PostgreSQL\16\bin`. Em seguida, crie o usuário e
o banco com as mesmas credenciais já usadas no `.env.example`
(usuário/senha/banco `plataforma_tea`), usando a senha de admin definida
acima:

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
$env:PGPASSWORD = "<SENHA_ADMIN_LOCAL>"
psql -U postgres -h localhost -c "CREATE ROLE plataforma_tea WITH LOGIN PASSWORD 'plataforma_tea' CREATEDB;"
psql -U postgres -h localhost -c "CREATE DATABASE plataforma_tea OWNER plataforma_tea;"
```

Com isso, o `.env` do backend (seção seguinte) não precisa de nenhum ajuste —
`DB_HOST=localhost` e porta `5432` funcionam igual ao Docker. O
`docker-compose.yml` continua no repo para quando a virtualização for
liberada; os dois caminhos usam o mesmo schema (mesmas migrations).

### Variáveis de ambiente do backend

Copie o exemplo e ajuste se necessário (os valores padrão já batem com o
`docker-compose.yml`):

```powershell
Copy-Item apps\api\.env.example apps\api\.env
```

### Rodando as migrations

O schema do banco é controlado **inteiramente por migrations** — não há
`synchronize` automático (ver `docs/ai/modules/database.md` para o porquê).
Com o Postgres rodando (`docker compose up -d`):

```powershell
npm run migration:run --workspace apps/api
```

Isso cria as tabelas `users` e `interaction_events`. Para reverter a última
migration aplicada:

```powershell
npm run migration:revert --workspace apps/api
```

#### Criando uma nova migration

1. Altere/crie a entidade TypeORM em `apps/api/src/**/entities/*.entity.ts`.
2. Com o Postgres rodando, gere a migration automaticamente a partir do diff
   entre as entidades e o banco atual:

   ```powershell
   npm run migration:generate --workspace apps/api -- src/database/migrations/NomeDescritivo
   ```

3. Revise o SQL gerado em `apps/api/src/database/migrations/`.
4. Aplique localmente: `npm run migration:run --workspace apps/api`.
5. Commite a migration junto com a mudança de entidade.

Se precisar de uma migration sem alteração de entidade (ex.: um backfill de
dado, um `ALTER TABLE` manual), crie um arquivo vazio com:

```powershell
npm run migration:create --workspace apps/api -- src/database/migrations/NomeDescritivo
```

e escreva o `up`/`down` à mão.

## 3. Rodando o backend

```powershell
npm run dev:api
```

Sobe o NestJS em modo watch em `http://localhost:3000` (porta configurável via
`PORT` no `.env`). Requer o Postgres rodando e as migrations aplicadas (passo
2) — sem isso, a API sobe mas fica tentando reconectar ao banco.

## 4. Rodando o frontend

```powershell
npm run dev:web
```

Sobe o Vite dev server em `http://localhost:5173`.

## Build de produção

```powershell
npm run build:web
npm run build:api
```

## Resumo dos comandos

| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências de front e back (raiz) |
| `docker compose up -d` | Sobe o Postgres local |
| `docker compose down` | Para o Postgres local |
| `npm run migration:run --workspace apps/api` | Aplica migrations pendentes |
| `npm run migration:revert --workspace apps/api` | Reverte a última migration |
| `npm run migration:generate --workspace apps/api -- <caminho>` | Gera migration a partir do diff de entidades |
| `npm run dev:api` | Roda o backend em modo dev |
| `npm run dev:web` | Roda o frontend em modo dev |
| `npm run build:api` / `npm run build:web` | Builds de produção |
