import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui';
import './AppHeader.css';

export interface AppHeaderProps {
  onOpenSidebar: () => void;
}

// Header global (todas as telas autenticadas, ver RequireAuth/AppLayout).
// Botão do menu é ícone + texto ("Menu"), nunca só o ícone de hambúrguer -
// mesma regra de rotulagem redundante de qualquer outro `Button`
// (coding-rule.md, RQ4 acessibilidade de interface 26,09%).
export function AppHeader({ onOpenSidebar }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Link to="/home" className="app-header__brand">
        <img src="/logo-tea.jpg" alt="Plataforma TEA" className="app-header__logo" />
      </Link>
      <Button variant="ghost" icon={<Menu color="currentColor" strokeWidth={1.75} />} onClick={onOpenSidebar}>
        Menu
      </Button>
    </header>
  );
}
