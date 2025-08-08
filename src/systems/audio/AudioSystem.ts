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
import soundDefinitionsData from '../../data/audio/sound-definitions.json';
import musicPatternsData from '../../data/audio/music-patterns.json';

export class AudioSystem {
  private soundSynthesizer: SoundSynthesizer | null = null;
  private musicGenerator: MusicGenerator | null = null;
  private oscillatorPool: OscillatorPool | null = null;
  private readonly settings: AudioSettings;
  private readonly eventBus: EventBus;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private backgroundMusicStarted = false;
  private resumeHandlersRemoved = false;
  private lastFootstepTime = 0;
  private footstepDebounceMs = 100; // Prevent multiple footsteps within 100ms

  constructor(
    eventBus: EventBus,
    private readonly logger: Logger,
    private readonly errorHandler: ErrorHandler
  ) {
    this.eventBus = eventBus;
    this.settings = new AudioSettings();
    
    this.logger.info('🔊 AudioSystem constructor starting');
    
    try {
      this.initializeAudioContext();
      this.logger.info('🔊 AudioContext initialized successfully', {
        state: this.audioContext?.state,
        sampleRate: this.audioContext?.sampleRate
      });
      
      this.oscillatorPool = new OscillatorPool(this.audioContext!);
      this.soundSynthesizer = new SoundSynthesizer(this.audioContext!, this.oscillatorPool, this.settings);
      this.musicGenerator = new MusicGenerator(this.audioContext!, this.oscillatorPool, this.settings, this.logger);
      
      this.subscribeToGameEvents();
      this.logger.info('🔊 AudioSystem constructor completed successfully');
    } catch (error) {
      this.logger.error('🔊 Failed to initialize audio system', { error });
      this.errorHandler.handle(
        GameErrorCode.AUDIO_INITIALIZATION_FAILED,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('🔊 AudioSystem.initialize() starting');
      
      // Load sound definitions from imported JSON
      const soundDefs = soundDefinitionsData.sounds as SoundDefinition[];
      this.logger.info('🔊 Loading sound definitions', { 
        soundCount: soundDefs.length,
        soundIds: soundDefs.map(s => s.id)
      });
      this.soundSynthesizer?.loadDefinitions(soundDefs);
      
      // Load music patterns from imported JSON  
      const musicPatterns = musicPatternsData.patterns as MusicPattern[];
      this.logger.info('🔊 Loading music patterns', { 
        patternCount: musicPatterns.length,
        patternIds: musicPatterns.map(p => p.id)
      });
      this.musicGenerator?.loadPatterns(musicPatterns);
      
      // Initialize settings from storage
      await this.settings.load();
      this.logger.info('🔊 Audio settings loaded', {
        masterVolume: this.settings.config.masterVolume,
        sfxVolume: this.settings.config.sfxVolume,
        musicVolume: this.settings.config.musicVolume,
        finalSfxVolume: this.settings.config.masterVolume * this.settings.config.sfxVolume,
        finalMusicVolume: this.settings.config.masterVolume * this.settings.config.musicVolume
      });
      
      this.isInitialized = true;
      
      this.logger.info('🔊 Procedural audio system initialized', {
        soundCount: soundDefs.length,
        musicPatterns: musicPatterns.length,
        audioContext: !!this.audioContext,
        audioContextState: this.audioContext?.state,
        sampleRate: this.audioContext?.sampleRate,
        isInitialized: this.isInitialized
      });

      // Start ambient background music after a brief delay
      setTimeout(() => {
        this.startBackgroundMusic();
      }, 1000);
      
    } catch (error) {
      this.logger.error('🔊 AudioSystem.initialize() failed', { error });
      this.errorHandler.handle(
        GameErrorCode.AUDIO_INITIALIZATION_FAILED,
        error instanceof Error ? error : new Error(String(error)),
        { hasAudioContext: !!this.audioContext }
      );
    }
  }

  playSound(soundId: string, options: PlaySoundOptions = {}): void {
    this.logger.info('🔊 playSound called', { 
      soundId, 
      options, 
      isInitialized: this.isInitialized, 
      hasAudioContext: !!this.audioContext,
      audioContextState: this.audioContext?.state 
    });
    
    if (!this.isInitialized || !this.audioContext) {
      this.logger.warn('🔊 Audio system not initialized, skipping sound', { 
        soundId,
        isInitialized: this.isInitialized,
        hasAudioContext: !!this.audioContext,
        audioContextState: this.audioContext?.state
      });
      return;
    }

    // Calculate final volume for logging
    const volume = options.volume ?? 1.0;
    const finalVolume = this.settings.config.masterVolume * this.settings.config.sfxVolume * volume;
    
    this.logger.info('🔊 Playing sound with calculated volume', {
      soundId,
      requestedVolume: volume,
      masterVolume: this.settings.config.masterVolume,
      sfxVolume: this.settings.config.sfxVolume,
      finalVolume,
      audioContextState: this.audioContext.state
    });

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
      
      this.logger.info('🔊 Sound synthesis completed successfully', { soundId });
      
    } catch (error) {
      this.logger.warn('🔊 Failed to synthesize sound', { soundId, error });
      this.errorHandler.handle(
        GameErrorCode.AUDIO_SYNTHESIS_FAILED,
        error instanceof Error ? error : new Error(String(error)),
        { soundId }
      );
    }
  }

