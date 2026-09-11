import '@fontsource/bebas-neue/400.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './style.css'

import { Buzz } from './lib/audio.ts'
import {
  applyJob,
  createEngine,
  displayedSlot,
  formatFee,
  formatSlot,
  formatTps,
  overdrive,
  pollDyes,
  pollMeter,
  pollSlot,
  stepBands,
  takeDye,
  visualFee,
  type DyeJob,
} from './lib/engine.ts'
import { hitBreaker, hitTube, makeLayout, tubeAnchor, type Layout } from './lib/geom.ts'
import { drawFrame } from './lib/shop.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#pane')!
const holdBtn = document.querySelector<HTMLButtonElement>('#hold')!
const readSlot = document.querySelector('#read-slot')!
const readTps = document.querySelector('#read-tps')!
const readFee = document.querySelector('#read-fee')!
const readWire = document.querySelector('#read-wire')!
const readStains = document.querySelector('#read-stains')!

function require2d(target: HTMLCanvasElement): CanvasRenderingContext2D {
  const c = target.getContext('2d')
  if (!c) throw new Error('2d')
  return c
}

const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)')
const eng = createEngine(reducedMq.matches)
reducedMq.addEventListener('change', () => {
  eng.reduced = reducedMq.matches
})

const buzz = new Buzz()
let layout: Layout = makeLayout(800, 600)
let dpr = 1
let ctx = require2d(canvas)

function fit(): void {
  const rect = canvas.getBoundingClientRect()
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.max(1, Math.floor(rect.width * dpr))
  canvas.height = Math.max(1, Math.floor(rect.height * dpr))
  ctx = require2d(canvas)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  layout = makeLayout(rect.width, rect.height)
}

fit()
window.addEventListener('resize', fit)

function setHeld(next: boolean): void {
  eng.held = next
  holdBtn.setAttribute('aria-pressed', String(next))
  holdBtn.classList.toggle('is-held', next)
  holdBtn.innerHTML = next
    ? '<span class="hold-lamp"></span> KILL · sample frozen'
    : '<span class="hold-lamp"></span> MAIN BREAKER'
  if (next) buzz.mute()
}

holdBtn.addEventListener('click', () => {
  void buzz.arm()
  setHeld(!eng.held)
})

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat) return
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA') return
  e.preventDefault()
  void buzz.arm()
  setHeld(!eng.held)
})

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  void buzz.arm()
  if (hitBreaker(layout, x, y)) {
    setHeld(!eng.held)
    return
  }
  const fam = hitTube(layout, x, y)
  if (fam) overdrive(eng, fam)
})

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const over = hitBreaker(layout, x, y) || hitTube(layout, x, y)
  canvas.style.cursor = over ? 'pointer' : 'default'
})

const abort = new AbortController()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function loopSlot(): Promise<void> {
  while (!abort.signal.aborted) {
    await pollSlot(eng, abort.signal)
    await sleep(900)
  }
}
async function loopMeter(): Promise<void> {
  while (!abort.signal.aborted) {
    await pollMeter(eng, abort.signal)
    await sleep(2800)
  }
}
async function loopDyes(): Promise<void> {
  while (!abort.signal.aborted) {
    await pollDyes(eng, abort.signal)
    await sleep(1600)
  }
}

void loopSlot()
void loopMeter()
void loopDyes()

function fallbackJob(slot: number): DyeJob {
  return { family: 'other', failed: false, slot, sig: `tick-${slot}` }
}

function releaseSlot(floor: number): void {
  const n = 1 + Math.floor(Math.min(5, (eng.tps ?? 400) / 900))
  for (let i = 0; i < n; i++) {
    const job = takeDye(eng) ?? fallbackJob(floor)
    const tube = layout.tubes.find((t) => t.family === job.family) ?? layout.tubes[0]!
    const a = tubeAnchor(tube)
    const nx = layout.benchW > 0 ? (a.x - layout.benchX) / layout.benchW : 0.5
    const ny = layout.benchH > 0 ? (a.y - layout.benchY) / layout.benchH : 0.5
    applyJob(eng, job, performance.now(), nx, ny)
  }
}

let lastUi = 0
let lastT = performance.now()
let lastFloor = 0

function frame(now: number): void {
  const dt = Math.min(0.05, (now - lastT) / 1000)
  lastT = now
  stepBands(eng, dt, now)

  const shown = displayedSlot(eng, now)
  const floor = Math.floor(shown)
  if (floor > lastFloor && eng.slot > 0 && !eng.held) {
    if (lastFloor > 0) releaseSlot(floor)
    lastFloor = floor
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, layout.w, layout.h)
  drawFrame(ctx, layout, eng, now)

  buzz.set(visualFee(eng), eng.held, eng.reduced)

  if (now - lastUi > 180) {
    lastUi = now
    readSlot.textContent = formatSlot(eng.slot)
    readTps.textContent = formatTps(eng.tps)
    readFee.textContent = formatFee(eng.feeMicro, eng.fee)
    readWire.textContent = eng.wire
    readStains.textContent = String(eng.stains)
    document.documentElement.style.setProperty('--fee', String(eng.fee))
    holdBtn.classList.toggle('is-live', eng.live)
    for (const el of document.querySelectorAll<HTMLElement>('[data-band]')) {
      const fam = el.dataset.band
      if (!fam || !(fam in eng.bands)) continue
      const b = eng.bands[fam as keyof typeof eng.bands]
      el.style.setProperty('--fill', String(b.fill))
    }
    document.title = eng.slot
      ? `slotneon · ${formatSlot(eng.slot)}`
      : 'slotneon — neon shop · solana mainnet'
  }

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
