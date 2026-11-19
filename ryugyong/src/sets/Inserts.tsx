import React from 'react';
import { W, H, rand, clamp, easeOut } from '../lib';
import { Cam, Layer, Vignette } from '../camera/Camera';
import { Pyramid, ACCENT } from '../props/Pyramid';

const INK = '#111111';
const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>{children}</svg>
);

/* ---------------------------------------------------------------- MAP (light style) */
const px = (lon: number, lat: number): [number, number] => [100 + (lon - 90) * 30, 80 + (45 - lat) * 22];
const poly = (pts: number[][]) => 'M' + pts.map(([lo, la]) => px(lo, la).map((v) => v.toFixed(1)).join(',')).join(' L') + ' Z';
const MAINLAND = [[90, 45], [135, 45], [133, 43], [130.6, 42.4], [129.7, 40.9], [128.4, 40.0], [127.6, 39.4], [128.6, 38.3], [129.4, 37.0], [129.5, 36.0], [129.3, 35.2], [127.8, 34.7], [126.6, 34.4], [126.3, 35.1], [126.5, 36.8], [126.1, 37.7], [125.3, 38.0], [125.0, 39.6], [124.3, 40.0], [121.8, 39.0], [121.5, 40.8], [120, 40], [118, 39], [117.7, 38.5], [118.8, 37.4], [119.5, 37.3], [122.5, 37.0], [120.3, 36.0], [119.2, 34.8], [120.9, 32.0], [121.9, 30.8], [121.5, 28.5], [119.6, 25.5], [117, 23.5], [114.2, 22.3], [110.5, 21.0], [109.7, 21.5], [108, 21.5], [106.7, 20.5], [105.8, 19], [106.6, 17.5], [108.8, 15.5], [109.3, 12.5], [109, 11.5], [107, 10.5], [105, 8.7], [104.8, 10.2], [103.5, 10.6], [102.3, 12.2], [100.9, 13.5], [100, 13.2], [99.2, 10.5], [99.9, 9.0], [100.4, 7.3], [101.3, 6.8], [102.3, 6.2], [103.4, 4.8], [103.4, 2.8], [104.2, 1.5], [103.5, 1.4], [102.0, 2.3], [101.0, 3.5], [100.3, 5.4], [98.3, 8.0], [98.6, 10.2], [98.5, 13], [97.7, 16.5], [94.5, 16], [94.3, 18.5], [92.2, 21], [90, 22]];
const NK = [[124.3, 40.0], [125.0, 39.6], [125.3, 38.0], [126.1, 37.7], [127.2, 38.3], [128.6, 38.3], [127.6, 39.4], [128.4, 40.0], [129.7, 40.9], [130.6, 42.4], [129.9, 42.9], [128.0, 42.0], [126.9, 41.8]];
const SK = [[126.1, 37.7], [126.5, 36.8], [126.3, 35.1], [126.6, 34.4], [127.8, 34.7], [129.3, 35.2], [129.5, 36.0], [129.4, 37.0], [128.6, 38.3], [127.2, 38.3]];
const ISLANDS = [
  [[129.8, 33.2], [131, 31.4], [131.8, 33.0], [133, 33.9], [135.2, 33.5], [136.8, 34.3], [138.8, 34.6], [140.0, 35.2], [140.9, 36.9], [141, 38.3], [142, 39.6], [141.4, 41.4], [140.0, 40.8], [139.7, 39.0], [138.5, 37.4], [136.8, 37.2], [136.0, 35.7], [133, 35.5], [131, 34.4]],
  [[140, 41.5], [141.5, 42.5], [143.3, 42], [145.5, 43.3], [144.2, 44.1], [141.8, 45.4], [141.3, 43.3], [140, 42.5]],
  [[120.1, 23], [120.7, 22], [121.0, 22.6], [121.9, 25], [121.0, 25.1]],
  [[120.0, 16.0], [120.6, 18.5], [122.2, 18.5], [122.0, 16.0], [124, 13.5], [122.5, 13.8], [121, 14]],
  [[108.6, 19.2], [110.0, 20.1], [111.0, 19.6], [109.6, 18.2]],
  [[95.3, 5.6], [97.5, 5.2], [100.3, 2.3], [103.7, 0.0], [104.5, -1.5], [106, -3], [105, -6], [101, -3], [96, 2]],
  [[109, 1.5], [110, 1.8], [111.3, 2.6], [113, 3.2], [115.5, 5.3], [117, 7], [119, 5.2], [118, 1], [117.5, -1], [116, -4], [111, -3], [110, -1.5]],
];
export const SEOUL = px(127.0, 37.55), SINGAPORE = px(103.82, 1.35), PYONGYANG = px(125.75, 39.02);

