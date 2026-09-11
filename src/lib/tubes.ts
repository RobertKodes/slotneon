import { SEGMENTS, type Engine, type FamilyBand } from './engine.ts'
import { cutPoly, polyLen, type Layout, type Pt, type TubeLayout } from './geom.ts'
import { familyColor, familyCore, ink, rgba, type Family } from './palette.ts'

function strokePts(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  if (pts.length < 2) return
  ctx.beginPath()
  ctx.moveTo(pts[0]!.x, pts[0]!.y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y)
  ctx.stroke()
}

function ends(pts: Pt[]): { a: Pt; b: Pt; angA: number; angB: number } {
  const a = pts[0]!
  const a2 = pts[1] ?? a
  const b = pts[pts.length - 1]!
  const b2 = pts[pts.length - 2] ?? b
  return {
    a,
    b,
    angA: Math.atan2(a2.y - a.y, a2.x - a.x),
    angB: Math.atan2(b.y - b2.y, b.x - b2.x),
  }
}

function electrode(ctx: CanvasRenderingContext2D, p: Pt, ang: number, r: number): void {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(ang)
  ctx.fillStyle = ink.ceramic
  ctx.beginPath()
  ctx.roundRect(-r * 1.1, -r * 0.85, r * 2.1, r * 1.7, r * 0.3)
  ctx.fill()
  ctx.fillStyle = ink.ceramicDark
  ctx.fillRect(-r * 0.2, -r * 0.55, r * 0.55, r * 1.1)
  ctx.fillStyle = ink.copper
  ctx.beginPath()
  ctx.arc(-r * 1.15, 0, r * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function clip(ctx: CanvasRenderingContext2D, tube: TubeLayout, benchY: number): void {
  ctx.fillStyle = ink.chromeDeep
  const pts = tube.pts
  const n = Math.max(2, Math.floor(pts.length / 5))
  for (let i = 1; i < n; i++) {
    const p = pts[Math.floor((i / n) * (pts.length - 1))]!
    if (!tube.hanging && p.y > benchY + 6) continue
    ctx.beginPath()
    ctx.roundRect(p.x - 5, p.y - 3.5, 10, 7, 1.5)
    ctx.fill()
    ctx.strokeStyle = rgba(ink.chrome, 0.45)
    ctx.lineWidth = 0.8
    ctx.stroke()
  }
}

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function crackOffset(pts: Pt[], seed: number, amp: number): Pt[] {
  return pts.map((p, i) => {
    const n = hash2(seed, i * 0.37) - 0.5
    return { x: p.x + n * amp, y: p.y + (hash2(i, seed) - 0.5) * amp * 0.6 }
  })
}

function segmentSlice(pts: Pt[], i: number, segs: number): Pt[] {
  const total = polyLen(pts)
  const a = cutPoly(pts, i / segs)
  const b = cutPoly(pts, (i + 1) / segs)
  if (a.length < 2) return b
  const start = a[a.length - 1]!
  // take b from the join onward
  const out: Pt[] = [start]
  const skip = polyLen(a)
  let acc = 0
  for (let k = 1; k < pts.length; k++) {
    const p0 = pts[k - 1]!
    const p1 = pts[k]!
    const d = Math.hypot(p1.x - p0.x, p1.y - p0.y)
    const next = acc + d
    if (next <= skip) {
      acc = next
      continue
    }
    if (acc < skip && d > 0) {
      // already added start
    }
    if (next > skip + total / segs + 0.01) {
      const u = (skip + total / segs - acc) / d
      out.push({ x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u })
      break
    }
    out.push(p1)
    acc = next
  }
  return out.length >= 2 ? out : b
}

function glowStroke(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  color: string,
  core: string,
  thick: number,
  intensity: number,
  reduced: boolean,
): void {
  if (pts.length < 2 || intensity <= 0.02) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalCompositeOperation = 'lighter'
  const bloom = reduced ? 0.45 : 1
  ctx.shadowColor = color
  ctx.shadowBlur = (18 + thick * 1.8) * intensity * bloom
  ctx.strokeStyle = rgba(color, 0.28 * intensity)
  ctx.lineWidth = thick * 3.4
  strokePts(ctx, pts)
  ctx.shadowBlur = (8 + thick) * intensity * bloom
  ctx.strokeStyle = rgba(color, 0.7 * intensity)
  ctx.lineWidth = thick * 1.35
  strokePts(ctx, pts)
  ctx.shadowBlur = 0
  ctx.strokeStyle = rgba(core, 0.92 * Math.min(1, intensity + 0.15))
  ctx.lineWidth = Math.max(1.2, thick * 0.32)
  strokePts(ctx, pts)
  ctx.restore()
}

export function drawTube(
  ctx: CanvasRenderingContext2D,
  tube: TubeLayout,
  band: FamilyBand,
  layout: Layout,
  now: number,
  reduced: boolean,
  held: boolean,
): void {
  const pts = tube.pts
  if (pts.length < 2) return
  const color = familyColor[tube.family]
  const core = familyCore[tube.family]
  const thick = tube.thick
  const fill = Math.min(1, band.fill + band.overdrive * 0.55)
  const flicker =
    reduced || held
      ? 1
      : 0.92 + Math.sin(now / 70 + hash2(pts[0]!.x, pts[0]!.y) * 12) * 0.05 + (hash2(now / 40, fill) - 0.5) * 0.04

  // unlit glass envelope
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = rgba(ink.dustyGlass, 0.16)
  ctx.lineWidth = thick
  strokePts(ctx, pts)
  ctx.strokeStyle = rgba('#ffffff', 0.1)
  ctx.lineWidth = Math.max(1, thick * 0.22)
  const hi = pts.map((p) => ({ x: p.x - thick * 0.18, y: p.y - thick * 0.22 }))
  strokePts(ctx, hi)
  ctx.restore()

  clip(ctx, tube, layout.benchY)

  const lit = cutPoly(pts, 0.12 + fill * 0.88)
  const intensity = (0.35 + fill * 0.65) * flicker * (held ? 0.78 : 1)

  // live segments; skip dead ones
  for (let i = 0; i < SEGMENTS; i++) {
    const until = band.deadUntil[i] ?? 0
    const slice = segmentSlice(pts, i, SEGMENTS)
    const along = (i + 0.5) / SEGMENTS
    if (along > fill + 0.04 && band.overdrive < 0.4) {
      // unlit remainder already drawn as glass
      continue
    }
    if (until > now) {
      const phase = (until - now) / 8000
      const sputterOn =
        !reduced && !held && band.sputter > 0.05 && hash2(now / 30, i) > 0.55
      if (sputterOn) {
        glowStroke(ctx, crackOffset(slice, i + 3, 2.2), ink.scorchPink, '#FFE8F0', thick, 0.55 * band.sputter, reduced)
      } else {
        ctx.save()
        ctx.lineCap = 'round'
        ctx.strokeStyle = rgba(ink.scorchBlack, 0.85)
        ctx.lineWidth = thick * 0.9
        strokePts(ctx, crackOffset(slice, i, 1.6))
        ctx.strokeStyle = rgba(ink.scorchPink, 0.18 * phase)
        ctx.lineWidth = thick * 0.35
        strokePts(ctx, slice)
        ctx.restore()
      }
      continue
    }
    glowStroke(ctx, slice, color, core, thick, intensity, reduced)
  }

  // overdrive extra bloom on whole lit run
  if (band.overdrive > 0.05) {
    glowStroke(ctx, lit, color, core, thick * 1.05, 0.45 + band.overdrive * 0.7, reduced)
  }

  const e = ends(pts)
  electrode(ctx, e.a, e.angA + Math.PI, thick * 0.72)
  electrode(ctx, e.b, e.angB, thick * 0.72)
}

export function drawWires(ctx: CanvasRenderingContext2D, layout: Layout, family: Family, from: Pt): void {
  const tx = layout.xformX + layout.xformW * 0.82
  const ty = layout.xformY + 18 + (['system', 'token', 'compute', 'dex', 'stake', 'other'].indexOf(family) % 3) * 16
  ctx.save()
  ctx.strokeStyle = family === 'compute' || family === 'dex' ? ink.gtoRed : ink.gto
  ctx.lineWidth = 1.35
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.bezierCurveTo(from.x - 30, from.y + 24, tx + 40, ty + 10, tx, ty)
  ctx.stroke()
  ctx.restore()
}

export function drawScorches(ctx: CanvasRenderingContext2D, layout: Layout, eng: Engine, now: number): void {
  for (const s of eng.scorches) {
    const age = (now - s.born) / s.life
    const a = 1 - age
    const x = layout.benchX + s.x * layout.benchW
    const y = layout.benchY + s.y * layout.benchH
    ctx.save()
    ctx.globalAlpha = 0.55 * a
    const g = ctx.createRadialGradient(x, y, 1, x, y, 16 + (1 - a) * 8)
    g.addColorStop(0, ink.scorchBlack)
    g.addColorStop(0.4, rgba(ink.scorchPink, 0.35 * a))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x, y, 18, 11, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}
