import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AudioSettings } from '../../../src/systems/audio/AudioSettings.js';

// Mock localStorage
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    length: 0,
    key: vi.fn()
  };
};

// Mock console methods to avoid test output noise
const mockConsole = {
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn()
};

describe('AudioSettings', () => {
  let settings: AudioSettings;
  let mockLocalStorage: any;

  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
    (global as any).localStorage = mockLocalStorage;
    (global as any).console = { ...console, ...mockConsole };
    
    settings = new AudioSettings();
  });

  describe('Default Configuration', () => {
    test('has correct default values', () => {
      expect(settings.config.masterVolume).toBe(0.8);
      expect(settings.config.sfxVolume).toBe(0.8);
      expect(settings.config.musicVolume).toBe(0.6);
      expect(settings.config.spatialAudioEnabled).toBe(true);
      expect(settings.config.audioQuality).toBe('medium');
      expect(settings.config.visualIndicatorsEnabled).toBe(false);
      expect(settings.config.chiptuneModeEnabled).toBe(false);
    });
  });

  describe('Volume Control', () => {
    test('sets master volume within valid range', () => {
      settings.setMasterVolume(0.5);
      expect(settings.config.masterVolume).toBe(0.5);
    });

    test('clamps master volume to valid range', () => {
      settings.setMasterVolume(1.5);
      expect(settings.config.masterVolume).toBe(1.0);
      
      settings.setMasterVolume(-0.5);
      expect(settings.config.masterVolume).toBe(0.0);
    });

    test('sets SFX volume within valid range', () => {
      settings.setSfxVolume(0.3);
      expect(settings.config.sfxVolume).toBe(0.3);
    });

    test('clamps SFX volume to valid range', () => {
      settings.setSfxVolume(2.0);
      expect(settings.config.sfxVolume).toBe(1.0);
      
      settings.setSfxVolume(-1.0);
      expect(settings.config.sfxVolume).toBe(0.0);
    });

    test('sets music volume within valid range', () => {
      settings.setMusicVolume(0.9);
      expect(settings.config.musicVolume).toBe(0.9);
    });

    test('clamps music volume to valid range', () => {
      settings.setMusicVolume(1.2);
      expect(settings.config.musicVolume).toBe(1.0);
      
      settings.setMusicVolume(-0.3);
      expect(settings.config.musicVolume).toBe(0.0);
    });

    test('saves settings after volume changes', async () => {
      settings.setMasterVolume(0.5);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'roguelike-audio-settings',
        expect.stringContaining('"masterVolume":0.5')
      );
    });
  });

  describe('Audio Quality Settings', () => {
    test('sets valid audio quality levels', () => {
      settings.setAudioQuality('low');
      expect(settings.config.audioQuality).toBe('low');
      
      settings.setAudioQuality('high');
      expect(settings.config.audioQuality).toBe('high');
    });

    test('saves settings after quality change', () => {
      settings.setAudioQuality('high');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'roguelike-audio-settings',
        expect.stringContaining('"audioQuality":"high"')
      );
    });
  });

  describe('Toggle Settings', () => {
    test('toggles spatial audio setting', () => {
      const initialValue = settings.config.spatialAudioEnabled;
      
      settings.toggleSpatialAudio();
      expect(settings.config.spatialAudioEnabled).toBe(!initialValue);
      
      settings.toggleSpatialAudio();
      expect(settings.config.spatialAudioEnabled).toBe(initialValue);
    });

    test('toggles visual indicators setting', () => {
      const initialValue = settings.config.visualIndicatorsEnabled;
      
      settings.toggleVisualIndicators();
      expect(settings.config.visualIndicatorsEnabled).toBe(!initialValue);
      
      settings.toggleVisualIndicators();
      expect(settings.config.visualIndicatorsEnabled).toBe(initialValue);
    });

    test('toggles chiptune mode setting', () => {
      const initialValue = settings.config.chiptuneModeEnabled;
      
      settings.toggleChiptuneMode();
      expect(settings.config.chiptuneModeEnabled).toBe(!initialValue);
      
      settings.toggleChiptuneMode();
      expect(settings.config.chiptuneModeEnabled).toBe(initialValue);
    });

    test('saves settings after toggle changes', () => {
      settings.toggleSpatialAudio();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Settings Persistence', () => {
    test('loads settings from localStorage successfully', async () => {
      const savedSettings = {
        masterVolume: 0.4,
        sfxVolume: 0.9,
        musicVolume: 0.2,
        spatialAudioEnabled: false,
        audioQuality: 'high' as const,
        visualIndicatorsEnabled: true,
        chiptuneModeEnabled: true
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings));
      
      await settings.load();
      
      expect(settings.config.masterVolume).toBe(0.4);
      expect(settings.config.sfxVolume).toBe(0.9);
      expect(settings.config.musicVolume).toBe(0.2);
      expect(settings.config.spatialAudioEnabled).toBe(false);
      expect(settings.config.audioQuality).toBe('high');
      expect(settings.config.visualIndicatorsEnabled).toBe(true);
      expect(settings.config.chiptuneModeEnabled).toBe(true);
    });

    test('handles missing localStorage data gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      await settings.load();
      
      // Should maintain default values
      expect(settings.config.masterVolume).toBe(0.8);
      expect(settings.config.sfxVolume).toBe(0.8);
      expect(settings.config.musicVolume).toBe(0.6);
    });

    test('handles corrupted localStorage data gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      
      await settings.load();
      
      // Should maintain default values and log warning
      expect(settings.config.masterVolume).toBe(0.8);
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load audio settings, using defaults'),
        expect.any(Error)
      );
    });

    test('handles partial localStorage data correctly', async () => {
      const partialSettings = {
        masterVolume: 0.3,
        audioQuality: 'low'
        // Missing other properties
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(partialSettings));
      
      await settings.load();
      
      expect(settings.config.masterVolume).toBe(0.3);
      expect(settings.config.audioQuality).toBe('low');
      // Should keep defaults for missing properties
      expect(settings.config.sfxVolume).toBe(0.8);
      expect(settings.config.musicVolume).toBe(0.6);
    });

    test('saves settings to localStorage successfully', async () => {
      settings.config.masterVolume = 0.5;
      
      await settings.save();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'roguelike-audio-settings',
        JSON.stringify(settings.config)
      );
    });

    test('handles localStorage save errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      await settings.save();
      
      // Check that the save error message was logged (should be the 2nd call)
      expect(mockConsole.warn).toHaveBeenNthCalledWith(2,
        expect.stringContaining('Failed to save audio settings'),
        undefined
      );
    });
  });

  describe('Edge Cases', () => {
    test('handles localStorage throwing errors', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      await settings.load();
      
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load audio settings, using defaults'),
        expect.any(Error)
      );
    });

    test('handles extreme volume values', () => {
      settings.setMasterVolume(Number.POSITIVE_INFINITY);
      expect(settings.config.masterVolume).toBe(1.0);
      
      settings.setMasterVolume(Number.NEGATIVE_INFINITY);
      expect(settings.config.masterVolume).toBe(0.0);
      
      settings.setMasterVolume(NaN);
      expect(settings.config.masterVolume).toBe(0.0);
    });

    test('preserves object integrity after invalid operations', async () => {
      // Try to load invalid data
      mockLocalStorage.getItem.mockReturnValue('{"invalid": "structure"}');
      
      await settings.load();
      
      // All expected properties should still exist
      expect(settings.config).toHaveProperty('masterVolume');
      expect(settings.config).toHaveProperty('sfxVolume');
      expect(settings.config).toHaveProperty('musicVolume');
      expect(settings.config).toHaveProperty('spatialAudioEnabled');
      expect(settings.config).toHaveProperty('audioQuality');
      expect(settings.config).toHaveProperty('visualIndicatorsEnabled');
      expect(settings.config).toHaveProperty('chiptuneModeEnabled');
    });
  });
});