const Pin: React.FC<{ at: [number, number]; drop: number; color?: string }> = ({ at, drop, color = '#C33631' }) => {
  if (drop <= 0) return null;
  const k = easeOut(drop);
  return <g transform={`translate(${at[0]},${at[1] - (1 - k) * 120})`} opacity={Math.min(1, drop * 3)}>
    <path d="M0,0 C-18,-26 -24,-40 -24,-52 A24,24 0 1 1 24,-52 C24,-40 18,-26 0,0 Z" fill={color} stroke={INK} strokeWidth={4} />
    <circle cx={0} cy={-52} r={9} fill="#F4F1EA" stroke={INK} strokeWidth={2.5} />
  </g>;
};
const MapLabel: React.FC<{ at: [number, number]; text: string; dx?: number; dy?: number; show: number }> = ({ at, text, dx = 40, dy = 10, show }) => (
  <text x={at[0] + dx} y={at[1] + dy} fontFamily="Marker" fontSize={34} fill="#F4F1EA" stroke={INK} strokeWidth={7} paintOrder="stroke" opacity={clamp(show)} letterSpacing={2}>{text}</text>
);

export const MapInsert: React.FC<{ cam: Cam; t: number; seoulPin: number; route: number; sgPin: number; labels: number }> = ({ cam, t, seoulPin, route, sgPin, labels }) => {
  const [x0, y0] = SEOUL, [x1, y1] = SINGAPORE;
  const cx = (x0 + x1) / 2 - 420, cy = (y0 + y1) / 2 - 60;
  const pathD = `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`;
  const len = 1500;
  return (
    <Svg>
      <Layer cam={cam} depth={1}>
        <rect x={-1500} y={-1500} width={W + 3000} height={H + 3000} fill="#A9CCDA" />
        {Array.from({ length: 30 }).map((_, i) => <path key={i} d={`M${-400 + (i % 6) * 420},${-200 + Math.floor(i / 6) * 330} q30,-12 60,0 t60,0`} stroke="#8DB6C6" strokeWidth={4} fill="none" />)}
        <path d={poly(MAINLAND)} fill="#E6DCC2" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
        {ISLANDS.map((p, i) => <path key={i} d={poly(p)} fill="#E6DCC2" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />)}
        <path d={poly(NK)} fill="#D8CDB0" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
        <path d={poly(SK)} fill="#3F7CC4" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
        {/* Singapore dot */}
        <circle cx={x1} cy={y1} r={10} fill="#C33631" stroke={INK} strokeWidth={3} />
        <path d={pathD} fill="none" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" strokeDasharray={`${len * clamp(route)} ${len}`} />
        <path d={pathD} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeDasharray={`${len * clamp(route)} ${len}`} opacity={0.4} />
        <Pin at={SEOUL} drop={seoulPin} color="#3F7CC4" />
        <Pin at={SINGAPORE} drop={sgPin} />
        <MapLabel at={SEOUL} text="SOUTH KOREA" dx={50} dy={40} show={labels} />
        <MapLabel at={SINGAPORE} text="SINGAPORE" dx={-260} dy={20} show={sgPin * 2 - 1} />
        {/* ship-like waves move slightly */}
        <path d={`M${300 + Math.sin(t) * 6},700 q20,-10 40,0`} stroke="#8DB6C6" strokeWidth={4} fill="none" />
      </Layer>
      <Vignette strength={0.18} id="map-vig" />
    </Svg>
  );
};

