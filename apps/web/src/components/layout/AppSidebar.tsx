import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { IconButton } from '../ui';
import { SidebarNav } from './SidebarNav';
import './AppSidebar.css';

export interface AppSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Drawer de navegação (mobile e tablet, < 1024px), aberto pelo hambúrguer
// do AppHeader: desliza pela ESQUERDA com overlay escurecido. No desktop a
// navegação é a `AppSidebarDesktop` (fixa e recolhível), os itens vêm do
// mesmo `SidebarNav`. É um Radix Dialog (foco preso, Esc fecha, clique no
// overlay fecha), nunca o `Dialog` genérico de components/ui, que é de
// confirmação.
//
// Portal do Radix renderiza fora de `.app-layout` (direto em `document.
// body`) - por isso o tema staff é aplicado de novo AQUI, direto na raiz do
// conteúdo, e não herdado da classe `.staff-theme` do AppLayout.
export function AppSidebar({ open, onOpenChange }: AppSidebarProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  const isStaff = user.role !== 'student';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="app-sidebar__overlay" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={['app-sidebar__content', isStaff ? 'staff-theme' : ''].filter(Boolean).join(' ')}
        >
          <div className="app-sidebar__header">
            <DialogPrimitive.Title className="app-sidebar__title">Menu</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <IconButton label="Fechar" icon={<X strokeWidth={2} />} />
            </DialogPrimitive.Close>
          </div>

          <SidebarNav onNavigate={() => onOpenChange(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
