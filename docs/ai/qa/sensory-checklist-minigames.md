# Checklist QA sensorial — mini jogos sérios (MJ2)

Executar antes de qualquer mini jogo novo (ou cena nova dentro de um mini
jogo já existente) entrar em produção. Ver `docs/ai/rules/coding-rule.md`
regra não-negociável 1 e `docs/ai/backlog/mini-jogos-serios.md` → MJ2.

- [ ] Áudio nasce `muted`. Só toca som se
      `useSensoryProfileStore.getState().soundEnabled === true` — testado
      manualmente com o toggle desligado (padrão) e ligado.
- [ ] Nenhum efeito de partícula em nenhum estado da cena, com ou sem o
      perfil sensorial ativado (partícula nunca é opt-in neste produto —
      é sempre ausente).
- [ ] Nenhum tremor de tela (`screen-shake`) em nenhum estado.
- [ ] Nenhum flash/estroboscopia acima de 3Hz. Transições de cor (ex.:
      destacar uma peça entregue) usam fade suave, nunca alternância
      abrupta repetida.
- [ ] Toda animação da cena consulta
      `getSensory().motionEnabled` (via `MiniGameSceneContext`, ver
      `components/minigame/MiniGameEngine.tsx`) antes de animar — com
      `motionEnabled: false` (padrão), o estado final renderiza
      instantaneamente, sem transição.
- [x] **Verificado por código** — `getSensory().motionEnabled` combina o
      toggle da plataforma (Zustand) com `prefers-reduced-motion` do SO
      (`lib/prefersReducedMotion.ts`, testado em
      `prefersReducedMotion.spec.ts`): o SO só pode DESLIGAR animação,
      nunca ligar por cima do toggle desligado. Isto cobre o canvas
      Pixi, que não é afetado pelo `@media (prefers-reduced-motion)`
      já aplicado a toda animação CSS da plataforma
      (`theme/sensory-theme.css`) — os dois juntos fecham o AC "motor
      respeita prefers-reduced-motion automaticamente, sem exigir
      configuração adicional".
- [ ] Nenhum contador regressivo visível, em nenhuma tela do jogo.
- [ ] Nenhuma mecânica exige resposta em menos de N segundos pra
      progredir (MJ4) — timers, se existirem, são só decorativos/
      informativos, nunca bloqueantes.
- [ ] Todo estado relevante (objetivo, "quase lá", concluído) é
      comunicado por ícone + texto, nunca só cor (MJ5) — testado
      desligando a percepção de cor mentalmente ("faria sentido em
      preto e branco?").
- [ ] Roteiro visual (MJ3) aparece antes da cena, com objetivo em
      linguagem simples e marcação de início/fim.
- [x] Testado com `prefers-reduced-motion` do sistema operacional
      ativado, além do toggle da plataforma — os dois devem produzir o
      mesmo resultado (sem animação). Coberto por
      `prefersReducedMotion.spec.ts` (a leitura da preferência) — o
      efeito ponta a ponta (SO ligado → nenhuma animação no canvas,
      mesmo com o toggle da plataforma ligado) ainda vale conferir
      manualmente antes de cada mini jogo novo entrar em produção,
      já que depende de mudar a preferência do SO de verdade.
- [x] Cartões/áreas de interação testados com mouse (clique),
      teclado (Tab + Enter, sem nenhum clique de mouse) e — por
      construção, nunca precisando de código específico — toque
      (mesmos elementos `<button>` nativos/React Aria já usados em
      toda a plataforma, sem handler de touch próprio). Ver
      `CardSequenceEditor.spec.tsx`/`CardBank.spec.tsx` (MJ4).
