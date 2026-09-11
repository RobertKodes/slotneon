import type { Family } from './palette.ts'

export type Pt = { x: number; y: number }

export type TubeLayout = {
  family: Family
  pts: Pt[]
  thick: number
  hanging: boolean
  stamp: string
}

export type Layout = {
  w: number
  h: number
  inset: number
  bar: number
  benchX: number
  benchY: number
  benchW: number
  benchH: number
  xformX: number
  xformY: number
  xformW: number
  xformH: number
  clockCx: number
  clockCy: number
  clockR: number
  breakerX: number
  breakerY: number
  breakerW: number
  breakerH: number
  stripX: number
  stripY: number
  stripW: number
  boardX: number
  boardY: number
  boardW: number
  boardH: number
  tubes: TubeLayout[]
}

function cubic(a: Pt, c1: Pt, c2: Pt, b: Pt, steps: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push({
      x: u ** 3 * a.x + 3 * u ** 2 * t * c1.x + 3 * u * t ** 2 * c2.x + t ** 3 * b.x,
      y: u ** 3 * a.y + 3 * u ** 2 * t * c1.y + 3 * u * t ** 2 * c2.y + t ** 3 * b.y,
    })
  }
  return out
}

function circle(cx: number, cy: number, r: number, steps: number, start = -Math.PI / 2): Pt[] {
  const out: Pt[] = []
  const sweep = Math.PI * 1.72
  for (let i = 0; i <= steps; i++) {
    const a = start + (i / steps) * sweep
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.92 })
  }
  return out
}

function zig(x: number, y: number, w: number, h: number, n: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    out.push({
      x: x + (i % 2 === 0 ? 0 : w),
      y: y + t * h,
    })
  }
  return out
}

function arrow(x: number, y: number, w: number, h: number): Pt[] {
  return [
    { x, y: y + h * 0.5 },
    { x: x + w * 0.62, y: y + h * 0.5 },
    { x: x + w * 0.62, y: y },
    { x: x + w, y: y + h * 0.5 },
    { x: x + w * 0.62, y: y + h },
    { x: x + w * 0.62, y: y + h * 0.5 },
  ]
}

