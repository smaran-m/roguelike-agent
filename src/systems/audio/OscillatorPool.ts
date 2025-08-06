export class OscillatorPool {
  private readonly availableOscillators: OscillatorNode[] = [];

  constructor(
    private readonly audioContext: AudioContext,
    _maxPoolSize: number = 50
  ) {
    // maxPoolSize is not currently used since Web Audio oscillators are one-shot
  }

  acquire(): OscillatorNode {
    if (this.availableOscillators.length > 0) {
      return this.availableOscillators.pop()!;
    }

    // Create new oscillator if pool is empty
    return this.audioContext.createOscillator();
  }

  release(_oscillator: OscillatorNode): void {
    // Can't reuse oscillators in Web Audio API - they're one-shot
    // This method exists for interface consistency and future optimization
    // In practice, we just let the oscillator be garbage collected
  }

  releaseAll(): void {
    this.availableOscillators.length = 0;
  }

  getPoolSize(): number {
    return this.availableOscillators.length;
  }
}