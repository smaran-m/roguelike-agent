// Audio system types and interfaces

export interface AudioConfig {
  masterVolume: number;        // 0.0 - 1.0
  sfxVolume: number;          // 0.0 - 1.0
  musicVolume: number;        // 0.0 - 1.0
  spatialAudioEnabled: boolean;
  audioQuality: 'low' | 'medium' | 'high';
  visualIndicatorsEnabled: boolean; // Accessibility
  chiptuneModeEnabled: boolean;     // 8-bit style processing
}

export interface SoundDefinition {
  id: string;
  type: 'simple' | 'chord' | 'noise' | 'sweep';
  waveform: 'sine' | 'square' | 'triangle' | 'sawtooth';
  frequency: number;           // Base frequency in Hz
  duration: number;            // Duration in seconds
  envelope: ADSREnvelope;      // Attack, Decay, Sustain, Release
  effects?: AudioEffect[];     // Optional effects (tremolo, vibrato, etc.)
  category: 'combat' | 'ui' | 'movement' | 'environment';
  spatialEnabled: boolean;
}

export interface ADSREnvelope {
  attack: number;    // Attack time in seconds
  decay: number;     // Decay time in seconds  
  sustain: number;   // Sustain level (0.0 - 1.0)
  release: number;   // Release time in seconds
}

export interface AudioEffect {
  type: 'vibrato' | 'tremolo' | 'distortion' | 'lowpass' | 'highpass';
  intensity: number; // 0.0 - 1.0
  frequency?: number; // For filter effects
}

export interface MusicPattern {
  id: string;
  tempo: number;               // BPM
  timeSignature: [number, number]; // e.g., [4, 4]
  key: string;                 // e.g., 'C', 'Am', 'F#'
  progression: string[];       // Chord progression: ['C', 'Am', 'F', 'G']
  melody?: Note[];            // Optional melody line
  rhythm: RhythmPattern;
  instruments: InstrumentTrack[];
}

export interface Note {
  frequency: number;
  duration: number;            // In beats
  velocity: number;            // 0.0 - 1.0
}

export interface RhythmPattern {
  pattern: number[];           // Array of velocity values (0-1)
  subdivision: number;         // Subdivisions per beat (8 = eighth notes)
}

export interface InstrumentTrack {
  instrument: InstrumentPreset;
  pattern: Note[];
  volume: number;
}

export interface InstrumentPreset {
  id: string;
  name: string;
  waveform: 'sine' | 'square' | 'triangle' | 'sawtooth';
  envelope: ADSREnvelope;
  effects: AudioEffect[];
}

export interface PlaySoundOptions {
  volume?: number;
  position?: { x: number; y: number };
  pitch?: number;              // Frequency multiplier
  effects?: AudioEffect[];
}

export interface PlayMusicOptions {
  volume?: number;
  fadeInTime?: number;         // Milliseconds
  tempo?: number;              // Override pattern tempo
  key?: string;                // Transpose to different key
}

export interface SynthPlayOptions {
  volume?: number;
  position?: { x: number; y: number };
  pitch?: number;
  effects?: AudioEffect[];
}

export interface VisualSoundIndicator {
  soundId: string;
  position?: { x: number; y: number };
  duration: number;
  type: string;
}

// Audio event types for integration with EventBus
export interface AudioSynthesisFailedEvent {
  type: 'AudioSynthesisFailed';
  timestamp: number;
  id: string;
  soundId: string;
  error: string;
}

export interface ShowVisualSoundIndicatorEvent {
  type: 'ShowVisualSoundIndicator';
  timestamp: number;
  id: string;
  indicator: VisualSoundIndicator;
}

export interface AudioAssetFailedEvent {
  type: 'AudioAssetFailed';
  timestamp: number;
  id: string;
  assetId: string;
}

// Extend game events with audio events
declare module '../../core/events/GameEvent.js' {
  interface GameEventMap {
    'AudioSynthesisFailed': AudioSynthesisFailedEvent;
    'ShowVisualSoundIndicator': ShowVisualSoundIndicatorEvent;
    'AudioAssetFailed': AudioAssetFailedEvent;
  }
}