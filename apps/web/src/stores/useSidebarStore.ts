import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  // Só vale no desktop (>= 1024px): true = mini-sidebar só com ícones.
  // No mobile a sidebar é drawer e o aberto/fechado vive em AppLayout.
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

// Preferência de navegador (localStorage), não dado de negócio: mesmo
// raciocínio de useGuidedTourStore. Nasce expandida.
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    { name: 'plataforma-tea-sidebar' },
  ),
);
