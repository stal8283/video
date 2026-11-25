#!/usr/bin/env bash
# Rebuild the short from script assets (vo.mp3 + words.json already generated via ElevenLabs).
set -e; cd "$(dirname "$0")"
python3 render.py && python3 audio.py
ffmpeg -loglevel error -y -i video_only.mp4 -i vo.mp3 -i sfx.wav -filter_complex "[1:a]adelay=150|150,highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=80,volume=1.6[v];[2:a]volume=0.9[s];[s][v]sidechaincompress=threshold=0.05:ratio=4:attack=20:release=300[sd];[1:a]adelay=150|150,highpass=f=80,acompressor=threshold=-18dB:ratio=3,volume=1.6[v2];[sd][v2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]" -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 24 -c:a aac -b:a 192k -movflags +faststart -shortest flannan_isles_short.mp4
