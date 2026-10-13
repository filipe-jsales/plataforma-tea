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
| M1 ✅ | **`--color-text-muted` não existe**, mas 18 usos em CSS caem num hex fixo (`#5a6472`) | Alta | O hex não acompanha o alto contraste: texto secundário fica cinza sobre fundo preto, justamente no modo pensado para baixa visão (RQ4 acessibilidade, 26,09%). Já há `.u-text-muted` (opacidade sobre `--color-text`) e `Text tone="muted"`; migrar os 18 usos (formulário de template, `WaterStateTransition`, `GuidedTour`...) ou definir o token nos dois temas |
| M2 ✅ | **Botão de fechar do `Toast` com 32px**, abaixo de `--hit-area-min` (56px) | Alta | Contradiz a regra de coordenação motora fina (RQ4, 21,74%) que o resto do design system respeita. Usado em `TemplateChallengeForm` |
| M3 ✅ | **Dois `<h1>` em `RoleSelect`** (a logo é envolvida em `h1` e "Quem é você?" é outro) | Média | Leitor de tela anuncia dois títulos principais na primeira tela do produto. A logo deve ser `img` solta (ou `header`) e o único `h1` o título |
| M4 | ~18 `style={{ ... }}` inline, a maioria `marginLeft: '12px'` em botões de linha (`AdminUsers`, `AdminSchools`...) | Média | Existe `theme/utilities.css` (`.u-ml-*`, `.u-flex`, `.u-gap-*`) justamente para isso. Melhor ainda: um container `flex` com `gap` em vez de margem em cada botão |
| M5 | **Sem Error Boundary**: um erro de render derruba a tela inteira em branco | Média | Para um público com sensibilidade a surpresa, tela branca é o pior desfecho. Boundary na raiz com mensagem descritiva e reversível ("Algo não carregou. Quer tentar de novo?") + botão de recarregar; registrar o erro como evento RD-E |
| M6 | Arquivos grandes: `ChallengePage` (869 linhas), `WaterStateChallengePage` (722), `WorkToolsGamePage` (578), `TeacherMetrics` (496), `AdminUsers` (480) | Média | Já mapeado em T7 para as duas primeiras. Nas demais, extrair subcomponentes (`AdminUsers`: diálogos de consentimento/reset; `TeacherMetrics`: as 3 abas) e hooks de estado |
| M7 | `logo-tea.jpg` usado em 2 telas (JPEG, fundo sólido) | Baixa | Em tema de alto contraste (fundo preto) o retângulo claro do JPEG aparece. Versão SVG/PNG transparente resolve e pesa menos |
| M8 | Teste com `TODO` aberto em `TeacherChallengeNew.spec.tsx` (Radix Dialog modal esconde o resto da página) | Baixa | Cobrir o ponto que ficou de fora, ou documentar por que não dá |
| M9 | Falha de `logEvent` só vai para o `console.warn` | Baixa | Se a API estiver fora do ar, a pesquisa (RQ5, "logar tudo desde o primeiro commit") perde dados sem ninguém notar. Fila local curta (sessionStorage) com reenvio resolve sem expor erro ao aluno |

### Achados da segunda varredura (2026-10-13)

| ID | Melhoria | Prioridade | Evidência / notas |
|---|---|---|---|
| M10 | **Alvos de toque < `--hit-area-min` na tela de login do aluno**: `StudentLogin.css` tem submit com `min-height: 48px` e `.student-login__link` com `min-height: 44px` | Alta | É a tela do aluno com TEA antes de qualquer ajuste sensorial (ver F1). Trocar por `var(--hit-area-min)` ou migrar para `Button`/`LinkButton`. `.student-login__link` ainda usa `text-decoration: underline` e botão cru, fora do design system |
| M11 | `ToggleSwitch` com trilho de 48x28px | Média | O `min-height` do wrapper é 56px, mas o controle em si é menor. Conferir se a área clicável é o wrapper inteiro (label) |
| M12 | **Sem `aria-live` / `role="status"` em quase nenhuma tela** (só `InlineFeedback`, `Toast`, `TextField`, `WaterStateTransition`) | Média | Resultado de Executar, troca de fase Use/Modify/Create e erros de carregamento nas telas de professor/admin não são anunciados a leitor de tela. Entra na auditoria T3 |
| M13 | Ainda há 18 `style={{}}` inline em 10 arquivos | Baixa | Já em M4; contagem atualizada. `GuidedTour.tsx` (2) vale checar, pois posiciona dinamicamente |
| M14 | Sem `.github/` no repo | Alta | Confirma T1: não há workflow nenhum. Primeiro passo mínimo: um job com `npm ci`, `tsc`, `oxlint`, jest e vitest |
| M15 | Avatar de 28px (`TeacherStudents`) e 48px (`TeacherAddStudent`) | Baixa | Se for decorativo, ok. Se for clicável, viola a regra de 56px |

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

