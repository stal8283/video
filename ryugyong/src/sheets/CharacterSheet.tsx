import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Character, Expr, Pose, View, Outfit } from '../rig/Character';
import { MAIN, EXTRAS, GUEST, CLERK, EXEC } from '../rig/outfits';
import { Pyramid } from '../props/Pyramid';
import { Suitcase, DeskBell, Clipboard, Blueprint, GlassPanel } from '../props/Props';
import { FONT_CSS } from '../ui/fonts';

const INK = '#111111';
const Label: React.FC<{ x: number; y: number; size?: number; children: React.ReactNode; anchor?: 'start' | 'middle'; color?: string }> = ({ x, y, size = 30, children, anchor = 'middle', color = INK }) => (
  <text x={x} y={y} fontFamily="Marker" fontSize={size} textAnchor={anchor} fill={color}>{children}</text>
);

const PROPS: Record<string, React.ReactNode> = {
  'The Guest': <Suitcase />, 'The Clerk': <DeskBell />, 'The Hotel Exec': <Clipboard />,
};
const EXPRS: Record<string, Expr[]> = {
  'The Guest': ['neutral', 'happy', 'surprised', 'concerned', 'thinking', 'panic'],
  'The Clerk': ['deadpan', 'neutral', 'thinking', 'angry', 'sad', 'surprised'],
  'The Hotel Exec': ['neutral', 'happy', 'concerned', 'thinking', 'deadpan', 'angry'],
};
const NOTES: Record<string, string> = {
  'The Guest': 'asks the questions - signature: round glasses + scarf',
  'The Clerk': 'deadpan answers - signature: peaked cap',
  'The Hotel Exec': 'signs, then walks away - signature: bun + lanyard',
};

const Row: React.FC<{ o: Outfit; y: number; i: number }> = ({ o, y, i }) => {
  const base = y + 560;
  const id = `r${i}`;
  const views: View[] = ['3q', 'side', 'back'];
  const poses: Pose[] = ['talk', 'point', 'hold', 'shrug'];
  const sw = [o.skin, o.skinShade, o.hair.color, o.top.color, o.top.dark, o.legs, o.hat?.color].filter(Boolean) as string[];
  return (
    <g>
      <rect x={60} y={y} width={3720} height={600} rx={18} fill="#ECE7DA" stroke="#CFC7B4" strokeWidth={3} />
      <Label x={90} y={y + 54} size={44} anchor="start">{o.name.toUpperCase()}</Label>
      <Label x={90} y={y + 92} size={24} anchor="start" color="#5A5248">{NOTES[o.name]}</Label>
      <g transform={`translate(330,${base}) scale(1.08)`}><Character outfit={o} idPrefix={`${id}f`} expr={i === 1 ? 'deadpan' : 'neutral'} /></g>
      <Label x={330} y={y + 588} size={22}>FRONT</Label>
      {views.map((v, k) => (
        <g key={v}>
          <g transform={`translate(${640 + k * 210},${base}) scale(0.8)`}><Character outfit={o} view={v} dir={1} idPrefix={`${id}v${k}`} expr={i === 1 ? 'deadpan' : 'neutral'} /></g>
          <Label x={640 + k * 210} y={y + 588} size={22}>{v === '3q' ? '3/4' : v.toUpperCase()}</Label>
        </g>
      ))}
      {/* expressions: heads only */}
      {EXPRS[o.name].map((e, k) => {
        const cx = 1360 + (k % 3) * 200, cy = y + 150 + Math.floor(k / 3) * 230;
        return (
          <g key={e}>
            <defs><clipPath id={`${id}c${k}`}><rect x={cx - 95} y={cy - 110} width={190} height={190} /></clipPath></defs>
            <g clipPath={`url(#${id}c${k})`}>
              <g transform={`translate(${cx},${cy + 200}) scale(0.62)`}><Character outfit={o} idPrefix={`${id}e${k}`} expr={e} shadow={0} /></g>
            </g>
            <Label x={cx} y={cy + 108} size={20}>{e.toUpperCase()}</Label>
          </g>
        );
      })}
      {poses.map((p, k) => (
        <g key={p}>
          <g transform={`translate(${2090 + k * 230},${base - 10}) scale(0.68)`}>
            <Character outfit={o} pose={p} idPrefix={`${id}p${k}`} expr={p === 'shrug' ? 'deadpan' : p === 'point' ? 'happy' : 'neutral'} mouth={p === 'talk' ? 'tallO' : null} prop={PROPS[o.name]} />
          </g>
          <Label x={2090 + k * 230} y={y + 588} size={22}>{p.toUpperCase()}</Label>
        </g>
      ))}
      {/* talking mouth set */}
      {(['closed', 'smallO', 'tallO', 'wide', 'smile'] as const).map((m, k) => {
        const cx = 3070 + (k % 3) * 150, cy = y + 150 + Math.floor(k / 3) * 190;
        return (
          <g key={m}>
            <defs><clipPath id={`${id}m${k}`}><rect x={cx - 70} y={cy - 70} width={140} height={140} /></clipPath></defs>
            <g clipPath={`url(#${id}m${k})`}><g transform={`translate(${cx},${cy + 125}) scale(0.5)`}><Character outfit={o} idPrefix={`${id}m${k}c`} mouth={m} shadow={0} /></g></g>
            <Label x={cx} y={cy + 88} size={18}>{m === 'smallO' ? 'SMALL O' : m === 'tallO' ? 'TALL O' : m.toUpperCase()}</Label>
          </g>
        );
      })}
      <Label x={3520} y={y + 410} size={20}>MOUTH SET</Label>
      {sw.map((c, k) => (
        <g key={k}><rect x={3000 + k * 100} y={y + 470} width={80} height={60} rx={6} fill={c} stroke={INK} strokeWidth={3} />
          <text x={3040 + k * 100} y={y + 552} fontSize={15} textAnchor="middle" fontFamily="monospace" fill="#5A5248">{c}</text></g>
      ))}
    </g>
  );
};

