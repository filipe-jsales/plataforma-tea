# Regras de código — Plataforma TEA

Este arquivo é a referência única de padrões de código e regras não-negociáveis
do projeto. Qualquer IA ou pessoa desenvolvedora deve ler isto antes de propor
ou implementar código neste repositório.

## Contexto do produto

Plataforma web gamificada, baseada em blocos (Blockly), para ensinar lógica de
programação e Pensamento Computacional a estudantes com TEA, integrando um
conceito de disciplina da educação básica em cada desafio. Três áreas:
Estudante, Professor, Admin. Ver [`docs/ai/persona.md`](../persona.md) para a
identidade/missão completa e a base de evidência por trás de cada regra
abaixo, e `docs/ai/modules/` para a arquitetura de cada parte do sistema.

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
- **`interaction_events` é escopado ao aluno, não telemetria genérica.**
  `studentPseudoId` é `NOT NULL` de propósito (RQ5 — avaliação de
  Pensamento Computacional do estudante). Ações de professor/admin (login,
  visualização de home, etc.) não emitem evento nessa tabela — ver "Padrão:
  eventos RD-* são escopados ao aluno" em `docs/ai/modules/backend.md`.

### Modelagem de domínio (backend)

Padrões já estabelecidos — seguir para qualquer entidade nova, não reabrir a
decisão a cada feature:

- **Papel do usuário é uma coluna (`users.role`), nunca tabelas separadas por
  papel.** Permissão é sempre derivada do papel via `RolesGuard` +
  `@Roles()`, nunca hardcoded em controller/tela. Ver `src/users/entities/
  user.entity.ts`.
- **Catálogo (disciplina, assunto, e qualquer lista que possa crescer) é
  tabela, nunca enum fixo no código.** Um enum exige migration + deploy para
  adicionar um valor; uma tabela não. Ver `src/subjects/entities/` — o MVP
  cadastra uma única linha, mas a estrutura já aguenta crescer.
- **Vínculo entre pessoas/entidades que muda com o tempo (matrícula,
  atribuição de turma) é histórico, não referência fixa.** Marcar
  `active: false` + timestamp de encerramento, nunca `DELETE` da linha
  antiga nem um FK único e permanente. Ver `src/schools/entities/
  enrollment.entity.ts`. Isso também alimenta RD-L (longitudinal) de graça —
  o histórico já fica no banco.
- **Coluna que referencia uma entidade que ainda não existe** (ex.:
  `interaction_events.challengeId` antes de existir `Challenge`) nasce
  nullable e sem FK, com comentário explicando o porquê — vira FK real numa
  migration `ALTER TABLE` quando a entidade existir. Nunca esperar a
  feature completa existir para começar a coletar o dado (regra
  não-negociável 6).
- **FK não valida invariante de negócio no banco** (ex.: nada impede um
  `role=admin` em `classrooms.teacherId`). Documentar isso na entidade e
  validar na camada de serviço quando o endpoint existir — não é motivo para
  adicionar trigger/constraint customizado sem necessidade concreta.
- **Pseudônimo é gerado na entidade, não em código de aplicação.** Use
  `@BeforeInsert()` (ver `User.generatePseudonymId`) para garantir que
  qualquer caminho de criação (endpoint, seed, import em lote) sempre gera o
  identificador — nunca deixar isso como responsabilidade de quem escreve o
  próximo endpoint de registro lembrar de fazer.
- **Dado reversível para identidade real do aluno vive em módulo próprio,
  nunca na mesma tabela/módulo que dados operacionais.** Ver
  `src/identity/` (`StudentIdentityReversal`). Regra rígida: **o
  `EventsModule` nunca importa `IdentityModule`** — a separação é em nível de
  módulo/import, não só de guard de rota, para não depender de disciplina em
  code review pra manter o isolamento. Isso é o requisito de arquitetura
  LGPD/ECA (regra não-negociável 8) implementado, não um comentário de
  intenção.
- **Seed de migration (`INSERT` em SQL puro) não aciona `@BeforeInsert`.**
  Qualquer valor que uma entidade geraria sozinha em runtime (`pseudonymId`
  via `randomUUID()`, `joinCode` via `generateJoinCode()`) precisa ser
  gerado explicitamente na própria query de seed (`uuid_generate_v4()` do
  Postgres, ou um literal fixo). Já causou uma falha de `NOT NULL
  constraint` neste projeto (ver `AddLoginMechanisms1785942128821`) — checar
  isso é rotina ao escrever seed, não uma surpresa.
- **Login por papel não é um formulário único.** Aluno usa turma + avatar +
  sequência de imagens (nunca e-mail/senha); professor e admin usam
  e-mail/senha (admin com TOTP). Os pools de ilustração de avatar e de
  sequência de login são tabelas separadas (`Illustration.kind`) de
  propósito — nunca deixar o aluno escolher a mesma imagem pras duas coisas,
  isso confunde "quem eu sou" com "minha senha". Ver `src/auth/auth.service.ts`.
