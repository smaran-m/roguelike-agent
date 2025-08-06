import { SoundDefinition, MusicPattern, PlaySoundOptions, PlayMusicOptions, VisualSoundIndicator } from './AudioTypes.js';
import { SoundSynthesizer } from './SoundSynthesizer.js';
import { MusicGenerator } from './MusicGenerator.js';
import { OscillatorPool } from './OscillatorPool.js';
import { AudioSettings } from './AudioSettings.js';
import { EventBus } from '../../core/events/EventBus.js';
import { Logger } from '../../utils/Logger.js';
import { ErrorHandler, GameError, GameErrorCode } from '../../utils/ErrorHandler.js';
import { generateEventId } from '../../core/events/GameEvent.js';
import { DamageDealtEvent, EntityMovedEvent, EnemyDiedEvent } from '../../core/events/GameEvent.js';

export class AudioSystem {
  private soundSynthesizer: SoundSynthesizer | null = null;
  private musicGenerator: MusicGenerator | null = null;
  private oscillatorPool: OscillatorPool | null = null;
  private readonly settings: AudioSettings;
  private readonly eventBus: EventBus;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  constructor(
    eventBus: EventBus,
    private readonly logger: Logger,
    private readonly errorHandler: ErrorHandler
  ) {
    this.eventBus = eventBus;
    this.settings = new AudioSettings();
    
    try {
      this.initializeAudioContext();
      this.oscillatorPool = new OscillatorPool(this.audioContext!);
      this.soundSynthesizer = new SoundSynthesizer(this.audioContext!, this.oscillatorPool, this.settings);
      this.musicGenerator = new MusicGenerator(this.audioContext!, this.oscillatorPool, this.settings, this.logger);
      
      this.subscribeToGameEvents();
    } catch (error) {
      this.logger.error('Failed to initialize audio system', { error });
      this.errorHandler.handle(
        GameErrorCode.AUDIO_INITIALIZATION_FAILED,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async initialize(): Promise<void> {
    try {
      // Load sound definitions (just parameters, no audio files)
      const soundDefs = await this.loadSoundDefinitions('/src/data/audio/sound-definitions.json');
      this.soundSynthesizer?.loadDefinitions(soundDefs);
      
      // Load music patterns
      const musicPatterns = await this.loadMusicPatterns('/src/data/audio/music-patterns.json');
      this.musicGenerator?.loadPatterns(musicPatterns);
      
      // Initialize settings from storage
      await this.settings.load();
      
      this.isInitialized = true;
      
      this.logger.info('Procedural audio system initialized', {
        soundCount: soundDefs.length,
        musicPatterns: musicPatterns.length,
        audioContext: !!this.audioContext,
        sampleRate: this.audioContext?.sampleRate
      });
      
    } catch (error) {
      this.errorHandler.handle(
        GameErrorCode.AUDIO_INITIALIZATION_FAILED,
        error instanceof Error ? error : new Error(String(error)),
        { hasAudioContext: !!this.audioContext }
      );
    }
  }

  playSound(soundId: string, options: PlaySoundOptions = {}): void {
    if (!this.isInitialized || !this.audioContext) {
      this.logger.warn('Audio system not initialized, skipping sound', { soundId });
      return;
    }

    try {
      // Generate sound procedurally
      this.soundSynthesizer?.play(soundId, {
        volume: options.volume ?? 1.0,
        position: options.position,
        pitch: options.pitch ?? 1.0, // Frequency multiplier
        effects: options.effects ?? []
      });

      // Visual indicator for accessibility
      if (this.settings.config.visualIndicatorsEnabled) {
        this.showVisualSoundIndicator(soundId, options.position);
      }
      
    } catch (error) {
      this.logger.warn('Failed to synthesize sound', { soundId, error });
      this.errorHandler.handle(
        GameErrorCode.AUDIO_SYNTHESIS_FAILED,
        error instanceof Error ? error : new Error(String(error)),
        { soundId }
      );
    }
  }

  playMusic(patternId: string, options: PlayMusicOptions = {}): void {
    if (!this.isInitialized || !this.audioContext) {
      this.logger.warn('Audio system not initialized, skipping music', { patternId });
      return;
    }

    try {
      this.musicGenerator?.play(patternId, {
        volume: options.volume ?? 1.0,
        fadeInTime: options.fadeInTime ?? 2000,
        tempo: options.tempo, // Override pattern tempo
        key: options.key      // Transpose to different key
      });
      
    } catch (error) {
      this.logger.warn('Failed to generate music', { patternId, error });
      this.errorHandler.handle(
        GameErrorCode.AUDIO_SYNTHESIS_FAILED,
        error instanceof Error ? error : new Error(String(error)),
        { patternId }
      );
    }
  }

  stopAllAudio(): void {
    this.soundSynthesizer?.stopAll();
    this.musicGenerator?.stop();
    this.oscillatorPool?.releaseAll();
  }

  setMasterVolume(volume: number): void {
    this.settings.setMasterVolume(Math.max(0, Math.min(1, volume)));
    this.soundSynthesizer?.updateVolume();
    this.musicGenerator?.updateVolume();
  }

  setSfxVolume(volume: number): void {
    this.settings.setSfxVolume(Math.max(0, Math.min(1, volume)));
    this.soundSynthesizer?.updateVolume();
  }

  setMusicVolume(volume: number): void {
    this.settings.setMusicVolume(Math.max(0, Math.min(1, volume)));
    this.musicGenerator?.updateVolume();
  }

  // Generate a one-off sound effect with specific parameters
  playTone(frequency: number, duration: number, waveform: OscillatorType = 'sine'): void {
    if (!this.audioContext || !this.oscillatorPool) {
      this.logger.warn('Audio context or oscillator pool not available for tone generation');
      return;
    }

    const oscillator = this.oscillatorPool.acquire();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    const volume = this.settings.config.sfxVolume * this.settings.config.masterVolume;
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
    
    oscillator.onended = () => {
      this.oscillatorPool?.release(oscillator);
    };
  }

  resumeAudioContext(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.logger.debug('Audio context resumed');
      }).catch(error => {
        this.logger.warn('Failed to resume audio context', { error });
      });
    }
  }

