// AC2 - miniatura inline do efeito do parâmetro "número de lados": SVG puro
// (mesmo padrão zero-dependência de components/charts/), sem Blockly/Pixi
// envolvido - é só geometria simples, atualiza em tempo real conforme o
// professor muda o valor no campo (nunca um par estático "4 vs 6", a
// prévia É o valor atual, o que demonstra o efeito de forma mais direta).
interface PolygonPreviewIconProps {
  sides: number;
  size?: number;
}

export function PolygonPreviewIcon({ sides, size = 56 }: PolygonPreviewIconProps) {
  const safeSides = Number.isInteger(sides) && sides >= 3 ? sides : 3;
  const center = size / 2;
  const radius = size / 2 - 4;
  const points = Array.from({ length: safeSides }, (_, index) => {
    const angle = (Math.PI * 2 * index) / safeSides - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg
      className="template-preview-icon"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Prévia: figura com ${sides} lados`}
    >
      <polygon points={points} fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="round" />
    </svg>
  );
}
