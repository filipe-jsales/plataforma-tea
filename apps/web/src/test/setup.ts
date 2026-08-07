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
