import React from 'react';
const INK = '#111111';

/* Small props. Local origin = centre of the object unless noted. */
export const Suitcase: React.FC = () => (
  <g>
    <path d="M-16,-46 L-16,-58 Q-16,-64 -10,-64 L10,-64 Q16,-64 16,-58 L16,-46" stroke={INK} strokeWidth={5} fill="none" />
    <rect x={-58} y={-46} width={116} height={84} rx={10} fill="#8A5A34" stroke={INK} strokeWidth={4.5} />
    <rect x={-58} y={-46} width={116} height={12} rx={6} fill="#6E4726" stroke={INK} strokeWidth={2.5} />
    <path d="M-34,-34 L-34,38 M34,-34 L34,38" stroke="#5A3A20" strokeWidth={6} />
    <circle cx={-6} cy={4} r={14} fill="#E7D7A8" stroke={INK} strokeWidth={2.5} />
    <text x={-6} y={8} fontSize={10} textAnchor="middle" fontFamily="Marker" fill={INK}>SG</text>
    <rect x={10} y={10} width={30} height={18} rx={3} fill="#A9C2C0" stroke={INK} strokeWidth={2.5} transform="rotate(-8,25,19)" />
    <path d="M-50,-24 L-44,30" stroke="#fff" strokeWidth={3} opacity={0.35} strokeLinecap="round" />
  </g>
);

export const DeskBell: React.FC = () => (
  <g>
    <ellipse cx={0} cy={0} rx={34} ry={7} fill="#3A3A3A" stroke={INK} strokeWidth={3} />
    <path d="M-28,-2 Q-28,-38 0,-38 Q28,-38 28,-2 Z" fill="#C8A64B" stroke={INK} strokeWidth={3.5} />
    <rect x={-3} y={-50} width={6} height={12} fill={INK} />
    <ellipse cx={0} cy={-51} rx={8} ry={3} fill="#3A3A3A" stroke={INK} strokeWidth={2} />
    <path d="M-18,-24 Q-14,-32 -6,-34" stroke="#FFF4C8" strokeWidth={4} fill="none" strokeLinecap="round" />
  </g>
);

export const Clipboard: React.FC<{ label?: string }> = ({ label = 'CONTRACT' }) => (
  <g transform="rotate(-6)">
    <rect x={-40} y={-52} width={80} height={104} rx={6} fill="#6E4726" stroke={INK} strokeWidth={4} />
    <rect x={-32} y={-40} width={64} height={86} fill="#F4F1EA" stroke={INK} strokeWidth={2} />
    <rect x={-16} y={-58} width={32} height={14} rx={3} fill="#9A9A9A" stroke={INK} strokeWidth={2.5} />
    <text x={0} y={-22} fontSize={11} textAnchor="middle" fontFamily="Marker" fill={INK}>{label}</text>
    {[-8, 2, 12, 22].map((y) => <line key={y} x1={-24} y1={y} x2={24} y2={y} stroke="#8A8A8A" strokeWidth={2} />)}
    <path d="M-20,36 q8,-8 14,0 t14,0" stroke="#2F5DA8" strokeWidth={2.5} fill="none" />
  </g>
);

export const Blueprint: React.FC = () => (
  <g transform="rotate(-10)">
    <rect x={-70} y={-40} width={140} height={80} fill="#2E5C86" stroke={INK} strokeWidth={4} />
    <path d="M-40,28 L0,-30 L40,28 Z M-20,28 L0,-30 L20,28" stroke="#DCE8F2" strokeWidth={2} fill="none" />
    <path d="M-60,-30 L-30,-30 M-60,-22 L-40,-22" stroke="#DCE8F2" strokeWidth={2} />
    <ellipse cx={-70} cy={0} rx={8} ry={40} fill="#3A6E9A" stroke={INK} strokeWidth={3} />
  </g>
);

export const GlassPanel: React.FC = () => (
  <g>
    <rect x={-50} y={-70} width={100} height={140} fill="#8FB0BD" stroke={INK} strokeWidth={6} opacity={0.95} />
    <path d="M-40,-30 L10,-66 M-40,10 L40,-50" stroke="#EAF3F5" strokeWidth={6} opacity={0.7} />
  </g>
);