/* ---------------------------------------------------------------- Singapore 1986 */
export const Singapore: React.FC<{ cam: Cam; t: number; bannerDrop: number; cast?: React.ReactNode }> = ({ cam, t, bannerDrop, cast }) => {
  const floorY = 700;
  return (
    <Svg>
      <defs>
        <linearGradient id="sg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#48296A" /><stop offset="0.55" stopColor="#DB747A" /><stop offset="1" stopColor="#F0B789" /></linearGradient>
        <radialGradient id="sg-sun"><stop offset="0" stopColor="#FFE2A8" stopOpacity={0.9} /><stop offset="1" stopColor="#FFE2A8" stopOpacity={0} /></radialGradient>
      </defs>
      <Layer cam={cam} depth={0.3}>
        <rect x={-1500} y={-2500} width={W + 3000} height={H + 3500} fill="url(#sg-sky)" />
        <circle cx={1500} cy={560} r={260} fill="url(#sg-sun)" />
        <circle cx={1500} cy={560} r={70} fill="#FFD98E" />
        {[0, 1, 2].map((i) => <ellipse key={i} cx={((i * 800 + t * 14) % 2600) - 300} cy={-300 + i * 220} rx={180} ry={26} fill="#E89A8E" opacity={0.6} />)}
      </Layer>
      <Layer cam={cam} depth={0.5}>
        {Array.from({ length: 16 }).map((_, i) => <rect key={i} x={-300 + i * 160} y={floorY - 140 - rand(i) * 120} width={130} height={300} fill="#7A4A6A" stroke={INK} strokeWidth={3} />)}
      </Layer>
      <Layer cam={cam} depth={0.7}>
        {/* the cylindrical tower: 73 storeys, drawn as banded drum */}
        <g transform={`translate(${W / 2},${floorY + 10})`}>
          <rect x={-150} y={-1500} width={300} height={1500} fill="#C9B8A6" stroke={INK} strokeWidth={5} />
          <path d="M60,-1500 L60,0 L150,0 L150,-1500 Z" fill="#000" opacity={0.18} />
          {Array.from({ length: 50 }).map((_, i) => <rect key={i} x={-150} y={-1480 + i * 29} width={300} height={10} fill="#5C4A5A" opacity={0.75} />)}
          <path d="M-60,-1500 L-60,0" stroke="#fff" strokeWidth={6} opacity={0.25} />
          <ellipse cx={0} cy={-1500} rx={150} ry={22} fill="#B3A08E" stroke={INK} strokeWidth={5} />
          <rect x={-20} y={-1580} width={40} height={80} fill="#B3A08E" stroke={INK} strokeWidth={4} />
          {/* hand-lettered sign on the roof */}
          <rect x={-120} y={-1640} width={240} height={50} rx={6} fill="#F4F1EA" stroke={INK} strokeWidth={4} />
          <text x={0} y={-1604} textAnchor="middle" fontFamily="Marker" fontSize={30} fill={INK}>HOTEL</text>
        </g>
      </Layer>
      <Layer cam={cam} depth={1}>
        <rect x={-1500} y={floorY} width={W + 3000} height={H + 800} fill="#9A7A6A" />
        {Array.from({ length: 40 }).map((_, i) => <line key={i} x1={-1500 + i * 120} y1={floorY} x2={-1500 + i * 120 - 80} y2={H + 600} stroke={INK} strokeWidth={2} opacity={0.25} />)}
        <line x1={-1500} y1={floorY} x2={W + 1500} y2={floorY} stroke={INK} strokeWidth={4} />
        {/* entrance canopy */}
        <path d={`M${W / 2 - 260},${floorY - 260} L${W / 2 + 260},${floorY - 260} L${W / 2 + 300},${floorY - 210} L${W / 2 - 300},${floorY - 210} Z`} fill="#6E4726" stroke={INK} strokeWidth={4.5} />
        <rect x={W / 2 - 280} y={floorY - 210} width={10} height={210} fill={INK} /><rect x={W / 2 + 270} y={floorY - 210} width={10} height={210} fill={INK} />
        <rect x={W / 2 - 110} y={floorY - 190} width={220} height={190} fill="#F2CF86" stroke={INK} strokeWidth={4} />
        <path d={`M${W / 2 - 110},${floorY} L${W / 2 + 110},${floorY} L${W / 2 + 200},${floorY + 220} L${W / 2 - 200},${floorY + 220} Z`} fill="#F2CF86" opacity={0.3} />
        <path d={`M${W / 2 - 90},${floorY + 4} L${W / 2 + 90},${floorY + 4} L${W / 2 + 200},${H + 300} L${W / 2 - 200},${H + 300} Z`} fill="#C33631" stroke={INK} strokeWidth={4} />
        {/* palms */}
        {[380, 1560].map((x, i) => <g key={i} transform={`translate(${x},${floorY + 10})`}>
          <path d="M-10,0 Q-20,-200 10,-360 L24,-360 Q0,-200 12,0 Z" fill="#6E4726" stroke={INK} strokeWidth={4} />
          {[0, 1, 2, 3, 4].map((k) => <path key={k} d={`M17,-360 Q${-120 + k * 60},${-430 + Math.abs(k - 2) * 30} ${-170 + k * 85 + Math.sin(t * 1.6 + k) * 8},${-330 + Math.abs(k - 2) * 50}`} stroke="#3E6A3A" strokeWidth={26} fill="none" strokeLinecap="round" />)}
        </g>)}
        {/* banner on strings */}
        {(() => {
          const k = easeOut(bannerDrop);
          return <g transform={`translate(${W / 2},${floorY - 380 - (1 - k) * 420})`} opacity={bannerDrop > 0 ? 1 : 0}>
            <path d="M-330,-60 L-300,0 M330,-60 L300,0" stroke={INK} strokeWidth={3} />
            <path d="M-310,0 L310,0 L290,45 L310,90 L-310,90 L-290,45 Z" fill="#C33631" stroke={INK} strokeWidth={5} />
            <text x={0} y={62} textAnchor="middle" fontFamily="Marker" fontSize={44} fill="#F4F1EA">TALLEST HOTEL 1986</text>
          </g>;
        })()}
        {cast}
      </Layer>
      <Layer cam={cam} depth={1.6} blur={6}>
        <g transform={`translate(-80,${H + 40})`}>{[0, 1, 2].map((k) => <path key={k} d={`M0,0 Q${80 + k * 60},${-300 - k * 60} ${200 + k * 90},${-420 + k * 40}`} stroke="#2E4A2A" strokeWidth={60} fill="none" strokeLinecap="round" />)}</g>
      </Layer>
      <Vignette strength={0.3} id="sg-vig" />
    </Svg>
  );
};

