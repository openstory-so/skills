/**
 * Stitch CLI — serve the WebCodecs stitcher page for a list of videos.
 *
 * Usage:
 *   node scripts/stitch.ts <video...> [--music <audio>] [--out <file.mp4>]
 *                          [--port <n>] [--no-open] [--stay]
 *
 * Starts a local HTTP server that serves the clips plus `scripts/stitch.html`,
 * opens the page in the default browser, and waits. The page decodes every
 * clip with WebCodecs, re-encodes them back-to-back into a single MP4 (music
 * track replacing the clips' own audio when given), then POSTs the result to
 * /save. The file is written atomically to --out and, unless --stay is set,
 * the server exits. Status lines are JSON on stdout; browser-side logs are
 * proxied back as {"page": ...} lines.
 */
import { spawn } from 'node:child_process'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import http from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const VIDEO_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
}

const AUDIO_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.mp4': 'audio/mp4',
  '.webm': 'audio/webm',
}

function fail(message: string): never {
  process.stderr.write(`${JSON.stringify({ error: message })}\n`)
  process.exit(1)
}

function contentTypeFor(filePath: string, kinds: Record<string, string>): string {
  const type = kinds[path.extname(filePath).toLowerCase()]
  if (!type) {
    fail(`unsupported file type: ${filePath} (expected one of ${Object.keys(kinds).join(', ')})`)
  }
  return type
}

function checkFile(filePath: string): string {
  const resolved = path.resolve(filePath)
  if (!existsSync(resolved) || !statSync(resolved).isFile()) fail(`file not found: ${filePath}`)
  return resolved
}

const { values: flags, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    music: { type: 'string' },
    mix: { type: 'boolean', default: false },
    'music-gain': { type: 'string' },
    out: { type: 'string' },
    port: { type: 'string' },
    'no-open': { type: 'boolean', default: false },
    stay: { type: 'boolean', default: false },
  },
})

if (positionals.length === 0) {
  fail(
    'usage: node scripts/stitch.ts <video...> [--music <audio>] [--mix] [--music-gain <0..1>] [--out <file.mp4>] [--port <n>] [--no-open] [--stay]',
  )
}

const videos = positionals.map((p) => ({
  path: checkFile(p),
  type: contentTypeFor(p, VIDEO_TYPES),
}))
const music = flags.music
  ? { path: checkFile(flags.music), type: contentTypeFor(flags.music, AUDIO_TYPES) }
  : null
if (flags.mix && music === null) fail('--mix requires --music')
// Mixing ducks the music under the clips' audio by default; solo music
// (replace mode) plays at full level unless --music-gain says otherwise.
const musicGain = flags['music-gain'] ? Number.parseFloat(flags['music-gain']) : flags.mix ? 0.5 : 1
if (Number.isNaN(musicGain) || musicGain < 0 || musicGain > 1) {
  fail(`invalid --music-gain: ${flags['music-gain'] ?? ''} (expected 0..1)`)
}
const outPath = path.resolve(flags.out ?? 'stitched.mp4')
const requestedPort = flags.port ? Number.parseInt(flags.port, 10) : 0
if (Number.isNaN(requestedPort)) fail(`invalid --port: ${flags.port ?? ''}`)

// Resolve the mediabunny browser bundle from a locally installed package
// (its exports map only exposes ".", so walk up from the resolved entry
// point to the package root, wherever the entry lives inside dist/). When
// the skill runs standalone with no node_modules around, the page imports
// the same bundle from the jsdelivr CDN instead.
const MEDIABUNNY_CDN =
  'https://cdn.jsdelivr.net/npm/mediabunny@1.50.9/dist/bundles/mediabunny.min.mjs'

function resolveMediabunnyBundle(): string | null {
  try {
    const require = createRequire(import.meta.url)
    let root = path.dirname(require.resolve('mediabunny'))
    while (path.basename(root) !== 'mediabunny' && root !== path.dirname(root)) {
      root = path.dirname(root)
    }
    const bundle = path.join(root, 'dist/bundles/mediabunny.mjs')
    return existsSync(bundle) ? bundle : null
  } catch {
    return null
  }
}

const mediabunnyBundle = resolveMediabunnyBundle()

const htmlTemplate = readFileSync(new URL('./stitch.html', import.meta.url), 'utf8')

const manifest = {
  videos: videos.map((v, i) => ({ name: path.basename(v.path), url: `/media/${i}` })),
  music: music ? { name: path.basename(music.path), url: '/music' } : null,
  mix: flags.mix,
  musicGain,
  outName: path.basename(outPath),
  bundleUrl: mediabunnyBundle ? '/mediabunny.mjs' : MEDIABUNNY_CDN,
}
// <-escape so a "</script>" in a filename cannot break out of the tag.
const manifestJson = JSON.stringify(manifest).replaceAll('<', '\\u003c')
const html = htmlTemplate.replace(/["']__MANIFEST__["']/, manifestJson)

function serveFile(res: http.ServerResponse, filePath: string, type: string): void {
  const { size } = statSync(filePath)
  res.writeHead(200, { 'content-type': type, 'content-length': size })
  createReadStream(filePath).pipe(res)
}

function readBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

const server = http.createServer((req, res) => {
  void handle(req, res).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`${JSON.stringify({ error: message })}\n`)
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: message }))
  })
})

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = req.url ?? '/'

  if (req.method === 'GET' && url === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(html)
    return
  }

  if (req.method === 'GET' && url === '/mediabunny.mjs' && mediabunnyBundle) {
    serveFile(res, mediabunnyBundle, 'text/javascript')
    return
  }

  if (req.method === 'GET' && url.startsWith('/media/')) {
    const index = Number.parseInt(url.slice('/media/'.length), 10)
    const video = videos[index]
    if (!video) {
      res.writeHead(404).end()
      return
    }
    serveFile(res, video.path, video.type)
    return
  }

  if (req.method === 'GET' && url === '/music' && music) {
    serveFile(res, music.path, music.type)
    return
  }

  if (req.method === 'POST' && url === '/log') {
    const body = await readBody(req)
    process.stdout.write(`${JSON.stringify({ page: body.toString('utf8') })}\n`)
    res.writeHead(204).end()
    return
  }

  if (req.method === 'POST' && url === '/save') {
    const body = await readBody(req)
    await mkdir(path.dirname(outPath), { recursive: true })
    const tmpPath = `${outPath}.tmp-${process.pid}`
    await writeFile(tmpPath, body)
    await rename(tmpPath, outPath)
    process.stdout.write(`${JSON.stringify({ saved: outPath, bytes: body.length })}\n`)
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ savedTo: outPath }), () => {
      if (!flags.stay) {
        server.close()
        setTimeout(() => process.exit(0), 200).unref()
      }
    })
    return
  }

  res.writeHead(404).end()
}

server.listen(requestedPort, '127.0.0.1', () => {
  const address = server.address()
  const port = address && typeof address === 'object' ? address.port : requestedPort
  const pageUrl = `http://127.0.0.1:${port}/`
  process.stdout.write(
    `${JSON.stringify({ url: pageUrl, videos: videos.length, music: manifest.music?.name ?? null, out: outPath })}\n`,
  )
  if (!flags['no-open']) {
    const opener = process.platform === 'darwin' ? 'open' : 'xdg-open'
    spawn(opener, [pageUrl], { stdio: 'ignore', detached: true }).unref()
  }
})