  getSettings(): AudioSettings {
    return this.settings;
  }

  private initializeAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Handle audio context suspension in some browsers
      if (this.audioContext.state === 'suspended') {
        document.addEventListener('click', this.resumeAudioContext.bind(this), { once: true });
        document.addEventListener('keydown', this.resumeAudioContext.bind(this), { once: true });
      }

      this.logger.debug('Audio context initialized', {
        state: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate
      });
      
    } catch (error) {
      throw new GameError(
        GameErrorCode.AUDIO_CONTEXT_FAILED,
        'Web Audio API not available',
        { error }
      );
    }
  }

  private subscribeToGameEvents(): void {
    // Combat events
    this.eventBus.subscribe('DamageDealt', (event) => {
      const damageEvent = event as DamageDealtEvent;
      // Higher pitch for more damage
      const pitch = 1.0 + (damageEvent.damage / 20);
      this.playSound('combat_hit', { 
        position: damageEvent.targetPosition,
        pitch 
      });
    });

    this.eventBus.subscribe('EnemyDied', (event) => {
      const deathEvent = event as EnemyDiedEvent;
      this.playSound('enemy_death', { position: deathEvent.position });
    });

    // Movement events - vary pitch based on terrain
    this.eventBus.subscribe('EntityMoved', (event) => {
      const moveEvent = event as EntityMovedEvent;
      if (moveEvent.entityId === 'player') {
        const pitch = this.getTerrainPitch(moveEvent.newPosition);
        this.playSound('footstep', { 
          volume: 0.3, 
          position: moveEvent.newPosition,
          pitch 
        });
      }
    });

    // UI events
    this.eventBus.subscribe('MenuOpened', () => {
      this.playSound('ui_menu_open');
    });

    // Area transitions
    this.eventBus.subscribe('AreaEntered', (_event) => {
      // Cast to proper event type when available
      this.handleAreaMusic('default');
    });
  }

  private getTerrainPitch(position: {x: number, y: number}): number {
    // Vary footstep pitch based on terrain type
    // This could be expanded to read actual terrain data
    return 0.8 + (Math.abs(position.x + position.y) % 5) * 0.1;
  }

  private handleAreaMusic(areaType: string): void {
    const musicMap: Record<string, string> = {
      'dungeon': 'dark_exploration',
      'town': 'peaceful_ambient',
      'combat': 'battle_intense',
      'boss': 'boss_battle'
    };

    const patternId = musicMap[areaType] || 'default_ambient';
    this.playMusic(patternId, { fadeInTime: 3000 });
  }

  private showVisualSoundIndicator(soundId: string, position?: {x: number, y: number}): void {
    const indicator: VisualSoundIndicator = {
      soundId,
      position,
      duration: this.getSoundDuration(soundId),
      type: this.getSoundCategory(soundId)
    };

    this.eventBus.publish({
      type: 'ShowVisualSoundIndicator',
      timestamp: Date.now(),
      id: generateEventId(),
      indicator
    } as any);
  }

  private getSoundDuration(_soundId: string): number {
    // Default duration, could be looked up from sound definitions
    return 0.5;
  }

  private getSoundCategory(soundId: string): string {
    // Default category, could be looked up from sound definitions
    if (soundId.includes('combat')) return 'combat';
    if (soundId.includes('ui')) return 'ui';
    if (soundId.includes('footstep')) return 'movement';
    return 'environment';
  }

  private async loadSoundDefinitions(path: string): Promise<SoundDefinition[]> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load sound definitions: ${response.statusText}`);
      }
      const data = await response.json();
      return data.sounds || [];
    } catch (error) {
      this.logger.warn('Failed to load sound definitions, using fallback', { path, error });
      // Return fallback sound definitions
      return this.getFallbackSoundDefinitions();
    }
  }

  private async loadMusicPatterns(path: string): Promise<MusicPattern[]> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load music patterns: ${response.statusText}`);
      }
      const data = await response.json();
      return data.patterns || [];
    } catch (error) {
      this.logger.warn('Failed to load music patterns, using fallback', { path, error });
      // Return fallback music patterns
      return this.getFallbackMusicPatterns();
    }
  }

  private getFallbackSoundDefinitions(): SoundDefinition[] {
    return [
      {
        id: 'combat_hit',
        type: 'simple',
        waveform: 'square',
        frequency: 220,
        duration: 0.15,
        envelope: { attack: 0.01, decay: 0.05, sustain: 0.6, release: 0.09 },
        category: 'combat',
        spatialEnabled: true
      },
      {
        id: 'footstep',
        type: 'noise',
        waveform: 'square',
        frequency: 100,
        duration: 0.1,
        envelope: { attack: 0.001, decay: 0.02, sustain: 0.1, release: 0.077 },
        category: 'movement',
        spatialEnabled: true
      },
      {
        id: 'ui_menu_open',
        type: 'chord',
        waveform: 'triangle',
        frequency: 523.25,
        duration: 0.3,
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.15 },
        category: 'ui',
        spatialEnabled: false
      }
    ];
  }

  private getFallbackMusicPatterns(): MusicPattern[] {
    return [
      {
        id: 'dark_exploration',
        tempo: 80,
        timeSignature: [4, 4],
        key: 'Dm',
        progression: ['Dm', 'Bb', 'F', 'C'],
        rhythm: { pattern: [1, 0, 0.5, 0, 1, 0, 0.5, 0], subdivision: 8 },
        instruments: []
      }
    ];
  }
}