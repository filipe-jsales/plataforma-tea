import { useState, type ReactNode } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import './AppLayout.css';

export interface AppLayoutProps {
  children: ReactNode;
}

// Casca global (header + sidebar direita + footer) de toda tela autenticada
// — aplicada uma vez em RequireAuth, nunca repetida tela a tela. `.staff-
// theme` aqui cobre header/footer (não portados); AppSidebar reaplica a
// mesma classe direto no seu próprio conteúdo porque o Portal do Radix o
// desconecta desta árvore no DOM real.
export function AppLayout({ children }: AppLayoutProps) {
  const role = useAuthStore((state) => state.user?.role);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isStaff = role != null && role !== 'student';

  return (
    <div className={['app-layout', isStaff ? 'staff-theme' : ''].filter(Boolean).join(' ')}>
      <AppHeader onOpenSidebar={() => setSidebarOpen(true)} />
      <AppSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <div className="app-layout__content">{children}</div>
      <AppFooter />
    </div>
  );
}
