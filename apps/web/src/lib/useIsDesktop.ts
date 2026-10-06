import { useSyncExternalStore } from 'react';

// Largura a partir da qual a sidebar deixa de ser drawer (mobile/tablet) e
// vira um painel fixo recolhível (desktop/notebook).
export const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const query = window.matchMedia(DESKTOP_MEDIA_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getSnapshot() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

// Sem `matchMedia` (jsdom, SSR) cai no modo drawer: é o comportamento
// seguro para telas pequenas e o que os testes sempre exercitaram.
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
