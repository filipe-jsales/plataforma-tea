// 3.10 — barril único do sistema de componentes acessíveis do aluno. Toda
// tela nova importa daqui (`import { Button, ToggleSwitch } from
// '../../components/ui'`), nunca direto de `@radix-ui/*`/`react-aria` —
// mesmo raciocínio de `lib/logEvent.ts` centralizar o `fetch` de eventos:
// um único lugar pra trocar a biblioteca por baixo sem tocar toda tela.
export { Button, type ButtonProps, type ButtonVariant } from './Button';
export { ToggleSwitch, type ToggleSwitchProps } from './ToggleSwitch';
export { SelectableCard, type SelectableCardProps } from './Card';
export { Tabs, type TabsProps, type TabItem } from './Tabs';
export { Tooltip, type TooltipProps } from './Tooltip';
export { Dialog, type DialogProps } from './Dialog';
export { Heading, type HeadingProps, type HeadingLevel } from './Heading';
export { Text, type TextProps, type TextTone, type TextSize } from './Text';
export { InlineFeedback, type InlineFeedbackProps, type FeedbackKind } from './InlineFeedback';
export { VisuallyHidden } from './VisuallyHidden';
