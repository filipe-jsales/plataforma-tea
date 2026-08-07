import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem isto, o DOM de um teste com render() vaza pro próximo dentro do mesmo
// arquivo (múltiplos <body> acumulados) — pega qualquer teste de componente
// novo de surpresa. @testing-library/react não faz isso sozinho fora de
// Jest; em Vitest precisa ser registrado explicitamente.
afterEach(() => {
  cleanup();
});

// jsdom não implementa ResizeObserver — @radix-ui/react-popper (usado por
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
