import type { ReactNode } from 'react';
import {
  Blocks,
  ClipboardList,
  Factory,
  FolderKanban,
  Image,
  Lightbulb,
  Network,
  Pentagon,
  Printer,
  Puzzle,
  Ruler,
  Shapes,
  Sprout,
  Table,
  Target,
  Tractor,
  Triangle,
  Wallet,
  Magnet,
  Search,
  type LucideIcon,
} from 'lucide-react';

// O backend não envia mais emoji (o design system não os usa): `icon` vem
// vazio e o glifo é escolhido aqui, por chave estável (template.key,
// parameter.key, scenario/tool id) - mesmo vocabulário de ícones Lucide do
// resto do app, decorativo (quem renderiza já põe aria-hidden).
const ICONS: Record<string, LucideIcon> = {
  // Templates de desafio
  regular_polygon: Pentagon,
  // Parâmetros do formulário guiado
  sides: Triangle,
  turnAngleDeg: Ruler,
  snapTolerancePercent: Magnet,
  enabledBlockTypes: Puzzle,
  closureTolerancePx: Target,
  blockSize: Search,
  // Mini jogo "Ferramentas do Mundo do Trabalho"
  's-3d-print': Factory,
  's-project-mgmt': FolderKanban,
  's-tractor': Sprout,
  's-mindmap': Lightbulb,
  's-spreadsheet': Wallet,
  't-3d-printer': Printer,
  't-project-tool': ClipboardList,
  't-tractor': Tractor,
  't-mindmap-tool': Network,
  't-spreadsheet': Table,
  't-graphic-editor': Image,
};

export function contentIcon(key: string | undefined): ReactNode {
  const Icon = (key && ICONS[key]) || (key ? Shapes : Blocks);
  return <Icon />;
}