  playMusic(patternId: string, options: PlayMusicOptions = {}): void {
    this.logger.info('🔊 playMusic called', { 
      patternId, 
      options, 
      isInitialized: this.isInitialized, 
      hasAudioContext: !!this.audioContext,
      audioContextState: this.audioContext?.state
    });
    
    if (!this.isInitialized || !this.audioContext) {
      this.logger.warn('🔊 Audio system not initialized, skipping music', { 
        patternId,
        isInitialized: this.isInitialized,
        hasAudioContext: !!this.audioContext,
        audioContextState: this.audioContext?.state
      });
      return;
    }

    // Calculate final volume for logging
    const volume = options.volume ?? 1.0;
    const finalVolume = this.settings.config.masterVolume * this.settings.config.musicVolume * volume;
    
    this.logger.info('🔊 Playing music with calculated volume', {
      patternId,
      requestedVolume: volume,
      masterVolume: this.settings.config.masterVolume,
      musicVolume: this.settings.config.musicVolume,
      finalVolume,
      audioContextState: this.audioContext.state
    });

    try {
      this.musicGenerator?.play(patternId, {
        volume: options.volume ?? 1.0,
        fadeInTime: options.fadeInTime ?? 2000,
        tempo: options.tempo, // Override pattern tempo
        key: options.key      // Transpose to different key
      });
      
      this.logger.info('🔊 Music generation completed successfully', { patternId });
      
    } catch (error) {
      this.logger.warn('🔊 Failed to generate music', { patternId, error });
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
      this.logger.warn('🔊 Audio context or oscillator pool not available for tone generation');
      return;
    }

    const oscillator = this.oscillatorPool.acquire();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    const volume = this.settings.config.sfxVolume * this.settings.config.masterVolume;
    this.logger.info('🔊 Playing test tone', {
      frequency,
      duration,
      waveform,
      volume,
      audioContextState: this.audioContext.state
    });
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
    
    oscillator.onended = () => {
      this.oscillatorPool?.release(oscillator);
      this.logger.debug('🔊 Test tone ended');
    };
  }

  // Testing utilities for debugging
  testSound(soundId?: string): void {
    this.logger.info('🔊 Testing sound system', {
      isInitialized: this.isInitialized,
      audioContextState: this.audioContext?.state,
      soundId: soundId || 'footstep'
    });
    
    if (soundId) {
      this.playSound(soundId, { volume: 1.0 });
    } else {
      // Test a simple tone first
      this.playTone(440, 0.5, 'sine');
    }
  }

