# Roadmap — melhorias e features mapeadas (2026-10)

Levantamento feito depois de fechar a frente "sem emoji + design system"
(DS1–DS11) e os eventos pré-login. Parte do que o código e a documentação
dizem **hoje** — não de um plano externo. Cada item tem prioridade, o achado
do mapeamento (`docs/ai/persona.md`) que o justifica e o que precisa ser
decidido antes. Identificadores (`F*`, `M*`, `T*`, `Q*`) são só referência
interna deste arquivo.

**Decisão de escopo:** transporte de **e-mail** (definição de senha, aviso ao
responsável — gap de 1.4 em `backend.md`) **não é prioridade agora**. Hoje o
fluxo funciona entregando o link/código manualmente; nada abaixo depende de
e-mail.

## O que foi fechado nesta rodada

| Item | Resultado |
|---|---|
| Sem emoji no backend/banco/frontend | Migration `RemoveEmojisFromSeededData`, ícones via `lib/contentIcons.tsx`, guardas `no-emoji.spec.ts` (API e web) |
| DS1 — `ChallengePage` fora de `components/ui/` | `ChallengePage` **e** `WaterStateChallengePage` migradas; ~10 regras de CSS próprio removidas |
| DS2/DS3/DS4/DS10/DS11 | Guia `/dev/design-system`; token `--color-text-on-dark`; decisão de manter `Tabs`/`Tooltip`; `Voltar` em `secondary` |
| Eventos pré-login | `POST /events/pre-login` público, restrito (ver `backend.md`) |
| Logout/expiração de sessão | **Já existia** (`lib/logout.ts`, 401 em `apiClient`, `RequireAuth`) — a lista de "próximos passos" estava desatualizada e foi corrigida |

## Segurança e robustez

| ID | Item | Prioridade | Notas |
|---|---|---|---|
| Q3 | Endpoint de reversão de identidade (`IdentityService.reveal`) sem controller/guard | Média | Existe só o service. Decidir quem pode (admin? com auditoria `AuditModule`) antes de expor — regra não-negociável 8 |
| Q4 | Rotas de leitura de eventos por turma (RD-E como sinal observável) | Baixa | Parcialmente coberto por M2/M3 de métricas; revisar se sobrou algo |
| Q5 | Retenção/limpeza de `interaction_events` pré-login | Baixa | Tabela append-only; linhas pré-login são anônimas e de baixo valor — definir janela de retenção (ex.: 12 meses) |

## Qualidade e manutenção

| ID | Item | Prioridade | Notas |
|---|---|---|---|
| T1 | **CI** (jest + vitest + `tsc` + `oxlint` + guardas de emoji) | Alta | Os guardas só protegem se alguém roda. Hoje não há pipeline versionado no repo |
| T2 | Warnings do `oxlint` (`exhaustive-deps` em `StudentHome`, `FractionsGamePage`, `WorkToolsGamePage`) | Média | O de `StudentHome` (efeito com `user` faltando) pode esconder bug real; os de `useMemo(level.id)` são ruído |
| T3 | Auditoria de acessibilidade automatizada (axe) nas telas principais | Média | Principalmente contraste de `--color-text-on-dark` em alto contraste e foco visível nos `Button` novos |
| T4 | Chunk > 500 kB no build (Pixi + Blockly) | Baixa | `ChallengePage` já carrega Pixi eager; `React.lazy` na rota (como nos mini jogos) tiraria isso do bundle inicial |
| T5 | Teste e2e do fluxo aluno (login → desafio → Executar) | Média | Hoje só unitário/integração de componente; um fluxo e2e pegaria regressões de integração (ex.: a troca de botões de DS1) |
| T6 | Migrations antigas ainda contêm emoji | Baixa | É histórico imutável; o banco novo termina limpo pela migration de limpeza. Só vale mexer se alguém reclamar do diff |
| T7 | `WaterStateChallengePage` e `ChallengePage` duplicam muito (predição, step, avançar, autosave) | Média | Extrair hook/componente comum (`usePrimmStage`, `<PredictChoice>`) reduziria divergência futura — agora que as duas usam o mesmo barril, é mais barato |

## Melhorias no que já existe

Achados na revisão do código atual (nada disto muda comportamento de
produto; são correções e consolidações). Parte pode já estar mapeada nas
issues DS12–DS25 do GitHub — conferir lá antes de abrir de novo.

