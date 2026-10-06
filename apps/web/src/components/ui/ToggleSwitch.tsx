import * as SwitchPrimitive from '@radix-ui/react-switch';
import type { ReactNode } from 'react';
import './ToggleSwitch.css';

export interface ToggleSwitchProps {
  id: string;
  // Decorativo - nunca substitui `label` (AC "rótulo redundante ícone + texto").
  icon?: ReactNode;
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

// 3.10 - configuração sensorial binária (som/animação/contraste). Radix
// Switch cobre o primitivo estrutural (role="switch", aria-checked,
// teclado) headless; o `<label>` externo estende a área de toque pra linha
// inteira (AC "espaçamento/área de toque ampliada"), não só o trilho
// pequeno do switch. O estado NUNCA depende só da posição do trilho/cor -
// `ui-toggle__state` escreve "Ligado"/"Desligado" em texto ao lado (AC
// "nunca só cor pra indicar estado", regra não-negociável 4 aplicada a
// controles, não só a feedback de erro).
export function ToggleSwitch({ id, icon, label, checked, onCheckedChange, disabled }: ToggleSwitchProps) {
  return (
    <label className="ui-toggle" htmlFor={id} data-disabled={disabled ? 'true' : undefined}>
      {icon && (
        <span className="ui-toggle__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="ui-toggle__label">{label}</span>
      <span className="ui-toggle__control">
        <span className="ui-toggle__state" aria-hidden="true">
          {checked ? 'Ligado' : 'Desligado'}
        </span>
        <SwitchPrimitive.Root
          id={id}
          className="ui-toggle__switch"
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        >
          <SwitchPrimitive.Thumb className="ui-toggle__thumb" />
        </SwitchPrimitive.Root>
      </span>
    </label>
  );
}
