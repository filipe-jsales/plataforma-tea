import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IconButton } from '../ui';
import './AppHeader.css';

export interface AppHeaderProps {
  onToggleMenu: () => void;
  // Estado do menu para `aria-expanded`: aberto (drawer) ou expandido (desktop).
  menuExpanded: boolean;
  // Nome acessível do hambúrguer, depende do modo (abrir / recolher).
  menuLabel: string;
  controlsId?: string;
}

// Header global (todas as telas autenticadas, ver RequireAuth/AppLayout).
// O hambúrguer é só ícone (vazado, fundo primary no hover) com nome
// acessível; mobile abre o drawer, desktop alterna a sidebar entre
// expandida e compacta.
export function AppHeader({ onToggleMenu, menuExpanded, menuLabel, controlsId }: AppHeaderProps) {
  return (
    <header className="app-header">
      <IconButton
        label={menuLabel}
        icon={<Menu color="currentColor" strokeWidth={1.75} />}
        aria-expanded={menuExpanded}
        aria-controls={controlsId}
        onClick={onToggleMenu}
      />
      <Link to="/home" className="app-header__brand">
        <img src="/logo-tea.jpg" alt="Plataforma TEA" className="app-header__logo" />
      </Link>
    </header>
  );
}
