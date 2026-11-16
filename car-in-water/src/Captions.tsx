import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { fontFamily } from "./fonts";
import { FPS, WORDS_T } from "./timing";


// highlight colour for key words
const HOT = new Set(["911", "911.", "floats.", "minute.", "door.", "eight", "minutes", "off.", "open.", "first.", "you.", "side", "glass.", "windshield.", "window.", "one", "flying."]);

/** One word at a time, cut on the exact frame it is spoken, ~70% down the frame. */
export const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  let idx = -1;
  for (let i = 0; i < WORDS_T.length; i++) {
    if (WORDS_T[i].start <= t + 0.001) idx = i;
    else break;
  }
  if (idx < 0) return null;
  const w = WORDS_T[idx];
  const next = WORDS_T[idx + 1];
  // hide during long pauses (>0.45s after the word ends)
  if (t > w.end + 0.45 && (!next || next.start > t)) return null;
  const local = f - Math.round(w.start * FPS);
  const pop = interpolate(local, [0, 2, 5], [0.86, 1.06, 1], { extrapolateRight: "clamp" });
  const clean = w.text.replace(/[.,!?]+$/, (m) => (m === "..." ? "" : m === "?" ? "?" : ""));
  const hot = HOT.has(w.text.toLowerCase());
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: "68%",
          transform: `translateY(-50%) scale(${pop})`,
          fontFamily,
          fontWeight: 900,
          fontSize: 92,
          letterSpacing: -1,
          color: hot ? "#ffd23f" : "#ffffff",
          WebkitTextStroke: "14px #000",
          paintOrder: "stroke fill",
          textShadow: "0 8px 18px rgba(0,0,0,0.45)",
          whiteSpace: "nowrap",
        }}
      >
        {clean}
      </div>
    </AbsoluteFill>
  );
};
