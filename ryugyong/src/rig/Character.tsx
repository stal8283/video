import React from 'react';

/* One rig, many outfits.  Origin = centre between the feet. Figure is ~420 px tall at scale 1.
   Head centre (0,-322) r 76; torso egg from y -258 to -92; legs -100..0.  */

export type View = 'front' | '3q' | 'side' | 'back';
export type Expr =
  | 'neutral' | 'happy' | 'surprised' | 'thinking' | 'concerned'
  | 'angry' | 'sad' | 'deadpan' | 'panic';
export type Pose = 'idle' | 'talk' | 'point' | 'hold' | 'walk' | 'cheer' | 'shrug';
export type Mouth = 'closed' | 'smallO' | 'tallO' | 'wide' | 'smile';
export type Symbol = 'sweat' | 'anger' | 'sparkle' | 'dizzy' | null;

export type Outfit = {
  name: string;
  skin: string;
  skinShade: string;
  hair: { style: 'sidepart' | 'bun' | 'short' | 'none'; color: string; hi: string };
  hat?: { kind: 'peaked' | 'hardhat' | 'pillbox'; color: string; band: string };
  top: {
    kind: 'parka' | 'uniform' | 'suit' | 'vest' | 'doorman' | 'coat';
    color: string; dark: string; light: string;
    shirt?: string; tie?: string; trim?: string; badge?: string;
  };
  legs: string;
  shoes: string;
  glasses?: 'round' | 'square';
  scarf?: string;
};

const INK = '#111111';
const SW = 4.5; // outline at 1080p

export type CharacterProps = {
  outfit: Outfit;
  view?: View;
  dir?: 1 | -1;           // 1 = facing screen-right (for 3q / side), -1 = left
  expr?: Expr;
  pose?: Pose;
  mouth?: Mouth | null;   // overrides expression mouth while talking
  blink?: boolean;
  symbol?: Symbol;
  t?: number;             // seconds, for idle bob / walk cycle
  prop?: React.ReactNode; // drawn in the hands for pose 'hold' (local coords centred at (0,-165))
  shadow?: number;        // shadow darkness 0..1 (0 = none)
  headTilt?: number;      // degrees
  idPrefix: string;
};

/* ------------------------------------------------------------------ helpers */
const torsoPath = (w = 1) =>
  `M0,-258 C${55 * w},-258 ${78 * w},-200 ${76 * w},-150 C${74 * w},-108 ${50 * w},-92 0,-92 ` +
  `C${-50 * w},-92 ${-74 * w},-108 ${-76 * w},-150 C${-78 * w},-200 ${-55 * w},-258 0,-258 Z`;

const HX = 0, HY = -322, HR = 76;

/* ------------------------------------------------------------------ face */
const Eyes: React.FC<{ expr: Expr; blink: boolean; view: View; fx: number }> = ({ expr, blink, view, fx }) => {
  if (view === 'back') return null;
  const pts: { x: number; s: number }[] =
    view === 'front' ? [{ x: -25, s: 1 }, { x: 25, s: 1 }]
      : view === '3q' ? [{ x: fx - 17, s: 0.78 }, { x: fx + 25, s: 1 }]
        : [{ x: fx + 22, s: 1 }];
  const y = HY - 2;
  return (
    <g>
      {pts.map((p, i) => {
        const rx = 6.5 * p.s, ry = 9.5;
        if (blink) return <path key={i} d={`M${p.x - 8 * p.s},${y + 2} Q${p.x},${y + 6} ${p.x + 8 * p.s},${y + 2}`} stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
        switch (expr) {
          case 'happy':
            return <path key={i} d={`M${p.x - 8 * p.s},${y + 3} Q${p.x},${y - 9} ${p.x + 8 * p.s},${y + 3}`} stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />;
          case 'surprised': case 'panic':
            return <g key={i}><ellipse cx={p.x} cy={y} rx={11 * p.s} ry={12.5} fill="#fff" stroke={INK} strokeWidth={3} /><ellipse cx={p.x} cy={y} rx={4.5 * p.s} ry={5} fill={INK} /></g>;
          case 'deadpan':
            return <g key={i}><ellipse cx={p.x} cy={y + 2} rx={rx} ry={6.5} fill={INK} /><path d={`M${p.x - 10 * p.s},${y - 2} L${p.x + 10 * p.s},${y - 2}`} stroke={INK} strokeWidth={3.5} strokeLinecap="round" /></g>;
          case 'thinking':
            return <ellipse key={i} cx={p.x + 3} cy={y - 3} rx={rx} ry={ry} fill={INK} />;
          case 'sad':
            return <ellipse key={i} cx={p.x} cy={y + 2} rx={rx * 0.9} ry={ry * 0.85} fill={INK} />;
          default:
            return <ellipse key={i} cx={p.x} cy={y} rx={rx} ry={ry} fill={INK} />;
        }
      })}
    </g>
  );
};

