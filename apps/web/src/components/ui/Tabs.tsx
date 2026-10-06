import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import './Tabs.css';

export interface TabItem {
  value: string;
  label: ReactNode;
  // Decorativo - nunca substitui `label`.
  icon?: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
}

// 3.10 - base pra telas com mais de uma visão sobre o mesmo dado (ex.:
// TeacherMetrics "Por aluno"/"Turma toda", hoje 2 botões manuais alternando
// estado - candidato futuro de migração, não feito automaticamente aqui,
// ver nota de débito em frontend.md). Radix Tabs cobre teclado (setas
// esquerda/direita movem entre abas, Home/End vão pra primeira/última) de
// graça - comportamento que 2 <button>s soltos nunca teriam sem
// reimplementar isso na mão.
export function Tabs({ items, value, onValueChange, ariaLabel }: TabsProps) {
  return (
    <TabsPrimitive.Root className="ui-tabs" value={value} onValueChange={onValueChange}>
      <TabsPrimitive.List className="ui-tabs__list" aria-label={ariaLabel}>
        {items.map((item) => (
          <TabsPrimitive.Trigger key={item.value} value={item.value} className="ui-tabs__trigger">
            {item.icon && (
              <span className="ui-tabs__icon" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content key={item.value} value={item.value} className="ui-tabs__content">
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
