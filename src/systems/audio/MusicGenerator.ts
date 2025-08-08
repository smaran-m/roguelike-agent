import { MusicPattern, PlayMusicOptions, InstrumentTrack, Note } from './AudioTypes.js';
import { OscillatorPool } from './OscillatorPool.js';
import { AudioEnvelope } from './AudioEnvelope.js';
import { WaveformGenerator } from './WaveformGenerator.js';
import { AudioSettings } from './AudioSettings.js';
import { Logger } from '../../utils/Logger.js';

export class MusicGenerator {
  private readonly patterns: Map<string, MusicPattern> = new Map();
  private readonly waveformGenerator: WaveformGenerator;
  private currentPattern: MusicPattern | null = null;
  private isPlaying = false;
  private musicTimeoutId: number | null = null;
  private activeOscillators: OscillatorNode[] = [];

  constructor(
    private readonly audioContext: AudioContext,
    private readonly oscillatorPool: OscillatorPool,
    private readonly settings: AudioSettings,
    private readonly logger: Logger
  ) {
    this.waveformGenerator = new WaveformGenerator(audioContext);
  }

  loadPatterns(patterns: MusicPattern[]): void {
    this.logger.info('Loading music patterns', { count: patterns.length });
    for (const pattern of patterns) {
      this.patterns.set(pattern.id, pattern);
      this.logger.info('Loaded music pattern', { id: pattern.id, tempo: pattern.tempo });
    }
  }

  play(patternId: string, options: PlayMusicOptions = {}): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      this.logger.warn('Music pattern not found', { patternId });
      return;
    }

    // Check if same pattern is already playing to avoid retriggering
    if (this.isPlaying && this.currentPattern?.id === patternId) {
      this.logger.info('Music pattern already playing, skipping retrigger', { 
        patternId, 
        currentlyPlaying: this.currentPattern?.id 
      });
      return;
    }

    // Stop current music if playing different pattern
    this.stop();

    this.currentPattern = pattern;
    this.isPlaying = true;

    const tempo = options.tempo || pattern.tempo;
    const volume = (options.volume || this.settings.config.musicVolume) * this.settings.config.masterVolume;
    
    this.logger.info('Starting music pattern', {
      patternId,
      tempo,
      volume,
      instrumentCount: pattern.instruments.length,
      wasAlreadyPlaying: false
    });

    this.startPattern(pattern, tempo, volume, options.fadeInTime);
  }

  stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.currentPattern = null;

    // Clear music timeout
    if (this.musicTimeoutId !== null) {
      clearTimeout(this.musicTimeoutId);
      this.musicTimeoutId = null;
    }

    // Stop all active oscillators
    for (const oscillator of this.activeOscillators) {
      try {
        oscillator.stop();
      } catch (error) {
        // Oscillator might already be stopped
      }
    }
    this.activeOscillators = [];

    this.logger.debug('Music stopped');
  }

  updateVolume(): void {
    // Volume updates will be applied to new notes
    // Existing notes will continue at their current volume
  }

  private startPattern(pattern: MusicPattern, tempo: number, volume: number, fadeInTime?: number): void {
    const beatDuration = 60 / tempo; // Duration of one beat in seconds
    const patternDuration = this.calculatePatternDuration(pattern, beatDuration);

    // Start all instrument tracks
    for (const track of pattern.instruments) {
      this.playInstrumentTrack(track, beatDuration, volume, fadeInTime);
    }

    // Schedule pattern to repeat
    this.musicTimeoutId = window.setTimeout(() => {
      if (this.isPlaying && this.currentPattern === pattern) {
        this.startPattern(pattern, tempo, volume); // Repeat without fade-in
      }
    }, patternDuration * 1000);
  }

  private playInstrumentTrack(track: InstrumentTrack, beatDuration: number, masterVolume: number, fadeInTime?: number): void {
    let currentTime = this.audioContext.currentTime;
    
    if (fadeInTime) {
      currentTime += fadeInTime / 1000;
    }

    for (const note of track.pattern) {
      this.playNote(note, track, currentTime, beatDuration, masterVolume, fadeInTime);
      currentTime += note.duration * beatDuration;
    }
  }

  private playNote(
    note: Note, 
    track: InstrumentTrack, 
    startTime: number, 
    beatDuration: number, 
    masterVolume: number,
    fadeInTime?: number
  ): void {
    const oscillator = this.oscillatorPool.acquire();
    const gainNode = this.audioContext.createGain();
    const envelope = new AudioEnvelope(gainNode, track.instrument.envelope);

    this.activeOscillators.push(oscillator);

    oscillator.type = track.instrument.waveform;
    oscillator.frequency.setValueAtTime(note.frequency, startTime);

    const finalVolume = masterVolume * track.volume * note.velocity;
    
    // Apply fade-in if specified
    if (fadeInTime && startTime === this.audioContext.currentTime + fadeInTime / 1000) {
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(finalVolume, startTime);
    } else {
      gainNode.gain.setValueAtTime(finalVolume, startTime);
    }

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    const noteDuration = note.duration * beatDuration;
    
    oscillator.start(startTime);
    oscillator.stop(startTime + noteDuration);
    
    envelope.trigger(startTime, noteDuration, finalVolume);

    // Clean up when note ends
    oscillator.onended = () => {
      const index = this.activeOscillators.indexOf(oscillator);
      if (index > -1) {
        this.activeOscillators.splice(index, 1);
      }
      this.oscillatorPool.release(oscillator);
    };
  }

  private calculatePatternDuration(pattern: MusicPattern, beatDuration: number): number {
    let maxDuration = 0;
    
    for (const track of pattern.instruments) {
      let trackDuration = 0;
      for (const note of track.pattern) {
        trackDuration += note.duration * beatDuration;
      }
      maxDuration = Math.max(maxDuration, trackDuration);
    }

    return maxDuration;
  }

  // Utility method to create a simple procedural melody
  generateSimpleMelody(key: string, length: number, octave: number = 4): Note[] {
    const scaleNotes = this.getScale(key, octave);
    const melody: Note[] = [];

    for (let i = 0; i < length; i++) {
      const noteIndex = Math.floor(Math.random() * scaleNotes.length);
      const frequency = scaleNotes[noteIndex];
      const duration = Math.random() > 0.7 ? 2 : 1; // Mostly quarter notes, some half notes
      const velocity = 0.6 + Math.random() * 0.4; // Random velocity between 0.6-1.0

      melody.push({
        frequency,
        duration,
        velocity
      });
    }

    return melody;
  }

  private getScale(key: string, octave: number): number[] {
    // Simple major scale generation
    const rootNote = key.replace(/m$/, ''); // Remove 'm' for minor keys
    const isMinor = key.endsWith('m');
    
    try {
      const rootFreq = this.waveformGenerator.getFrequencyFromNote(rootNote, octave);
      
      // Major scale intervals: W-W-H-W-W-W-H (whole and half steps)
      // Minor scale intervals: W-H-W-W-H-W-W
      const intervals = isMinor 
        ? [1, 1.122, 1.26, 1.414, 1.587, 1.782, 2.0] // Natural minor
        : [1, 1.122, 1.26, 1.333, 1.5, 1.682, 1.888]; // Major

      return intervals.map(interval => rootFreq * interval);
    } catch (error) {
      // Fallback to C major if invalid key
      const cFreq = this.waveformGenerator.getFrequencyFromNote('C', octave);
      return [1, 1.122, 1.26, 1.333, 1.5, 1.682, 1.888].map(interval => cFreq * interval);
    }
  }
}