import * as SelectPrimitive from '@radix-ui/react-select';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id?: string;
  label: string;
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

// 3.11 — "Ordenar por"/"Desafio" deixam de ser <select> nativo sem estilo
// (AC "estilizado de forma consistente com o resto dos inputs da
// plataforma") e passam a usar @radix-ui/react-select — mesma base
// headless já adotada em 3.10, não uma lib nova. `label` é sempre visível
// (nunca só placeholder — rotulagem redundante, mesma regra de todo
// componente em components/ui/).
export function Select({ id, label, options, value, onValueChange, placeholder }: SelectProps) {
  return (
    <label className="ui-select-field" htmlFor={id}>
      <span className="ui-select-field__label">{label}</span>
      <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
        <SelectPrimitive.Trigger id={id} className="ui-select__trigger" aria-label={label}>
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="ui-select__icon" aria-hidden="true">
            ▾
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="ui-select__content" position="popper" sideOffset={4}>
            <SelectPrimitive.Viewport>
              {options.map((option) => (
                <SelectPrimitive.Item key={option.value} value={option.value} className="ui-select__item">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="ui-select__item-indicator" aria-hidden="true">
                    ✓
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </label>
  );
}