/* ---------------------------------------------------------------- Height chart wall */
export const HeightChart: React.FC<{ cam: Cam; t: number; grow: number; tagIn: number }> = ({ cam, t, grow, tagIn }) => {
  const floorY = 860;
  return (
    <Svg>
      <defs><radialGradient id="hc-lamp"><stop offset="0" stopColor="#F6D58E" stopOpacity={0.45} /><stop offset="1" stopColor="#F6D58E" stopOpacity={0} /></radialGradient></defs>
      <Layer cam={cam} depth={0.7}>
        <rect x={-900} y={-900} width={W + 1800} height={H + 1800} fill="#3E5568" />
        {Array.from({ length: 30 }).map((_, i) => Array.from({ length: 16 }).map((_, j) => <circle key={`${i}-${j}`} cx={-700 + i * 120 + (j % 2) * 60} cy={-500 + j * 90} r={7} fill="#2C3E50" />))}
        <circle cx={W / 2} cy={300} r={480} fill="url(#hc-lamp)" />
        {/* painted measuring strip */}
        <rect x={W / 2 - 40} y={-200} width={80} height={floorY + 200} fill="#F4F1EA" stroke={INK} strokeWidth={4.5} />
        {Array.from({ length: 24 }).map((_, i) => <line key={i} x1={W / 2 - 40} y1={floorY - i * 50} x2={W / 2 - (i % 2 ? 16 : 0)} y2={floorY - i * 50} stroke={INK} strokeWidth={4} />)}
        <rect x={-900} y={floorY} width={W + 1800} height={600} fill="#6E4726" />
        {Array.from({ length: 20 }).map((_, i) => <line key={i} x1={-900 + i * 200} y1={floorY} x2={-900 + i * 200} y2={floorY + 600} stroke={INK} strokeWidth={3} opacity={0.4} />)}
        <line x1={-900} y1={floorY} x2={W + 900} y2={floorY} stroke={INK} strokeWidth={5} />
      </Layer>
      <Layer cam={cam} depth={1}>
        {/* Singapore drum model (left) */}
        <g transform={`translate(${W / 2 - 330},${floorY})`}>
          <rect x={-70} y={-480} width={140} height={480} fill="#C9B8A6" stroke={INK} strokeWidth={5} />
          {Array.from({ length: 16 }).map((_, i) => <rect key={i} x={-70} y={-460 + i * 28} width={140} height={8} fill="#5C4A5A" opacity={0.7} />)}
          <ellipse cx={0} cy={-480} rx={70} ry={12} fill="#B3A08E" stroke={INK} strokeWidth={4} />
          <g transform="translate(0,-560) rotate(-3)"><rect x={-110} y={-30} width={220} height={56} rx={6} fill="#F4F1EA" stroke={INK} strokeWidth={4} /><text x={0} y={10} textAnchor="middle" fontFamily="Marker" fontSize={30} fill={INK}>SINGAPORE</text></g>
          <line x1={0} y1={-588} x2={0} y2={-640} stroke={INK} strokeWidth={3} />
        </g>
        {/* the pyramid model grows from the ground (right) */}
        <g transform={`translate(${W / 2 + 330},${floorY})`}>
          <defs><clipPath id="hc-grow"><rect x={-400} y={-760 * grow - 6} width={800} height={760 * grow + 10} /></clipPath></defs>
          <g clipPath="url(#hc-grow)"><g transform="scale(0.72)"><Pyramid state="concrete" crane={false} idPrefix="hc-p" t={t} /></g></g>
          {/* dashed outline shows the target before it grows */}
          <g opacity={0.5 * (1 - grow)} transform="scale(0.72)"><path d="M-300,0 L-40,-820 L40,-820 L300,0 Z" fill="none" stroke="#F4F1EA" strokeWidth={6} strokeDasharray="20 16" /></g>
          {tagIn > 0 && <g transform={`translate(0,${-800 - (1 - easeOut(tagIn)) * 300}) rotate(4)`}><rect x={-120} y={-30} width={240} height={56} rx={6} fill="#F4F1EA" stroke={INK} strokeWidth={4} /><text x={0} y={10} textAnchor="middle" fontFamily="Marker" fontSize={30} fill={INK}>PYONGYANG</text></g>}
        </g>
      </Layer>
      <Vignette strength={0.4} id="hc-vig" />
    </Svg>
  );
};

