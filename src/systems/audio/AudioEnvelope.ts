import { ADSREnvelope } from './AudioTypes.js';

export class AudioEnvelope {
  constructor(
    private readonly gainNode: GainNode,
    private readonly envelope: ADSREnvelope
  ) {}

  trigger(startTime: number, totalDuration: number): void {
    const { attack, decay, sustain, release } = this.envelope;
    const sustainTime = Math.max(0, totalDuration - attack - decay - release);
    
    // Start at 0
    this.gainNode.gain.setValueAtTime(0, startTime);
    
    // Attack phase
    this.gainNode.gain.linearRampToValueAtTime(1, startTime + attack);
    
    // Decay phase
    this.gainNode.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
    
    // Sustain phase (hold current value)
    this.gainNode.gain.setValueAtTime(sustain, startTime + attack + decay + sustainTime);
    
    // Release phase
    this.gainNode.gain.linearRampToValueAtTime(0, startTime + totalDuration);
  }

  triggerRelease(releaseTime: number): void {
    // Immediate release from current value
    this.gainNode.gain.cancelScheduledValues(releaseTime);
    this.gainNode.gain.linearRampToValueAtTime(0, releaseTime + this.envelope.release);
  }
}