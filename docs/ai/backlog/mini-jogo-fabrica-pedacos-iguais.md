# Mini jogo — "Fábrica de Pedaços Iguais" (1º mini jogo de conteúdo)

Primeiro mini jogo sério de CONTEÚDO da plataforma (MJ1/MJ7 já eram
infraestrutura; este é o jogo em cima dela), cobrindo Matemática —
frações. Documento no mesmo formato de
`docs/ai/backlog/metricas-professor-admin.md`. Texto de design original
recebido do produto, adaptado aqui com as decisões técnicas fechadas
durante a implementação.

## Contexto

Não existe hoje um tópico "frações" cadastrado no desafio de blocos (o
currículo atual do MVP é `angulos_formas` + `water_state`) — o vínculo
formal `concept_id` entre este jogo e um desafio de blocos equivalente
(MJ8) continua bloqueado, como já documentado em
`mini-jogos-serios.md`. Este jogo usa `conceptId: 'fractions_equal_parts'`
como string livre, mesmo padrão já em produção em `miniGameStore`/
`MiniGamePage`.

## Mecânica

O aluno recebe um "pedido" (fração-alvo, ex.: 1/4) e monta/ajusta/observa
uma sequência curta de até 5 tipos de cartão:

- `Escolher o inteiro`
- `Cortar em partes iguais` (define o denominador diretamente, 2–8)
- `Repetir corte`
- `Separar pedaço(s)` (define o numerador)
- `Entregar pedido`

Reordenação por botões ↑/↓ (nunca drag-and-drop, MJ4). Resultado comparado
ao pedido com feedback ícone+texto, nunca "errado" (MJ5).

### Decisão de design: "Repetir corte" é pedagógico, não matemático

