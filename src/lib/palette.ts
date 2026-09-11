/** Named tokens — keep in sync with README. */

export const ink = {
  asphalt: '#0A0A0C',
  shop: '#12110F',
  plywood: '#3A2C1E',
  plywoodLit: '#4A3826',
  plywoodDark: '#241910',
  dustyGlass: '#C8D0D4',
  chrome: '#8A8E94',
  chromeBright: '#C4C8CC',
  chromeDeep: '#3A3E44',
  copper: '#B87333',
  copperHot: '#D4924A',
  copperDeep: '#7A4A1C',
  busBar: '#C4783A',
  enamel: '#1A3A2A',
  enamelEdge: '#0E2218',
  enamelRust: '#4A2A18',
  bakelite: '#2A1810',
  powerWarm: '#E8A04A',
  powerHot: '#F3C56B',
  scorchPink: '#E85A8A',
  scorchBlack: '#2A1210',
  chalk: '#D8D0C0',
  slate: '#1A2420',
  bone: '#E6DDCC',
  ceramic: '#C9B896',
  ceramicDark: '#8A7A62',
  gto: '#1A1410',
  gtoRed: '#7A2218',
} as const

export type Family = 'system' | 'token' | 'compute' | 'dex' | 'stake' | 'other'

/** Neon gas hues — argon, mercury, classic neon, cathode pink, sodium, krypton. */
export const familyColor: Record<Family, string> = {
  system: '#8FD4F0',
  token: '#2FC9B0',
  compute: '#FF5A2A',
  dex: '#FF6B9A',
  stake: '#F0A020',
  other: '#9AE6B0',
}

export const familyCore: Record<Family, string> = {
  system: '#F4FBFF',
  token: '#E8FFF8',
  compute: '#FFE8DC',
  dex: '#FFF0F5',
  stake: '#FFF6E0',
  other: '#F2FFF6',
}

export const familyLabel: Record<Family, string> = {
  system: 'argon · sys',
  token: 'mercury · tkn',
  compute: 'neon · cu',
  dex: 'cathode · dex',
  stake: 'sodium · stk',
  other: 'krypton · oth',
}

export const familyStamp: Record<Family, string> = {
  system: 'SYS',
  token: 'TKN',
  compute: 'CU',
  dex: 'DEX',
  stake: 'STK',
  other: 'OTH',
}

export const FAMILIES: Family[] = ['system', 'token', 'compute', 'dex', 'stake', 'other']

export function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  const k = Math.min(1, Math.max(0, t))
  return `rgb(${Math.round(ar + (br - ar) * k)},${Math.round(ag + (bg - ag) * k)},${Math.round(ab + (bb - ab) * k)})`
}