### Features novas (varredura de 2026-10-13)

| ID | Feature | Prioridade | Justificativa |
|---|---|---|---|
| F10 | **Lembrar preferência sensorial por dispositivo** (aplicar `data-motion`/`data-contrast`/`data-sound` já no carregamento, antes do login) | Alta | É a base técnica de F1; sem isso o toggle do login não persiste |
| F11 | Previsibilidade de transição: aviso antes de trocar de fase/tela ("Agora vem a fase Modify") | Média | Previsibilidade/aviso prévio de mudança (RQ4). Hoje a troca é direta |
| F12 | Página de erro 404/403 descritiva e reversível (junto de M5) | Média | Rota inexistente ou sem permissão não deve ser tela vazia |

### Mais features e melhorias (varredura de 2026-10-13, 2ª rodada)

Itens que nascem de lacunas já escritas em `backend.md`/`frontend.md` ou de
barreiras de RQ4 sem nenhum controle no código hoje (buscado: não há
tamanho de texto, leitura em voz alta nem pausa).

| ID | Item | Prioridade | Justificativa / notas |
|---|---|---|---|
| F13 ✅ | **Professor autorar desafio de fase Modify via template** | Média | Gap explícito em `backend.md` (`buildChallengeConfig` sempre gera `stage: 'create'`). Hoje o professor só cria a fase final do ciclo Use-Modify-Create (RQ2, 21,74%). A capacidade de dado (`EditableFieldConfig.min/max`) já existe; falta a tela |
| F14 | **Botão "preciso de uma pausa"** sempre visível no desafio, sem penalidade, que congela a tela e volta de onde parou | Alta | Hipersensibilidade (30,43%) e ansiedade (13,04%). Logar `break_requested`/`break_ended` como RD-E **só com duração**, nunca interpretar o motivo (regra 7) |
| F15 ✅ | **Tamanho/espaçamento de texto ajustável** no perfil sensorial (3 níveis) | Média | Acessibilidade de interface (26,09%). Hoje o perfil controla só movimento/som/contraste. Tokens de fonte já existem, então é mais um `data-*` |
| F16 ✅ | **Leitura do enunciado em voz alta (opt-in)** via `speechSynthesis` do navegador | Média | Sem dependência nova. Nasce desligado (regra 1) e respeita `data-sound`. Reduz sobrecarga de leitura (39,13%) |
| F17 ✅ | **Agenda visual da sessão** ("hoje: 1. Use  2. Modify  3. Create") com o passo atual marcado | Média | TEACCH é o modelo mais citado (39,13%). Mostrar etapas feitas e a seguir, **sem contagem regressiva nem tempo** (regra 5). Dá previsibilidade, e F11 vira o aviso entre etapas |
| F18 ✅ | **Dica em degraus** na Ajuda (1ª: pista curta, 2ª: exemplo, 3ª: mostrar) | Média | Hoje a Ajuda é um passo só. Degraus mantêm a autonomia e geram dado (`hint_level_opened`) sobre onde trava, sem culpar o aluno |
| F19 | **Importar alunos por CSV** (professor/admin) | Média | Cadastro um a um é barreira institucional (17,39%). O parser/gerador de CSV já existe no export do admin (`metrics/csv.ts`); falta importação com pré-visualização e relatório de erros por linha |
| F20 | **Progresso do aluno contra o próprio histórico** ("você já fez 3 desafios este mês"), sem comparar com colegas | Média | Regra 5 pede progressão relativa ao próprio histórico; RQ5 aponta falta de estudos longitudinais (34,78%). Os dados já são logados. Conferir antes o que `StudentHome` mostra hoje |
| F21 | **Anotação qualitativa do professor** por aluno/desafio (texto livre curto, privado) | Baixa | Complementa o que o log não captura. Cuidado: aviso na tela de que não é laudo, e nada de campos clínicos (regra 7) |
| F22 | Tela de auditoria para o admin (consulta ao `AuditModule`) | Baixa | Pré-requisito do Q3 (reversão de identidade): quem expôs o quê e quando |
| M16 | Usar `Tooltip` como reforço textual de métricas curtas em `ChallengeReport`/`AdminMetrics` | Baixa | Dá o primeiro uso real ao componente (DS4). Cuidado: tooltip nunca é o único lugar da informação (RQ4) |
| M17 | `TemplateParameterField`: preparar um registro de miniaturas (`visualPreview`) em vez de `case` fixo | Baixa | Só vale quando entrar o 2º template (F2); evita mexer no formulário a cada tipo novo |
| M18 | Guia `/dev/design-system`: adicionar os tokens e estados novos (alvo de 56px do Toast, `.u-text-muted`) e um teste que falha se aparecer `--color-text-muted` ou `<h1>` duplicado | Baixa | Transforma as correções M1-M3 em guarda permanente, como já é feito para emoji (`no-emoji.spec.ts`) |

