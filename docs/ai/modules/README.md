# Módulos — Plataforma TEA

Índice da arquitetura do repositório, por módulo. Ver também
[`docs/ai/persona.md`](../persona.md) (identidade/missão/evidência do
projeto) e `docs/ai/rules/coding-rule.md` (regras de código) para o contexto
que se aplica a qualquer mudança nestes módulos.

- [`frontend.md`](./frontend.md) — `apps/web`, React + Vite + Blockly + PixiJS.
- [`backend.md`](./backend.md) — `apps/api`, NestJS + TypeORM + JWT.
- [`database.md`](./database.md) — Postgres via Docker, schema e migrations.

## Visão geral do monorepo

```
plataforma-tea/
├── docker-compose.yml   # Postgres local
├── docs/ai/             # esta documentação
├── apps/
│   ├── web/              # frontend — área Estudante/Professor/Admin (React)
│   └── api/               # backend — API REST (NestJS)
└── AGENTS.md / CLAUDE.md  # apontam para docs/ai/
```

Estado atual (verificar `git log` para o que mudou desde então): instalação
base dos dois apps concluída, com a infraestrutura de autenticação JWT, schema
de eventos de interação e tema sensorial já wireados. As telas de
Estudante/Professor/Admin e o editor Blockly funcional ainda não foram
implementados — são os próximos passos de feature, não de instalação.
