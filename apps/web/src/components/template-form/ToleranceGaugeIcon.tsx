// AC2 - miniatura inline do parâmetro "tolerância de encaixe": uma barra
// preenchida proporcionalmente ao percentual, mesma lógica de "quanto mais
// cheia, mais fácil encaixar" que o professor já reconhece de outras
// configurações de acessibilidade (nunca só um número solto).
interface ToleranceGaugeIconProps {
  percent: number;
  width?: number;
  height?: number;
}

export function ToleranceGaugeIcon({ percent, width = 96, height = 20 }: ToleranceGaugeIconProps) {
  const safePercent = Math.min(Math.max(percent, 0), 100);
  const barHeight = height * 0.6;
  const barY = (height - barHeight) / 2;
  const filledWidth = (safePercent / 100) * width;

  return (
    <svg
      className="template-preview-icon"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Prévia: tolerância de encaixe de ${percent}%`}
    >
      <rect
        x={0.5}
        y={barY}
        width={width - 1}
        height={barHeight}
        rx={barHeight / 2}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.4}
        strokeWidth={1.5}
      />
      <rect x={0.5} y={barY} width={Math.max(filledWidth - 1, 0)} height={barHeight} rx={barHeight / 2} fill="currentColor" />
    </svg>
  );
}