/* ---------------------------------------------------------------- Top-down blueprint table */
export const BlueprintTable: React.FC<{ cam: Cam; t: number; unroll: number; circle: number }> = ({ cam, t, unroll, circle }) => (
  <Svg>
    <Layer cam={cam} depth={1}>
      <rect x={-900} y={-900} width={W + 1800} height={H + 1800} fill="#6E4726" />
      {Array.from({ length: 24 }).map((_, i) => <line key={i} x1={-900} y1={-600 + i * 120} x2={W + 900} y2={-600 + i * 120} stroke="#4E3219" strokeWidth={5} />)}
      {Array.from({ length: 30 }).map((_, i) => <path key={`k${i}`} d={`M${rand(i) * W},${-600 + Math.floor(rand(i + 3) * 24) * 120 + 60} q30,-8 60,0`} stroke="#5A3A1E" strokeWidth={3} fill="none" />)}
      {/* blueprint unrolling to the right */}
      <defs><clipPath id="bp-clip"><rect x={460} y={140} width={1000 * clamp(unroll)} height={800} /></clipPath></defs>
      <g clipPath="url(#bp-clip)">
        <rect x={460} y={140} width={1000} height={800} fill="#2E5C86" stroke={INK} strokeWidth={5} />
        {Array.from({ length: 20 }).map((_, i) => <line key={i} x1={460 + i * 50} y1={140} x2={460 + i * 50} y2={940} stroke="#4A7AA6" strokeWidth={1.5} />)}
        {Array.from({ length: 16 }).map((_, i) => <line key={`h${i}`} x1={460} y1={140 + i * 50} x2={1460} y2={140 + i * 50} stroke="#4A7AA6" strokeWidth={1.5} />)}
        <g transform="translate(960,880) scale(0.68)" opacity={0.95}>
          <path d="M-300,0 L-40,-820 L40,-820 L300,0 Z M-150,0 L-30,-820 M150,0 L30,-820 M-46,-820 L-26,-990 L26,-990 L46,-820" fill="none" stroke="#DCE8F2" strokeWidth={6} />
          {[1, 2, 3, 4, 5, 6, 7].map((k) => <line key={k} x1={-300 + k * 30} y1={-k * 103} x2={300 - k * 30} y2={-k * 103} stroke="#DCE8F2" strokeWidth={2} opacity={0.6} />)}
        </g>
        <text x={520} y={210} fontFamily="Marker" fontSize={40} fill="#DCE8F2">105 FLOORS</text>
        <text x={1400} y={900} textAnchor="end" fontFamily="Marker" fontSize={30} fill="#DCE8F2">PYONGYANG - 1987</text>
        {/* red pencil circles the empty interior */}
        <path d="M960,520 m-150,0 a150,190 0 1,0 300,0 a150,190 0 1,0 -300,0" fill="none" stroke="#C33631" strokeWidth={9} strokeDasharray={`${1100 * clamp(circle)} 2000`} strokeLinecap="round" />
      </g>
      <ellipse cx={460 + 1000 * clamp(unroll)} cy={540} rx={26} ry={410} fill="#3A6E9A" stroke={INK} strokeWidth={5} />
      {/* mug, pencil, ruler */}
      <g transform="translate(300,300)"><circle r={74} fill="#E7E2D0" stroke={INK} strokeWidth={5} /><circle r={56} fill="#3A2416" /><ellipse cx={-14} cy={-16} rx={18} ry={8} fill="#6A4A34" /></g>
      <g transform="translate(1620,760) rotate(-30)"><rect x={-140} y={-12} width={280} height={24} fill="#C33631" stroke={INK} strokeWidth={4} /><path d="M140,-12 L180,0 L140,12 Z" fill="#E7C9A0" stroke={INK} strokeWidth={3} /></g>
      <g transform="translate(260,860) rotate(12)"><rect x={-200} y={-26} width={400} height={52} fill="#D9C67A" stroke={INK} strokeWidth={4} />{Array.from({ length: 20 }).map((_, i) => <line key={i} x1={-190 + i * 20} y1={-26} x2={-190 + i * 20} y2={i % 2 ? -12 : -2} stroke={INK} strokeWidth={2} />)}</g>
    </Layer>
    <Vignette strength={0.4} id="bp-vig" />
  </Svg>
);

