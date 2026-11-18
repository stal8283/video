// Generates the voiceover with ElevenLabs and word-level timings for captions/scene sync.
// Usage: ELEVENLABS_API_KEY=... node scripts/voiceover.mjs [voiceId]
// (If the key is stored as a network secret for api.elevenlabs.io, the proxy injects it.)
import fs from "node:fs";
const src = fs.readFileSync(new URL("../src/script.ts", import.meta.url), "utf8");
const text = src.match(/SCRIPT = `([\s\S]*?)`;/)[1].replace(/\n/g, " ");
const voiceId = process.argv[2] || process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ"; // "Liam": energetic, conversational
const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "content-type": "application/json", "xi-api-key": process.env.ELEVENLABS_API_KEY || "proxy-injected" },
  body: JSON.stringify({
    text,
    model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
    voice_settings: { stability: 0.38, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true, speed: 1.2 },
  }),
});
if (!res.ok) { console.error(res.status, await res.text()); process.exit(1); }
const { audio_base64, alignment } = await res.json();
fs.writeFileSync(new URL("../public/voiceover.mp3", import.meta.url), Buffer.from(audio_base64, "base64"));
const { characters: ch, character_start_times_seconds: s, character_end_times_seconds: e } = alignment;
const words = []; let cur = null;
for (let i = 0; i < ch.length; i++) {
  if (/\s/.test(ch[i])) { if (cur) words.push(cur); cur = null; continue; }
  if (!cur) cur = { text: "", start: s[i], end: e[i] };
  cur.text += ch[i]; cur.end = e[i];
}
if (cur) words.push(cur);
const duration = e[e.length - 1] + 0.9;
fs.writeFileSync(new URL("../public/voiceover.json", import.meta.url),
  JSON.stringify({ audio: "voiceover.mp3", duration, words }, null, 1));
console.log(`voiceover: ${words.length} words, ${duration.toFixed(1)}s`);
