// Draft word timings (~220 wpm) so the video can be previewed before the
// ElevenLabs voiceover exists. scripts/voiceover.mjs overwrites this file.
import fs from "node:fs";
const src = fs.readFileSync(new URL("../src/script.ts", import.meta.url), "utf8");
const text = src.match(/SCRIPT = `([\s\S]*?)`;/)[1];
let t = 0.15;
const words = text.split(/\s+/).filter(Boolean).map((w) => {
  const d = 0.08 + 0.036 * w.replace(/[^\w]/g, "").length;
  const out = { text: w, start: +t.toFixed(3), end: +(t + d).toFixed(3) };
  t += d + (/[.?!]$/.test(w) ? 0.26 : /[,]$/.test(w) ? 0.1 : /\.\.\.$/.test(w) ? 0.4 : 0.02);
  return out;
});
fs.writeFileSync(new URL("../public/voiceover.json", import.meta.url),
  JSON.stringify({ audio: null, duration: +(t + 0.6).toFixed(3), words }, null, 1));
console.log(`draft timings: ${words.length} words, ${t.toFixed(1)}s`);
