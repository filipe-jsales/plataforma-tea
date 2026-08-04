# Regras de código — Plataforma TEA

Este arquivo é a referência única de padrões de código e regras não-negociáveis
do projeto. Qualquer IA ou pessoa desenvolvedora deve ler isto antes de propor
ou implementar código neste repositório.

## Contexto do produto

Plataforma web gamificada, baseada em blocos (Blockly), para ensinar lógica de
programação e Pensamento Computacional a estudantes com TEA, integrando um
conceito de disciplina da educação básica em cada desafio. Três áreas:
Estudante, Professor, Admin. Ver `docs/ai/modules/` para a arquitetura de cada
parte do sistema.

Todo o desenho do produto é orientado por um Mapeamento Sistemático da
Literatura (23 estudos primários, 2016–2026) sobre metodologias ativas de
ensino de programação para estudantes com TEA. As regras abaixo traduzem os
achados desse mapeamento em restrições de engenharia.

## Regras não-negociáveis

1. **Filtro sensorial antes do filtro estético.** Qualquer decisão de UI sem
   respaldo em evidência (animação, som, gradiente, confetti, etc.) nasce
   **desligada por padrão** e só liga se o usuário ativar explicitamente nas
   configurações. Ver `apps/web/src/theme/sensory-theme.css` e
   `apps/web/src/stores/useSensoryProfileStore.ts` para o mecanismo já
   implementado — todo novo componente visual deve ler esse estado antes de
   animar ou tocar som.
2. **Uma paleta de blocos nova por tela.** Introdução de blocos segue
   Use–Modify–Create: o aluno primeiro vê o bloco funcionando (Use), depois
   modifica (Modify), só depois cria do zero (Create). Nunca despejar todos os
   blocos disponíveis de uma vez.
3. **Todo desafio segue o ciclo PRIMM internamente** (Predict → Run →
   Investigate → Modify → Make), mesmo que a UI não exponha os rótulos
   técnicos ao aluno. Isso é arquitetura do componente de desafio, não
   terminologia de tela.
4. **Feedback de erro nunca é punitivo.** Sem "errado", "falhou", X vermelho
   grande. Usar linguagem descritiva e reversível ("quase lá — quer tentar de
   novo?").
5. **Sem ranqueamento público, contagem regressiva ou timer competitivo por
   padrão.** Progressão é sempre relativa ao histórico do próprio aluno, nunca
   comparativa entre alunos, salvo ativação explícita pelo professor.
6. **Toda interação relevante é logada de forma estruturada desde o primeiro
   commit** da feature — nunca "logamos depois". Usar as categorias definidas
   em `apps/api/src/common/enums/event-category.enum.ts`:
   - `RD-I` interação (cliques, encaixe/desencaixe de bloco, timing)
   - `RD-P` produto (estado do programa montado)
   - `RD-C` curricular (acerto/erro do conceito da disciplina)
   - `RD-E` engajamento-proxy (sinais observáveis, nunca inferência)
   - `RD-L` longitudinal (marcos de progresso entre sessões)
7. **RD-E nunca vira inferência clínica na UI do professor.** Pode expor
   "tempo de inatividade: 4min", nunca "possível sobrecarga sensorial
   detectada". Interpretação clínica não é responsabilidade do software.
8. **Dados de estudante são pseudonimizados desde a coleta** (ver
   `User.pseudonymId` / `User.schoolReversibleRef` em
   `apps/api/src/users/entities/user.entity.ts`). Isso é requisito de
   arquitetura LGPD/ECA, não nota de rodapé.
9. **Painel do professor é operável por quem não tem formação técnica.**
   Nenhuma configuração pode exigir entender XML do Blockly ou toolbox JSON
   diretamente — sempre construir uma camada de abstração visual antes.
10. **Feature ambígua de gamificação → perguntar antes de implementar.** Se o
    pedido não deixar claro como a feature respeita as regras 1, 5 e 6 (ex.:
    "adiciona um sistema de pontos"), esclarecer o encaixe nas regras acima
    antes de codar, propondo a versão mínima compatível como padrão.

## Convenções de engenharia

### Monorepo

- `npm workspaces`, pacotes em `apps/*`. Rodar comandos com
  `npm run <script> --workspace apps/web` (ou `apps/api`), ou usar os atalhos
  do `package.json` raiz (`dev:web`, `dev:api`, `build:web`, `build:api`).
- Instalar dependências sempre a partir da raiz do repo
  (`npm install --workspace apps/web <pkg>`), nunca `cd` para dentro do app e
  rodar `npm install` isolado — quebraria o lockfile único do workspace.

### Backend (`apps/api`, NestJS)

- Um módulo por domínio: `entities/`, `dto/`, `*.service.ts`,
  `*.controller.ts`, `*.module.ts`. Ver `src/events/` e `src/users/` como
  referência de estrutura.
- **Schema de banco só muda por migration.** `synchronize` é sempre `false`
  (`app.module.ts`). Nunca editar uma migration já commitada e rodada; criar
  uma nova. Ver `docs/ai/modules/database.md` para o fluxo completo.
- Toda entrada de API validada via DTO com `class-validator`
  (`ValidationPipe({ whitelist: true, transform: true })` já é global em
  `main.ts`) — não validar manualmente dentro do controller/service.
- Rotas que tocam dado de aluno exigem `@UseGuards(JwtAuthGuard)`; rotas
  restritas a papel específico usam `@Roles(Role.TEACHER)` +
  `RolesGuard` (ver `src/auth/`).
- Nomes de coluna em `camelCase` nas entidades (TypeORM usa o nome da
  propriedade como está, sem naming strategy customizada) — manter
  consistência em qualquer entidade nova.

### Frontend (`apps/web`, React + Vite)

- React fixado em `^18`, não `19` — `react-blockly` (peer dep) só suporta até
  18. Não fazer upgrade de major do React sem checar essa dependência primeiro.
- Qualquer componente que anime, toque som ou mude contraste **lê o estado de
  `useSensoryProfileStore` antes** — nunca hardcodar `transition`/`animation`
  fora do sistema de `data-motion` do `sensory-theme.css`.
- Estado global "cross-cutting" (perfil sensorial, sessão do usuário, etc.) via
  Zustand, um store por domínio — evitar um único store monolítico.
- Editor de blocos: `blockly` + `react-blockly`. Mundo/personagem que executa
  o código: `pixi.js`, isolado em componente próprio, comunicando por state
  (nunca acoplado diretamente ao DOM do Blockly).

### Geral

- TypeScript estrito nas duas apps; não usar `any` para contornar erro de tipo
  — resolver o tipo real (ver `apps/api/src/auth/auth.module.ts` para exemplo
  de cast tipado em vez de `any`, no `expiresIn` do JWT).
- Sem comentário do tipo "o que o código faz" — só comentar o porquê quando
  não-óbvio (workaround, invariante, decisão sem alternativa clara).
