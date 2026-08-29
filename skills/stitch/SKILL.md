---
name: stitch
description: >
  Stitch a list of video clips into one MP4 — optionally adding a music track,
  either replacing the clips' audio or mixed underneath it — using a local
  WebCodecs page. Use whenever the user asks to "stitch these videos",
  "join/combine/concatenate clips", "assemble the takes into one video", "add
  music under the cut", "mix music with the audio", "keep the dialogue and add
  music", or wants a single deliverable MP4 from several generated shots. Runs
  entirely locally: a tiny server opens a stitcher page in the browser, the
  page decodes and re-encodes with WebCodecs, and the result is saved back to
  disk.
---

# stitch workflow

The CLI lives in `scripts/stitch.ts` **next to this SKILL.md** — run it from
the skill directory with plain node (Node 22+). It starts a local HTTP
server, opens a stitcher page in the default browser, and blocks until the
page has produced the final MP4 and POSTed it back. The page decodes every
clip with WebCodecs (via mediabunny), re-encodes them back-to-back onto one
timeline, and writes a single `h264 + aac` MP4.

```bash
node <this-skill-dir>/scripts/stitch.ts <video1> <video2> [...] \
  [--music <audio-file>] \
  [--mix]                   # mix music WITH the clips' audio (default: replace)
  [--music-gain <0..1>]     # music level; defaults to 0.5 with --mix, 1 otherwise
  [--out <file.mp4>]        # default ./stitched.mp4 (written atomically)
  [--port <n>]              # default: random free port
  [--no-open]               # don't open the browser (you navigate yourself)
  [--stay]                  # keep serving after save (default: exit on save)
```

mediabunny is served from local `node_modules` when installed; otherwise the
page loads it from the jsdelivr CDN, so the skill works standalone.

Clip order = argument order. Accepted video inputs: mp4/m4v/mov/webm/mkv.
Music: mp3/m4a/aac/wav/ogg/flac (also mp4/webm audio).

## Behavior

- **Video**: each clip is fully re-encoded (h264 preferred, falls back to
  hevc/vp9/av1 by encoder support). Mixed resolutions are letterboxed into
  the first clip's frame size (`contain`). Each clip boundary starts on a
  keyframe.
- **Audio**: with `--music` alone, the music track replaces all clip audio
  and is laid under the full cut, looping if shorter and trimmed to the
  video length. Add `--mix` to keep the clips' own audio and blend the
  music underneath it (Web Audio offline render; music ducked to 0.5 by
  default, tune with `--music-gain`). Without `--music`, the clips' own
  audio is carried through (normalized to 48 kHz stereo AAC); if no clip
  has audio the output is video-only.
- **Choosing replace vs mix**: if the clips carry audio worth keeping
  (dialogue, generated sound effects, ambience) and the user wants music
  too, use `--music … --mix`. Use `--music` alone when the clips are
  silent or the user explicitly wants their audio replaced. When the user
  says the music is too loud/quiet in a mix, re-run with a different
  `--music-gain` (0.3 quiet bed → 0.7 prominent).
- Requires a WebCodecs browser (Chrome/Edge). The whole pipeline is local —
  nothing is uploaded.

## Driving it as an agent

Run it in the background and watch stdout — every line is JSON:

1. First line: `{"url": "http://127.0.0.1:<port>/", "videos": n, "music": ..., "out": ...}`.
   The browser opens automatically (unless `--no-open`) and stitching starts
   with no user interaction.
2. Page-side logs/errors are proxied back as `{"page": "..."}` lines — check
   these if nothing gets saved (e.g. a clip with no video track, or an
   unsupported codec).
3. Success line: `{"saved": "<abs path>", "bytes": n}` — then the process
   exits by itself (unless `--stay`). Treat that line as completion; verify
   with `ffprobe` if the result matters.

A short clip list finishes in seconds; budget roughly real-time for longer
cuts (decode + encode is faster than realtime on Apple Silicon).

Typical hand-off from the create-sequence flow: the API's export already
returns a stitched MP4, so reach for this skill when the cut needs local
control — download the individual shot videos, pass them in scene order
(reorder or drop shots as needed), add a music bed with `--music` (and
`--mix` to keep the shots' own audio), and `--out <dir>/<name>.mp4`.