- **Desafio novo (em qualquer tópico) segue o ciclo Use→Modify→Create,
  nunca pula etapa.** Respaldo empírico: RQ2 do mapeamento sistemático,
  21,74% dos estudos primários — é o ciclo completo de 3 etapas que tem
  evidência, não uma combinação parcial. Regras concretas ao cadastrar um
  desafio (ver nota de pesquisa completa em
  `apps/api/src/challenges/challenge-config.interface.ts`):
  - Declare `Challenge.position` explicitamente (nunca deduza ordem de
    `createdAt`) — é o que permite inserir uma etapa no meio depois (ex.: um
    "modify" entre um "use" e um "create" já existentes) sem forjar
    timestamp. Mesmo raciocínio de `Illustration.position`/
    `BlockDefinition.position`.
  - Todo `blockType` em `allowedBlockTypes` só pode aparecer pela primeira
    vez (na ordem de `position`) num desafio `stage: 'use'` — nunca estreando
    em `modify`/`create`. Testado contra o seed real em
    `block-progression.spec.ts`.
  - Um tópico com só `use`+`create` (sem `modify` no meio) é um estado
    intermediário aceitável como passo incremental — nunca trate como
    sequência completa/validada para fins de pesquisa com usuários reais ou
    de alegação de aderência ao framework Use-Modify-Create até o `modify`
    existir de verdade.

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
- Elemento interativo novo em QUALQUER módulo (aluno, professor, admin —
  botão, link, toggle, card selecionável, aba/segmented control, dropdown,
  tabela, badge, tooltip, modal) usa `components/ui/` (3.10/3.11 — Radix UI
  headless pros primitivos estruturais, React Aria só onde Radix não cobre,
  ex.: card clicável) em vez de `<button>`/`<select>`/CSS cru — é o que
  garante área de toque mínima 56×56, rótulo ícone+texto e foco visível sem
  cada tela reimplementar isso. A diferença entre aluno e professor/admin é
  só TEMA (cor mais rica, elevação, microanimação — classe `.staff-theme`,
  ver `theme/staff-theme.css`), nunca fundação de componente: nenhuma tela
  de professor/admin nasce de HTML puro só porque "a regra sensorial não se
  aplica aqui" — ela ainda usa `components/ui/`, só sem a restrição
  sensorial do aluno. Ver "Sistema de design compartilhado (professor/
  admin, 3.11)" em `docs/ai/modules/frontend.md`.

### Geral

- TypeScript estrito nas duas apps; não usar `any` para contornar erro de tipo
  — resolver o tipo real (ver `apps/api/src/auth/auth.module.ts` para exemplo
  de cast tipado em vez de `any`, no `expiresIn` do JWT).
- Sem comentário do tipo "o que o código faz" — só comentar o porquê quando
  não-óbvio (workaround, invariante, decisão sem alternativa clara).

### Testes — não-negociável a partir deste ponto

**Nenhuma feature nova (service, store, helper de `lib/`, guard, util) entra
sem teste unitário no mesmo commit/PR que a introduz.** Isso vale tanto para
código novo quanto para qualquer lógica não-trivial adicionada a um arquivo
já existente — não é retroativo por padrão, mas toda mudança futura precisa
sair coberta.

- **Backend (`apps/api`)**: Jest, já configurado (`npm run test --workspace
  apps/api`, ou `npm run test:api` na raiz). Testar o `*.service.ts`
  instanciando a classe direto com repositórios/deps mockados (`jest.Mocked`)
  — não subir `TestingModule`/Nest DI nem banco real só pra testar lógica de
  service. Ver `apps/api/src/auth/auth.service.spec.ts` e
  `apps/api/src/home/home.service.spec.ts` como referência de padrão
  (mock de repositório/serviço colaborador, sem tocar Postgres). Módulos que
  só fazem passthrough fino pro TypeORM (ex.: `SchoolsService`,
  `SubjectsService`) ainda merecem teste — a asserção é sobre o `where`/
  `relations` passado ao repositório, não sobre o retorno do Postgres.
  Guards com lógica própria (`RolesGuard`) e métodos de entidade
  (`User.generatePseudonymId`) também são testados — ver
  `apps/api/src/auth/guards/roles.guard.spec.ts` e
  `apps/api/src/users/entities/user.entity.spec.ts`.
- **Frontend (`apps/web`)**: Vitest + Testing Library (`npm run test
  --workspace apps/web`, ou `npm run test:web` na raiz;
  `apps/web/vitest.config.ts` configura `jsdom`). Toda função de `lib/` e todo
  store Zustand novo (ou store existente que ganhar lógica nova) precisa de
  `*.spec.ts` cobrindo o comportamento, não só o caminho feliz — ver
  `apps/web/src/lib/apiClient.spec.ts` (mock de `fetch` global via
  `vi.stubGlobal`) e `apps/web/src/stores/useSensoryProfileStore.spec.ts`
  (reset de estado em `beforeEach`, já que stores Zustand são singletons
  compartilhados entre testes). Componentes de tela (`routes/`) que
  contenham lógica de decisão (não só JSX declarativo) também devem ganhar
  teste com `@testing-library/react` conforme forem escritos/alterados.
- **O que testar de verdade, não só "ter um arquivo `.spec.ts`":** o
  comportamento que a regra de negócio exige — ex. `HomeService` nunca
  devolver identificação de aluno individual pro professor/admin (regra não-
  negociável 5/9), `AuthService.loginStudent` nunca vazar pseudônimo/e-mail
  no roster, `getIllustrationAsset` cair no fallback em vez de quebrar. Um
  teste que só confirma "a função roda sem erro" não substitui isso.
- Rodar a suíte relevante antes de considerar uma feature pronta. Se a
  mudança tocar as duas apps, rodar as duas (`npm run test:api` e
  `npm run test:web`).
