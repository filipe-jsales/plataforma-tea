# Frontend — `apps/web`

React 18 + TypeScript + Vite. Ver `docs/ai/rules/coding-rule.md` para as
regras de UX sensorial que se aplicam a todo componente novo.

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Editor de blocos | `blockly` + `react-blockly` | Base de facto na literatura de VPEs para TEA; permite restringir toolbox por tela (Use–Modify–Create). |
| Mundo/personagem | `pixi.js` | Renderização 2D leve, controle fino de timing — necessário para permitir desligar animação. |
| Estado global | `zustand` | Menos boilerplate que Redux; um store por domínio (ex.: perfil sensorial) observável por qualquer componente. |
| Tema/sensorial | CSS Variables + `prefers-reduced-motion` + atributos `data-*` no `<html>` | Alterna perfil sensorial em runtime sem recompilar; respeita config do SO por padrão. |

**Nota de compatibilidade:** React está fixado em `^18`, não `19` —
`react-blockly@9` (peer dependency) só suporta React 16–18. Não atualizar o
major do React sem antes checar se `react-blockly` já suporta a versão nova.

## Estrutura atual

```
apps/web/src/
├── theme/sensory-theme.css          # CSS vars + prefers-reduced-motion
├── stores/useSensoryProfileStore.ts # perfil sensorial (motion/som/contraste)
├── App.tsx                           # placeholder de instalação
└── main.tsx                          # importa o tema e inicializa o store
```

## Perfil sensorial (`useSensoryProfileStore`)

Store Zustand com `motionEnabled`, `soundEnabled`, `highContrast` — todos
`false` por padrão (regra não-negociável 1). Qualquer alteração nesse estado
escreve atributos `data-motion` / `data-contrast` / `data-sound` no
`<html>` via `applyToDocument()`. `sensory-theme.css` reage a esses atributos
via seletor `:root[data-motion='full']` etc.

**Ao criar um componente que anima ou toca som:** ler
`useSensoryProfileStore` (ou os atributos `data-*` do `<html>`, se for
CSS puro) antes de decidir animar/tocar — nunca assumir que motion/som estão
ligados.

## Próximos passos (fora do escopo de instalação)

- Roteamento entre áreas Estudante / Professor / Admin.
- Tela de login consumindo `POST /auth/login` (backend ainda não tem esse
  endpoint — ver `docs/ai/modules/backend.md`).
- Editor de blocos com toolbox contextual por desafio (Use–Modify–Create).
- Componente do mundo PixiJS que executa o programa montado no Blockly.