/* ---------------------------------------------------------------- Banner wall (Soviet ally collapses) */
export const BannerWall: React.FC<{ cam: Cam; t: number; fall: number; frame: number }> = ({ cam, t, fall, frame }) => {
  const k = clamp(fall);
  const y = 260 + k * k * 640;
  return (
    <Svg>
      <Layer cam={cam} depth={0.7}>
        <rect x={-900} y={-900} width={W + 1800} height={H + 1800} fill="#7A6A54" />
        {Array.from({ length: 30 }).map((_, r) => Array.from({ length: 22 }).map((_, c) => <rect key={`${r}-${c}`} x={-900 + c * 170 + (r % 2) * 85} y={-600 + r * 60} width={160} height={52} fill="none" stroke="#5E503D" strokeWidth={4} />))}
        <rect x={-900} y={900} width={W + 1800} height={400} fill="#5A4C3A" />
        <line x1={-900} y1={900} x2={W + 900} y2={900} stroke={INK} strokeWidth={5} />
        {/* nails */}
        <circle cx={W / 2 - 360} cy={160} r={9} fill={INK} /><circle cx={W / 2 + 360} cy={160} r={9} fill={INK} />
        {k < 0.02 && <path d={`M${W / 2 - 360},160 L${W / 2 - 330},${y} M${W / 2 + 360},160 L${W / 2 + 330},${y}`} stroke={INK} strokeWidth={4} />}
        {k >= 0.02 && <path d={`M${W / 2 - 360},160 l${8 + Math.sin(t * 9) * 6},40 M${W / 2 + 360},160 l${-8 + Math.cos(t * 9) * 6},40`} stroke={INK} strokeWidth={4} />}
        <g transform={`translate(${W / 2},${y}) rotate(${k * -18})`}>
          <rect x={-340} y={0} width={680} height={330} fill="#A8322E" stroke={INK} strokeWidth={6} />
          <path d="M-250,70 l14,30 l33,4 l-24,22 l7,33 l-30,-17 l-30,17 l7,-33 l-24,-22 l33,-4 Z" fill="#D9B54A" stroke={INK} strokeWidth={3} />
          <text x={50} y={210} textAnchor="middle" fontFamily="Marker" fontSize={150} fill="#D9B54A" stroke={INK} strokeWidth={3}>USSR</text>
          <path d="M-340,300 L340,300" stroke="#7A2420" strokeWidth={12} />
        </g>
        {/* a crate of aid money, empty */}
        <g transform="translate(330,900)"><rect x={-140} y={-170} width={280} height={170} fill="#8A6A44" stroke={INK} strokeWidth={5} /><path d="M-140,-170 L140,0 M140,-170 L-140,0" stroke="#6A4E30" strokeWidth={8} /><rect x={-90} y={-130} width={180} height={50} fill="#E7E2D0" stroke={INK} strokeWidth={3} /><text x={0} y={-94} textAnchor="middle" fontFamily="Marker" fontSize={32} fill={INK}>AID</text></g>
      </Layer>
      <Layer cam={cam} depth={0.7}>
        {k >= 1 && frame >= 0 && null}
      </Layer>
      <Vignette strength={0.45} id="bw-vig" />
    </Svg>
  );
};

