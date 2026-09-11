import { FAMILIES, type Family } from './palette.ts'
import { laneAt } from './programs.ts'
import {
  feeNorm,
  pressureFee,
  RpcPool,
  rpcEndpoints,
  sampleTps,
  wireName,
  type AddressSig,
} from './rpc.ts'

export type DyeJob = {
  family: Family
  failed: boolean
  slot: number
  sig: string
}

export type FamilyBand = {
  fill: number
  target: number
  recent: number
  overdrive: number
  deadUntil: number[]
  sputter: number
}

export type Scorch = {
  x: number
  y: number
  family: Family
  born: number
  life: number
}

export type Engine = {
  rpc: RpcPool
  slot: number
  slotAt: number
  slotMs: number
  tps: number | null
  feeMicro: number | null
  fee: number
  fill: number
  wire: string
  live: boolean
  held: boolean
  queue: DyeJob[]
  reduced: boolean
  stains: number
  bands: Record<Family, FamilyBand>
  scorches: Scorch[]
  tick: number
}

const SEEN_CAP = 900
const TPS_REF = 4200
const SEGMENTS = 8

function emptyBand(): FamilyBand {
  return {
    fill: 0.12,
    target: 0.12,
    recent: 0,
    overdrive: 0,
    deadUntil: Array.from({ length: SEGMENTS }, () => 0),
    sputter: 0,
  }
}

export function createEngine(reduced: boolean): Engine {
  const rpc = new RpcPool(rpcEndpoints())
  const bands = {} as Record<Family, FamilyBand>
  for (const f of FAMILIES) bands[f] = emptyBand()
  return {
    rpc,
    slot: 0,
    slotAt: performance.now(),
    slotMs: 400,
    tps: null,
    feeMicro: null,
    fee: 0.08,
    fill: 0.42,
    wire: wireName(rpc.url),
    live: false,
    held: false,
    queue: [],
    reduced,
    stains: 0,
    bands,
    scorches: [],
    tick: 0,
  }
}

export function displayedSlot(eng: Engine, now: number): number {
  if (eng.held || !eng.slot) return eng.slot
  const coast = Math.min((now - eng.slotAt) / eng.slotMs, 1.4)
  return eng.slot + coast
}

export function targetFill(tps: number | null): number {
  if (tps == null) return 0.38
  const n = Math.min(1, Math.max(0, tps / TPS_REF))
  return 0.22 + n * 0.7
}

export function visualFee(eng: Engine): number {
  if (eng.feeMicro && eng.feeMicro > 0) return eng.fee
  return Math.min(0.28, 0.06 + (eng.tps ?? 0) / 14000)
}

export function stepBands(eng: Engine, dt: number, now: number): void {
  const shopFill = targetFill(eng.tps)
  eng.fill += (shopFill - eng.fill) * Math.min(1, dt * (eng.held ? 0.08 : 1.15))

  for (const f of FAMILIES) {
    const b = eng.bands[f]
    const decay = eng.held ? 0.04 : 0.55
    b.recent = Math.max(0, b.recent - dt * decay)
    const local = Math.min(1, b.recent / 14)
    b.target = 0.1 + local * 0.78 + eng.fill * 0.12
    if (eng.held) {
      // freeze fill; overdrive still bleeds off
    } else {
      b.fill += (b.target - b.fill) * Math.min(1, dt * 1.4)
    }
    b.overdrive = Math.max(0, b.overdrive - dt * 1.6)
    b.sputter = Math.max(0, b.sputter - dt * 2.2)
    for (let i = 0; i < b.deadUntil.length; i++) {
      if (b.deadUntil[i]! > 0 && now > b.deadUntil[i]!) b.deadUntil[i] = 0
    }
  }

  eng.scorches = eng.scorches.filter((s) => now - s.born < s.life)
}

export function overdrive(eng: Engine, family: Family): void {
  const b = eng.bands[family]
  b.overdrive = 1
  b.fill = Math.min(1, b.fill + 0.35)
}

