import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { BEATS } from './scenes/Beats';
import { f, T, FPS } from './lib';
import { FONT_CSS } from './ui/fonts';

import { CUES, BEDS } from './sfx';

/* Music ("Sneaky Snitch", Kevin MacLeod, CC BY 4.0): ducked ~-18 dB under speech, up in the silent title/chapter
   stretch, dipped for "the money runs out", near-silent for a beat after "Empty box.", lighter under skit 2. */
const speaking = (fr: number) => T.segments.some((sg) => fr / FPS >= sg.start - 0.15 && fr / FPS <= sg.end + 0.25);
const MUSIC_VOL = (() => {
  const raw = Array.from({ length: T.frames }, (_, i) => {
    const t = i / FPS;
    let v = speaking(i) ? 0.12 : 0.3;
    if (t >= 35.2 && t < 43.65) v *= 0.5;
    if (t >= 50.6 && t < 51.85) v *= 0.15;
    if (t >= 56.1 && t < 61.4) v *= 0.65;
    return v;
  });
  const out: number[] = []; let v = raw[0];
  for (let i = 0; i < raw.length; i++) { v += (raw[i] - v) * 0.15; out.push(v); }
  return out;
})();

export const Video: React.FC<{ audio?: boolean }> = ({ audio = true }) => (
  <AbsoluteFill style={{ background: '#000' }}>
    <style>{FONT_CSS}</style>
    {BEATS.map((b, i) => {
      const from = f(b.start);
      const to = i === BEATS.length - 1 ? T.frames : f(BEATS[i + 1].start);
      const C = b.C;
      return <Sequence key={b.id} from={from} durationInFrames={to - from} name={b.id}><C from={from} dur={to - from} /></Sequence>;
    })}
    {audio && <Audio src={staticFile('voiceover.wav')} />}
    {audio && <Audio src={staticFile('music.wav')} volume={(fr) => MUSIC_VOL[Math.min(MUSIC_VOL.length - 1, fr)]} />}
    {audio && BEDS.map((b, i) => {
      const n = Math.max(2, f(b.to) - f(b.from));
      return <Sequence key={`bed${i}`} from={f(b.from)} durationInFrames={n} name={`amb ${b.file}`}>
        <Audio src={staticFile(`sfx/${b.file}.wav`)} loop volume={(x) => b.vol * Math.min(1, x / 3, (n - x) / 3)} />
      </Sequence>;
    })}
    {audio && CUES.map((c, i) => <Sequence key={i} from={Math.max(0, f(c.at))} durationInFrames={c.dur ? Math.max(2, f(c.dur)) : undefined} name={`sfx ${c.what}`}><Audio src={staticFile(`sfx/${c.file}.wav`)} volume={c.vol} /></Sequence>)}
  </AbsoluteFill>
);
