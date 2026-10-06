import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  X,
} from 'lucide-react';
import { CONTENT_CATEGORY_STUDENT_LABEL } from '../../lib/contentCategory';
import { performLogout } from '../../lib/logout';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button, LinkButton } from '../ui';
import './AppSidebar.css';

export interface AppSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Sidebar global, aberta pelo hambúrguer do AppHeader - abre pela DIREITA
// (`AppSidebar.css`), nunca centralizada como o `Dialog` genérico de
// components/ui (aquele é pra confirmação, este é navegação persistente).
// Configurações/Sair vivem aqui pros 3 papéis (ver docs/ai/persona.md -
// pedido explícito do usuário: layout global, "Sair" sempre no rodapé da
// sidebar).
//
// Portal do Radix renderiza fora de `.app-layout` (direto em `document.
// body`) - por isso o tema staff é aplicado de novo AQUI, direto na raiz do
// conteúdo, e não herdado da classe `.staff-theme` do AppLayout (que não
// alcançaria este nó via CSS, já que ele não é descendente no DOM real).
export function AppSidebar({ open, onOpenChange }: AppSidebarProps) {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [subjectsExpanded, setSubjectsExpanded] = useState(false);

  if (!user) return null;

  const currentUser = user;
  const isStaff = currentUser.role !== 'student';

  function handleNavigate() {
    onOpenChange(false);
  }

  function handleLogout() {
    onOpenChange(false);
    performLogout(currentUser);
    navigate('/login', { replace: true });
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="app-sidebar__overlay" />
        <DialogPrimitive.Content
          className={['app-sidebar__content', isStaff ? 'staff-theme' : ''].filter(Boolean).join(' ')}
        > 
          <div className="app-sidebar__header">
            <DialogPrimitive.Title className="app-sidebar__title">Menu</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" className="">
                <span aria-hidden="true"></span>
                {<X /> }
              </Button>
            </DialogPrimitive.Close>
          </div>

          <nav className="app-sidebar__nav" aria-label="Menu principal">
            {user.role === 'student' && (
              <>
                <LinkButton
                  to="/settings/sensory"
                  variant="secondary"
                  icon={<Settings color="currentColor" strokeWidth={1.75} />}
                  onClick={handleNavigate}
                >
                  Configurações
                </LinkButton>

                <div className="app-sidebar__group">
                  <Button
                    variant="ghost"
                    className="app-sidebar__group-toggle"
                    icon={
                      subjectsExpanded ? (
                        <ChevronUp color="currentColor" strokeWidth={1.75} />
                      ) : (
                        <ChevronDown color="currentColor" strokeWidth={1.75} />
                      )
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
                        variant="secondary"
                        icon={<BookOpenCheck color="currentColor" strokeWidth={1.75} />}
                        onClick={handleNavigate}
                      >
                        {CONTENT_CATEGORY_STUDENT_LABEL.informatica_educacional}
                      </LinkButton>
                      <LinkButton
                        to="/subjects"
                        variant="secondary"
                        icon={<Laptop color="currentColor" strokeWidth={1.75} />}
                        onClick={handleNavigate}
                      >
                        {CONTENT_CATEGORY_STUDENT_LABEL.educacao_computacao}
                      </LinkButton>
                    </div>
                  )}
                </div>
              </>
            )}

            {user.role === 'teacher' && (
              <>
                <LinkButton to="/teacher/students/new" icon={<Plus />} onClick={handleNavigate}>
                  Adicionar aluno
                </LinkButton>
                <LinkButton to="/teacher/students" icon={<UserGroup />} onClick={handleNavigate}>
                  Meus alunos
                </LinkButton>
                <LinkButton to="/teacher/metrics" icon={<ChartLine />} onClick={handleNavigate}>
                  Painel da turma
                </LinkButton>
                <LinkButton to="/teacher/challenges" icon={<Puzzle />} onClick={handleNavigate}>
                  Meus desafios
                </LinkButton>
                <LinkButton to="/teacher/minigames" icon={<Gamepad2 />} onClick={handleNavigate}>
                  Mini jogo
                </LinkButton>
              </>
            )}

            {user.role === 'admin' && (
              <LinkButton to="/admin/settings" icon={<Settings />} onClick={handleNavigate}>
                Configurações
              </LinkButton>
            )}
          </nav>

          <Button variant="secondary" className="app-sidebar__logout" icon={<LogOut />} onClick={handleLogout}>
            Sair
          </Button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
