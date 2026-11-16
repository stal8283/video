// Render preview stills: node scripts/stills.mjs [frame ...]  (default: middle of every scene)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const chromiumOptions = { gl: "swangle" };
const comp = await selectComposition({ serveUrl, id: "CarInWater", browserExecutable, chromiumOptions });
let frames = process.argv.slice(2).map(Number);
if (!frames.length) {
  const vo = JSON.parse(fs.readFileSync("public/voiceover.json", "utf8"));
  frames = Array.from({ length: 13 }, (_, i) => Math.round(((i + 0.5) / 13) * comp.durationInFrames));
}
fs.mkdirSync("out/stills", { recursive: true });
for (const frame of frames) {
  const t0 = Date.now();
  await renderStill({ composition: comp, serveUrl, frame, output: `out/stills/f${String(frame).padStart(4, "0")}.jpg`, imageFormat: "jpeg", jpegQuality: 85, browserExecutable, chromiumOptions, scale: 0.5 });
  console.log("frame", frame, Date.now() - t0, "ms");
}