export function makeLayout(w: number, h: number): Layout {
  const mobile = w < 720
  const s = Math.min(w, h)
  const inset = Math.max(14, s * 0.028)
  const bar = Math.max(10, s * 0.018)
  const innerW = w - inset * 2
  const innerH = h - inset * 2

  const benchX = mobile ? inset + innerW * 0.08 : inset + innerW * 0.16
  const benchW = mobile ? innerW * 0.84 : innerW * 0.58
  const benchH = Math.max(70, s * 0.16)
  const benchY = mobile ? h * 0.62 : h * 0.66

  const xformW = Math.max(70, s * 0.13)
  const xformH = Math.max(88, s * 0.2)
  const xformX = mobile ? inset + 18 : inset + innerW * 0.045
  const xformY = benchY - xformH * 0.72

  const clockR = Math.max(22, s * 0.055)
  const clockCx = mobile ? w * 0.22 : inset + innerW * 0.2
  const clockCy = mobile ? h * 0.22 : inset + innerH * 0.2

  const breakerW = Math.max(36, s * 0.055)
  const breakerH = Math.max(54, s * 0.1)
  const breakerX = xformX + 8
  const breakerY = xformY - breakerH - 18

  const stripW = Math.max(90, benchW * 0.28)
  const stripX = benchX + 12
  const stripY = benchY + benchH * 0.08

  const boardW = Math.max(90, s * 0.16)
  const boardH = Math.max(70, s * 0.14)
  const boardX = mobile ? w * 0.55 : w * 0.42
  const boardY = mobile ? h * 0.14 : inset + innerH * 0.1

  const bx = benchX
  const by = benchY
  const bw = benchW
  const bh = benchH

  const system = cubic(
    { x: bx + bw * 0.05, y: by + bh * 0.2 },
    { x: bx + bw * 0.3, y: by + bh * 0.02 },
    { x: bx + bw * 0.64, y: by + bh * 0.36 },
    { x: bx + bw * 0.95, y: by + bh * 0.16 },
    28,
  )

  const token = cubic(
    { x: bx + bw * 0.08, y: by + bh * 0.9 },
    { x: bx + bw * 0.08, y: by + bh * 0.46 },
    { x: bx + bw * 0.3, y: by + bh * 0.46 },
    { x: bx + bw * 0.3, y: by + bh * 0.9 },
    22,
  )

  const compute = zig(bx + bw * 0.5, by - bh * 2.2, bw * 0.12, bh * 1.05, 6)

  const dex = circle(bx + bw * 0.78, by - bh * 1.5, Math.max(32, bw * 0.1), 32)

  const stake = arrow(bx + bw * 0.4, by + bh * 0.52, bw * 0.28, bh * 0.38)

  const other = cubic(
    { x: bx + bw * 0.72, y: by + bh * 0.9 },
    { x: bx + bw * 0.98, y: by + bh * 0.92 },
    { x: bx + bw * 0.99, y: by + bh * 0.38 },
    { x: bx + bw * 0.76, y: by + bh * 0.46 },
    24,
  )

  const hangingCompute: Pt[] = compute.map((p) => ({ x: p.x, y: p.y }))
  const hangingDex: Pt[] = dex.map((p) => ({ x: p.x, y: p.y }))

  const tubes: TubeLayout[] = [
    { family: 'system', pts: system, thick: Math.max(7, s * 0.012), hanging: false, stamp: 'SYS' },
    { family: 'token', pts: token, thick: Math.max(7, s * 0.012), hanging: false, stamp: 'TKN' },
    { family: 'compute', pts: hangingCompute, thick: Math.max(6.5, s * 0.011), hanging: true, stamp: 'CU' },
    { family: 'dex', pts: hangingDex, thick: Math.max(6.5, s * 0.011), hanging: true, stamp: 'DEX' },
    { family: 'stake', pts: stake, thick: Math.max(6.2, s * 0.01), hanging: false, stamp: 'STK' },
    { family: 'other', pts: other, thick: Math.max(6, s * 0.01), hanging: false, stamp: 'OTH' },
  ]

  return {
    w,
    h,
    inset,
    bar,
    benchX,
    benchY,
    benchW,
    benchH,
    xformX,
    xformY,
    xformW,
    xformH,
    clockCx,
    clockCy,
    clockR,
    breakerX,
    breakerY,
    breakerW,
    breakerH,
    stripX,
    stripY,
    stripW,
    boardX,
    boardY,
    boardW,
    boardH,
    tubes,
  }
}

export function polyLen(pts: Pt[]): number {
  let n = 0
  for (let i = 1; i < pts.length; i++) {
    n += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y)
  }
  return n
}

export function cutPoly(pts: Pt[], t: number): Pt[] {
  if (pts.length < 2) return pts.slice()
  const goal = polyLen(pts) * Math.min(1, Math.max(0, t))
  if (goal <= 0) return [pts[0]!]
  const out: Pt[] = [pts[0]!]
  let acc = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    if (acc + d >= goal) {
      const u = d <= 0 ? 0 : (goal - acc) / d
      out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u })
      return out
    }
    out.push(b)
    acc += d
  }
  return out
}

export function distToPoly(pts: Pt[], x: number, y: number): number {
  let best = Infinity
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const t = len2 <= 0 ? 0 : Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / len2))
    const px = a.x + dx * t
    const py = a.y + dy * t
    const d = Math.hypot(x - px, y - py)
    if (d < best) best = d
  }
  return best
}

export function hitTube(layout: Layout, x: number, y: number): Family | null {
  let best: { f: Family; d: number } | null = null
  for (const tube of layout.tubes) {
    const d = distToPoly(tube.pts, x, y)
    const thresh = tube.thick * 2.4
    if (d < thresh && (!best || d < best.d)) best = { f: tube.family, d }
  }
  return best?.f ?? null
}

export function hitBreaker(layout: Layout, x: number, y: number): boolean {
  return (
    x >= layout.breakerX - 8 &&
    x <= layout.breakerX + layout.breakerW + 8 &&
    y >= layout.breakerY - 8 &&
    y <= layout.breakerY + layout.breakerH + 8
  )
}

export function tubeAnchor(tube: TubeLayout): Pt {
  const pts = tube.pts
  if (!pts.length) return { x: 0, y: 0 }
  const mid = pts[Math.floor(pts.length / 2)]!
  return mid
}