const Brows: React.FC<{ expr: Expr; view: View; fx: number }> = ({ expr, view, fx }) => {
  if (view === 'back') return null;
  const xs = view === 'front' ? [-25, 25] : view === '3q' ? [fx - 17, fx + 25] : [fx + 22];
  const y = HY - 26;
  return (
    <g stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round">
      {xs.map((x, i) => {
        const side = view === 'front' ? (i === 0 ? -1 : 1) : (xs.length === 2 && i === 0 ? -1 : 1);
        const inner = x - side * 10, outer = x + side * 10; // inner end is towards face centre
        let yi = y, yo = y, bend = -3;
        switch (expr) {
          case 'angry': yi = y + 7; yo = y - 3; bend = 0; break;
          case 'concerned': case 'sad': yi = y - 6; yo = y + 2; bend = 0; break;
          case 'surprised': yi = y - 8; yo = y - 8; bend = -4; break;
          case 'panic': yi = y - 8; yo = y; bend = -1; break;
          case 'deadpan': yi = y + 2; yo = y + 2; bend = 0; break;
          case 'thinking': if (i === xs.length - 1) { yi = y - 8; yo = y - 8; } break;
        }
        return <path key={i} d={`M${inner},${yi} Q${x},${(yi + yo) / 2 + bend} ${outer},${yo}`} />;
      })}
    </g>
  );
};

const MouthShape: React.FC<{ expr: Expr; mouth: Mouth | null; view: View; fx: number }> = ({ expr, mouth, view, fx }) => {
  if (view === 'back') return null;
  const x = view === 'front' ? 0 : view === '3q' ? fx + 6 : fx + 38;
  const y = HY + 34;
  const k = view === 'side' ? 0.6 : 1;
  const fillDark = '#5a1f1f';
  const m: Mouth | 'frown' | 'flat' | 'grit' | 'pursed' | 'wavy' =
    mouth ?? ({
      neutral: 'smile', happy: 'wide', surprised: 'smallO', thinking: 'pursed', concerned: 'wavy',
      angry: 'frown', sad: 'frown', deadpan: 'flat', panic: 'grit',
    } as const)[expr];
  switch (m) {
    case 'closed': return <path d={`M${x - 10 * k},${y} L${x + 10 * k},${y}`} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />;
    case 'flat': return <path d={`M${x - 13 * k},${y} L${x + 13 * k},${y}`} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />;
    case 'smallO': return <ellipse cx={x} cy={y} rx={6 * k} ry={6} fill={fillDark} stroke={INK} strokeWidth={3} />;
    case 'tallO': return <ellipse cx={x} cy={y + 2} rx={8 * k} ry={12} fill={fillDark} stroke={INK} strokeWidth={3} />;
    case 'wide': return <path d={`M${x - 17 * k},${y - 5} Q${x},${y - 1} ${x + 17 * k},${y - 5} Q${x + 14 * k},${y + 17} ${x},${y + 17} Q${x - 14 * k},${y + 17} ${x - 17 * k},${y - 5} Z`} fill={fillDark} stroke={INK} strokeWidth={3} strokeLinejoin="round" />;
    case 'smile': return <path d={`M${x - 14 * k},${y - 3} Q${x},${y + 10} ${x + 14 * k},${y - 3}`} stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
    case 'frown': return <path d={`M${x - 13 * k},${y + 5} Q${x},${y - 7} ${x + 13 * k},${y + 5}`} stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
    case 'pursed': return <path d={`M${x - 4},${y + 1} L${x + 12 * k},${y - 2}`} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />;
    case 'wavy': return <path d={`M${x - 14 * k},${y + 2} q${5 * k},-5 ${9 * k},0 q${5 * k},5 ${9 * k},0 q${5 * k},-5 ${10 * k},0`} stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
    case 'grit': return <g><rect x={x - 17 * k} y={y - 7} width={34 * k} height={14} rx={4} fill="#fff" stroke={INK} strokeWidth={3} /><path d={`M${x - 17 * k},${y} L${x + 17 * k},${y} M${x - 6 * k},${y - 7} L${x - 6 * k},${y + 7} M${x + 6 * k},${y - 7} L${x + 6 * k},${y + 7}`} stroke={INK} strokeWidth={2} /></g>;
  }
};

