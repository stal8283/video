import React from 'react';
import { W, H, rand } from '../lib';
import { Cam, Layer, Vignette } from '../camera/Camera';
import { Pyramid, PyramidState, ACCENT } from '../props/Pyramid';

const INK = '#111111';
export type Grade = 'night' | 'overcast' | 'day' | 'sepia';

const G = {
  night: { sky: ['#0E1322', '#1A2751'], far: '#1C2440', mid: '#222B45', midDark: '#181F33', road: '#1E2230', walk: '#2A2E3A', win: '#E8C77A', haze: '#2A3560', vig: 0.6 },
  overcast: { sky: ['#8E979C', '#C9CCC6'], far: '#9DA3A3', mid: '#8A8F8C', midDark: '#747874', road: '#5E605E', walk: '#7C7E79', win: '#3D4245', haze: '#C9CCC6', vig: 0.35 },
  day: { sky: ['#8FB5CC', '#DCE7E4'], far: '#A9BCC2', mid: '#B5AE9E', midDark: '#958F80', road: '#6A6B68', walk: '#A9A493', win: '#4E6470', haze: '#DCE7E4', vig: 0.15 },
  sepia: { sky: ['#5A4A38', '#B9A580'], far: '#8E7C62', mid: '#7A6950', midDark: '#5E503D', road: '#5A4C3A', walk: '#776650', win: '#3E3326', haze: '#B9A580', vig: 0.45 },
};

/* Far city blocks (deterministic) */
const Blocks: React.FC<{ y: number; n: number; seed: number; fill: string; win: string; night: boolean; t: number; hMin: number; hMax: number; gapCenter?: number }> = ({ y, n, seed, fill, win, night, t, hMin, hMax, gapCenter = 0 }) => {
  const out: React.ReactNode[] = [];
  let x = -400;
  for (let i = 0; i < n; i++) {
    const w = 90 + rand(seed + i) * 110;
    const h = hMin + rand(seed + i * 3.1) * (hMax - hMin);
    const cx = x + w / 2;
    if (gapCenter && Math.abs(cx - W / 2) < gapCenter) { x += w + 6; continue; }
    out.push(<rect key={`b${i}`} x={x} y={y - h} width={w} height={h} fill={fill} stroke={INK} strokeWidth={3} />);
    // roof detail
    if (rand(seed + i * 7) > 0.6) out.push(<rect key={`r${i}`} x={x + w * 0.3} y={y - h - 16} width={w * 0.25} height={16} fill={fill} stroke={INK} strokeWidth={2.5} />);
    const cols = Math.max(2, Math.floor(w / 26)), rows = Math.floor(h / 34);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const s = seed * 13 + i * 101 + r * 7 + c;
      const lit = night ? rand(s) > 0.72 : rand(s) > 0.15;
      if (!lit) continue;
      const flick = night && rand(s * 3) > 0.96 ? (Math.sin(t * 9 + s) > 0 ? 1 : 0.3) : 1;
      out.push(<rect key={`w${i}-${r}-${c}`} x={x + 8 + c * ((w - 16) / cols)} y={y - h + 14 + r * 34} width={(w - 16) / cols - 8} height={14} fill={win} opacity={(night ? 0.85 : 0.55) * flick} />);
    }
    x += w + 6;
  }
  return <g>{out}</g>;
};

const StreetLamp: React.FC<{ x: number; y: number; s?: number; on: boolean }> = ({ x, y, s = 1, on }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    {on && <ellipse cx={0} cy={0} rx={300} ry={46} fill="#F2CF86" opacity={0.18} />}
    {on && <circle cx={34} cy={-318} r={130} fill="#F2CF86" opacity={0.16} />}
    <rect x={-7} y={-320} width={14} height={320} fill="#2B2F38" stroke={INK} strokeWidth={3} />
    <path d="M0,-318 Q20,-340 50,-330" stroke={INK} strokeWidth={8} fill="none" />
    <path d="M28,-332 L62,-332 L54,-312 L36,-312 Z" fill="#3A3F4A" stroke={INK} strokeWidth={3} />
    <ellipse cx={45} cy={-310} rx={11} ry={5} fill={on ? '#FFE7A8' : '#6A6A6A'} />
    <rect x={-16} y={-16} width={32} height={16} fill="#2B2F38" stroke={INK} strokeWidth={3} />
  </g>
);