### Implementado em 2026-10-13 (F13, F15, F16, F17, F18)

| ID | Resultado | Onde está documentado |
|---|---|---|
| F13 | Parâmetro `stage` no template `regular_polygon` ("Montar do zero" / "Mudar um programa pronto") + `visibleWhen` no schema. Em `modify` o handler gera o programa pronto e destrava só lados e ângulo. Migration `AddStageToRegularPolygonTemplate` | `backend.md` ("Autoria da fase Modify pelo professor (F13)"), `database.md` |
| F15 | Tamanho do texto Normal / Grande / Muito grande (`data-font-scale`, 100% / 125% / 150%), escolhido em Configurações, vale na hora e só neste aparelho | `frontend.md` ("Preferências de leitura") |
| F16 | Botão "Ouvir o enunciado" (Web Speech, pt-BR), opt-in próprio, nunca fala sozinho. Evento `challenge.read_aloud_used` | `frontend.md`, `backend.md` (eventos) |
| F17 | `agenda` no detalhe do desafio + `SessionAgenda` (ícone + palavra, sem tempo nem contagem). `null` fora da sequência oficial | `frontend.md` ("Agenda visual da sessão"), `backend.md` |
| F18 | Ajuda em 3 degraus (pista, números, forma), textos derivados do `goal`. `challenge.help_viewed` só no 1º degrau + `challenge.hint_level_opened` | `frontend.md` ("Ajuda em degraus"), `backend.md` |

Decisões e limites que valem lembrar:

- **F15/F16 ficam só no aparelho** (não no perfil do aluno no backend). É
  conveniência de leitura de quem está naquele computador, sem dado de
  pesquisa nem migration. Se a escola quiser que a escolha acompanhe o aluno
  entre computadores, vira coluna em `users` + `PATCH /users/:id/sensory-profile`.
- **F16 não depende de `soundEnabled`**: é acionado pelo aluno a cada vez e
  tem opt-in próprio. Reabrir só se a equipe preferir amarrar os dois.
- **F13 usa os limites inteiros do template** (3-12 lados, 1-359 graus) como
  faixa editável. Uma faixa configurável pelo professor ("só deixar o aluno
  trocar de 3 a 6 lados") é melhoria futura.
- **F18 só vale na fase `create`**, como a Ajuda já era. `use` e `modify`
  continuam sem Ajuda (não há alvo escondido).
- **F17 e F18 não têm escopo em `WaterStateChallengePage`** além da agenda e
  do "Ouvir": a trilha da água nunca teve botão de Ajuda.

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