/* ---------------------------------------------------------------- Gift box metaphor */
export const GiftBox: React.FC<{ cam: Cam; t: number; glint: number; lid: number; moth: number }> = ({ cam, t, glint, lid, moth }) => {
  const floorY = 820;
  const L = easeOut(lid);
  return (
    <Svg>
      <defs>
        <linearGradient id="gb-paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7F9DAA" /><stop offset="1" stopColor="#4E6B7A" /></linearGradient>
        <radialGradient id="gb-lamp"><stop offset="0" stopColor="#F6D58E" stopOpacity={0.4} /><stop offset="1" stopColor="#F6D58E" stopOpacity={0} /></radialGradient>
        <clipPath id="gb-front"><rect x={W / 2 - 330} y={floorY - 420} width={660} height={420} /></clipPath>
      </defs>
      <Layer cam={cam} depth={0.7}>
        <rect x={-900} y={-900} width={W + 1800} height={H + 1800} fill="#C9BFA6" />
        {Array.from({ length: 40 }).map((_, i) => <rect key={i} x={-900 + i * 90} y={-900} width={36} height={H + 1800} fill="#BDB296" />)}
        <circle cx={W / 2} cy={360} r={520} fill="url(#gb-lamp)" />
        <rect x={-900} y={floorY} width={W + 1800} height={600} fill="#6E4726" />
        {Array.from({ length: 20 }).map((_, i) => <line key={i} x1={-900 + i * 200} y1={floorY} x2={-900 + i * 200} y2={floorY + 600} stroke={INK} strokeWidth={3} opacity={0.4} />)}
        <line x1={-900} y1={floorY} x2={W + 900} y2={floorY} stroke={INK} strokeWidth={5} />
        {/* framed pinned paper */}
        <g transform="translate(280,240) rotate(-4)"><rect x={0} y={0} width={180} height={130} fill="#F4F1EA" stroke={INK} strokeWidth={4} /><text x={90} y={58} textAnchor="middle" fontFamily="Marker" fontSize={28} fill={INK}>GUESTS:</text><text x={90} y={104} textAnchor="middle" fontFamily="Marker" fontSize={40} fill="#C33631">0</text></g>
      </Layer>
      <Layer cam={cam} depth={1}>
        <ellipse cx={W / 2 + 40} cy={floorY + 6} rx={400} ry={30} fill="#000" opacity={0.35} />
        {/* inside of the box (dark, empty) visible when lid lifts */}
        <path d={`M${W / 2 - 330},${floorY - 420} L${W / 2 + 330},${floorY - 420} L${W / 2 + 290},${floorY - 470} L${W / 2 - 290},${floorY - 470} Z`} fill="#1A1E24" stroke={INK} strokeWidth={4} />
        {/* box front */}
        <rect x={W / 2 - 330} y={floorY - 420} width={660} height={420} fill="url(#gb-paper)" stroke={INK} strokeWidth={6} />
        <g clipPath="url(#gb-front)">
          {Array.from({ length: 8 }).map((_, i) => <path key={i} d={`M${W / 2 - 330 + i * 100},${floorY} l50,-90 l50,90`} fill="none" stroke="#DCE8EC" strokeWidth={3} opacity={0.5} />)}
          {/* glint sweep */}
          <rect x={W / 2 - 600 + glint * 1200} y={floorY - 460} width={90} height={520} fill="#FFFFFF" opacity={glint > 0 && glint < 1 ? 0.55 : 0} transform={`rotate(20,${W / 2},${floorY - 200})`} />
        </g>
        <rect x={W / 2 - 40} y={floorY - 420} width={80} height={420} fill="#C8A64B" stroke={INK} strokeWidth={4} />
        {/* tag */}
        <g transform={`translate(${W / 2 + 230},${floorY - 300}) rotate(${8 + Math.sin(t * 2) * 3})`}><line x1={0} y1={-40} x2={0} y2={0} stroke={INK} strokeWidth={3} /><rect x={-70} y={0} width={140} height={60} rx={6} fill="#F4F1EA" stroke={INK} strokeWidth={4} /><text x={0} y={42} textAnchor="middle" fontFamily="Marker" fontSize={30} fill={INK}>105 FL.</text></g>
        {/* lid */}
        <g transform={`translate(${W / 2},${floorY - 420 - L * 330}) rotate(${L * -16})`}>
          <rect x={-350} y={-80} width={700} height={80} fill="url(#gb-paper)" stroke={INK} strokeWidth={6} />
          <rect x={-40} y={-80} width={80} height={80} fill="#C8A64B" stroke={INK} strokeWidth={4} />
          <path d="M0,-80 C-140,-200 -200,-90 0,-80 C140,-200 200,-90 0,-80 Z" fill="#C8A64B" stroke={INK} strokeWidth={5} />
        </g>
        {/* one moth flutters out */}
        {moth > 0 && (() => {
          const mx = W / 2 + moth * 300 + Math.sin(moth * 18) * 30, my = floorY - 470 - moth * 300;
          const flap = Math.sin(t * 40) > 0 ? 1 : 0.4;
          return <g transform={`translate(${mx},${my})`}>
            <ellipse cx={-12} cy={0} rx={16} ry={10 * flap} fill="#BDB6A6" stroke={INK} strokeWidth={2.5} />
            <ellipse cx={12} cy={0} rx={16} ry={10 * flap} fill="#BDB6A6" stroke={INK} strokeWidth={2.5} />
            <ellipse cx={0} cy={0} rx={4} ry={10} fill={INK} />
          </g>;
        })()}
        {lid > 0.4 && lid < 0.9 && <g opacity={1 - (lid - 0.4) / 0.5}>{[0, 1, 2].map((i) => <circle key={i} cx={W / 2 - 160 + i * 160} cy={floorY - 470 - (lid - 0.4) * 80} r={28 + (lid - 0.4) * 40} fill="#D8D0BE" stroke={INK} strokeWidth={3} />)}</g>}
      </Layer>
      <Vignette strength={0.35} id="gb-vig" />
    </Svg>
  );
};
void ACCENT;
