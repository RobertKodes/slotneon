# slotneon

Live Solana **mainnet** as a neon-bender’s night shop. Not an explorer. Not a dashboard. Not a casino.

You are looking through an alley window after hours. Bent glass tubes wait on the bench. They light by program family. Transformer glow and ballast buzz are fee pressure. Failed txs sputter pink-argon, go dark, and leave a scorch. The wall clock ticks with the slot.

Target live: https://robertkodes.github.io/slotneon/

## How to read the shop

| Shop | Chain |
| --- | --- |
| Wall clock / metronome | Confirmed slot |
| Tube fill / lit segments | Sample activity for that program family (TPS proxy on the shop as a whole) |
| Gas color | Family: system argon ice-blue, token mercury teal, compute neon red-orange, dex cathode pink, stake sodium amber, other krypton mint |
| Ballast glow + buzz meter | `getRecentPrioritizationFees` median, log-scaled. Falls back to a dim idle / CU heuristic if the meter flakes |
| Dead segments, pink flicker, bench scorch | `err` on a sampled signature. Marks linger |
| MAIN BREAKER / KILL | Freeze the lit shop. Spacebar works. Tap a tube to overdrive that color band |

No wallet. No keys. Browser talks JSON-RPC. First click arms a quiet 56 Hz ballast buzz (Web Audio, optional).

## Palette

Named hex, cold shop, warm copper, glass that actually looks like glass:

| Token | Hex | Use |
| --- | --- | --- |
| **asphalt** | `#0A0A0C` | Alley / room pitch |
| **shop** | `#12110F` | Interior wall |
| **dusty glass** | `#C8D0D4` | Pane film, unlit envelopes |
| **chrome** | `#8A8E94` | Storefront frame |
| **copper** | `#B87333` | Bus bars, terminals, knife |
| **enamel** | `#1A3A2A` | Transformer bodies |
| **power warm** | `#E8A04A` | Strip LEDs, fee heat |
| **scorch pink** | `#E85A8A` | Fail flicker |
| **scorch black** | `#2A1210` | Burn on the plywood |

Gas (not a seventh brand color):

| Family | Hex | Gas |
| --- | --- | --- |
| system | `#8FD4F0` | argon ice |
| token | `#2FC9B0` | mercury teal |
| compute | `#FF5A2A` | classic neon |
| dex | `#FF6B9A` | cathode pink |
| stake | `#F0A020` | sodium amber |
| other | `#9AE6B0` | krypton mint |

## Type

- **Bebas Neue** — painted window sign. Condensed shop lettering, not Inter, not a SaaS geometric.
- **IBM Plex Mono** — ticket stamps, slot figures, the breaker rocker. Reads as a work order, not a terminal theme.

## Layout

Asymmetrical alley window: mast on the glass at left, workbench of bent tubes offset, yellowed shop ticket pinned on the right, wet asphalt reflecting in the pane. No centered hero. No three cards. No purple.

## Tinkerer notes

```bash
npm i
npm run dev
```

Vite serves at `/slotneon/`. Open that path, not `/`.

```bash
npm run build
```

must pass. GitHub Actions builds and publishes `dist/` to the `gh-pages` branch (base `/slotneon/`). `public/.nojekyll` rides along so GitHub Pages does not eat the files.

If Pages 404s after merge: GitHub repo Settings → Pages → source **`gh-pages` / root**. The workflow runs on `master` (and `workflow_dispatch`), so the live URL appears after merge, not on the PR branch.

Public RPC, rotating on failure (no keys):

- `solana-rpc.publicnode.com`
- `solana.publicnode.com`
- `solana-mainnet.publicnode.com`
- `api.mainnet-beta.solana.com` (fallback; some networks 403)

Override with `VITE_RPC_URL`. Methods: `getSlot`, `getRecentPerformanceSamples`, `getRecentPrioritizationFees`, a slow rotate of `getSignaturesForAddress` across program lanes, and an occasional `getBlock` with `transactionDetails: "signatures"` for density. If a method 4xxs we stop asking.

`prefers-reduced-motion`: tubes still sit on the bench and fill with sample; flicker, rain, and buzz stop.

KILL freezes the sample. Restore the breaker to resume. Tap a tube to overdrive that gas for a beat.
