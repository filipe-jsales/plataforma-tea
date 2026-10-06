import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import type { ReactNode } from 'react';
import './SegmentedControl.css';

export interface SegmentedControlOption {
  value: string;
  label: ReactNode;
  // Decorativo - nunca substitui `label`.
  icon?: ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
}

// 3.11 - substitui o padrão "2 <button> soltos com estilos diferentes um do
// outro" (ex.: TeacherMetrics "Por aluno"/"Turma toda", que hoje é 2
// <button role="tab"> reimplementando manualmente teclado/estado ativo) por
// um primitivo de verdade: @radix-ui/react-toggle-group em modo `single`
// com `rovingFocus` - teclado (setas movem entre opções) e seleção
// exclusiva vêm da lib, não de `aria-selected` calculado à mão em cada
// tela. `type="single"` + `onValueChange` que ignora string vazia impede
// des-selecionar tudo (o Toggle Group nativo permite ficar sem nenhuma
// opção ativa ao clicar de novo na selecionada - aqui isso não faz sentido,
// sempre existe uma visão ativa).
export function SegmentedControl({ options, value, onValueChange, ariaLabel }: SegmentedControlProps) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      className="ui-segmented"
      aria-label={ariaLabel}
      value={value}
      onValueChange={(next: string) => {
        if (next) onValueChange(next);
      }}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item key={option.value} value={option.value} className="ui-segmented__item">
          {option.icon && (
            <span className="ui-segmented__icon" aria-hidden="true">
              {option.icon}
            </span>
          )}
          <span>{option.label}</span>
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
