#!/usr/bin/env bash
# Rebuild the short: render video, synthesize the SFX mix, mix with the voiceover.
set -e; cd "$(dirname "$0")"
python3 keyer.py >/dev/null
python3 render.py && python3 audio.py
ffmpeg -loglevel error -y -i video_only.mp4 -i vo.mp3 -i sfx.wav -filter_complex "[1:a]adelay=150|150,highpass=f=80,equalizer=f=3500:t=q:w=1.2:g=3,highshelf=f=7000:g=7,acompressor=threshold=-18dB:ratio=3:attack=5:release=80,volume=1.5,aformat=channel_layouts=stereo,asplit=2[v][vk];[2:a]bass=g=6:f=75[sb];[sb][vk]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=350[sd];[sd][v]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]" -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 192k -movflags +faststart -shortest flannan_isles_short.mp4
