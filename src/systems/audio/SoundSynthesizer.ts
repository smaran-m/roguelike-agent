import { SoundDefinition, SynthPlayOptions } from './AudioTypes.js';
import { AudioEnvelope } from './AudioEnvelope.js';
import { OscillatorPool } from './OscillatorPool.js';
import { AudioSettings } from './AudioSettings.js';
import { GameError, GameErrorCode } from '../../utils/ErrorHandler.js';

export class SynthesizedSound {
  private isPlaying = false;

  constructor(
    private readonly oscillators: OscillatorNode[],
    private readonly gainNodes: GainNode[],
    private readonly envelope: AudioEnvelope,
    private readonly duration: number,
    private readonly audioContext: AudioContext,
    private readonly onEnded: () => void,
    private readonly targetVolume: number = 1.0
  ) {}

  play(): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    const now = this.audioContext.currentTime;
    
    // Start oscillators
    for (const oscillator of this.oscillators) {
      oscillator.start(now);
      oscillator.stop(now + this.duration);
    }
    
    // Apply envelope with the calculated volume
    this.envelope.trigger(now, this.duration, this.targetVolume);
    
    // Schedule cleanup
    setTimeout(() => {
      this.onEnded();
    }, this.duration * 1000);
  }

  stop(): void {
    if (!this.isPlaying) return;
    
    const now = this.audioContext.currentTime;
    
    // Quick fade out
    for (const gainNode of this.gainNodes) {
      gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
    }
    
    // Stop oscillators after fade
    setTimeout(() => {
      for (const oscillator of this.oscillators) {
        try {
          oscillator.stop();
        } catch (error) {
          // Oscillator might already be stopped
        }
      }
      this.onEnded();
    }, 50);
  }

  updateVolume(masterVolume: number): void {
    for (const gainNode of this.gainNodes) {
      gainNode.gain.setTargetAtTime(
        masterVolume,
        this.audioContext.currentTime,
        0.1
      );
    }
  }
}

export class SoundSynthesizer {
  private readonly soundDefinitions: Map<string, SoundDefinition> = new Map();
  private readonly activeSounds: Set<SynthesizedSound> = new Set();

  constructor(
    private readonly audioContext: AudioContext,
    private readonly oscillatorPool: OscillatorPool,
    private readonly settings: AudioSettings
  ) {}

  loadDefinitions(definitions: SoundDefinition[]): void {
    for (const def of definitions) {
      this.soundDefinitions.set(def.id, def);
    }
  }

  play(soundId: string, options: SynthPlayOptions): void {
    const definition = this.soundDefinitions.get(soundId);
    if (!definition) {
      throw new GameError(GameErrorCode.SOUND_DEFINITION_NOT_FOUND, `Sound not found: ${soundId}`);
    }

    const synthesizedSound = this.createSynthesizedSound(definition, options);
    this.activeSounds.add(synthesizedSound);
    synthesizedSound.play();
  }

  stopAll(): void {
    for (const sound of this.activeSounds) {
      sound.stop();
    }
    this.activeSounds.clear();
  }

  updateVolume(): void {
    const masterVolume = this.settings.config.masterVolume * this.settings.config.sfxVolume;
    for (const sound of this.activeSounds) {
      sound.updateVolume(masterVolume);
    }
  }

  private createSynthesizedSound(definition: SoundDefinition, options: SynthPlayOptions): SynthesizedSound {
    const frequency = definition.frequency * (options.pitch || 1.0);
    
    switch (definition.type) {
      case 'simple':
        return this.createSimpleSound(definition, frequency, options);
      case 'chord':
        return this.createChordSound(definition, frequency, options);
      case 'noise':
        return this.createNoiseSound(definition, options);
      case 'sweep':
        return this.createSweepSound(definition, frequency, options);
      default:
        throw new GameError(GameErrorCode.INVALID_SOUND_TYPE, `Invalid sound type: ${definition.type}`);
    }
  }

  private createSimpleSound(definition: SoundDefinition, frequency: number, options: SynthPlayOptions): SynthesizedSound {
    const oscillator = this.oscillatorPool.acquire();
    const gainNode = this.audioContext.createGain();
    const envelope = new AudioEnvelope(gainNode, definition.envelope);

    // Apply proper volume: settings * user volume * sound category volume
    const masterVolume = this.settings.config.masterVolume;
    const categoryVolume = this.settings.config.sfxVolume;
    const userVolume = options.volume || 1.0;
    const finalVolume = masterVolume * categoryVolume * userVolume;
    
    gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);

    oscillator.type = definition.waveform;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    // Apply spatial positioning if enabled
    if (definition.spatialEnabled && options.position) {
      const pannerNode = this.audioContext.createPanner();
      pannerNode.panningModel = 'HRTF';
      pannerNode.setPosition(options.position.x, 0, options.position.y);
      
      gainNode.connect(pannerNode);
      pannerNode.connect(this.audioContext.destination);
    } else {
      gainNode.connect(this.audioContext.destination);
    }

