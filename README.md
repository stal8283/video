# video

GTA 6 shorts workflow. The research and ideas are in **[CONTENT_PLAN.md](CONTENT_PLAN.md)**.

## Editing pipeline: `tools/shortmaker.py`

It turns raw gameplay captures and a script into a finished 1080x1920 short in the reference style:

- **Voiceover:** ElevenLabs TTS from your script, with word timings. You can use your own recorded voice instead: set `"audio": "path.wav"` and it is transcribed with faster-whisper.
- **Captions:** one word at a time with a pop-in animation. Money amounts are green and hype words yellow.
- **Layout:** gameplay cropped to 1080x`band_height` over a blurred copy of itself.
- **Callouts:** red bouncing arrows at the times and positions you set (to point at HUD cash, sell values and so on).
- **Audio:** voiceover on top, with game audio and optional music ducked under it.

### Setup
```
sudo apt install ffmpeg          # needs libass (standard builds have it)
pip install pillow numpy faster-whisper
# ElevenLabs: set ELEVENLABS_API_KEY (in the cloud env it is injected automatically)
```

### Making a video
1. Record gameplay at 1080p or higher with the HUD on, and put the files in `footage/`.
2. Copy `projects/TEMPLATE_loot_house.json`, then paste in the script and list the clips (`start`/`end` in seconds; `speed` is optional for fast-forwarding walking).
3. Run `python3 tools/shortmaker.py projects/<name>.json`. The video is written to `renders/`.
4. Watch it, adjust the callout `t`/`x`/`y` (frame coordinates on the 1080x1920 output), and run it again. The voiceover is cached, so re-renders don't spend more TTS credits unless the script changes.

`projects/demo_pipeline_test.json` is the internal test that was used to check the pipeline.
