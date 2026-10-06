import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem isto, o DOM de um teste com render() vaza pro próximo dentro do mesmo
// arquivo (múltiplos <body> acumulados) - pega qualquer teste de componente
// novo de surpresa. @testing-library/react não faz isso sozinho fora de
// Jest; em Vitest precisa ser registrado explicitamente.
afterEach(() => {
  cleanup();
});

// jsdom não implementa ResizeObserver - @radix-ui/react-popper (usado por
// Tooltip.tsx em components/ui/) mede o elemento ancorado com isso mesmo
// sem nenhum teste chamar posicionamento explicitamente. Stub mínimo, só
// pra satisfazer a chamada; nenhum teste depende do callback disparar.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom não implementa Pointer Events nem scrollIntoView -
// @radix-ui/react-select (Select.tsx, 3.11) chama hasPointerCapture/
// setPointerCapture/releasePointerCapture/scrollIntoView ao abrir/navegar o
// dropdown mesmo em testes que só usam clique/teclado via
// @testing-library/user-event. Sem isto, abrir o Select lança
// TypeError antes de qualquer asserção rodar.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}