export const CharacterSheet: React.FC = () => (
  <AbsoluteFill style={{ background: '#F4F1EA' }}>
    <style>{FONT_CSS}</style>
    <svg width={3840} height={2700} viewBox="0 0 3840 2700">
      <Label x={70} y={78} size={60} anchor="start">THE HOTEL THAT HAS NEVER HAD A SINGLE GUEST - CAST &amp; HERO OBJECT</Label>
      {MAIN.map((o, i) => <Row key={o.name} o={o} y={120 + i * 630} i={i} />)}
      {/* extras + props */}
      <rect x={60} y={2020} width={1980} height={640} rx={18} fill="#ECE7DA" stroke="#CFC7B4" strokeWidth={3} />
      <Label x={90} y={2074} size={44} anchor="start">EXTRAS</Label>
      {EXTRAS.map((o, k) => (
        <g key={o.name}>
          <g transform={`translate(${230 + k * 300},${2560}) scale(0.95)`}>
            <Character outfit={o} idPrefix={`x${k}`} pose={k === 0 ? 'hold' : k === 1 ? 'hold' : 'idle'} prop={k === 0 ? <Blueprint /> : k === 1 ? <GlassPanel /> : undefined} expr={k === 3 ? 'surprised' : 'neutral'} />
          </g>
          <Label x={230 + k * 300} y={2620} size={20}>{o.name.toUpperCase()}</Label>
        </g>
      ))}
      <g transform="translate(1500,2350)"><Suitcase /></g>
      <g transform="translate(1720,2380)"><DeskBell /></g>
      <g transform="translate(1880,2340)"><Clipboard /></g>
      <g transform="translate(1600,2520)"><Blueprint /></g>
      <g transform="translate(1860,2530) scale(.7)"><GlassPanel /></g>
      <Label x={1700} y={2620} size={20}>PROPS</Label>
      {/* hero object */}
      <rect x={2080} y={2020} width={1700} height={640} rx={18} fill="#ECE7DA" stroke="#CFC7B4" strokeWidth={3} />
      <Label x={2110} y={2074} size={44} anchor="start">HERO OBJECT - THE PYRAMID</Label>
      <defs><clipPath id="litpanel"><rect x={3240} y={2090} width={500} height={540} rx={12} /></clipPath></defs>
      <rect x={3240} y={2090} width={500} height={540} rx={12} fill="#13192B" />
      {(['concrete', 'glass', 'lit'] as const).map((s, k) => (
        <g key={s}>
          <g clipPath={s === 'lit' ? 'url(#litpanel)' : undefined}><g transform={`translate(${2420 + k * 570},${2585}) scale(0.4)`}><Pyramid state={s} idPrefix={`h${k}`} t={1.3} /></g></g>
          <Label x={2420 + k * 570} y={2620} size={20} color={s === 'lit' ? '#F4F1EA' : INK}>{s === 'concrete' ? '1992-2008: BARE SHELL' : s === 'glass' ? '2011: GLASS SKIN' : 'NIGHT: LED SHOW'}</Label>
        </g>
      ))}
    </svg>
  </AbsoluteFill>
);
