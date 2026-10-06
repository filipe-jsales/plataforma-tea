import { useState, type ReactNode } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSidebarStore } from '../../stores/useSidebarStore';
import { useIsDesktop } from '../../lib/useIsDesktop';
import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { AppSidebarDesktop } from './AppSidebarDesktop';
import './AppLayout.css';

export interface AppLayoutProps {
  children: ReactNode;
}

// Casca global (header + sidebar + footer) de toda tela autenticada -
// aplicada uma vez em RequireAuth, nunca repetida tela a tela. Abaixo de
// 1024px a navegação é um drawer (AppSidebar); a partir dele é uma sidebar
// fixa e recolhível ao lado do conteúdo (AppSidebarDesktop). `.staff-theme`
// aqui cobre header/sidebar fixa/footer; o drawer reaplica a mesma classe
// direto no seu conteúdo porque o Portal do Radix o desconecta desta
// árvore no DOM real.
export function AppLayout({ children }: AppLayoutProps) {
  const role = useAuthStore((state) => state.user?.role);
  const isDesktop = useIsDesktop();
  const collapsed = useSidebarStore((state) => state.collapsed);
  const toggleCollapsed = useSidebarStore((state) => state.toggleCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isStaff = role != null && role !== 'student';

  function handleToggleMenu() {
    if (isDesktop) {
      toggleCollapsed();
    } else {
      setDrawerOpen(true);
    }
  }

  const menuExpanded = isDesktop ? !collapsed : drawerOpen;
  const menuLabel = isDesktop ? (collapsed ? 'Expandir menu' : 'Recolher menu') : 'Abrir menu';

  return (
    <div className={['app-layout', isStaff ? 'staff-theme' : ''].filter(Boolean).join(' ')}>
      <AppHeader
        onToggleMenu={handleToggleMenu}
        menuExpanded={menuExpanded}
        menuLabel={menuLabel}
        controlsId={isDesktop ? 'app-sidebar-desktop' : undefined}
      />
      <div className="app-layout__body">
        {isDesktop ? (
          <AppSidebarDesktop collapsed={collapsed} />
        ) : (
          <AppSidebar open={drawerOpen} onOpenChange={setDrawerOpen} />
        )}
        <div className="app-layout__content">{children}</div>
      </div>
      <AppFooter />
    </div>
  );
}
