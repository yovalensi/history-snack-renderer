// Render worker: POST /render {"story":"spinoza","cut":"short"} with header "x-render-secret".
// Renders from BUNDLE_URL (Remotion bundle hosted on Bunny), uploads the MP4 to the Bunny storage zone,
// and returns its public CDN URL. One render at a time; a second request waits for the first.
import http from 'node:http'
import { readFile, rm } from 'node:fs/promises'
import { renderMedia, selectComposition } from '@remotion/renderer'

const { BUNDLE_URL, BUNNY_ZONE, BUNNY_KEY, BUNNY_CDN, RENDER_SECRET, PORT = '8080', CONCURRENCY = '8' } = process.env
let queue = Promise.resolve()

async function render({ story, cut }) {
  const inputProps = { story, ...(cut === 'short' && { cut: 'short' }) }
  const composition = await selectComposition({ serveUrl: BUNDLE_URL, id: 'Story', inputProps })
  const out = `/tmp/${story}-${cut}.mp4`
  const t0 = Date.now()
  await renderMedia({
    serveUrl: BUNDLE_URL, composition, inputProps, codec: 'h264', crf: 23, outputLocation: out,
    concurrency: Number(CONCURRENCY), chromiumOptions: { gl: 'swangle' },
  })
  const seconds = Math.round((Date.now() - t0) / 1000)
  const remote = `reels/${story}-${cut}.mp4`
  const res = await fetch(`https://storage.bunnycdn.com/${BUNNY_ZONE}/${remote}`, {
    method: 'PUT', headers: { AccessKey: BUNNY_KEY, 'Content-Type': 'application/octet-stream' }, body: await readFile(out),
  })
  await rm(out, { force: true })
  if (!res.ok) throw new Error(`upload ${res.status}`)
  return { url: `${BUNNY_CDN}/${remote}`, renderSeconds: seconds, durationFrames: composition.durationInFrames }
}

http
  .createServer((req, res) => {
    const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)) }
    if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true })
    if (req.method !== 'POST' || req.url !== '/render') return send(404, { error: 'not found' })
    if (req.headers['x-render-secret'] !== RENDER_SECRET) return send(401, { error: 'bad secret' })
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      let job
      try { job = JSON.parse(body) } catch { return send(400, { error: 'bad json' }) }
      if (!/^[a-z0-9-]+$/.test(job.story ?? '') || !['short', 'full'].includes(job.cut)) return send(400, { error: 'story and cut (short|full) required' })
      const run = queue.then(() => render(job))
      queue = run.catch(() => {})
      run.then((r) => send(200, r), (e) => send(500, { error: String(e.message ?? e) }))
    })
  })
  .listen(Number(PORT), () => console.log(`renderer listening on ${PORT}`))
