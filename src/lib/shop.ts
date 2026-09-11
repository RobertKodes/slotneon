import type { Engine } from './engine.ts'
import { visualFee } from './engine.ts'
import { type Layout, type Pt } from './geom.ts'
import { FAMILIES, familyColor, ink, rgba } from './palette.ts'
import { drawScorches, drawTube, drawWires } from './tubes.ts'

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function grain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  n: number,
  color: string,
): void {
  ctx.fillStyle = color
  for (let i = 0; i < n; i++) {
    const u = hash2(i * 3.1, x + y)
    const v = hash2(i * 7.7, y - x)
    ctx.fillRect(x + u * w, y + v * h, 0.7 + hash2(i, x) * 1.4, 0.5 + hash2(i, y) * 1.1)
  }
}

function drawInterior(ctx: CanvasRenderingContext2D, L: Layout, fee: number): void {
  const { w, h } = L
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#161412')
  bg.addColorStop(0.42, ink.shop)
  bg.addColorStop(1, ink.asphalt)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // street sodium leaking in from the alley (upper left, outside the pane)
  const sodium = ctx.createRadialGradient(w * 0.12, h * 0.08, 4, w * 0.12, h * 0.08, Math.max(w, h) * 0.55)
  sodium.addColorStop(0, rgba(ink.powerWarm, 0.16))
  sodium.addColorStop(0.35, rgba(ink.powerWarm, 0.05))
  sodium.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sodium
  ctx.fillRect(0, 0, w, h)

  const cool = ctx.createRadialGradient(w * 0.72, h * 0.38, 10, w * 0.72, h * 0.38, w * 0.5)
  cool.addColorStop(0, rgba('#2FC9B0', 0.04))
  cool.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = cool
  ctx.fillRect(0, 0, w, h)

  // pegboard wall
  const wallX = L.inset + 8
  const wallY = L.inset + 8
  const wallW = w - (L.inset + 8) * 2
  const wallH = L.benchY - wallY - 8
  ctx.fillStyle = '#1C1914'
  ctx.fillRect(wallX, wallY, wallW, wallH)
  ctx.fillStyle = rgba('#000000', 0.18)
  const hole = Math.max(3.2, Math.min(w, h) * 0.006)
  const gap = hole * 3.4
  for (let yy = wallY + 14; yy < wallY + wallH - 10; yy += gap) {
    for (let xx = wallX + 16; xx < wallX + wallW - 16; xx += gap) {
      ctx.beginPath()
      ctx.arc(xx, yy, hole * 0.38, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // fee-warmed worklamp over the left bench
  const lamp = ctx.createRadialGradient(L.xformX + 40, L.benchY - 20, 8, L.xformX + 40, L.benchY, 160 + fee * 80)
  lamp.addColorStop(0, rgba(ink.powerWarm, 0.1 + fee * 0.12))
  lamp.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = lamp
  ctx.fillRect(0, 0, w, h)
}

function drawBench(ctx: CanvasRenderingContext2D, L: Layout): void {
  const { benchX: x, benchY: y, benchW: w, benchH: h } = L
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w + 18, y + h)
  ctx.lineTo(x - 10, y + h)
  ctx.closePath()
  const g = ctx.createLinearGradient(x, y, x, y + h)
  g.addColorStop(0, ink.plywoodLit)
  g.addColorStop(0.35, ink.plywood)
  g.addColorStop(1, ink.plywoodDark)
  ctx.fillStyle = g
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.strokeStyle = rgba('#2A1C10', 0.35)
  ctx.lineWidth = 1
  for (let i = 0; i < 9; i++) {
    const yy = y + 8 + i * (h / 8)
    ctx.beginPath()
    ctx.moveTo(x - 8, yy)
    ctx.quadraticCurveTo(x + w * 0.5, yy + (i % 2 === 0 ? 3 : -2), x + w + 16, yy + 1)
    ctx.stroke()
  }
  grain(ctx, x, y, w, h, 90, rgba('#1A1008', 0.16))
  grain(ctx, x, y, w, h, 40, rgba(ink.powerWarm, 0.04))
  ctx.restore()

  // front apron
  ctx.fillStyle = '#1A140E'
  ctx.fillRect(x - 10, y + h, w + 28, Math.max(10, h * 0.18))
  ctx.fillStyle = rgba('#000', 0.35)
  ctx.fillRect(x - 10, y + h, w + 28, 3)

  // copper bus bar along the front lip
  const by = y + 4
  const bg = ctx.createLinearGradient(x, by, x, by + 8)
  bg.addColorStop(0, ink.copperHot)
  bg.addColorStop(0.45, ink.busBar)
  bg.addColorStop(1, ink.copperDeep)
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(x + 8, by, w - 20, 6, 1)
  ctx.fill()
  ctx.fillStyle = rgba('#fff', 0.18)
  ctx.fillRect(x + 12, by + 1, w * 0.2, 1.2)
}

function drawPowerStrip(ctx: CanvasRenderingContext2D, L: Layout, fee: number, live: boolean): void {
  const x = L.stripX
  const y = L.stripY
  const w = L.stripW
  ctx.fillStyle = '#1A1A1C'
  ctx.beginPath()
  ctx.roundRect(x, y, w, 16, 3)
  ctx.fill()
  ctx.strokeStyle = rgba(ink.chrome, 0.25)
  ctx.stroke()
  const n = 4
  for (let i = 0; i < n; i++) {
    const ox = x + 12 + i * ((w - 20) / n)
    ctx.fillStyle = '#0C0C0E'
    ctx.fillRect(ox, y + 4, 10, 8)
    ctx.fillStyle = live ? rgba(ink.powerWarm, 0.45 + fee * 0.5) : '#3A3228'
    ctx.beginPath()
    ctx.arc(ox + 14, y + 8, 2.1, 0, Math.PI * 2)
    ctx.fill()
    if (live) {
      ctx.fillStyle = rgba(ink.powerHot, 0.25 + fee * 0.35)
      ctx.beginPath()
      ctx.arc(ox + 14, y + 8, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawTransformers(ctx: CanvasRenderingContext2D, L: Layout, fee: number, now: number, reduced: boolean, held: boolean): void {
  const x = L.xformX
  const y = L.xformY
  const w = L.xformW
  const h = L.xformH

  const drawBox = (bx: number, by: number, bw: number, bh: number, label: string, glow: number) => {
    ctx.fillStyle = ink.enamelEdge
    ctx.beginPath()
    ctx.roundRect(bx - 3, by + bh - 8, bw + 6, 10, 2)
    ctx.fill()
    const body = ctx.createLinearGradient(bx, by, bx + bw, by)
    body.addColorStop(0, ink.enamelEdge)
    body.addColorStop(0.2, ink.enamel)
    body.addColorStop(0.7, '#24503A')
    body.addColorStop(1, ink.enamelEdge)
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.roundRect(bx, by, bw, bh, 3)
    ctx.fill()
    ctx.strokeStyle = rgba('#8FBF9A', 0.18)
    ctx.lineWidth = 1
    ctx.stroke()
    // rust chip
    ctx.fillStyle = rgba(ink.enamelRust, 0.45)
    ctx.beginPath()
    ctx.ellipse(bx + bw * 0.2, by + bh * 0.72, 8, 4, 0.2, 0, Math.PI * 2)
    ctx.fill()
    // nameplate
    ctx.fillStyle = '#C9B07A'
    ctx.fillRect(bx + 8, by + 10, bw - 16, 16)
    ctx.fillStyle = '#3A2A10'
    ctx.font = `600 ${Math.max(7, bw * 0.12)}px 'IBM Plex Mono', monospace`
    ctx.textAlign = 'center'
    ctx.fillText(label, bx + bw / 2, by + 21)
    // terminals
    ctx.fillStyle = ink.copper
    ctx.fillRect(bx + bw - 14, by + 32, 8, 6)
    ctx.fillRect(bx + bw - 14, by + 44, 8, 6)
    // warning stripe
    ctx.fillStyle = '#C9A227'
    ctx.fillRect(bx, by + bh - 14, bw, 6)
    ctx.fillStyle = '#1A1408'
    ctx.fillRect(bx + 6, by + bh - 14, 8, 6)
    ctx.fillRect(bx + 22, by + bh - 14, 8, 6)

    const buzz = reduced || held ? glow : glow * (0.92 + Math.sin(now / 45) * 0.08)
    const rg = ctx.createRadialGradient(bx + bw * 0.45, by + bh * 0.55, 2, bx + bw * 0.45, by + bh * 0.55, 40 + buzz * 50)
    rg.addColorStop(0, rgba(ink.powerHot, 0.22 + buzz * 0.45))
    rg.addColorStop(0.45, rgba(ink.powerWarm, 0.1 + buzz * 0.2))
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg
    ctx.fillRect(bx - 20, by - 20, bw + 40, bh + 40)

    // filament meter
    ctx.fillStyle = '#0C0C0A'
    ctx.fillRect(bx + 10, by + 34, bw * 0.45, 8)
    ctx.fillStyle = rgba(ink.powerWarm, 0.2 + buzz * 0.8)
    ctx.fillRect(bx + 11, by + 35, (bw * 0.45 - 2) * buzz, 6)
  }

  drawBox(x, y + h * 0.38, w * 0.92, h * 0.58, '15kV', fee)
  drawBox(x + w * 0.12, y, w * 0.78, h * 0.42, 'BALLAST', Math.min(1, fee * 1.1 + 0.08))
}

function drawBreaker(ctx: CanvasRenderingContext2D, L: Layout, held: boolean): void {
  const { breakerX: x, breakerY: y, breakerW: w, breakerH: h } = L
  ctx.fillStyle = ink.bakelite
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 4)
  ctx.fill()
  ctx.strokeStyle = rgba(ink.copper, 0.35)
  ctx.stroke()
  ctx.fillStyle = ink.copperDeep
  ctx.fillRect(x + w * 0.22, y + h * 0.18, w * 0.18, 6)
  ctx.fillRect(x + w * 0.6, y + h * 0.62, w * 0.18, 6)

  ctx.save()
  ctx.translate(x + w * 0.5, y + h * (held ? 0.28 : 0.7))
  ctx.rotate(held ? -0.95 : 0.18)
  ctx.fillStyle = ink.copper
  ctx.beginPath()
  ctx.roundRect(-w * 0.1, -h * 0.42, w * 0.2, h * 0.5, 2)
  ctx.fill()
  ctx.fillStyle = ink.bakelite
  ctx.beginPath()
  ctx.roundRect(-w * 0.16, -h * 0.5, w * 0.32, 10, 2)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = held ? ink.scorchPink : '#3AE07A'
  ctx.beginPath()
  ctx.arc(x + w * 0.5, y + h - 9, 3.2, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = rgba(ink.chalk, 0.55)
  ctx.font = `500 ${Math.max(7, w * 0.22)}px 'IBM Plex Mono', monospace`
  ctx.textAlign = 'center'
  ctx.fillText(held ? 'KILL' : 'LIVE', x + w * 0.5, y - 6)
}

function drawClock(ctx: CanvasRenderingContext2D, L: Layout, slot: number, tick: number, reduced: boolean, now: number): void {
  const { clockCx: cx, clockCy: cy, clockR: r } = L
  ctx.fillStyle = '#1A1C18'
  ctx.beginPath()
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = ink.chrome
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.strokeStyle = ink.chromeDeep
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = rgba(ink.chalk, 0.55)
  ctx.lineWidth = 1.2
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78)
    ctx.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92)
    ctx.stroke()
  }

  ctx.fillStyle = rgba(ink.chalk, 0.7)
  ctx.font = `${Math.max(8, r * 0.22)}px 'IBM Plex Mono', monospace`
  ctx.textAlign = 'center'
  ctx.fillText('SLOT', cx, cy + r * 0.42)

  const ang = ((slot % 12) / 12) * Math.PI * 2 - Math.PI / 2
  const tickAng = ((tick % 60) / 60) * Math.PI * 2 - Math.PI / 2
  const sweep = reduced ? tickAng : tickAng + Math.sin(now / 180) * 0.02

  ctx.strokeStyle = ink.copper
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(ang) * r * 0.45, cy + Math.sin(ang) * r * 0.45)
  ctx.stroke()

  ctx.strokeStyle = ink.powerWarm
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(sweep) * r * 0.82, cy + Math.sin(sweep) * r * 0.82)
  ctx.stroke()

  ctx.fillStyle = ink.powerHot
  ctx.beginPath()
  ctx.arc(cx, cy, 3, 0, Math.PI * 2)
  ctx.fill()
}

function drawChalkboard(ctx: CanvasRenderingContext2D, L: Layout, fee: number): void {
  const { boardX: x, boardY: y, boardW: w, boardH: h } = L
  ctx.fillStyle = ink.slate
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 3)
  ctx.fill()
  ctx.strokeStyle = '#3A2A18'
  ctx.lineWidth = 5
  ctx.stroke()
  ctx.fillStyle = rgba(ink.chalk, 0.72)
  ctx.font = `${Math.max(8, w * 0.08)}px 'IBM Plex Mono', monospace`
  ctx.textAlign = 'left'
  ctx.fillText('BALLAST', x + 10, y + 18)
  ctx.fillText('fee heat', x + 10, y + 32)
  ctx.fillStyle = '#0C0C0A'
  ctx.fillRect(x + 10, y + 40, w - 20, 8)
  ctx.fillStyle = rgba(ink.powerWarm, 0.25 + fee * 0.75)
  ctx.fillRect(x + 10, y + 40, (w - 20) * fee, 8)
  ctx.fillStyle = rgba(ink.chalk, 0.45)
  ctx.font = `${Math.max(7, w * 0.07)}px 'IBM Plex Mono', monospace`
  ctx.fillText('idle', x + 10, y + h - 12)
  ctx.textAlign = 'right'
  ctx.fillText('hot', x + w - 10, y + h - 12)
}