export function applyJob(eng: Engine, job: DyeJob, now: number, nx: number, ny: number): void {
  const b = eng.bands[job.family]
  b.recent += job.failed ? 0.4 : 1.15
  if (!job.failed) return
  eng.stains += 1
  b.sputter = 1
  const live = b.deadUntil
    .map((until, i) => (until > now ? -1 : i))
    .filter((i) => i >= 0)
  const pick = live.length ? live[Math.floor(Math.random() * live.length)]! : Math.floor(Math.random() * SEGMENTS)
  b.deadUntil[pick] = now + 4200 + Math.random() * 3800
  if (eng.scorches.length < 28) {
    eng.scorches.push({
      x: nx + (Math.random() - 0.5) * 0.08,
      y: ny + 0.02 + Math.random() * 0.04,
      family: job.family,
      born: now,
      life: 14000 + Math.random() * 8000,
    })
  }
}

const seen = new Set<string>()
const seenOrder: string[] = []

function remember(sig: string): boolean {
  if (seen.has(sig)) return false
  seen.add(sig)
  seenOrder.push(sig)
  if (seenOrder.length > SEEN_CAP) {
    const old = seenOrder.shift()
    if (old) seen.delete(old)
  }
  return true
}

function enqueue(eng: Engine, sigs: AddressSig[], family: Family): void {
  for (const s of sigs) {
    if (!remember(s.signature)) continue
    eng.queue.push({
      family,
      failed: s.err != null,
      slot: s.slot,
      sig: s.signature,
    })
  }
  if (eng.queue.length > 240) eng.queue.splice(0, eng.queue.length - 240)
}

export async function pollSlot(eng: Engine, signal: AbortSignal): Promise<void> {
  try {
    const slot = await eng.rpc.getSlot(signal)
    eng.wire = wireName(eng.rpc.url)
    eng.live = true
    if (slot > eng.slot) {
      eng.slot = slot
      eng.slotAt = performance.now()
      eng.tick += 1
    }
  } catch {
    eng.live = false
    eng.wire = `${wireName(eng.rpc.url)} · cold`
  }
}

export async function pollMeter(eng: Engine, signal: AbortSignal): Promise<void> {
  try {
    const [perf, fees] = await Promise.all([eng.rpc.getPerf(signal), eng.rpc.getFees(signal)])
    const t = sampleTps(perf)
    if (t) {
      eng.tps = t.tps
      eng.slotMs = Math.min(800, Math.max(280, t.slotMs))
    }
    const med = pressureFee(fees)
    if (med != null) {
      eng.feeMicro = med
      eng.fee = feeNorm(med)
    }
    eng.live = true
    eng.wire = wireName(eng.rpc.url)
  } catch {
    eng.live = false
  }
}

let lane = 0
let blockFails = 0

export async function pollDyes(eng: Engine, signal: AbortSignal): Promise<void> {
  if (eng.held) return
  const laneDef = laneAt(lane++)
  try {
    const sigs = await eng.rpc.getSigs(laneDef.id, signal)
    enqueue(eng, sigs, laneDef.family)
    eng.live = true
    eng.wire = wireName(eng.rpc.url)
  } catch {
    eng.live = false
  }

  if (blockFails < 6 && eng.slot > 0 && lane % 4 === 0) {
    try {
      const block = await eng.rpc.getBlockSigs(Math.max(0, eng.slot - 2), signal)
      const n = block.signatures?.length ?? 0
      const extra = Math.min(18, Math.floor(n / 220))
      for (let i = 0; i < extra; i++) {
        eng.queue.push({
          family: 'other',
          failed: false,
          slot: eng.slot,
          sig: `blk-${eng.slot}-${i}`,
        })
      }
    } catch {
      blockFails += 1
    }
  }
}

export function takeDye(eng: Engine): DyeJob | null {
  if (eng.held) return null
  return eng.queue.shift() ?? null
}

export function formatFee(micro: number | null, norm: number): string {
  if (micro == null) return norm > 0.2 ? 'inferred' : 'idle'
  if (micro <= 0) return 'idle · 0 µL'
  if (micro >= 1_000_000) return `${(micro / 1_000_000).toFixed(1)}M µL`
  if (micro >= 1000) return `${(micro / 1000).toFixed(1)}k µL`
  return `${Math.round(micro)} µL`
}

export function formatTps(tps: number | null): string {
  if (tps == null) return '— tx/s'
  if (tps >= 1000) return `${(tps / 1000).toFixed(1)}k tx/s`
  return `${Math.round(tps)} tx/s`
}

export function formatSlot(slot: number): string {
  if (!slot) return '—'
  return slot.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export { SEGMENTS }
