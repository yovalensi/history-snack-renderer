// One-shot render for a Bunny sandbox: node render-once.mjs <story> <short|full>
// Renders from BUNDLE_URL, uploads reels/<story>-<cut>.mp4 to the Bunny storage zone, prints the CDN URL and timings.
import { readFile } from 'node:fs/promises'
import { cpus } from 'node:os'
import { renderMedia, selectComposition } from '@remotion/renderer'

const [story, cut = 'short'] = process.argv.slice(2)
const { BUNDLE_URL, BUNNY_ZONE, BUNNY_KEY, BUNNY_CDN, CONCURRENCY } = process.env
const inputProps = { story, ...(cut === 'short' && { cut: 'short' }) }
const t0 = Date.now()
const composition = await selectComposition({ serveUrl: BUNDLE_URL, id: 'Story', inputProps })
const out = `/tmp/${story}-${cut}.mp4`
let last = -1
await renderMedia({
  serveUrl: BUNDLE_URL, composition, inputProps, codec: 'h264', crf: 23, outputLocation: out,
  concurrency: Number(CONCURRENCY ?? Math.min(8, cpus().length)),
  onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; console.log(`progress ${p * 10}%`) } },
})
const renderSeconds = Math.round((Date.now() - t0) / 1000)
const remote = `reels/${story}-${cut}-cloud.mp4`
const res = await fetch(`https://storage.bunnycdn.com/${BUNNY_ZONE}/${remote}`, { method: 'PUT', headers: { AccessKey: BUNNY_KEY, 'Content-Type': 'application/octet-stream' }, body: await readFile(out) })
if (!res.ok) throw new Error(`upload ${res.status}`)
console.log(JSON.stringify({ url: `${BUNNY_CDN}/${remote}`, renderSeconds, cpus: cpus().length, frames: composition.durationInFrames }))
