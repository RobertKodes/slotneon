export class Buzz {
  private ctx: AudioContext | null = null
  private gain: GainNode | null = null
  enabled = false

  async arm(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      this.enabled = true
      return
    }
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 56
    const osc2 = ctx.createOscillator()
    osc2.type = 'square'
    osc2.frequency.value = 112
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 220
    filter.Q.value = 0.7
    const gain = ctx.createGain()
    gain.gain.value = 0
    const mix = ctx.createGain()
    mix.gain.value = 0.35
    osc.connect(filter)
    osc2.connect(mix)
    mix.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc2.start()
    this.ctx = ctx
    this.gain = gain
    this.enabled = true
  }

  set(fee: number, held: boolean, reduced: boolean): void {
    if (!this.gain || !this.ctx || !this.enabled) return
    const amp = reduced || held || !this.enabled ? 0 : 0.01 + fee * 0.038
    this.gain.gain.setTargetAtTime(amp, this.ctx.currentTime, 0.12)
  }

  mute(): void {
    if (!this.gain || !this.ctx) return
    this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05)
  }
}
