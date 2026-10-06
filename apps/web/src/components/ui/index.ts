// 3.10/3.11 - barril único do sistema de componentes acessíveis,
// compartilhado pelos 3 módulos (aluno/professor/admin - a diferença entre
// eles é só tema, ver theme/staff-theme.css, nunca fundação de componente).
// Toda tela nova importa daqui (`import { Button, ToggleSwitch } from
// '../../components/ui'`), nunca direto de `@radix-ui/*`/`react-aria` -
// mesmo raciocínio de `lib/logEvent.ts` centralizar o `fetch` de eventos:
// um único lugar pra trocar a biblioteca por baixo sem tocar toda tela.
export { Button, type ButtonProps, type ButtonVariant } from './Button';
export { IconButton, type IconButtonProps } from './IconButton';
export { LinkButton, type LinkButtonProps } from './LinkButton';
export { ToggleSwitch, type ToggleSwitchProps } from './ToggleSwitch';
export { SelectableCard, type SelectableCardProps, type SelectableCardAlign } from './Card';
export { Tabs, type TabsProps, type TabItem } from './Tabs';
export { SegmentedControl, type SegmentedControlProps, type SegmentedControlOption } from './SegmentedControl';
export { Select, type SelectProps, type SelectOption } from './Select';
export { TextField, type TextFieldProps } from './TextField';
export { TextareaField, type TextareaFieldProps } from './TextareaField';
export {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  type TableProps,
} from './Table';
export { Badge, type BadgeProps, type BadgeVariant } from './Badge';
export { Tooltip, type TooltipProps } from './Tooltip';
export { Dialog, DialogCancel, type DialogProps } from './Dialog';
export { Heading, type HeadingProps, type HeadingLevel } from './Heading';
export { Text, type TextProps, type TextTone, type TextSize } from './Text';
export { InlineFeedback, type InlineFeedbackProps, type FeedbackKind } from './InlineFeedback';
export { Toast, type ToastProps } from './Toast';
export { GuidedTour, type GuidedTourProps, type GuidedTourStep } from './GuidedTour';
export { LikertScaleField, type LikertScaleFieldProps, LIKERT_SCALE_OPTIONS } from './LikertScaleField';
export { Slider, type SliderProps } from './Slider';
export { VisuallyHidden } from './VisuallyHidden';
