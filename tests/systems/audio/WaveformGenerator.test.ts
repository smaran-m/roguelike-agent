import { describe, test, expect, beforeEach, vi } from 'vitest';
import { WaveformGenerator } from '../../../src/systems/audio/WaveformGenerator.js';

// Mock AudioContext
const createMockAudioContext = () => ({
  sampleRate: 44100,
  createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => ({
    length,
    numberOfChannels: channels,
    sampleRate,
    getChannelData: vi.fn((channel: number) => new Float32Array(length))
  })),
  createPeriodicWave: vi.fn((real: Float32Array, imag: Float32Array) => ({
    real,
    imag
  }))
});

describe('WaveformGenerator', () => {
  let generator: WaveformGenerator;
  let mockAudioContext: any;

  beforeEach(() => {
    mockAudioContext = createMockAudioContext();
    generator = new WaveformGenerator(mockAudioContext);
  });

  describe('Musical Note Generation', () => {
    test('generates correct frequency for A4 (440Hz)', () => {
      const frequency = generator.getFrequencyFromNote('A', 4);
      expect(frequency).toBeCloseTo(440.00, 2);
    });

    test('generates correct frequency for middle C (C4)', () => {
      const frequency = generator.getFrequencyFromNote('C', 4);
      expect(frequency).toBeCloseTo(261.63, 2);
    });

    test('handles octave changes correctly', () => {
      const c4 = generator.getFrequencyFromNote('C', 4);
      const c5 = generator.getFrequencyFromNote('C', 5);
      const c3 = generator.getFrequencyFromNote('C', 3);
      
      expect(c5).toBeCloseTo(c4 * 2, 2); // One octave up
      expect(c3).toBeCloseTo(c4 * 0.5, 2); // One octave down
    });

    test('handles sharp and flat notes correctly', () => {
      const cSharp = generator.getFrequencyFromNote('C#', 4);
      const dFlat = generator.getFrequencyFromNote('Db', 4);
      
      expect(cSharp).toBeCloseTo(277.18, 2);
      expect(dFlat).toBeCloseTo(cSharp, 2); // C# and Db are enharmonically equivalent
    });

    test('throws error for invalid note names', () => {
      expect(() => generator.getFrequencyFromNote('H', 4)).toThrow('Invalid note: H');
      expect(() => generator.getFrequencyFromNote('X', 4)).toThrow('Invalid note: X');
    });
  });

  describe('Chord Generation', () => {
    test('generates correct major triad intervals', () => {
      const cmajor = generator.getChordFrequencies('C', 'major', 4);
      
      expect(cmajor).toHaveLength(3);
      expect(cmajor[0]).toBeCloseTo(261.63, 2); // C (root)
      expect(cmajor[1]).toBeCloseTo(327.04, 2); // E (major third)
      expect(cmajor[2]).toBeCloseTo(392.44, 2); // G (perfect fifth)
    });

    test('generates correct minor triad intervals', () => {
      const aminor = generator.getChordFrequencies('A', 'minor', 4);
      const rootFreq = 440; // A4
      
      expect(aminor).toHaveLength(3);
      expect(aminor[0]).toBeCloseTo(rootFreq, 2); // A (root)
      expect(aminor[1]).toBeCloseTo(rootFreq * 1.2, 2); // C (minor third)
      expect(aminor[2]).toBeCloseTo(rootFreq * 1.5, 2); // E (perfect fifth)
    });

    test('generates suspended chords correctly', () => {
      const csus4 = generator.getChordFrequencies('C', 'sus4', 4);
      const rootFreq = 261.63;
      
      expect(csus4).toHaveLength(3);
      expect(csus4[0]).toBeCloseTo(rootFreq, 2); // C (root)
      expect(csus4[1]).toBeCloseTo(rootFreq * 1.33, 2); // F (perfect fourth)
      expect(csus4[2]).toBeCloseTo(rootFreq * 1.5, 2); // G (perfect fifth)
    });

    test('defaults to major chord for unknown chord types', () => {
      const unknownChord = generator.getChordFrequencies('C', 'unknown_chord_type', 4);
      const majorChord = generator.getChordFrequencies('C', 'major', 4);
      
      expect(unknownChord).toEqual(majorChord);
    });

    test('handles different octaves in chord generation', () => {
      const c4major = generator.getChordFrequencies('C', 'major', 4);
      const c5major = generator.getChordFrequencies('C', 'major', 5);
      
      // All frequencies should be doubled for the higher octave
      for (let i = 0; i < c4major.length; i++) {
        expect(c5major[i]).toBeCloseTo(c4major[i] * 2, 2);
      }
    });
  });

  describe('Noise Buffer Generation', () => {
    test('creates white noise buffer with correct properties', () => {
      const duration = 0.1;
      const buffer = generator.createNoiseBuffer(duration, 'white');
      
      expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(
        1, // mono channel
        mockAudioContext.sampleRate * duration,
        mockAudioContext.sampleRate
      );
      
      expect(buffer.length).toBe(mockAudioContext.sampleRate * duration);
      expect(buffer.numberOfChannels).toBe(1);
    });

    test('creates pink noise buffer with correct properties', () => {
      const duration = 0.05;
      const buffer = generator.createNoiseBuffer(duration, 'pink');
      
      expect(buffer.length).toBe(mockAudioContext.sampleRate * duration);
      expect(buffer.numberOfChannels).toBe(1);
    });

    test('defaults to white noise when no type specified', () => {
      const buffer = generator.createNoiseBuffer(0.1);
      
      expect(buffer.length).toBe(mockAudioContext.sampleRate * 0.1);
      expect(buffer.numberOfChannels).toBe(1);
    });
  });

  describe('Custom Waveform Generation', () => {
    test('creates periodic wave from frequency components', () => {
      const frequencies = [440, 880, 1320]; // Fundamental, 2nd harmonic, 3rd harmonic
      const amplitudes = [1.0, 0.5, 0.25];
      
      const periodicWave = generator.createCustomWave(frequencies, amplitudes);
      
      expect(mockAudioContext.createPeriodicWave).toHaveBeenCalled();
      expect(periodicWave).toBeDefined();
    });

    test('handles empty frequency array', () => {
      const periodicWave = generator.createCustomWave([], []);
      
      expect(mockAudioContext.createPeriodicWave).toHaveBeenCalled();
    });

    test('handles mismatched frequency and amplitude arrays', () => {
      const frequencies = [440, 880];
      const amplitudes = [1.0]; // Shorter amplitude array
      
      const periodicWave = generator.createCustomWave(frequencies, amplitudes);
      
      expect(mockAudioContext.createPeriodicWave).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('handles very low octave numbers', () => {
      const frequency = generator.getFrequencyFromNote('C', 0);
      expect(frequency).toBeCloseTo(16.35, 2); // C0
    });

    test('handles very high octave numbers', () => {
      const frequency = generator.getFrequencyFromNote('C', 8);
      expect(frequency).toBeCloseTo(4186, 0); // C8 (integer precision)
    });

    test('handles zero duration noise buffer', () => {
      const buffer = generator.createNoiseBuffer(0);
      expect(buffer.length).toBe(0);
    });

    test('handles negative octaves gracefully', () => {
      const frequency = generator.getFrequencyFromNote('C', -1);
      expect(frequency).toBeCloseTo(8.18, 2); // Very low frequency
    });
  });
});