#!/bin/sh
# Browsers cannot play FLV. The game's FLVs contain H.264 video and AAC audio, so
# they are remuxed (streams copied, not re-encoded) into MP4 files placed next to
# the originals; the player loads the .mp4 sibling of any .flv URL.
# With --webm, a VP9/Opus WebM is also encoded (lossy) for browsers built without
# H.264 support (e.g. some open-source Chromium builds); it is tried after the MP4.
#   tools/video/remux-flv.sh [--webm] <assets directory>
set -e
webm=0
if [ "$1" = "--webm" ]; then webm=1; shift; fi
dir="${1:?usage: remux-flv.sh [--webm] <assets directory>}"
find "$dir" -name '*.flv' | while read -r f; do
  ffmpeg -nostdin -loglevel error -y -i "$f" -c copy -movflags +faststart "${f%.flv}.mp4"
  echo "remuxed $f -> ${f%.flv}.mp4"
  if [ "$webm" = 1 ]; then
    ffmpeg -nostdin -loglevel error -y -i "$f" -c:v libvpx-vp9 -b:v 0 -crf 32 -c:a libopus "${f%.flv}.webm"
    echo "encoded $f -> ${f%.flv}.webm"
  fi
done
