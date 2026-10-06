// MJ10 - geometria pura pro traçado da seta que liga um cartão de situação
// a um cartão de ferramenta em WorkToolsGamePage (substitui "só aparece uma
// flag" por uma linha visível entre os dois cartões). Função pura, sem
// DOM/React - o componente só chama `getBoundingClientRect()` e passa os
// retângulos aqui; isso é o que permite testar a matemática sem precisar de
// layout real (jsdom não calcula posição/tamanho de verdade).
export interface ConnectorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ConnectorLinePoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Ancora a linha na borda direita do cartão de origem (situação) e na
// borda esquerda do cartão de destino (ferramenta), ambas no meio vertical
// do cartão - coordenadas relativas ao container que envolve as duas
// colunas (nunca em coordenadas absolutas da viewport, que mudam com
// scroll).
export function computeConnectorLinePoints(
  containerRect: ConnectorRect,
  fromRect: ConnectorRect,
  toRect: ConnectorRect,
): ConnectorLinePoints {
  return {
    x1: fromRect.left + fromRect.width - containerRect.left,
    y1: fromRect.top + fromRect.height / 2 - containerRect.top,
    x2: toRect.left - containerRect.left,
    y2: toRect.top + toRect.height / 2 - containerRect.top,
  };
}
