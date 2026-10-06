import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  ChartLine,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Laptop,
  LogOut,
  Plus,
  Puzzle,
  Settings,
  UserGroup,
} from 'lucide-react';
import { CONTENT_CATEGORY_STUDENT_LABEL } from '../../lib/contentCategory';
import { performLogout } from '../../lib/logout';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button, LinkButton, Tooltip } from '../ui';

export interface SidebarNavProps {
  // Mini-sidebar: só ícones (o texto continua no DOM, escondido, e o
  // Tooltip mostra o nome). Nunca só ícone sem nome acessível.
  compact?: boolean;
  // Chamado antes de navegar/sair; o drawer usa para se fechar.
  onNavigate?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const ICON_PROPS = { color: 'currentColor', strokeWidth: 1.75 } as const;

function mainItems(role: string): NavItem[] {
  if (role === 'teacher') {
    return [
      { to: '/teacher/students/new', label: 'Adicionar aluno', icon: <Plus {...ICON_PROPS} /> },
      { to: '/teacher/students', label: 'Meus alunos', icon: <UserGroup {...ICON_PROPS} /> },
      { to: '/teacher/metrics', label: 'Painel da turma', icon: <ChartLine {...ICON_PROPS} /> },
      { to: '/teacher/challenges', label: 'Meus desafios', icon: <Puzzle {...ICON_PROPS} /> },
      { to: '/teacher/minigames', label: 'Mini jogo', icon: <Gamepad2 {...ICON_PROPS} /> },
    ];
  }
  return [];
}

function accountItems(role: string): NavItem[] {
  if (role === 'student') {
    return [{ to: '/settings/sensory', label: 'Configurações', icon: <Settings {...ICON_PROPS} /> }];
  }
  if (role === 'admin') {
    return [{ to: '/admin/settings', label: 'Configurações', icon: <Settings {...ICON_PROPS} /> }];
  }
  return [];
}

// Entre itens que casam com a rota atual (ex.: /teacher/students e
// /teacher/students/new), só o mais específico fica ativo.
function findActiveTo(items: NavItem[], pathname: string): string | null {
  const matches = items
    .map((item) => item.to)
    .filter((to) => pathname === to || pathname.startsWith(`${to}/`));
  if (matches.length === 0) return null;
  return matches.reduce((best, current) => (current.length > best.length ? current : best));
}

// Navegação compartilhada pelo drawer (mobile/tablet) e pela sidebar fixa
// (desktop): mesmos itens por papel, mesma lógica de "Sair".
export function SidebarNav({ compact = false, onNavigate }: SidebarNavProps) {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [subjectsExpanded, setSubjectsExpanded] = useState(false);

  if (!user) return null;

  const currentUser = user;
  const main = mainItems(currentUser.role);
  const account = accountItems(currentUser.role);
  const isStudent = currentUser.role === 'student';
  const activeTo = findActiveTo(
    [...main, ...account, ...(isStudent ? [{ to: '/subjects', label: '', icon: null }] : [])],
    pathname,
  );

  function handleNavigate() {
    onNavigate?.();
  }

  function handleLogout() {
    onNavigate?.();
    performLogout(currentUser);
    navigate('/login', { replace: true });
  }

  function renderLink(item: NavItem) {
    const active = activeTo === item.to;
    const link = (
      <LinkButton
        key={item.to}
        to={item.to}
        variant="ghost"
        icon={item.icon}
        className={['app-sidebar__item', active ? 'app-sidebar__item--active' : ''].filter(Boolean).join(' ')}
        aria-current={active ? 'page' : undefined}
        onClick={handleNavigate}
      >
        {item.label}
      </LinkButton>
    );
    return compact ? (
      <Tooltip key={item.to} content={item.label}>
        {link}
      </Tooltip>
    ) : (
      link
    );
  }

  const subjectsActive = activeTo === '/subjects';

  return (
    <>
      <nav className="app-sidebar__nav" aria-label="Menu principal">
        {isStudent &&
          (compact ? (
            <Tooltip content="Matérias">
              <LinkButton
                to="/subjects"
                variant="ghost"
                icon={<BookOpenCheck {...ICON_PROPS} />}
                className={['app-sidebar__item', subjectsActive ? 'app-sidebar__item--active' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-current={subjectsActive ? 'page' : undefined}
                onClick={handleNavigate}
              >
                Matérias
              </LinkButton>
            </Tooltip>
          ) : (
            <div className="app-sidebar__group">
              <Button
                variant="ghost"
                className="app-sidebar__item app-sidebar__group-toggle"
                icon={
                  subjectsExpanded ? <ChevronUp {...ICON_PROPS} /> : <ChevronDown {...ICON_PROPS} />
                }
                onClick={() => setSubjectsExpanded((value) => !value)}
                aria-expanded={subjectsExpanded}
              >
                Matérias
              </Button>
              {subjectsExpanded && (
                <div className="app-sidebar__group-items">
                  <LinkButton
                    to="/subjects"
                    variant="ghost"
                    icon={<BookOpenCheck {...ICON_PROPS} />}
                    className="app-sidebar__item"
                    onClick={handleNavigate}
                  >
                    {CONTENT_CATEGORY_STUDENT_LABEL.informatica_educacional}
                  </LinkButton>
                  <LinkButton
                    to="/subjects"
                    variant="ghost"
                    icon={<Laptop {...ICON_PROPS} />}
                    className="app-sidebar__item"
                    onClick={handleNavigate}
                  >
                    {CONTENT_CATEGORY_STUDENT_LABEL.educacao_computacao}
                  </LinkButton>
                </div>
              )}
            </div>
          ))}

        {main.map(renderLink)}

        {main.length + (isStudent ? 1 : 0) > 0 && account.length > 0 && (
          <div className="app-sidebar__divider" role="presentation">
            <span className="app-sidebar__divider-label">Conta</span>
          </div>
        )}

        {account.map(renderLink)}
      </nav>

      {compact ? (
        <Tooltip content="Sair">
          <Button
            variant="secondary"
            className="app-sidebar__logout"
            icon={<LogOut {...ICON_PROPS} />}
            onClick={handleLogout}
          >
            Sair
          </Button>
        </Tooltip>
      ) : (
        <Button
          variant="secondary"
          className="app-sidebar__logout"
          icon={<LogOut {...ICON_PROPS} />}
          onClick={handleLogout}
        >
          Sair
        </Button>
      )}
    </>
  );
}