const Glasses: React.FC<{ kind: 'round' | 'square'; view: View; fx: number }> = ({ kind, view, fx }) => {
  if (view === 'back') return null;
  const xs = view === 'front' ? [-25, 25] : view === '3q' ? [fx - 17, fx + 25] : [fx + 22];
  const y = HY - 2;
  return (
    <g stroke={INK} strokeWidth={3.5} fill="rgba(255,255,255,0.18)">
      {xs.map((x, i) => kind === 'round'
        ? <circle key={i} cx={x} cy={y} r={view === '3q' && i === 0 ? 13 : 16} />
        : <rect key={i} x={x - 17} y={y - 12} width={34} height={24} rx={5} />)}
      {xs.length === 2 && <path d={`M${xs[0] + 14},${y - 3} Q${(xs[0] + xs[1]) / 2},${y - 9} ${xs[1] - 14},${y - 3}`} fill="none" />}
      {view === 'side' && <path d={`M${xs[0] - 16},${y - 2} L${xs[0] - 58},${y - 6}`} fill="none" />}
    </g>
  );
};

/* ------------------------------------------------------------------ hair & hats */
const Hair: React.FC<{ o: Outfit; view: View; fx: number; layer: 'back' | 'front' }> = ({ o, view, fx, layer }) => {
  const { style, color, hi } = o.hair;
  if (style === 'none' || o.hat) {
    if (layer === 'front' && o.hat && view === 'back' && style !== 'none')
      return <path d={`M${-HR + 1},${HY - 40} C${-HR - 4},${HY + 4} ${-50},${HY + 30} 0,${HY + 30} C50,${HY + 30} ${HR + 4},${HY + 4} ${HR - 1},${HY - 40} Z`} fill={color} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />;
    return null;
  }
  if (layer === 'back') {
    if (style === 'bun') {
      const bx = view === 'side' ? -40 : view === '3q' ? -16 : 0;
      return <circle cx={bx} cy={HY - 84} r={30} fill={color} stroke={INK} strokeWidth={SW} />;
    }
    return null;
  }
  if (view === 'back') {
    return (
      <g>
        <path d={`M${-HR - 2},${HY + 8} C${-HR - 6},${HY - 70} ${-40},${HY - 82} 0,${HY - 82} C40,${HY - 82} ${HR + 6},${HY - 70} ${HR + 2},${HY + 8} C40,${HY + 40} -40,${HY + 40} ${-HR - 2},${HY + 8} Z`} fill={color} stroke={INK} strokeWidth={SW} />
        <path d={`M-30,${HY - 50} Q-20,${HY} -32,${HY + 20} M8,${HY - 60} Q14,${HY - 10} 6,${HY + 24} M40,${HY - 40} Q46,${HY} 36,${HY + 16}`} stroke={INK} strokeWidth={2} opacity={0.45} fill="none" />
      </g>
    );
  }
  // cap of hair sitting on the head; part moves with facing
  const part = view === 'front' ? -22 : view === '3q' ? fx - 30 : fx - 50;
  const depth = style === 'short' ? 0.75 : 1;
  const sideX = view === 'side' ? -HR - 3 : -HR - 3;
  const d = `M${sideX},${HY + 4 * depth} C${-HR - 8},${HY - 70} -40,${HY - 86} 0,${HY - 86} ` +
    `C40,${HY - 86} ${HR + 8},${HY - 70} ${HR + 3},${HY + (view === 'side' ? -30 : 4 * depth)} ` +
    `C${HR - 6},${HY - 34 * depth} ${part + 50},${HY - 50 * depth} ${part},${HY - 44 * depth} ` +
    `C${part - 20},${HY - 40 * depth} ${-HR + 4},${HY - 30 * depth} ${sideX},${HY + 4 * depth} Z`;
  return (
    <g>
      <path d={d} fill={color} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M${part - 30},${HY - 66} Q${part + 10},${HY - 80} ${part + 54},${HY - 70}`} stroke={hi} strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.75} />
      <path d={`M${part},${HY - 46} Q${part + 6},${HY - 70} ${part + 2},${HY - 84} M${part + 26},${HY - 50} Q${part + 30},${HY - 70} ${part + 26},${HY - 82} M${part - 22},${HY - 40} Q${part - 26},${HY - 64} ${part - 18},${HY - 80}`} stroke={INK} strokeWidth={2} opacity={0.4} fill="none" />
    </g>
  );
};

const Hat: React.FC<{ o: Outfit; view: View; fx: number }> = ({ o, view, fx }) => {
  if (!o.hat) return null;
  const { kind, color, band } = o.hat;
  const vx = view === 'front' ? 0 : view === '3q' ? fx * 0.8 : fx * 1.1;
  if (kind === 'hardhat') return (
    <g>
      <path d={`M${-HR + 2},${HY - 30} C${-HR},${HY - 110} ${HR},${HY - 110} ${HR - 2},${HY - 30} Z`} fill={color} stroke={INK} strokeWidth={SW} />
      <path d={`M${-HR - 14 + vx * 0.3},${HY - 28} L${HR + 14 + vx * 0.3},${HY - 28}`} stroke={INK} strokeWidth={10} strokeLinecap="round" />
      <path d={`M${-HR - 12 + vx * 0.3},${HY - 28} L${HR + 12 + vx * 0.3},${HY - 28}`} stroke={color} strokeWidth={4} strokeLinecap="round" />
      <path d={`M${vx * 0.4 - 6},${HY - 100} L${vx * 0.4 - 6},${HY - 34} M${vx * 0.4 + 6},${HY - 100} L${vx * 0.4 + 6},${HY - 34}`} stroke={band} strokeWidth={3} />
      <path d={`M${-HR + 16},${HY - 70} Q${-40},${HY - 98} ${-6},${HY - 98}`} stroke="#fff" strokeWidth={5} fill="none" opacity={0.5} strokeLinecap="round" />
    </g>
  );
  if (kind === 'pillbox') return (
    <g>
      <rect x={-46 + vx * 0.3} y={HY - 112} width={92} height={46} rx={8} fill={color} stroke={INK} strokeWidth={SW} />
      <rect x={-46 + vx * 0.3} y={HY - 80} width={92} height={12} fill={band} stroke={INK} strokeWidth={2.5} />
    </g>
  );
  // peaked uniform cap
  return (
    <g>
      <path d={`M${-HR + 4},${HY - 44} C${-HR - 10},${HY - 100} ${HR + 10},${HY - 100} ${HR - 4},${HY - 44} Z`} fill={color} stroke={INK} strokeWidth={SW} />
      <rect x={-HR + 4} y={HY - 58} width={2 * HR - 8} height={16} fill={band} stroke={INK} strokeWidth={2.5} />
      {view !== 'back' && <path d={`M${vx - 52},${HY - 42} Q${vx + (view === 'side' ? 40 : 0)},${HY - 24} ${vx + 52 + (view === 'side' ? 40 : 0)},${HY - 42} Z`} fill={INK} />}
      {view !== 'back' && <circle cx={vx * 0.6} cy={HY - 72} r={7} fill="#C8A64B" stroke={INK} strokeWidth={2} />}
    </g>
  );
};

/* ------------------------------------------------------------------ torso clothing */
const Clothes: React.FC<{ o: Outfit; view: View; w: number; clip: string }> = ({ o, view, w, clip }) => {
  const t = o.top;
  const back = view === 'back';
  const cx = view === 'front' || back ? 0 : view === '3q' ? 14 : 30;
  const hem = <rect x={-90} y={-114} width={180} height={24} fill={t.dark} />;
  const folds = (
    <g stroke={INK} strokeWidth={2} opacity={0.25} fill="none">
      <path d={`M${-50 * w},-150 Q${-40 * w},-130 ${-52 * w},-118`} />
      <path d={`M${54 * w},-160 Q${44 * w},-140 ${56 * w},-122`} />
    </g>
  );
  let body: React.ReactNode = null;
  if (back) {
    body = <g>
      <path d={`M0,-250 L0,-114`} stroke={INK} strokeWidth={2} opacity={0.35} />
      <path d={`M-40,-252 Q0,-236 40,-252`} stroke={INK} strokeWidth={3} fill={t.dark} />
      {t.kind === 'vest' && <rect x={-90} y={-200} width={180} height={14} fill="#E7E2D0" opacity={0.9} />}
    </g>;
  } else if (t.kind === 'parka') {
    body = <g>
      <path d={`M${cx},-256 L${cx},-114`} stroke={INK} strokeWidth={3} />
      <path d={`M${cx - 3},-250 L${cx + 3},-250 M${cx - 3},-234 L${cx + 3},-234 M${cx - 3},-218 L${cx + 3},-218 M${cx - 3},-202 L${cx + 3},-202 M${cx - 3},-186 L${cx + 3},-186 M${cx - 3},-170 L${cx + 3},-170 M${cx - 3},-154 L${cx + 3},-154 M${cx - 3},-138 L${cx + 3},-138`} stroke={INK} strokeWidth={1.6} />
      <rect x={cx - 52 * w} y={-150} width={34 * w} height={26} rx={4} fill={t.dark} stroke={INK} strokeWidth={2.5} />
      <rect x={cx + 18 * w} y={-150} width={34 * w} height={26} rx={4} fill={t.dark} stroke={INK} strokeWidth={2.5} />
      <path d={`M${cx - 46},-262 Q${cx},-236 ${cx + 46},-262 L${cx + 40},-244 Q${cx},-224 ${cx - 40},-244 Z`} fill={t.light} stroke={INK} strokeWidth={3} />
    </g>;
  } else if (t.kind === 'uniform') {
    body = <g>
      <path d={`M${cx - 30},-258 L${cx - 30},-236 L${cx + 30},-236 L${cx + 30},-258`} fill={t.dark} stroke={INK} strokeWidth={3} />
      <path d={`M${cx},-236 L${cx},-114`} stroke={INK} strokeWidth={2.5} />
      {[-220, -192, -164, -136].map((y) => <circle key={y} cx={cx + 9} cy={y} r={4.5} fill="#C8A64B" stroke={INK} strokeWidth={1.5} />)}
      <rect x={cx - 56 * w} y={-214} width={30 * w} height={20} rx={3} fill={t.dark} stroke={INK} strokeWidth={2} />
      {t.badge && view === 'front' && <g><rect x={cx + 22} y={-216} width={44} height={16} rx={2} fill="#F4F1EA" stroke={INK} strokeWidth={2} /><text x={cx + 44} y={-204} fontSize={10} textAnchor="middle" fontFamily="Marker" fill={INK}>{t.badge}</text></g>}
      <path d={`M-80,-200 L-60,-196 M80,-200 L60,-196`} stroke={t.trim ?? '#C8A64B'} strokeWidth={5} />
    </g>;
  } else if (t.kind === 'suit' || t.kind === 'coat' || t.kind === 'doorman') {
    const shirt = t.shirt ?? '#F4F1EA';
    body = <g>
      {t.kind !== 'doorman' && <path d={`M${cx - 26},-256 L${cx},-196 L${cx + 26},-256 Z`} fill={shirt} stroke={INK} strokeWidth={2.5} />}
      {t.tie && <path d={`M${cx - 6},-246 L${cx + 6},-246 L${cx + 9},-206 L${cx},-194 L${cx - 9},-206 Z`} fill={t.tie} stroke={INK} strokeWidth={2} />}
      {t.kind !== 'doorman' && <>
        <path d={`M${cx - 26},-256 L${cx - 44},-226 L${cx - 30},-218 L${cx},-170`} fill="none" stroke={INK} strokeWidth={3} />
        <path d={`M${cx + 26},-256 L${cx + 44},-226 L${cx + 30},-218 L${cx},-170`} fill="none" stroke={INK} strokeWidth={3} />
        <path d={`M${cx},-170 L${cx},-114`} stroke={INK} strokeWidth={2.5} />
        <circle cx={cx + 6} cy={-150} r={4} fill={t.dark} stroke={INK} strokeWidth={1.5} />
        <circle cx={cx + 6} cy={-130} r={4} fill={t.dark} stroke={INK} strokeWidth={1.5} />
        <path d={`M${cx - 58 * w},-152 L${cx - 24 * w},-152`} stroke={INK} strokeWidth={2.5} />
        <path d={`M${cx + 24 * w},-152 L${cx + 58 * w},-152`} stroke={INK} strokeWidth={2.5} />
      </>}
      {t.kind === 'doorman' && <>
        <path d={`M${cx - 22},-252 L${cx - 22},-114 M${cx + 22},-252 L${cx + 22},-114`} stroke={t.trim ?? '#C8A64B'} strokeWidth={5} />
        {[-230, -200, -170, -140].map((y) => <g key={y}><circle cx={cx - 22} cy={y} r={4.5} fill="#C8A64B" stroke={INK} strokeWidth={1.5} /><circle cx={cx + 22} cy={y} r={4.5} fill="#C8A64B" stroke={INK} strokeWidth={1.5} /></g>)}
        <path d={`M${cx - 30},-258 L${cx - 30},-240 L${cx + 30},-240 L${cx + 30},-258`} fill={t.dark} stroke={INK} strokeWidth={3} />
      </>}
      {t.badge && view === 'front' && <g><path d={`M${cx - 36},-252 L${cx - 46},-196`} stroke="#2C3E50" strokeWidth={3} /><rect x={cx - 64} y={-198} width={38} height={26} rx={3} fill="#F4F1EA" stroke={INK} strokeWidth={2} /><text x={cx - 45} y={-181} fontSize={8} textAnchor="middle" fontFamily="Marker" fill={INK}>{t.badge}</text></g>}
    </g>;
  } else if (t.kind === 'vest') {
    const shirt = t.shirt ?? '#6B6F73';
    body = <g>
      <rect x={-90} y={-262} width={180} height={180} fill={shirt} />
      <path d={`M${cx - 58 * w},-250 L${cx - 18},-250 L${cx - 10},-114 L${-90},-114 Z`} fill={t.color} stroke={INK} strokeWidth={2.5} />
      <path d={`M${cx + 58 * w},-250 L${cx + 18},-250 L${cx + 10},-114 L${90},-114 Z`} fill={t.color} stroke={INK} strokeWidth={2.5} />
      <rect x={-90} y={-176} width={180} height={12} fill="#E7E2D0" opacity={0.95} />
      <rect x={-90} y={-144} width={180} height={12} fill="#E7E2D0" opacity={0.95} />
      <rect x={cx + 24} y={-232} width={26} height={18} rx={3} fill={t.dark} stroke={INK} strokeWidth={2} />
    </g>;
  }
  return (
    <g clipPath={`url(#${clip})`}>
      {body}
      {hem}
      {folds}
      {/* shade on the far side + highlight streaks */}
      <path d={`M${40 * w},-258 C${100 * w},-220 ${100 * w},-120 ${30 * w},-92 L${120},-92 L${120},-258 Z`} fill="#000" opacity={0.14} />
      <path d={`M${-58 * w},-226 Q${-64 * w},-196 ${-60 * w},-170`} stroke="#fff" strokeWidth={4} opacity={0.35} fill="none" strokeLinecap="round" />
      {o.scarf && !back && <g>
        <path d={`M${cx - 44},-258 Q${cx},-236 ${cx + 44},-258 L${cx + 44},-240 Q${cx},-218 ${cx - 44},-240 Z`} fill={o.scarf} stroke={INK} strokeWidth={2.5} />
        <path d={`M${cx + 18},-236 L${cx + 26},-180 L${cx + 42},-182 L${cx + 34},-238 Z`} fill={o.scarf} stroke={INK} strokeWidth={2.5} />
        <path d={`M${cx + 24},-192 L${cx + 40},-194`} stroke={INK} strokeWidth={1.5} />
      </g>}
    </g>
  );
};

/* ------------------------------------------------------------------ arms */
type Pt = [number, number];
const armPts = (pose: Pose, t: number, side: -1 | 1): Pt[] => {
  const sh: Pt = [side * 60, -224];
  switch (pose) {
    case 'talk': return side === 1 ? [sh, [96, -178], [124, -214]] : [sh, [-78, -170], [-80, -128]];
    case 'point': return side === 1 ? [sh, [130, -230], [176, -236]] : [sh, [-78, -170], [-80, -128]];
    case 'hold': return [sh, [side * 72, -168], [side * 34, -172]];
    case 'cheer': return [sh, [side * 96, -282], [side * 108, -340]];
    case 'shrug': return [sh, [side * 92, -172], [side * 128, -204]];
    case 'walk': { const s = Math.sin(t * Math.PI * 2 * 1.6) * side; return [sh, [side * 70 + s * 26, -170], [side * 72 + s * 44, -124]]; }
    default: return [sh, [side * 76, -176], [side * 80, -130]];
  }
};
const Arm: React.FC<{ pts: Pt[]; c: string }> = ({ pts, c }) => (
  <g>
    <path d={`M${pts[0][0]},${pts[0][1]} Q${pts[1][0]},${pts[1][1]} ${pts[2][0]},${pts[2][1]}`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
    <ellipse cx={pts[2][0]} cy={pts[2][1]} rx={10} ry={9} fill={c} stroke={INK} strokeWidth={3.5} />
  </g>
);

/* ------------------------------------------------------------------ symbols */
export const EmotionSymbol: React.FC<{ s: Symbol; x?: number; y?: number }> = ({ s, x = 80, y = HY - 70 }) => {
  if (!s) return null;
  if (s === 'sweat') return <path transform={`translate(${x},${y + 30})`} d="M0,-18 C8,-6 12,2 12,8 A12,12 0 1 1 -12,8 C-12,2 -8,-6 0,-18 Z" fill="#9BD3F0" stroke={INK} strokeWidth={3} />;
  if (s === 'anger') return <g transform={`translate(${x},${y})`} stroke="#C33631" strokeWidth={6} fill="none" strokeLinecap="round">
    <path d="M-14,-4 Q-4,-4 -4,-14 M14,-4 Q4,-4 4,-14 M-14,4 Q-4,4 -4,14 M14,4 Q4,4 4,14" /></g>;
  if (s === 'sparkle') return <g transform={`translate(${x},${y})`} fill="#F4E9B8" stroke={INK} strokeWidth={2.5}>
    <path d="M0,-18 L5,-5 L18,0 L5,5 L0,18 L-5,5 L-18,0 L-5,-5 Z" /><path transform="translate(-30,24) scale(.55)" d="M0,-18 L5,-5 L18,0 L5,5 L0,18 L-5,5 L-18,0 L-5,-5 Z" /></g>;
  return <g transform={`translate(${-x * 0.2},${y - 10})`} fill="#F4E9B8" stroke={INK} strokeWidth={2.5}>
    {[0, 1, 2].map((i) => <path key={i} transform={`translate(${Math.cos(i * 2.1) * 50},${Math.sin(i * 2.1) * 14}) scale(.6)`} d="M0,-18 L5,-5 L18,0 L5,5 L0,18 L-5,5 L-18,0 L-5,-5 Z" />)}
    <ellipse cx={0} cy={0} rx={56} ry={16} fill="none" strokeDasharray="6 8" /></g>;
};

/* ------------------------------------------------------------------ Character */
export const Character: React.FC<CharacterProps> = ({
  outfit: o, view = 'front', dir = 1, expr = 'neutral', pose = 'idle', mouth = null, blink = false,
  symbol = null, t = 0, prop, shadow = 0.3, headTilt = 0, idPrefix,
}) => {
  const fx = view === '3q' ? 22 : view === 'side' ? 44 : 0;
  const w = view === 'side' ? 0.8 : 1;
  const bob = Math.sin(t * Math.PI * 2 / 3.4) * 2.2 + (pose === 'walk' ? Math.abs(Math.sin(t * Math.PI * 2 * 1.6)) * -6 : 0);
  const clip = `${idPrefix}-torso`, hclip = `${idPrefix}-head`, vig = `${idPrefix}-vig`;
  const legSwing = pose === 'walk' ? Math.sin(t * Math.PI * 2 * 1.6) * 16 : 0;
  const flip = (view === '3q' || view === 'side') && dir === -1 ? -1 : 1;
  const armsBehind = view === 'back';
  const arms = (pose !== 'idle' || view !== 'back') ? (
    <g>
      {view !== 'side' && <Arm c={o.skin} pts={armPts(pose, t, -1)} />}
      <Arm c={o.skin} pts={armPts(pose, t, 1)} />
    </g>
  ) : null;
  return (
    <g>
      {shadow > 0 && <ellipse cx={30} cy={2} rx={95} ry={15} fill="#000" opacity={shadow} />}
      <g transform={`scale(${flip},1)`}>
        <defs>
          <clipPath id={clip}><path d={torsoPath(w)} /></clipPath>
          <clipPath id={hclip}><circle cx={HX} cy={HY} r={HR} /></clipPath>
          <radialGradient id={vig} cx="0.42" cy="0.4" r="0.62">
            <stop offset="0.55" stopColor={o.skin} />
            <stop offset="1" stopColor={o.skinShade} />
          </radialGradient>
        </defs>
        {/* legs */}
        <g stroke={o.legs} strokeWidth={9} strokeLinecap="round">
          <line x1={-20 * w} y1={-100} x2={-22 * w - legSwing} y2={-6} />
          <line x1={20 * w} y1={-100} x2={22 * w + legSwing} y2={-6} />
        </g>
        <ellipse cx={-24 * w - legSwing + (view === 'side' ? 8 : 0)} cy={-4} rx={view === 'side' ? 18 : 15} ry={8} fill={o.shoes} stroke={INK} strokeWidth={2.5} />
        <ellipse cx={24 * w + legSwing + (view === 'side' ? 8 : 0)} cy={-4} rx={view === 'side' ? 18 : 15} ry={8} fill={o.shoes} stroke={INK} strokeWidth={2.5} />
        <g transform={`translate(0,${bob})`}>
          {armsBehind && arms}
          {/* torso */}
          <path d={torsoPath(w)} fill={o.top.color} />
          <Clothes o={o} view={view} w={w} clip={clip} />
          <path d={torsoPath(w)} fill="none" stroke={INK} strokeWidth={SW} />
          {/* head */}
          <g transform={`rotate(${headTilt},0,-250)`}>
            <Hair o={o} view={view} fx={fx} layer="back" />
            <circle cx={HX} cy={HY} r={HR} fill={`url(#${vig})`} />
            <g clipPath={`url(#${hclip})`}>
              <path fillRule="evenodd" d={`M${HX - HR},${HY} a${HR},${HR} 0 1,0 ${2 * HR},0 a${HR},${HR} 0 1,0 ${-2 * HR},0 Z M${HX - HR - 14},${HY - 12} a${HR},${HR} 0 1,0 ${2 * HR},0 a${HR},${HR} 0 1,0 ${-2 * HR},0 Z`} fill={o.skinShade} opacity={0.55} />
            </g>
            <circle cx={HX} cy={HY} r={HR} fill="none" stroke={INK} strokeWidth={SW} />
            <path d={`M${HX - 62},${HY - 30} A70,70 0 0,1 ${HX - 26},${HY - 64}`} stroke="#fff" strokeWidth={3.5} fill="none" opacity={0.75} strokeLinecap="round" />
            {view !== 'back' && (expr === 'happy' || expr === 'neutral') && <>
              {view !== 'side' && <ellipse cx={view === 'front' ? -40 : fx - 30} cy={HY + 18} rx={11} ry={6} fill="#E58B7A" opacity={0.35} />}
              <ellipse cx={view === 'front' ? 40 : view === '3q' ? fx + 40 : fx + 6} cy={HY + 18} rx={11} ry={6} fill="#E58B7A" opacity={0.35} />
            </>}
            <Eyes expr={expr} blink={blink} view={view} fx={fx} />
            <Brows expr={expr} view={view} fx={fx} />
            <MouthShape expr={expr} mouth={mouth} view={view} fx={fx} />
            {o.glasses && <Glasses kind={o.glasses} view={view} fx={fx} />}
            <Hair o={o} view={view} fx={fx} layer="front" />
            <Hat o={o} view={view} fx={fx} />
            {expr === 'panic' && <EmotionSymbol s="sweat" />}
            {symbol && <EmotionSymbol s={symbol} />}
          </g>
          {pose === 'hold' && prop && <g transform="translate(0,-170)">{prop}</g>}
          {!armsBehind && arms}
        </g>
      </g>
    </g>
  );
};
