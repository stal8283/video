import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FPS, W, H, clamp, easeOut, rand } from '../lib';
import { ACCENT } from '../props/Pyramid';

/* Black text card: pure black, one line of Caveat, typed on locked to the voice, no pop, no tilt. */
export const BlackCard: React.FC<{ text: string; typeFrom: number; typeTo: number }> = ({ text, typeFrom, typeTo }) => {
  const frame = useCurrentFrame();
  // typeFrom/typeTo are shot-local frames: first letter at typeFrom, last letter by typeTo (>= 19 chars/s)
  const rate = Math.max(19 / FPS, text.length / Math.max(1, typeTo - typeFrom));
  const n = clamp(Math.floor((frame - typeFrom) * rate) + 1, 0, text.length);
  const size = Math.min(150, 1700 / (text.length * 0.43));
  return (
    <AbsoluteFill style={{ background: '#000000', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', fontFamily: 'Caveat', fontWeight: 700, fontSize: size, color: '#FFFFFF', whiteSpace: 'nowrap', lineHeight: 1 }}>
        <span style={{ visibility: 'hidden' }}>{text}</span>
        <span style={{ position: 'absolute', left: 0, top: 0 }}>{text.slice(0, n)}</span>
      </div>
    </AbsoluteFill>
  );
};

/* Chapter card: silent black card, Title Case, shown complete. */
export const ChapterCard: React.FC<{ text: string }> = ({ text }) => (
  <AbsoluteFill style={{ background: '#000000', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontFamily: 'Marker', fontSize: 92, color: '#F4F1EA', letterSpacing: 2 }}>{text}</div>
    <div style={{ width: 160, height: 6, background: ACCENT, marginTop: 28, borderRadius: 3 }} />
  </AbsoluteFill>
);

/* Title: cream hand-brushed caps laid over a live scene, lines arriving 0.3 s apart. */
export const TitleOverlay: React.FC<{ lines: { text: string; accent?: boolean }[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      {lines.map((l, i) => {
        const st = i * 9;
        const k = easeOut((frame - st) / 7);
        return (
          <div key={i} style={{
            fontFamily: 'Marker', fontSize: i === 1 ? 112 : 132, lineHeight: 1.08, color: l.accent ? ACCENT : '#F4F1EA',
            opacity: frame >= st ? 1 : 0, transform: `translateY(${(1 - k) * 26}px)`,
            textShadow: '0 6px 0 rgba(0,0,0,0.55), 0 0 40px rgba(0,0,0,0.6)', letterSpacing: 3,
          }}>{l.text}</div>
        );
      })}
    </AbsoluteFill>
  );
};

/* Date / place stamp: a small yellow tag on a string at a top corner, drops in and swings (damped pendulum). */
export const Stamp: React.FC<{ text: string; side?: 'left' | 'right'; from?: number; hold?: number }> = ({ text, side = 'left', from = 3, hold = 999 }) => {
  const frame = useCurrentFrame() - from;
  if (frame < 0 || frame > hold) return null;
  const drop = easeOut(frame / 8);
  const ang = 14 * Math.exp(-frame / 14) * Math.cos(frame / 3.2);
  const x = side === 'left' ? 150 : W - 150;
  const len = 70 + 40 * drop;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <g transform={`translate(${x},0) rotate(${ang})`}>
        <line x1={0} y1={0} x2={0} y2={len} stroke="#111" strokeWidth={3} />
        <g transform={`translate(0,${len})`}>
          <rect x={-text.length * 13 - 26} y={0} width={text.length * 26 + 52} height={64} rx={8} fill="#E8C547" stroke="#111" strokeWidth={4.5} />
          <circle cx={0} cy={12} r={5} fill="#111" />
          <text x={0} y={50} textAnchor="middle" fontFamily="Marker" fontSize={34} fill="#111">{text}</text>
        </g>
      </g>
    </svg>
  );
};

/* Small corner plate with a rolling counter (60% of the value in the first third). */
export const CounterPlate: React.FC<{ from: number; to: number; start: number; dur: number; label?: string; corner?: 'tl' | 'tr'; format?: (n: number) => string }> = ({ from, to, start, dur, label, corner = 'tr', format = (n) => Math.round(n).toLocaleString('en-US') }) => {
  const frame = useCurrentFrame();
  const t = clamp((frame - start) / dur);
  const k = t < 1 / 3 ? 0.6 * (t * 3) : 0.6 + 0.4 * easeOut((t - 1 / 3) * 1.5);
  const v = from + (to - from) * k;
  const appear = easeOut((frame - start + 6) / 6);
  if (frame < start - 6) return null;
  const left = corner === 'tl' ? 60 : W - 60 - 360;
  return (
    <div style={{ position: 'absolute', left, top: 60, width: 360, opacity: appear, transform: `translateY(${(1 - appear) * -20}px)` }}>
      <div style={{ background: '#16191F', border: '4px solid #111', borderRadius: 12, padding: '10px 18px', boxShadow: '0 6px 0 rgba(0,0,0,0.35)' }}>
        {label && <div style={{ fontFamily: 'Marker', fontSize: 24, color: '#BDB6A6', letterSpacing: 2 }}>{label}</div>}
        <div style={{ fontFamily: 'Marker', fontSize: 64, color: '#F4F1EA', lineHeight: 1.05 }}>{format(v)}</div>
        <div style={{ height: 5, width: 90, background: ACCENT, borderRadius: 3 }} />
      </div>
    </div>
  );
};

/* Dust puff: three soft blobs that fade within 8 frames */
export const Puff: React.FC<{ x: number; y: number; at: number; frame: number; s?: number; color?: string }> = ({ x, y, at, frame, s = 1, color = '#D8D0BE' }) => {
  const k = (frame - at) / 8;
  if (k < 0 || k > 1) return null;
  return <g opacity={1 - k}>{[0, 1, 2].map((i) => <circle key={i} cx={x + (i - 1) * 34 * s * (0.6 + k)} cy={y - 10 * s * k - (i === 1 ? 10 : 0)} r={(16 + 10 * k) * s} fill={color} stroke="#111" strokeWidth={2.5} />)}</g>;
};
export const Ring: React.FC<{ x: number; y: number; r: number; at: number; frame: number; color?: string }> = ({ x, y, r, at, frame, color = '#F4F1EA' }) => {
  const k = (frame - at) / 3;
  if (k < 0 || k > 1.6) return null;
  return <circle cx={x} cy={y} r={r * (1 + 0.1 * Math.min(1, k))} fill="none" stroke={color} strokeWidth={4} opacity={1 - k / 1.6} />;
};
void rand;
