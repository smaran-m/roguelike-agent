import { AudioConfig } from './AudioTypes.js';

export class AudioSettings {
  config: AudioConfig = {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.6,
    spatialAudioEnabled: true,
    audioQuality: 'medium',
    visualIndicatorsEnabled: false,
    chiptuneModeEnabled: false
  };

  private readonly storageKey = 'roguelike-audio-settings';

  async load(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.config = { ...this.config, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load audio settings, using defaults');
    }
  }

  async save(): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save audio settings');
    }
  }

  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, isNaN(volume) ? 0 : volume));
    this.save();
  }

  setSfxVolume(volume: number): void {
    this.config.sfxVolume = Math.max(0, Math.min(1, isNaN(volume) ? 0 : volume));
    this.save();
  }

  setMusicVolume(volume: number): void {
    this.config.musicVolume = Math.max(0, Math.min(1, isNaN(volume) ? 0 : volume));
    this.save();
  }

  toggleSpatialAudio(): void {
    this.config.spatialAudioEnabled = !this.config.spatialAudioEnabled;
    this.save();
  }

  toggleVisualIndicators(): void {
    this.config.visualIndicatorsEnabled = !this.config.visualIndicatorsEnabled;
    this.save();
  }

  toggleChiptuneMode(): void {
    this.config.chiptuneModeEnabled = !this.config.chiptuneModeEnabled;
    this.save();
  }

  setAudioQuality(quality: 'low' | 'medium' | 'high'): void {
    this.config.audioQuality = quality;
    this.save();
  }
}