| ID | Melhoria | Prioridade | Evidência / notas |
|---|---|---|---|
| M1 | **`--color-text-muted` não existe**, mas 18 usos em CSS caem num hex fixo (`#5a6472`) | Alta | O hex não acompanha o alto contraste: texto secundário fica cinza sobre fundo preto, justamente no modo pensado para baixa visão (RQ4 acessibilidade, 26,09%). Já há `.u-text-muted` (opacidade sobre `--color-text`) e `Text tone="muted"`; migrar os 18 usos (formulário de template, `WaterStateTransition`, `GuidedTour`...) ou definir o token nos dois temas |
| M2 | **Botão de fechar do `Toast` com 32px**, abaixo de `--hit-area-min` (56px) | Alta | Contradiz a regra de coordenação motora fina (RQ4, 21,74%) que o resto do design system respeita. Usado em `TemplateChallengeForm` |
| M3 | **Dois `<h1>` em `RoleSelect`** (a logo é envolvida em `h1` e "Quem é você?" é outro) | Média | Leitor de tela anuncia dois títulos principais na primeira tela do produto. A logo deve ser `img` solta (ou `header`) e o único `h1` o título |
| M4 | ~18 `style={{ ... }}` inline, a maioria `marginLeft: '12px'` em botões de linha (`AdminUsers`, `AdminSchools`...) | Média | Existe `theme/utilities.css` (`.u-ml-*`, `.u-flex`, `.u-gap-*`) justamente para isso. Melhor ainda: um container `flex` com `gap` em vez de margem em cada botão |
| M5 | **Sem Error Boundary**: um erro de render derruba a tela inteira em branco | Média | Para um público com sensibilidade a surpresa, tela branca é o pior desfecho. Boundary na raiz com mensagem descritiva e reversível ("Algo não carregou. Quer tentar de novo?") + botão de recarregar; registrar o erro como evento RD-E |
| M6 | Arquivos grandes: `ChallengePage` (869 linhas), `WaterStateChallengePage` (722), `WorkToolsGamePage` (578), `TeacherMetrics` (496), `AdminUsers` (480) | Média | Já mapeado em T7 para as duas primeiras. Nas demais, extrair subcomponentes (`AdminUsers`: diálogos de consentimento/reset; `TeacherMetrics`: as 3 abas) e hooks de estado |
| M7 | `logo-tea.jpg` usado em 2 telas (JPEG, fundo sólido) | Baixa | Em tema de alto contraste (fundo preto) o retângulo claro do JPEG aparece. Versão SVG/PNG transparente resolve e pesa menos |
| M8 | Teste com `TODO` aberto em `TeacherChallengeNew.spec.tsx` (Radix Dialog modal esconde o resto da página) | Baixa | Cobrir o ponto que ficou de fora, ou documentar por que não dá |
| M9 | Falha de `logEvent` só vai para o `console.warn` | Baixa | Se a API estiver fora do ar, a pesquisa (RQ5, "logar tudo desde o primeiro commit") perde dados sem ninguém notar. Fila local curta (sessionStorage) com reenvio resolve sem expor erro ao aluno |

## Features (alinhadas ao que a plataforma já tem)

| ID | Feature | Prioridade | Justificativa / pré-requisito |
|---|---|---|---|
| F1 | **Controle sensorial na tela de login** (movimento / som / contraste antes de entrar) | Alta | Hipersensibilidade sensorial é 30,43% (RQ4). Hoje o aluno só ajusta **depois** de logar; quem precisa de alto contraste já enfrenta a primeira tela sem ele. É também o que ativa de verdade o evento `sensory_setting_changed_pre_login`. Mesmo componente `ToggleSwitch`; persistir local e reaplicar após o login |
| F2 | **Mais conteúdo curricular**: 2º template de desafio (outra disciplina) e novos tópicos | Alta | Só existe `regular_polygon`. Valida a promessa de "template reutilizável" e dá massa de dados real às métricas |
| F3 | **Par real para "Blocos × jogo" (MJ8)**: tópico de blocos de frações com `conceptId = fractions_equal_parts` | Média | Infra pronta e sem uso. **Depende de conteúdo pedagógico** (enunciado, fases Use/Modify/Create) — precisa de decisão do professor/pesquisador |
| F4 | Visão agregada de tentativas na fase Modify ("combinações de TIMES/ANGLE que você já tentou") | Média | Dado já logado (`challenge_modify_attempt`); falta tela. Reforça Use–Modify–Create (RQ2, 21,74%) e dá ao professor material para a roda de conversa |
| F5 | Ícones por conteúdo no autoral (professor escolhe o ícone do desafio/cenário) | Baixa | Hoje o ícone é derivado da chave (`contentIcons.tsx`). Se professores criarem conteúdo próprio, precisam escolher de um conjunto Lucide curado (nunca texto livre/emoji) |
| F6 | Exportação de relatório para o professor (PDF/CSV da turma) | Média | Só o admin exporta (6.6). Professor leva ao conselho de classe; barreira institucional (17,39%) pede painel sem formação técnica |
| F7 | Instrumento de avaliação de CT (escala validada) integrado ao fluxo | Média | RQ5: ausência de instrumento padronizado (39,13%) é o gap #1 que o software deve viabilizar. A pesquisa pré/pós já tem `survey_responses`; dá para conectar a um instrumento publicado |
| F8 | MJ6 — comparação opt-in entre alunos | Bloqueado | Decisão de produto de 2026-08-24: só reaproveitando a flag #37/#27, que não existe. Reabrir só se a flag for criada |
| F9 | Modo "sala de aula" para o professor (ver quem está travado agora) | Baixa | Exige tempo real (SSE/WebSocket) e cuidado para não virar vigilância individual — risco de colidir com a regra de nunca inferir estado clínico/emocional (regra 7). Só com revisão ética |

## Ordem sugerida

1. **T1** (CI) + **M1/M2/M3** (correções pequenas no que já existe) — baratos e protegem tudo o que já foi feito.
2. **F1** (controle sensorial no login) — fecha o ciclo do evento pré-login e é o maior ganho de acessibilidade imediato.
3. **T2/T3** — limpar warnings e auditar acessibilidade antes de crescer conteúdo.
4. **F2** (2º template) — destrava dados reais; **F3** entra junto se houver conteúdo de frações em blocos.
5. **F4, F6, F7** — valor para professor e pesquisa.
6. **T7, T4, T5** — refatorações quando a próxima mudança funcional tocar essas telas.

## Não prioritário por decisão

- **Rate limit nos logins** (antigo Q1) e mover o `ThrottlerModule` para o `AppModule` (antigo Q2): fora do radar por decisão de 2026-10. Reabrir quando a plataforma for exposta fora de ambiente controlado — o login do aluno (3 imagens) é o mais exposto e `ThrottlerGuard` já está configurado (6.6), então é só repetir o padrão por rota.
- **E-mail** (definição de senha, notificação): fora do escopo agora.
- **F8/F9**: dependem de decisão de produto/ética.
