import React from 'react';
import { W, H, rand, clamp } from '../lib';
import { Cam, Layer, Vignette } from '../camera/Camera';
import { DeskBell } from '../props/Props';
import { Pyramid } from '../props/Pyramid';

const INK = '#111111';
export type LobbyMode = 'night' | 'day2012';
export const FLOOR_Y = 700;      // cast line (feet) – 65% of frame height
export const DESK_X = 1240;      // desk centre

/* Elevation set. Layers: back wall (0.6) / wall items (0.62) / floor (0.85) / desk+clerk (0.95) / cast (1.0) / fg plant + rope (1.55, blurred). */
export const Lobby: React.FC<{
  cam: Cam; t: number; mode: LobbyMode; idp: string;
  dialFloor?: number;          // elevator dial number shown
  keysTaken?: number;          // number of keys missing from the rack (always 0 – the joke)
  bookText?: string | null;    // guest book on desk
  banner?: { text: string; drop: number; enter?: number } | null; // drop 0..1 = fallen
  calendar?: string; calendarTear?: number;      // tear progress 0..1
  clerk?: React.ReactNode;     // drawn behind the desk
  cast?: React.ReactNode;      // in front of the desk
  deskProps?: React.ReactNode;
  dust?: number;               // dust-in-beam effect 0..1
  sheets?: boolean;            // dust sheets on chairs
  overlay?: React.ReactNode;
}> = ({ cam, t, mode, idp, dialFloor = 1, keysTaken = 0, bookText = null, banner = null, calendar = '1992', calendarTear = 0, clerk, cast, deskProps, dust = 0, sheets = true, overlay }) => {
  const day = mode === 'day2012';
  const wall = day ? '#C9BFA6' : '#4A4A40';
  const wallLine = day ? '#ADA389' : '#3A3A32';
  const wain = day ? '#6E4726' : '#3E2A1A';
  const floorA = day ? '#B9AE96' : '#3A3830', floorB = day ? '#8E8470' : '#2A2922';
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <radialGradient id={`${idp}-lamp`}><stop offset="0" stopColor="#F6D58E" stopOpacity={0.55} /><stop offset="1" stopColor="#F6D58E" stopOpacity={0} /></radialGradient>
        <linearGradient id={`${idp}-beam`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={day ? '#FFF6D8' : '#9FB4E0'} stopOpacity={day ? 0.32 : 0.18} /><stop offset="1" stopColor={day ? '#FFF6D8' : '#9FB4E0'} stopOpacity={0} /></linearGradient>
      </defs>
      {/* back wall */}
      <Layer cam={cam} depth={0.6}>
        <rect x={-900} y={-700} width={W + 1800} height={FLOOR_Y + 700} fill={wall} />
        {/* panels */}
        {Array.from({ length: 22 }).map((_, i) => <rect key={i} x={-900 + i * 170 + 14} y={-680} width={142} height={FLOOR_Y + 470 - 260} rx={6} fill="none" stroke={wallLine} strokeWidth={4} />)}
        <rect x={-900} y={FLOOR_Y - 190} width={W + 1800} height={190} fill={wain} />
        {Array.from({ length: 30 }).map((_, i) => <line key={i} x1={-900 + i * 120} y1={FLOOR_Y - 190} x2={-900 + i * 120} y2={FLOOR_Y} stroke={INK} strokeWidth={2} opacity={0.35} />)}
        <rect x={-900} y={FLOOR_Y - 200} width={W + 1800} height={14} fill={day ? '#8A5E36' : '#4E3622'} stroke={INK} strokeWidth={3} />
        {/* window with a view of the city (and a lamp-lit night or day) */}
        <g transform="translate(150,110)">
          <rect x={0} y={0} width={380} height={330} fill={day ? '#A8C4D2' : '#141B30'} />
          {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={i * 50} y={220 - rand(i) * 90} width={44} height={200} fill={day ? '#8C9EA8' : '#1F2945'} />)}
          {!day && Array.from({ length: 20 }).map((_, i) => <rect key={`w${i}`} x={8 + (i % 8) * 48} y={240 + Math.floor(i / 8) * 26} width={10} height={8} fill="#E8C77A" opacity={rand(i + 3) > 0.4 ? 0.8 : 0} />)}
          <rect x={0} y={0} width={380} height={330} fill="none" stroke={INK} strokeWidth={10} />
          <line x1={190} y1={0} x2={190} y2={330} stroke={INK} strokeWidth={8} />
          <line x1={0} y1={165} x2={380} y2={165} stroke={INK} strokeWidth={8} />
          <path d={`M-20,-14 L400,-14`} stroke={INK} strokeWidth={8} />
          {/* curtains sway */}
          <path d={`M-30,-14 Q${-10 + Math.sin(t * 1.3) * 6},170 -40,350 L-80,350 L-80,-14 Z`} fill="#7A2E2A" stroke={INK} strokeWidth={4} />
          <path d={`M410,-14 Q${390 + Math.sin(t * 1.1 + 1) * 6},170 420,350 L460,350 L460,-14 Z`} fill="#7A2E2A" stroke={INK} strokeWidth={4} />
        </g>
        {/* light beam from the window across the wall/floor */}
        <path d={`M150,440 L530,440 L900,${FLOOR_Y + 300} L380,${FLOOR_Y + 300} Z`} fill={`url(#${idp}-beam)`} />
        {/* framed picture of the hotel */}
        <g transform="translate(640,170)">
          <rect x={0} y={0} width={150} height={190} fill="#E7DEC8" stroke={INK} strokeWidth={6} />
          <rect x={12} y={12} width={126} height={166} fill={day ? '#9FB5C0' : '#2A3448'} />
          <g transform="translate(75,170) scale(0.14)"><Pyramid state="glass" idPrefix={`${idp}-pic`} crane={false} /></g>
          <rect x={-8} y={-8} width={166} height={206} fill="none" stroke="#C8A64B" strokeWidth={5} />
        </g>
        {/* plaque */}
        <g transform="translate(860,120)">
          <rect x={0} y={0} width={300} height={70} rx={8} fill="#C8A64B" stroke={INK} strokeWidth={4.5} />
          <text x={150} y={48} textAnchor="middle" fontFamily="Marker" fontSize={34} fill="#2B2216">RYUGYONG HOTEL</text>
        </g>
        {/* clock (stopped hands for night, running for day) */}
        <g transform="translate(1010,290)">
          <circle r={52} fill="#F4F1EA" stroke={INK} strokeWidth={5} />
          {Array.from({ length: 12 }).map((_, i) => <line key={i} x1={0} y1={-42} x2={0} y2={-36} stroke={INK} strokeWidth={3} transform={`rotate(${i * 30})`} />)}
          <line x1={0} y1={0} x2={0} y2={-30} stroke={INK} strokeWidth={5} strokeLinecap="round" transform={`rotate(${day ? t * 6 : 300})`} />
          <line x1={0} y1={0} x2={0} y2={-40} stroke={INK} strokeWidth={3} strokeLinecap="round" transform={`rotate(${day ? t * 72 : 60})`} />
        </g>
        {/* key rack: 105 hooks, 105 keys */}
        <g transform="translate(1110,230)">
          <rect x={0} y={0} width={420} height={250} rx={6} fill="#6E4726" stroke={INK} strokeWidth={5} />
          <text x={210} y={30} textAnchor="middle" fontFamily="Marker" fontSize={24} fill="#F4E9C8">ROOM KEYS</text>
          {Array.from({ length: 105 }).map((_, i) => {
            const c = i % 15, r = Math.floor(i / 15);
            const x = 22 + c * 26.5, y = 50 + r * 28;
            const taken = i < keysTaken;
            return <g key={i}><circle cx={x} cy={y} r={2.5} fill={INK} />{!taken && <path d={`M${x},${y} L${x},${y + 14}`} stroke="#C8A64B" strokeWidth={4} strokeLinecap="round" />}</g>;
          })}
        </g>
        {/* elevator with floor dial */}
        <g transform="translate(1600,150)">
          <rect x={0} y={90} width={230} height={FLOOR_Y - 240} fill="#8A8F94" stroke={INK} strokeWidth={6} />
          <line x1={115} y1={90} x2={115} y2={FLOOR_Y - 150} stroke={INK} strokeWidth={4} />
          <path d="M20,110 L40,110 L40,500 M210,110 L190,110 L190,500" stroke="#fff" strokeWidth={3} opacity={0.25} fill="none" />
          <path d="M-14,90 L244,90 L230,70 L0,70 Z" fill="#C8A64B" stroke={INK} strokeWidth={4} />
          <rect x={60} y={-10} width={110} height={70} rx={10} fill="#1A1A1A" stroke={INK} strokeWidth={5} />
          <text x={115} y={42} textAnchor="middle" fontFamily="Marker" fontSize={44} fill={dialFloor > 1 ? '#F6C76A' : '#7A5A2A'}>{Math.round(dialFloor)}</text>
          {/* out of order sign */}
          {!day && <g transform="translate(115,300) rotate(-4)"><rect x={-80} y={-28} width={160} height={56} fill="#F4F1EA" stroke={INK} strokeWidth={4} /><text x={0} y={10} textAnchor="middle" fontFamily="Marker" fontSize={26} fill={INK}>OUT OF ORDER</text></g>}
        </g>
        {/* wall calendar */}
        <g transform="translate(-140,250)">
          <rect x={0} y={0} width={130} height={160} fill="#F4F1EA" stroke={INK} strokeWidth={4.5} />
          <rect x={0} y={0} width={130} height={38} fill="#7A2E2A" stroke={INK} strokeWidth={4.5} />
          <text x={65} y={110} textAnchor="middle" fontFamily="Marker" fontSize={46} fill={INK}>{calendar}</text>
          {calendarTear > 0 && calendarTear < 1 && <g transform={`translate(${65 + calendarTear * 60},${110 + calendarTear * calendarTear * 500}) rotate(${calendarTear * 260})`} opacity={1 - calendarTear * 0.3}>
            <rect x={-65} y={-72} width={130} height={122} fill="#F4F1EA" stroke={INK} strokeWidth={4} />
          </g>}
        </g>
        {/* wall lamp */}
        <circle cx={590} cy={480} r={220} fill={`url(#${idp}-lamp)`} />
        <path d="M570,470 L610,470 L620,500 L560,500 Z" fill="#E8C77A" stroke={INK} strokeWidth={3.5} />
        <rect x={585} y={500} width={10} height={30} fill={INK} />
        {/* banner on strings */}
        {banner && (() => {
          const k = clamp(banner.drop);
          const y = 40 - (1 - (banner.enter ?? 1)) * 400 + k * k * 760, rot = k * 26;
          return <g transform={`translate(${W / 2 + 40},${y}) rotate(${rot})`}>
            {k < 0.05 && <path d="M-300,-40 L-260,0 M300,-40 L260,0" stroke={INK} strokeWidth={3} />}
            <path d="M-270,0 L270,0 L250,60 L270,120 L-270,120 L-250,60 Z" fill="#C33631" stroke={INK} strokeWidth={5} />
            <text x={0} y={80} textAnchor="middle" fontFamily="Marker" fontSize={52} fill="#F4F1EA">{banner.text}</text>
          </g>;
        })()}
      </Layer>
      {/* floor */}
      <Layer cam={cam} depth={0.85}>
        <rect x={-1200} y={FLOOR_Y - 2} width={W + 2400} height={H + 600} fill={floorA} />
        {Array.from({ length: 14 }).map((_, r) => Array.from({ length: 40 }).map((_, c) => (r + c) % 2 ? null :
          <rect key={`${r}-${c}`} x={-1200 + c * 110 - r * 18} y={FLOOR_Y + r * 70} width={110} height={70} fill={floorB} />))}
        <line x1={-1200} y1={FLOOR_Y} x2={W + 1200} y2={FLOOR_Y} stroke={INK} strokeWidth={4} />
        {/* red carpet runner */}
        <path d={`M560,${FLOOR_Y + 10} L940,${FLOOR_Y + 10} L1180,${H + 400} L320,${H + 400} Z`} fill="#8E2B28" stroke={INK} strokeWidth={4} opacity={0.9} />
        {/* armchairs under dust sheets */}
        {sheets && <g>
          {[-260, 2060].map((x, i) => <g key={i} transform={`translate(${x},${FLOOR_Y + 20})`}>
            <path d="M-110,0 Q-120,-150 -60,-170 Q0,-190 60,-170 Q120,-150 110,0 Z" fill={day ? '#E7E2D0' : '#8D8A80'} stroke={INK} strokeWidth={4.5} />
            <path d="M-70,-120 Q-60,-60 -80,-10 M20,-160 Q30,-90 10,-20 M70,-130 Q80,-60 66,-6" stroke={INK} strokeWidth={2} opacity={0.35} fill="none" />
          </g>)}
        </g>}
        {/* potted plant by the elevator */}
        <g transform={`translate(1530,${FLOOR_Y + 10})`}>
          <path d="M-36,0 L36,0 L28,-70 L-28,-70 Z" fill="#6E4726" stroke={INK} strokeWidth={4} />
          {[-1, 0, 1].map((i) => <path key={i} d={`M0,-70 Q${i * 30 + Math.sin(t + i) * 3},-140 ${i * 50},-180 Q${i * 10},-120 0,-70`} fill="#4E7A4A" stroke={INK} strokeWidth={3.5} />)}
        </g>
      </Layer>
      {/* clerk behind desk, then desk */}
      <Layer cam={cam} depth={0.95}>
        {clerk}
        <g transform={`translate(${DESK_X},${FLOOR_Y + 40})`}>
          <rect x={-300} y={-210} width={600} height={210} fill="#6E4726" stroke={INK} strokeWidth={5} />
          {[-200, 0, 200].map((x) => <rect key={x} x={x - 80} y={-180} width={160} height={150} rx={6} fill="none" stroke="#4E3219" strokeWidth={4} />)}
          <rect x={-320} y={-230} width={640} height={26} fill="#8A5E36" stroke={INK} strokeWidth={4.5} />
          <rect x={-120} y={-150} width={240} height={50} rx={5} fill="#C8A64B" stroke={INK} strokeWidth={3.5} />
          <text x={0} y={-114} textAnchor="middle" fontFamily="Marker" fontSize={30} fill="#2B2216">RECEPTION</text>
          <g transform="translate(220,-230)"><DeskBell /></g>
          {bookText !== null && <g transform="translate(-150,-232)">
            <path d="M-90,0 L0,-8 L90,0 L90,-6 L0,-16 L-90,-6 Z" fill="#F4F1EA" stroke={INK} strokeWidth={3} />
            <path d="M-96,2 L0,-4 L96,2" stroke="#2C3E50" strokeWidth={6} fill="none" />
          </g>}
          {deskProps}
        </g>
      </Layer>
      {/* cast in front of the desk */}
      <Layer cam={cam} depth={1}>{cast}</Layer>
      {/* dust in the window beam */}
      {dust > 0 && <Layer cam={cam} depth={0.9}>
        {Array.from({ length: 24 }).map((_, i) => {
          const u = (rand(i) + t * 0.02 * (0.5 + rand(i + 3))) % 1;
          const x = 230 + u * 520 + rand(i + 7) * 200, y = 460 + u * 420 + Math.sin(t * 0.8 + i) * 14;
          return <circle key={i} cx={x} cy={y} r={2 + rand(i + 1) * 2.5} fill="#FFF3D0" opacity={dust * (0.35 + 0.4 * Math.sin(t * 1.5 + i * 2) ** 2)} />;
        })}
      </Layer>}
      {/* foreground: brass stanchion + rope, cropped, blurred */}
      <Layer cam={cam} depth={1.55} blur={6}>
        <g transform={`translate(-60,${H + 60})`}>
          <rect x={-14} y={-330} width={28} height={330} fill="#B08A3A" stroke={INK} strokeWidth={5} />
          <circle cx={0} cy={-340} r={26} fill="#C8A64B" stroke={INK} strokeWidth={5} />
          <path d="M20,-300 Q220,-180 420,-300" stroke="#8E2B28" strokeWidth={24} fill="none" />
        </g>
      </Layer>
      {overlay}
      <Vignette strength={day ? 0.3 : 0.55} id={`${idp}-vig`} />
    </svg>
  );
};