O card original propunha que "Repetir corte" fosse necessário pra chegar
ao número de partes (implicando uma mecânica de duplicação/iteração
matemática). Implementado diferente: `Cortar em partes iguais` já define o
denominador diretamente (2–8, escolhido pelo aluno/professor).
`Repetir corte` é **opcional e sem efeito no resultado** — só reforça
visualmente a repetição (uma "flash" extra de corte na animação, quando
`motionEnabled`) e é logado (`repeatCutCount` no payload de
`minigame_round_executed`), mas nunca é exigido pra acertar. Motivo: a
mecânica de duplicação restringiria os denominadores possíveis a potências
de 2 (2, 4, 8...), excluindo terços/sextos — o próprio texto original já
sinalizava esse risco ("se o aluno não perceber que repetir o corte é o
que gera múltiplas partes, o jogo pode virar tentativa-e-erro"). Ver
`apps/web/src/lib/fractionsFactory.ts`.

### Decisão de design: geometria única pros 3 temas

Barra de chocolate, pizza e jardim usam a MESMA geometria visual (faixa de
retângulos iguais), diferenciados só por cor e ícone — não fatias de
pizza nem grade de jardim. Motivo: o próprio texto original alerta que "um
corte quase igual mal desenhado pode confundir mais do que ensinar";
retângulos iguais em faixa são a forma mais inequívoca de mostrar "partes
iguais" sem risco de imprecisão de desenho. Fatias/grade reais ficam como
melhoria futura. Ver `apps/web/src/components/minigame/scenes/
fractionsFactoryScene.ts`.

### Nada é gabarito oculto

Ao contrário do desafio `water_state` (`expectedModel` nunca visível ao
aluno), aqui a fração-alvo e a sequência pré-montada (níveis Use/Modify)
são sempre visíveis — é literalmente o que o aluno vê na tela. O backend
serve `config` inteiro; a validação de acerto roda no cliente
(`simulateSequence`/`matchesTarget`), mesmo racional de `turtleWorld.ts`
(fechamento geométrico calculado no frontend).

## Estrutura em 3 níveis (Use → Modify → Create)

3 linhas da tabela `mini_game_levels` (`stage`+`position`, mesmo padrão de
`Challenge`), seed via migration `CreateMiniGameLevels`:

1. **Use** (`/minigame/fractions/use`) — sequência pronta e correta
   (1/2 da barra de chocolate), só observação, sem controles de edição.
2. **Modify** (`/minigame/fractions/modify`) — sequência quase certa (1/4
   da pizza, mas cortada em 3 partes por engano); aluno corrige o cartão
   errado.
3. **Create** (`/minigame/fractions/create`) — 3/4 do jardim, sequência
   vazia, aluno monta do zero a partir da paleta (`CardBank`).

Progressão sequencial no frontend (array fixo `['use','modify','create']`,
sem precisar de `nextChallengeId`) — link "Próximo nível" aparece ao
concluir cada um.

## Ciclo PRIMM interno

Mapeado sobre o `createMiniGameStore` já existente (MJ1/MJ7), sem alterar
a store: `predict → run` na 1ª execução da rodada; toda tentativa
incorreta seguinte fica em `run` via `recordAttempt()` (mesmo significado
de "tentativa dentro da mesma fase" já documentado pro MJ7 — é aqui que a
correção de cartão do design original acontece, não numa fase `modify` da
store); ao acertar, `run→investigate→modify→make` em sequência marca
`completed`. "Novo pedido" (fase Make) chama `store.startScene()` de novo,
sorteando do `fractionPool` quando o nível é `create`. Mesma divergência já
registrada pro desafio de blocos ("Predict mora em 3.3 e 3.4").

## Configurável pelo professor

`GET/PATCH /teacher/minigames/levels` (`apps/api/src/minigames/`,
`@Roles(Role.TEACHER)`) — tema (barra/pizza/jardim) e fração-alvo por
nível (Use/Modify), mais o pool de frações sorteadas em "Novo pedido"
(Create, 1 a 5 opções). Validação semântica no service (denominador 2–8,
numerador 1..denominador-1), mensagens descritivas por campo — nunca
"edite o JSON de config" (regra não-negociável 9). Tela:
`apps/web/src/routes/teacher/TeacherMiniGameSettings.tsx`
(`/teacher/minigames`, link em `TeacherHome`).

Níveis são currículo global (mesmo modelo de `Challenge`/
`ChallengeTemplate`) — não existe settings por turma neste repo, e não foi
criado um novo padrão só pra este jogo.

## Admin recebe métricas dos eventos

`GET /metrics/admin/minigames` (lista) + `GET /metrics/admin/minigames/
:levelId` (relatório de profundidade), mesmo padrão de 6.5
(`MetricsAdminChallengeService`), reaproveitando `statistics.ts` (nenhuma
fórmula estatística duplicada): alunos que chegaram/concluíram, rodadas
por aluno (`DescriptiveStats` + histograma), tempo até a 1ª execução,
eventos por categoria RD-*/tipo, contagem de abandono (RD-E, sempre número
bruto — regra não-negociável 7) e taxa de resposta da predição opcional.
Tela: `apps/web/src/routes/metrics/MiniGameReport.tsx`
(`/admin/minigames`, link em `AdminHome`).

`interaction_events` ganhou `miniGameLevelId` (FK nullable, migration
`AddMiniGameLevelIdToInteractionEvents`) — permite ao admin cruzar sem
parsear `scene_id` como string, mesmo padrão de `challengeId`.

## Dados/Eventos (MJ7 estendido)

Além dos 5 eventos já existentes (`minigame_scene_started`,
`minigame_primm_phase_changed`, `minigame_step_retry`,
`minigame_completed`, `minigame_abandoned`), este jogo adiciona 2 (mesmas
5 categorias RD-*, nenhuma taxonomia paralela):

- `minigame_round_executed` (RD-P) — a cada "Executar": sequência
  completa, se bateu com o pedido, `miniGameLevelId`.
- `minigame_predict_answered` (RD-C) — só quando o aluno responde a
  predição opcional (nunca obrigatória); `predicted_parts`.

## Status de implementação

**Implementado.** Backend: `apps/api/src/minigames/` (entidade, service,
2 controllers, DTO), migrations `CreateMiniGameLevels`/
`AddMiniGameLevelIdToInteractionEvents`,
`MetricsAdminMiniGameService`. Frontend: `apps/web/src/lib/
fractionsFactory.ts` (lógica pura, testada), `stores/
fractionsRoundStore.ts`, `components/minigame/{CardSequenceEditor,CardBank,
scenes/fractionsFactoryScene}.tsx`, `routes/minigame/fractions/
FractionsGamePage.tsx`, `routes/teacher/TeacherMiniGameSettings.tsx`,
`routes/metrics/MiniGameReport.tsx`. Entrada pro aluno: seção "Mini jogos"
em `SubjectSelector.tsx`.