function drawHooks(ctx: CanvasRenderingContext2D, L: Layout): void {
  for (const tube of L.tubes) {
    if (!tube.hanging) continue
    const p = tube.pts[Math.floor(tube.pts.length / 2)]!
    ctx.strokeStyle = ink.chrome
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(p.x, p.y - 28)
    ctx.lineTo(p.x, p.y - 4)
    ctx.stroke()
    ctx.fillStyle = ink.chromeDeep
    ctx.beginPath()
    ctx.arc(p.x, p.y - 4, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawStamps(ctx: CanvasRenderingContext2D, L: Layout): void {
  ctx.font = `${Math.max(8, L.benchW * 0.028)}px 'IBM Plex Mono', monospace`
  ctx.textAlign = 'center'
  ctx.fillStyle = rgba('#1A1208', 0.45)
  for (const tube of L.tubes) {
    if (tube.hanging) continue
    const p = tube.pts[Math.floor(tube.pts.length * 0.4)]!
    ctx.fillText(tube.stamp, p.x, L.benchY + L.benchH - 10)
  }
}

function drawWindow(ctx: CanvasRenderingContext2D, L: Layout, eng: Engine, now: number): void {
  const { w, h, inset, bar } = L
  // dusty film
  ctx.fillStyle = rgba(ink.dustyGlass, 0.035)
  ctx.fillRect(0, 0, w, h)

  // scratches
  ctx.strokeStyle = rgba('#ffffff', 0.04)
  ctx.lineWidth = 0.7
  for (let i = 0; i < 18; i++) {
    const x0 = hash2(i, 2) * w
    const y0 = hash2(i, 9) * h
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + 18 + hash2(i, 4) * 40, y0 + (hash2(i, 1) - 0.5) * 12)
    ctx.stroke()
  }

  // rain streaks (skip if reduced)
  if (!eng.reduced) {
    ctx.strokeStyle = rgba(ink.dustyGlass, 0.07)
    ctx.lineWidth = 1
    for (let i = 0; i < 22; i++) {
      const x = hash2(i, 3.3) * w
      const y = (hash2(i, 8) * h + (now / 40) * (0.4 + hash2(i, 1))) % h
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + 1.2, y + 16 + hash2(i, 2) * 22)
      ctx.stroke()
    }
  }

  // wet asphalt reflection along the bottom of the pane
  const wet = ctx.createLinearGradient(0, h * 0.78, 0, h)
  wet.addColorStop(0, 'rgba(0,0,0,0)')
  wet.addColorStop(0.4, 'rgba(6,6,8,0.25)')
  wet.addColorStop(1, 'rgba(6,6,8,0.55)')
  ctx.fillStyle = wet
  ctx.fillRect(0, h * 0.78, w, h * 0.22)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.18
  let i = 0
  for (const f of FAMILIES) {
    const col = familyColor[f]
    const b = eng.bands[f]
    const gx = L.benchX + L.benchW * (0.15 + i * 0.14)
    const gy = h - 18
    const rg = ctx.createRadialGradient(gx, gy, 2, gx, gy, 40 + b.fill * 30)
    rg.addColorStop(0, rgba(col, 0.55 * b.fill))
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg
    ctx.beginPath()
    ctx.ellipse(gx, gy, 48, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    i += 1
  }
  ctx.restore()

  // aluminum storefront frame
  ctx.fillStyle = ink.chromeDeep
  ctx.fillRect(0, 0, w, bar + 4)
  ctx.fillRect(0, h - bar - 4, w, bar + 4)
  ctx.fillRect(0, 0, bar + 4, h)
  ctx.fillRect(w - bar - 4, 0, bar + 4, h)
  const chrome = ctx.createLinearGradient(0, 0, 0, bar + 4)
  chrome.addColorStop(0, ink.chromeBright)
  chrome.addColorStop(0.45, ink.chrome)
  chrome.addColorStop(1, ink.chromeDeep)
  ctx.fillStyle = chrome
  ctx.fillRect(0, 0, w, bar)
  ctx.fillRect(0, h - bar, w, bar)
  ctx.fillStyle = ctx.createLinearGradient(0, 0, bar, 0)
  ctx.fillRect(0, 0, bar, h)
  ctx.fillRect(w - bar, 0, bar, h)

  // corner screws
  ctx.fillStyle = ink.chromeDeep
  for (const [sx, sy] of [
    [bar * 0.5, bar * 0.5],
    [w - bar * 0.5, bar * 0.5],
    [bar * 0.5, h - bar * 0.5],
    [w - bar * 0.5, h - bar * 0.5],
  ] as const) {
    ctx.beginPath()
    ctx.arc(sx, sy, 3.2, 0, Math.PI * 2)
    ctx.fill()
  }

  // inner rebate
  ctx.strokeStyle = rgba('#000', 0.45)
  ctx.lineWidth = 2
  ctx.strokeRect(inset * 0.55, inset * 0.55, w - inset * 1.1, h - inset * 1.1)

  // transom bar
  ctx.fillStyle = ink.chrome
  ctx.fillRect(bar, h * 0.08, w - bar * 2, 6)
}

export function drawFrame(ctx: CanvasRenderingContext2D, L: Layout, eng: Engine, now: number): void {
  const fee = visualFee(eng)
  drawInterior(ctx, L, fee)
  drawChalkboard(ctx, L, fee)
  drawClock(ctx, L, eng.slot, eng.tick, eng.reduced, now)
  drawBreaker(ctx, L, eng.held)
  drawTransformers(ctx, L, fee, now, eng.reduced, eng.held)
  drawBench(ctx, L)
  drawScorches(ctx, L, eng, now)
  drawPowerStrip(ctx, L, fee, eng.live && !eng.held)
  drawHooks(ctx, L)

  for (const tube of L.tubes) {
    const end: Pt = tube.pts[0]!
    drawWires(ctx, L, tube.family, end)
  }

  for (const tube of L.tubes) {
    drawTube(ctx, tube, eng.bands[tube.family], L, now, eng.reduced, eng.held)
  }

  drawStamps(ctx, L)
  drawWindow(ctx, L, eng, now)

  const vig = ctx.createRadialGradient(L.w * 0.42, L.h * 0.45, L.h * 0.18, L.w * 0.5, L.h * 0.5, L.h * 0.9)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, L.w, L.h)
}
