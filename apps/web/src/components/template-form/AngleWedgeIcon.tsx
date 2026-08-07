// AC2 — miniatura inline do parâmetro "ângulo de giro": um leque (wedge)
// cuja abertura é o próprio valor em graus — independente do número de
// lados, é o efeito ISOLADO deste campo específico (AC2 exige um exemplo
// visual "daquele parâmetro", não da combinação).
interface AngleWedgeIconProps {
  angleDeg: number;
  size?: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function AngleWedgeIcon({ angleDeg, size = 56 }: AngleWedgeIconProps) {
  const safeAngle = Math.min(Math.max(angleDeg, 1), 359);
  const center = size / 2;
  const radius = size / 2 - 6;
  const startDeg = -90;
  const endDeg = startDeg + safeAngle;
  const start = { x: center + radius * Math.cos(toRad(startDeg)), y: center + radius * Math.sin(toRad(startDeg)) };
  const end = { x: center + radius * Math.cos(toRad(endDeg)), y: center + radius * Math.sin(toRad(endDeg)) };
  const largeArcFlag = safeAngle > 180 ? 1 : 0;
  const wedgePath = [
    `M ${center} ${center}`,
    `L ${start.x.toFixed(1)} ${start.y.toFixed(1)}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
    'Z',
  ].join(' ');

  return (
    <svg
      className="template-preview-icon"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Prévia: ângulo de ${angleDeg} graus`}
    >
      <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={1} />
      <path d={wedgePath} fill="currentColor" fillOpacity={0.35} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}