  testMusic(patternId?: string): void {
    this.logger.info('🔊 Testing music system', {
      isInitialized: this.isInitialized,
      audioContextState: this.audioContext?.state,
      patternId: patternId || 'dark_exploration'
    });
    
    this.playMusic(patternId || 'dark_exploration', { volume: 1.0, fadeInTime: 500 });
  }

  // Debug function to check audio system status
  getDebugInfo(): any {
    return {
      isInitialized: this.isInitialized,
      hasAudioContext: !!this.audioContext,
      audioContextState: this.audioContext?.state,
      sampleRate: this.audioContext?.sampleRate,
      settings: this.settings.config,
      backgroundMusicStarted: this.backgroundMusicStarted,
      soundDefinitionsCount: this.soundSynthesizer ? 'loaded' : 'not loaded',
      musicPatternsCount: this.musicGenerator ? 'loaded' : 'not loaded'
    };
  }

  // Reset background music flag for testing
  resetBackgroundMusic(): void {
    this.logger.info('🔊 Resetting background music flag');
    this.backgroundMusicStarted = false;
    this.musicGenerator?.stop();
  }

  resumeAudioContext(): void {
    if (this.audioContext) {
      this.logger.info('🔊 Attempting to resume AudioContext', { 
        currentState: this.audioContext.state,
        isInitialized: this.isInitialized,
        backgroundMusicStarted: this.backgroundMusicStarted
      });
      
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          this.logger.info('🔊 Audio context resumed successfully', { 
            newState: this.audioContext?.state,
            sampleRate: this.audioContext?.sampleRate
          });
          
          // Start background music after AudioContext resumes (only once)
          this.startBackgroundMusic();
          
        }).catch(error => {
          this.logger.warn('🔊 Failed to resume audio context', { error });
        });
      } else {
        this.logger.info('🔊 AudioContext not suspended, no resume needed', { 
          state: this.audioContext.state 
        });
        
        // Try to start music if it hasn't started and context is ready
        this.startBackgroundMusic();
      }
    } else {
      this.logger.warn('🔊 No AudioContext available for resume');
    }
  }

  private startBackgroundMusic(): void {
    if (!this.backgroundMusicStarted && this.isInitialized && this.audioContext?.state === 'running') {
      this.logger.info('🔊 Starting background music for the first time');
      this.backgroundMusicStarted = true;
      this.playMusic('dark_exploration', { 
        volume: 1.2, 
        fadeInTime: 3000 
      });
      
      // Remove event handlers once audio is working to prevent spam
      this.removeResumeHandlers();
    } else {
      this.logger.debug('🔊 Skipping background music start', {
        alreadyStarted: this.backgroundMusicStarted,
        isInitialized: this.isInitialized,
        audioContextState: this.audioContext?.state
      });
    }
  }

  private removeResumeHandlers(): void {
    if (!this.resumeHandlersRemoved && (this as any).resumeHandler) {
      this.logger.info('🔊 Removing resume event handlers to prevent spam');
      document.removeEventListener('click', (this as any).resumeHandler);
      document.removeEventListener('keydown', (this as any).resumeHandler);
      document.removeEventListener('touchstart', (this as any).resumeHandler);
      document.removeEventListener('visibilitychange', (this as any).visibilityHandler);
      this.resumeHandlersRemoved = true;
    }
  }

  getSettings(): AudioSettings {
    return this.settings;
  }

  private initializeAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      this.logger.info('🔊 AudioContext created', {
        state: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate
      });
      
      // Add resume listeners since browsers require user interaction
      // Store handlers so we can remove them later
      const resumeHandler = () => {
        this.logger.info('🔊 User interaction detected - attempting to resume audio');
        this.resumeAudioContext();
      };
      
      // Store handlers for later removal
      (this as any).resumeHandler = resumeHandler;
      
      document.addEventListener('click', resumeHandler);
      document.addEventListener('keydown', resumeHandler);
      document.addEventListener('touchstart', resumeHandler);
      
      // Also listen for visibility changes to resume audio
      const visibilityHandler = () => {
        if (!document.hidden && this.audioContext?.state === 'suspended') {
          this.logger.info('🔊 Page became visible - attempting to resume audio');
          this.resumeAudioContext();
        }
      };
      (this as any).visibilityHandler = visibilityHandler;
      document.addEventListener('visibilitychange', visibilityHandler);

      this.logger.info('🔊 Audio context initialized with event listeners', {
        state: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate
      });
      
    } catch (error) {
      this.logger.error('🔊 Failed to create AudioContext', { error });
      throw new GameError(
        GameErrorCode.AUDIO_CONTEXT_FAILED,
        'Web Audio API not available',
        { error }
      );
    }
  }

  private subscribeToGameEvents(): void {
    this.logger.info('🔊 Subscribing to game events');
    
    // Combat events
    this.eventBus.subscribe('DamageDealt', (event) => {
      const damageEvent = event as DamageDealtEvent;
      this.logger.info('🔊 DamageDealt event received', { damage: damageEvent.damage, targetPosition: damageEvent.targetPosition });
      // Higher pitch for more damage
      const pitch = 1.0 + (damageEvent.damage / 20);
      this.playSound('combat_hit', { 
        position: damageEvent.targetPosition,
        pitch 
      });
    });

    this.eventBus.subscribe('EnemyDied', (event) => {
      const deathEvent = event as EnemyDiedEvent;
      this.logger.info('🔊 EnemyDied event received', { position: deathEvent.position });
      this.playSound('enemy_death', { 
        volume: 0.3, 
        position: deathEvent.position 
      });
    });

    // Movement events - vary pitch based on terrain
    this.eventBus.subscribe('EntityMoved', (event) => {
      const moveEvent = event as EntityMovedEvent;
      this.logger.debug('🔊 EntityMoved event received', { 
        entityId: moveEvent.entityId, 
        oldPosition: moveEvent.oldPosition,
        newPosition: moveEvent.newPosition,
        isPlayerCheck: moveEvent.entityId === 'player',
        entityIdType: typeof moveEvent.entityId,
        entityIdLength: moveEvent.entityId?.length
      });
      
      // More flexible player checking - check for 'player' or entities that look like players
      const isPlayerEntity = moveEvent.entityId === 'player' || 
                           moveEvent.entityId?.toLowerCase().includes('player') ||
                           moveEvent.entityId?.includes('Hattori'); // Based on GameStateManager
      
      if (isPlayerEntity) {
        const currentTime = Date.now();
        const timeSinceLastFootstep = currentTime - this.lastFootstepTime;
        
        if (timeSinceLastFootstep >= this.footstepDebounceMs) {
          const pitch = this.getTerrainPitch(moveEvent.newPosition);
          
          this.logger.debug('🔊 Playing footstep sound for player movement', { 
            entityId: moveEvent.entityId,
            pitch, 
            position: moveEvent.newPosition,
            timeSinceLastFootstep,
            audioContextState: this.audioContext?.state,
            isInitialized: this.isInitialized
          });
          
          this.playSound('footstep', { 
            volume: 0.8, 
            position: moveEvent.newPosition,
            pitch 
          });
          
          this.lastFootstepTime = currentTime;
        } else {
          this.logger.debug('🔊 Skipping footstep due to debounce', {
            timeSinceLastFootstep,
            debounceMs: this.footstepDebounceMs,
            position: moveEvent.newPosition
          });
        }
      } else {
        this.logger.debug('🔊 Skipping footstep for non-player entity', { 
          entityId: moveEvent.entityId,
          expectedPlayerId: 'player'
        });
      }
    });

    // UI events
    this.eventBus.subscribe('MenuOpened', () => {
      this.logger.info('🔊 MenuOpened event received');
      this.playSound('ui_menu_open');
    });

    // Area transitions
    this.eventBus.subscribe('AreaEntered', (_event) => {
      this.logger.info('🔊 AreaEntered event received');
      // Cast to proper event type when available
      this.handleAreaMusic('default');
    });
    
    this.logger.info('🔊 Game event subscriptions completed');
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


}