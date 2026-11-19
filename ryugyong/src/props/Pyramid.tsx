import React from 'react';

/* The hero object: a 105-floor three-winged pyramid, drawn front-on.
   Units: base centre at (0,0); total height to the spire ~1040.  Scale with a transform. */

export type PyramidState = 'concrete' | 'glass' | 'lit';
const INK = '#111111';
export const ACCENT = '#8FD23F';
export const ACCENT_BODY = '#64A14B';

// seeded pseudo random (deterministic)
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const TOP = -820;
const halfAt = (y: number, base: number, top: number) => base + (top - base) * (y / TOP); // y negative

export const Pyramid: React.FC<{
  state: PyramidState;
  t?: number;            // seconds, for LED animation
  ledOn?: number;        // 0..1 switch-on progress (lit state)
  crane?: boolean;
  halo?: boolean;
  idPrefix: string;
}> = ({ state, t = 0, ledOn = 1, crane = state === 'concrete', halo = state === 'lit', idPrefix }) => {
  const P = {
    concrete: { side: '#7D7A73', front: '#96928A', ridge: '#6A675F', win: '#3A3834' },
    glass: { side: '#4E6B7A', front: '#6F8F9E', ridge: '#3E5866', win: '#2D4452' },
    lit: { side: '#141C2A', front: '#1C2638', ridge: '#0E141F', win: '#0A0F18' },
  }[state];
  const rows: React.ReactNode[] = [];
  // floor bands: 105 floors -> draw every 2nd floor as a band
  for (let i = 1; i < 52; i++) {
    const y = (TOP * i) / 52;
    const wo = halfAt(y, 300, 40), wf = halfAt(y, 150, 30);
    if (state === 'concrete') {
      // empty window holes, missing in random places
      const segs = 7;
      for (let s = 0; s < segs; s++) {
        if (rand(i * 31 + s) < 0.18) continue;
        const x0 = -wo + (2 * wo * s) / segs + 3, x1 = -wo + (2 * wo * (s + 1)) / segs - 3;
        rows.push(<rect key={`w${i}-${s}`} x={x0} y={y - 6} width={Math.max(0, x1 - x0)} height={7} fill={P.win} opacity={0.85} />);
      }
    } else if (state === 'glass') {
      rows.push(<line key={`g${i}`} x1={-wo} y1={y} x2={wo} y2={y} stroke={P.win} strokeWidth={1.6} opacity={0.6} />);
    } else {
      rows.push(<line key={`g${i}`} x1={-wo} y1={y} x2={wo} y2={y} stroke="#26324A" strokeWidth={1.5} opacity={0.8} />);
    }
    void wf;
  }
  // LED pattern on the front wing (lit state): rows of dots with a travelling wave
  const leds: React.ReactNode[] = [];
  if (state === 'lit' && ledOn > 0) {
    for (let i = 3; i < 50; i++) {
      const y = (TOP * i) / 52;
      const wf = halfAt(y, 300, 40) - 10;
      const n = Math.max(2, Math.round(wf / 10));
      // switch-on sweeps bottom to top
      const rowOn = ledOn * 1.25 - (i / 50) * 0.25;
      if (rowOn <= 0) continue;
      for (let k = 0; k <= n; k++) {
        const x = -wf + (2 * wf * k) / n;
        const wave = 0.5 + 0.5 * Math.sin(t * 2.4 - i * 0.35 + Math.sin(x * 0.02 + t) * 1.2);
        const on = wave > 0.35;
        leds.push(<circle key={`l${i}-${k}`} cx={x} cy={y} r={on ? 4 : 3.2} fill={on ? '#B6F06A' : '#4E8A36'} opacity={Math.min(1, rowOn) * (on ? 1 : 0.6)} />);
      }
    }
  }
  // stepped outer edges: left side from base to top, right side mirrored back down
  const left: [number, number][] = [[-300, 0]];
  for (let k = 1; k <= 10; k++) {
    const y = (TOP * k) / 10, yPrev = (TOP * (k - 0.15)) / 10;
    left.push([-(halfAt(y, 300, 40) + 14), yPrev], [-halfAt(y, 300, 40), y]);
  }
  const right = left.map(([x, y]) => [-x, y] as [number, number]).reverse();
  const outline = 'M' + [...left, ...right].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L') + ' Z';
  const clipId = `${idPrefix}-pyr`;
  const haloId = `${idPrefix}-halo`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}><path d={outline} /></clipPath>
        <radialGradient id={haloId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={ACCENT} stopOpacity={0.6} />
          <stop offset="0.25" stopColor={ACCENT} stopOpacity={0.45} />
          <stop offset="0.5" stopColor={ACCENT} stopOpacity={0.22} />
          <stop offset="1" stopColor={ACCENT} stopOpacity={0} />
        </radialGradient>
      </defs>
      {halo && <ellipse cx={0} cy={-520} rx={460 * (0.6 + 0.4 * ledOn)} ry={640 * (0.6 + 0.4 * ledOn)} fill={`url(#${haloId})`} opacity={ledOn} />}
      {/* crown: ringed cone + mast */}
      <g>
        <line x1={0} y1={-1000} x2={0} y2={-1050} stroke={INK} strokeWidth={5} />
        <path d={`M-46,${TOP} L-26,-990 L26,-990 L46,${TOP} Z`} fill={P.side} stroke={INK} strokeWidth={4.5} />
        {[0, 1, 2, 3, 4, 5].map((r) => {
          const y = TOP - 22 - r * 28; const hw = 52 - r * 4.5;
          return <rect key={r} x={-hw} y={y - 6} width={2 * hw} height={10} rx={3} fill={state === 'lit' ? '#1C2638' : P.front} stroke={INK} strokeWidth={3} />;
        })}
        {state === 'lit' && ledOn > 0.6 && (
          // a flag picture on the crown LEDs
          <g opacity={Math.min(1, (ledOn - 0.6) / 0.4)}>
            <rect x={-30} y={-985} width={60} height={9} fill="#2F5DA8" />
            <rect x={-30} y={-976} width={60} height={3} fill="#F4F1EA" />
            <rect x={-30} y={-973} width={60} height={22} fill="#C33631" />
            <rect x={-30} y={-951} width={60} height={3} fill="#F4F1EA" />
            <rect x={-30} y={-948} width={60} height={9} fill="#2F5DA8" />
            <circle cx={-12} cy={-962} r={8} fill="#F4F1EA" />
            <path d="M-12,-968 L-10,-963 L-5,-963 L-9,-960 L-7,-955 L-12,-958 L-17,-955 L-15,-960 L-19,-963 L-14,-963 Z" fill="#C33631" />
          </g>
        )}
      </g>
      {/* wings */}
      <path d={outline} fill={P.side} />
      <g clipPath={`url(#${clipId})`}>
        <path d={`M-150,0 L-30,${TOP} L30,${TOP} L150,0 Z`} fill={P.front} />
        {rows}
        {state === 'glass' && <g opacity={0.35}>
          <path d={`M-300,-120 L300,-420 L300,-360 L-300,-60 Z`} fill="#DCE8EC" />
          <path d={`M-300,-420 L300,-720 L300,-690 L-300,-390 Z`} fill="#DCE8EC" />
          {[-100, 0, 100].map((x) => <line key={x} x1={x} y1={0} x2={x * 0.2} y2={TOP} stroke={P.win} strokeWidth={1.4} />)}
        </g>}
        {state === 'concrete' && <g opacity={0.25} stroke="#4A3A2A" strokeWidth={3}>
          <path d="M-120,-640 L-118,-560 M60,-500 L62,-410 M-60,-300 L-58,-220 M140,-200 L142,-130" />
        </g>}
        {leds}
        <path d={`M-150,0 L-30,${TOP}`} stroke={P.ridge} strokeWidth={4} />
        <path d={`M150,0 L30,${TOP}`} stroke={P.ridge} strokeWidth={4} />
      </g>
      <path d={outline} fill="none" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      {crane && <Crane />}
    </g>
  );
};

const Crane: React.FC = () => (
  <g transform="translate(0,-1000)" stroke={INK} strokeWidth={3.5} fill="none">
    <path d="M-8,0 L-8,-150 M8,0 L8,-150" />
    {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M-8,${-i * 30} L8,${-i * 30 - 30}`} strokeWidth={2} />)}
    <path d="M-140,-150 L190,-150 M-140,-138 L190,-138" />
    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => <path key={i} d={`M${-140 + i * 33},-150 L${-124 + i * 33},-138`} strokeWidth={2} />)}
    <path d="M0,-150 L0,-190 L-140,-150 M0,-190 L190,-150" strokeWidth={2.5} />
    <rect x={-150} y={-160} width={30} height={30} fill="#5A5852" />
    <path d="M150,-138 L150,-60" strokeWidth={2} />
    <path d="M144,-60 L156,-60 L150,-48 Z" fill={INK} />
  </g>
);
