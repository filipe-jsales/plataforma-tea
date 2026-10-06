import { useAuthStore } from '../../stores/useAuthStore';
import { SidebarNav } from './SidebarNav';
import './AppSidebar.css';

export interface AppSidebarDesktopProps {
  collapsed: boolean;
}

// Sidebar fixa do desktop/notebook (>= 1024px): fica ao lado do conteúdo,
// sem overlay, e empurra a área de trabalho. Expandida (~256px) ou
// compacta (~64px, só ícones); quem alterna é o hambúrguer do AppHeader
// (useSidebarStore). Não é portal, então herda `.staff-theme` do AppLayout.
export function AppSidebarDesktop({ collapsed }: AppSidebarDesktopProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return (
    <aside
      id="app-sidebar-desktop"
      className={['app-sidebar-desktop', collapsed ? 'app-sidebar--compact' : ''].filter(Boolean).join(' ')}
    >
      <SidebarNav compact={collapsed} />
    </aside>
  );
}