const Cloud: React.FC<{ x: number; y: number; s: number; c: string }> = ({ x, y, s, c }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={0.85}>
    <path d="M-120,20 Q-120,-20 -70,-18 Q-60,-60 -10,-50 Q20,-80 60,-48 Q110,-56 112,-10 Q140,0 124,22 Z" fill={c} stroke={INK} strokeWidth={3} />
  </g>
);

export const CityExterior: React.FC<{
  cam: Cam; t: number; grade: Grade; idp: string;
  pyramid: PyramidState; ledOn?: number; crane?: boolean;
  pyrScale?: number; pyrY?: number; pyrRise?: number; // rise 0..1 clips the pyramid from the ground up (construction)
  foreground?: 'lamp' | 'railing' | 'fence' | 'none';
  extras?: React.ReactNode; cast?: React.ReactNode; inWorld?: React.ReactNode; overlay?: React.ReactNode;
  mist?: number; debris?: number;
}> = ({ cam, t, grade, idp, pyramid, ledOn = 1, crane, pyrScale = 0.62, pyrY = 660, pyrRise = 1, foreground = 'lamp', extras, cast, inWorld, overlay, mist = 0, debris = 0 }) => {
  const g = G[grade];
  const night = grade === 'night';
  const horizon = 660;
  const pyrH = 1050 * pyrScale;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id={`${idp}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={g.sky[0]} /><stop offset="1" stopColor={g.sky[1]} /></linearGradient>
        <linearGradient id={`${idp}-haze`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={g.haze} stopOpacity={0} /><stop offset="1" stopColor={g.haze} stopOpacity={0.55} /></linearGradient>
        <clipPath id={`${idp}-rise`}><rect x={-2000} y={pyrY - pyrH * 1.05 * pyrRise - 10} width={6000} height={pyrH * 1.1 * pyrRise + 10} /></clipPath>
      </defs>
      {/* sky */}
      <Layer cam={cam} depth={0.25}>
        <rect x={-1500} y={-1500} width={W + 3000} height={H + 2200} fill={`url(#${idp}-sky)`} />
        {night && Array.from({ length: 40 }).map((_, i) => <circle key={i} cx={rand(i) * W * 1.4 - W * 0.2} cy={rand(i + 50) * 420 - 200} r={1.5 + rand(i + 9) * 1.5} fill="#E8E4D8" opacity={0.4 + 0.4 * Math.sin(t * 2 + i)} />)}
        {night && <g><circle cx={1520} cy={150} r={46} fill="#E9E2C8" stroke={INK} strokeWidth={3} /><circle cx={1500} cy={140} r={9} fill="#CFC6A8" /></g>}
        {grade === 'day' && <circle cx={1560} cy={170} r={70} fill="#F6E7B0" opacity={0.9} />}
        {[0, 1, 2].map((i) => <Cloud key={i} x={((i * 700 + t * (12 + i * 5)) % 2600) - 400} y={120 + i * 70} s={0.9 + i * 0.3} c={night ? '#232D52' : grade === 'overcast' ? '#B2B6B2' : grade === 'sepia' ? '#A08C6A' : '#F1F3EE'} />)}
      </Layer>
      {/* far city */}
      <Layer cam={cam} depth={0.4}>
        <Blocks y={horizon} n={30} seed={3} fill={g.far} win={g.win} night={night} t={t} hMin={60} hMax={170} gapCenter={pyramid ? 0 : 0} />
        <rect x={-1500} y={horizon - 200} width={W + 3000} height={200} fill={`url(#${idp}-haze)`} />
      </Layer>
      {/* hero pyramid */}
      <Layer cam={cam} depth={0.55}>
        <g clipPath={`url(#${idp}-rise)`}>
          <g transform={`translate(${W / 2},${pyrY}) scale(${pyrScale})`}>
            <Pyramid state={pyramid} t={t} ledOn={ledOn} crane={crane} idPrefix={`${idp}-p`} />
          </g>
        </g>
        {inWorld}
      </Layer>
      {/* mid buildings flanking */}
      <Layer cam={cam} depth={0.75}>
        <Blocks y={horizon + 20} n={26} seed={11} fill={g.mid} win={g.win} night={night} t={t} hMin={120} hMax={260} gapCenter={420} />
        {/* glow of the hero falls on near surfaces */}
        {pyramid === 'lit' && <ellipse cx={W / 2} cy={horizon} rx={700} ry={200} fill={ACCENT} opacity={0.08 * ledOn} />}
      </Layer>
      {/* street */}
      <Layer cam={cam} depth={1}>
        <rect x={-1500} y={horizon + 20} width={W + 3000} height={70} fill={g.walk} stroke={INK} strokeWidth={3} />
        {Array.from({ length: 30 }).map((_, i) => <line key={i} x1={-1500 + i * 160} y1={horizon + 20} x2={-1500 + i * 160} y2={horizon + 90} stroke={INK} strokeWidth={2} opacity={0.35} />)}
        <rect x={-1500} y={horizon + 90} width={W + 3000} height={H} fill={g.road} />
        <line x1={-1500} y1={horizon + 90} x2={W + 1500} y2={horizon + 90} stroke={INK} strokeWidth={4} />
        {Array.from({ length: 22 }).map((_, i) => <rect key={i} x={-1500 + i * 220} y={horizon + 220} width={120} height={12} fill="#D9D4C4" opacity={0.55} />)}
        {Array.from({ length: 14 }).map((_, i) => <rect key={`z${i}`} x={700 + i * 40} y={horizon + 300} width={22} height={120} fill="#D9D4C4" opacity={0.35} />)}
        <path d={`M-1500,${horizon + 160} L${W + 1500},${horizon + 160}`} stroke="#000" strokeWidth={2} opacity={0.15} />
        {extras}
        <StreetLamp x={260} y={horizon + 60} s={0.8} on={night} />
        <StreetLamp x={1660} y={horizon + 60} s={0.8} on={night} />
        {mist > 0 && [0, 1, 2].map((i) => <rect key={i} x={-1500 + ((t * 20 * (i + 1)) % 400)} y={horizon + 30 + i * 40} width={W + 3000} height={36} rx={18} fill={night ? '#3A4670' : '#E5E5DF'} opacity={0.14 * mist} />)}
        {cast}
        {debris > 0 && Array.from({ length: 10 }).map((_, i) => {
          const x = ((rand(i) * W * 1.2 + t * (180 + rand(i + 4) * 120)) % (W * 1.3)) - 100;
          const y = horizon + 40 + rand(i + 9) * 380 + Math.sin(t * 3 + i) * 18;
          return <rect key={`d${i}`} x={x} y={y} width={18} height={12} fill="#E7E2D0" stroke={INK} strokeWidth={2} transform={`rotate(${t * 200 + i * 40},${x},${y})`} opacity={0.8 * debris} />;
        })}
      </Layer>
      {/* foreground */}
      <Layer cam={cam} depth={1.6} blur={6}>
        {foreground === 'lamp' && <g transform={`translate(${W + 40},${H + 140}) scale(1.7)`}><rect x={-14} y={-700} width={28} height={700} fill="#1A1D24" /><path d="M0,-690 Q-40,-730 -110,-712" stroke="#1A1D24" strokeWidth={14} fill="none" /></g>}
        {foreground === 'railing' && <g>{Array.from({ length: 14 }).map((_, i) => <rect key={i} x={-200 + i * 170} y={H - 160} width={18} height={260} fill="#1A1D24" />)}<rect x={-300} y={H - 170} width={W + 600} height={22} fill="#1A1D24" /></g>}
        {foreground === 'fence' && <g>{Array.from({ length: 30 }).map((_, i) => <rect key={i} x={-300 + i * 90} y={H - 190 + (i % 2) * 10} width={70} height={320} fill="#4E4030" stroke={INK} strokeWidth={4} />)}<rect x={-300} y={H - 130} width={W + 600} height={18} fill="#3A2F22" /></g>}
      </Layer>
      {overlay}
      <Vignette strength={g.vig} id={`${idp}-vig`} />
    </svg>
  );
};