    oscillator.connect(gainNode);

    const synthesizedSound = new SynthesizedSound(
      [oscillator],
      [gainNode],
      envelope,
      definition.duration,
      this.audioContext,
      () => {
        this.oscillatorPool.release(oscillator);
        this.activeSounds.delete(synthesizedSound);
      },
      finalVolume
    );

    return synthesizedSound;
  }

  private createChordSound(definition: SoundDefinition, baseFrequency: number, options: SynthPlayOptions): SynthesizedSound {
    // Create a simple triad (root, third, fifth)
    const frequencies = [
      baseFrequency,           // Root
      baseFrequency * 1.25,    // Major third (5:4 ratio)
      baseFrequency * 1.5      // Perfect fifth (3:2 ratio)
    ];

    const oscillators: OscillatorNode[] = [];
    const gainNodes: GainNode[] = [];

    // Calculate proper volume once for all chord tones
    const masterVolume = this.settings.config.masterVolume;
    const categoryVolume = this.settings.config.sfxVolume;
    const userVolume = options.volume || 1.0;
    const chordToneVolume = 0.3; // Reduce volume for chord harmony
    const finalVolume = masterVolume * categoryVolume * userVolume * chordToneVolume;

    for (let i = 0; i < frequencies.length; i++) {
      const oscillator = this.oscillatorPool.acquire();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = definition.waveform;
      oscillator.frequency.setValueAtTime(frequencies[i], this.audioContext.currentTime);
      
      // Apply calculated volume for chord tones
      gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillators.push(oscillator);
      gainNodes.push(gainNode);
    }

    const envelope = new AudioEnvelope(gainNodes[0], definition.envelope);

    const synthesizedSound = new SynthesizedSound(
      oscillators,
      gainNodes,
      envelope,
      definition.duration,
      this.audioContext,
      () => {
        for (const osc of oscillators) {
          this.oscillatorPool.release(osc);
        }
        this.activeSounds.delete(synthesizedSound);
      },
      finalVolume
    );

    return synthesizedSound;
  }

  private createNoiseSound(definition: SoundDefinition, options: SynthPlayOptions): SynthesizedSound {
    // Generate white noise using a buffer source
    const bufferSize = this.audioContext.sampleRate * 0.1; // 100ms of noise
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // White noise
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = this.audioContext.createGain();
    const envelope = new AudioEnvelope(gainNode, definition.envelope);
    
    // Apply proper volume
    const masterVolume = this.settings.config.masterVolume;
    const categoryVolume = this.settings.config.sfxVolume;
    const userVolume = options.volume || 1.0;
    const finalVolume = masterVolume * categoryVolume * userVolume;
    
    gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);

    // Optional filtering for colored noise
    let filterNode: BiquadFilterNode | null = null;
    if (definition.effects) {
      const filterEffect = definition.effects.find(e => e.type === 'lowpass' || e.type === 'highpass');
      if (filterEffect) {
        filterNode = this.audioContext.createBiquadFilter();
        filterNode.type = filterEffect.type as BiquadFilterType;
        filterNode.frequency.setValueAtTime(filterEffect.frequency || 1000, this.audioContext.currentTime);
        
        source.connect(filterNode);
        filterNode.connect(gainNode);
      } else {
        source.connect(gainNode);
      }
    } else {
      source.connect(gainNode);
    }

    gainNode.connect(this.audioContext.destination);

    const synthesizedSound = new SynthesizedSound(
      [source as any], // Type casting for interface compatibility
      [gainNode],
      envelope,
      definition.duration,
      this.audioContext,
      () => this.activeSounds.delete(synthesizedSound),
      finalVolume
    );

    return synthesizedSound;
  }

  private createSweepSound(definition: SoundDefinition, startFrequency: number, options: SynthPlayOptions): SynthesizedSound {
    const oscillator = this.oscillatorPool.acquire();
    const gainNode = this.audioContext.createGain();
    const envelope = new AudioEnvelope(gainNode, definition.envelope);

    // Apply proper volume
    const masterVolume = this.settings.config.masterVolume;
    const categoryVolume = this.settings.config.sfxVolume;
    const userVolume = options.volume || 1.0;
    const finalVolume = masterVolume * categoryVolume * userVolume;
    
    gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);

    oscillator.type = definition.waveform;
    oscillator.frequency.setValueAtTime(startFrequency, this.audioContext.currentTime);
    
    // Sweep to half frequency over the duration
    const endFrequency = startFrequency * 0.5;
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      this.audioContext.currentTime + definition.duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    const synthesizedSound = new SynthesizedSound(
      [oscillator],
      [gainNode],
      envelope,
      definition.duration,
      this.audioContext,
      () => {
        this.oscillatorPool.release(oscillator);
        this.activeSounds.delete(synthesizedSound);
      },
      finalVolume
    );

    return synthesizedSound;
  }
}