import type { ReactNode } from 'react';
import type { PieceId } from '../../lib/riverCrossing';

export type RiverIconId = PieceId | 'farmer';

export const RIVER_ICON_LABEL: Record<RiverIconId, string> = {
  wolf: 'Lobo',
  sheep: 'Ovelha',
  lettuce: 'Alface',
  dog: 'Cachorro',
  chicken: 'Galinha',
  farmer: 'Fazendeiro',
};

const ART: Record<RiverIconId, ReactNode> = {
  wolf: (
    <>
      <path d="M6 6l9 8h18l9-8 2 20c0 10-8 17-20 17S4 36 4 26z" fill="#7b8794" stroke="#3e4c59" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 11l5 5-4 5zM39 11l-5 5 4 5z" fill="#f4a6b8" />
      <ellipse cx="24" cy="34" rx="9" ry="7" fill="#e4e7eb" />
      <ellipse cx="17" cy="23" rx="3.2" ry="2" fill="#f6c945" />
      <ellipse cx="31" cy="23" rx="3.2" ry="2" fill="#f6c945" />
      <circle cx="17" cy="23" r="1.1" fill="#1f2933" />
      <circle cx="31" cy="23" r="1.1" fill="#1f2933" />
      <ellipse cx="24" cy="30" rx="3" ry="2.2" fill="#1f2933" />
      <path d="M20 37q4 3 8 0" fill="none" stroke="#1f2933" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  sheep: (
    <>
      <g fill="#ffffff" stroke="#9aa5b1" strokeWidth="1.6">
        <circle cx="12" cy="20" r="7" />
        <circle cx="24" cy="13" r="8" />
        <circle cx="36" cy="20" r="7" />
        <circle cx="14" cy="31" r="7" />
        <circle cx="34" cy="31" r="7" />
        <circle cx="24" cy="26" r="10" />
      </g>
      <ellipse cx="24" cy="31" rx="8" ry="9" fill="#52606d" />
      <ellipse cx="14.5" cy="27" rx="4" ry="2.2" fill="#52606d" transform="rotate(-20 14.5 27)" />
      <ellipse cx="33.5" cy="27" rx="4" ry="2.2" fill="#52606d" transform="rotate(20 33.5 27)" />
      <circle cx="20.5" cy="29" r="1.5" fill="#fff" />
      <circle cx="27.5" cy="29" r="1.5" fill="#fff" />
      <ellipse cx="24" cy="36" rx="2.4" ry="1.6" fill="#f4a6b8" />
    </>
  ),
  lettuce: (
    <>
      <ellipse cx="24" cy="26" rx="19" ry="17" fill="#2f9e44" stroke="#1b5e2a" strokeWidth="2" />
      <ellipse cx="14" cy="25" rx="9" ry="13" fill="#51cf66" stroke="#2b8a3e" strokeWidth="1.5" />
      <ellipse cx="34" cy="25" rx="9" ry="13" fill="#51cf66" stroke="#2b8a3e" strokeWidth="1.5" />
      <ellipse cx="24" cy="24" rx="9" ry="14" fill="#94d82d" stroke="#5c940d" strokeWidth="1.5" />
      <path d="M24 12v26M24 22l-5-5M24 28l5-5" stroke="#5c940d" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </>
  ),
  dog: (
    <>
      <ellipse cx="9" cy="24" rx="6" ry="13" fill="#6f4e37" transform="rotate(12 9 24)" />
      <ellipse cx="39" cy="24" rx="6" ry="13" fill="#6f4e37" transform="rotate(-12 39 24)" />
      <ellipse cx="24" cy="25" rx="15" ry="17" fill="#d9a066" stroke="#8d5a2b" strokeWidth="2" />
      <ellipse cx="31" cy="17" rx="5" ry="6" fill="#8d5a2b" />
      <ellipse cx="24" cy="32" rx="9" ry="7" fill="#f8e6cf" />
      <circle cx="17.5" cy="22" r="2.2" fill="#1f2933" />
      <circle cx="30.5" cy="22" r="2.2" fill="#1f2933" />
      <ellipse cx="24" cy="28.5" rx="3.4" ry="2.4" fill="#1f2933" />
      <path d="M24 31v3M20 35q4 3 8 0" stroke="#1f2933" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M22 36q2 7 4 0z" fill="#e8590c" />
    </>
  ),
  chicken: (
    <>
      <g fill="#e8590c">
        <circle cx="19" cy="7" r="3.5" />
        <circle cx="24" cy="5" r="4" />
        <circle cx="29" cy="7" r="3.5" />
      </g>
      <circle cx="24" cy="25" r="18" fill="#ffffff" stroke="#adb5bd" strokeWidth="2" />
      <ellipse cx="9" cy="28" rx="4.5" ry="9" fill="#e9ecef" stroke="#ced4da" />
      <ellipse cx="39" cy="28" rx="4.5" ry="9" fill="#e9ecef" stroke="#ced4da" />
      <circle cx="17" cy="21" r="2.2" fill="#1f2933" />
      <circle cx="31" cy="21" r="2.2" fill="#1f2933" />
      <path d="M19 27h10l-5 8z" fill="#fd9a14" stroke="#e67700" strokeLinejoin="round" />
      <ellipse cx="24" cy="38" rx="2.5" ry="3.5" fill="#e03131" />
    </>
  ),
  farmer: (
    <>
      <path d="M8 46l2-12c1-4 5-6 14-6s13 2 14 6l2 12z" fill="#c92a2a" />
      <path d="M17 46l1-14h12l1 14z" fill="#1c7ed6" />
      <circle cx="24" cy="21" r="9" fill="#ffd8a8" stroke="#d9a066" strokeWidth="1.5" />
      <circle cx="20.5" cy="21" r="1.2" fill="#1f2933" />
      <circle cx="27.5" cy="21" r="1.2" fill="#1f2933" />
      <path d="M20.5 25q3.5 3 7 0" stroke="#1f2933" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M14 15q10-12 20 0z" fill="#f2c94c" stroke="#b8860b" strokeWidth="1.5" />
      <ellipse cx="24" cy="15" rx="15" ry="3.2" fill="#f2c94c" stroke="#b8860b" strokeWidth="1.5" />
      <rect x="15" y="12.5" width="18" height="2.5" fill="#c92a2a" />
    </>
  ),
};

export function RiverPieceIcon({ id, size = 48 }: { id: RiverIconId; size?: number }) {
  return (
    <svg
      className="river-icon"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      {ART[id]}
    </svg>
  );
}
