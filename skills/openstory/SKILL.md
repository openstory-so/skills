---
name: openstory
description: >
  Create multi-scene AI videos with OpenStory's public HTTP API — turn a
  script or brief into a sequence, enhance a script, poll generation, and
  export a stitched MP4. Use when asked to make, generate, or produce a
  video or OpenStory sequence from a script or idea; to enhance or expand
  an OpenStory script; to check OpenStory generation status; or to
  export/download an OpenStory MP4. Not for editing the OpenStory codebase.
---

# OpenStory

Public API at `https://openstory.so`. Override the origin only when the user
gives a self-hosted base URL.

## Discover first

`GET {origin}/api/v1` (unauthenticated). The body is the contract:
`instructions`, `requestSchema`, and `_links`. Follow `_links` (each has
`method`; writes also have `contentType` and `examples`). Do not hardcode
paths or paste the schema into later calls from memory — if a field is
unclear, re-read `requestSchema` or `GET {origin}/api/v1/openapi.json`.

## Auth

Required on every call except the root.

1. Read `OPENSTORY_API_KEY` from the environment.
2. If it is missing, stop. Tell the user to create a key under
   **Settings → Developer** at the origin and export
   `OPENSTORY_API_KEY`. Do not open the dashboard unless they ask.
3. Send `Authorization: Bearer $OPENSTORY_API_KEY` (or `x-api-key`).

Keys are team-scoped. `429` includes `Retry-After` — honor it. Errors are
always `{ "error": { "code", "message", "details"? } }`.

## Create a video

API defaults are stills (`motion`/`music` false). Unless the user says
otherwise, send `motion: true`, `music: true`, `enhance: "auto"`. Set
`targetSeconds` from the brief; omit it if they did not imply a length.
`music: true` requires `motion: true`.

Pass style, cast, and locations as **names** or inline `{ name, ... }`
objects. Never invent ids. Omit `style` to let the API pick. Do not send
person `referenceImageUrls` unless the user provided images and the live
schema's portrait-attestation fields.

`POST` the `_links.create-sequence` href with a JSON body. Expect `202`.
Take `sequences[0]`; follow its `_links.poll` (or `statusUrl`).

## Poll generation

Sequence status long-polls. Append `?wait=60s` (also `30`, `2m`,
`1500ms`; cap 90s). A malformed `wait` is `400` — do not invent other
syntax.

Repeat `GET` on the poll link until `X-Wait-Done: true`. Then:

- `failed` / `archived` → report and stop.
- `completed` → read `counts`. `videosFailed > 0` means the run finished
  with broken shots; say so. Do not call it a full success.

Status is database-backed; reconnecting and polling again is correct.

## Export MP4

Export only when `counts.videosReady === counts.shots` and
`videosFailed === 0`. Otherwise the export `POST` rejects a partial cut.

1. `POST` `_links.create-export` (empty JSON object is valid).
2. `GET` `_links.exports` until an entry is `ready` (use its `url`) or
   `failed` (surface `error`). Export list does **not** long-poll.
3. Return the HTTPS URL. Download to disk only if the user asked for a
   local file.

## Enhance only

When the user wants a script, not a video: `POST` `_links.enhance-script`.
The response is SSE:

- unnamed `data:` frames → `{ "delta": "..." }`
- `event: done` → `{ "enhancedScript", "_links" }`
- `event: error` → fail

Stop after `done` unless they then want a sequence — follow that
response's `create-sequence` example (`enhance: "off"`).

## List

`GET` `_links.list-sequences` for this key's sequences. Page with the
`next` link; its absence is the end.
