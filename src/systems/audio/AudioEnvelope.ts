import { ADSREnvelope } from './AudioTypes.js';

export class AudioEnvelope {
  constructor(
    private readonly gainNode: GainNode,
    private readonly envelope: ADSREnvelope
  ) {}

  trigger(startTime: number, totalDuration: number, targetVolume?: number): void {
    const { attack, decay, sustain, release } = this.envelope;
    const sustainTime = Math.max(0, totalDuration - attack - decay - release);
    
    // Use passed target volume or fall back to current gain value
    const currentVolume = targetVolume ?? this.gainNode.gain.value;
    
    // Start at 0
    this.gainNode.gain.setValueAtTime(0, startTime);
    
    // Attack phase - ramp to calculated volume, not hardcoded 1
    this.gainNode.gain.linearRampToValueAtTime(currentVolume, startTime + attack);
    
    // Decay phase - multiply calculated volume by sustain level
    this.gainNode.gain.linearRampToValueAtTime(currentVolume * sustain, startTime + attack + decay);
    
    // Sustain phase (hold current value)
    this.gainNode.gain.setValueAtTime(currentVolume * sustain, startTime + attack + decay + sustainTime);
    
    // Release phase
    this.gainNode.gain.linearRampToValueAtTime(0, startTime + totalDuration);
  }

  triggerRelease(releaseTime: number): void {
    // Immediate release from current value
    this.gainNode.gain.cancelScheduledValues(releaseTime);
    this.gainNode.gain.linearRampToValueAtTime(0, releaseTime + this.envelope.release);
  }
}