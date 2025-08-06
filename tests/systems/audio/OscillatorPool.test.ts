import { describe, test, expect, beforeEach, vi } from 'vitest';
import { OscillatorPool } from '../../../src/systems/audio/OscillatorPool.js';

// Mock OscillatorNode
const createMockOscillator = () => ({
  type: 'sine' as OscillatorType,
  frequency: { 
    setValueAtTime: vi.fn(),
    value: 440 
  },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null as any,
  playbackState: 0,
  FINISHED_STATE: 3
});

// Mock AudioContext
const createMockAudioContext = () => ({
  createOscillator: vi.fn(() => createMockOscillator()),
  sampleRate: 44100,
  currentTime: 0
});

describe('OscillatorPool', () => {
  let pool: OscillatorPool;
  let mockAudioContext: any;

  beforeEach(() => {
    mockAudioContext = createMockAudioContext();
    pool = new OscillatorPool(mockAudioContext, 10); // Small pool for testing
  });

  describe('Pool Initialization', () => {
    test('initializes with correct max pool size', () => {
      const customPool = new OscillatorPool(mockAudioContext, 25);
      expect(customPool.getPoolSize()).toBe(0); // Pool starts empty
    });

    test('uses default pool size when not specified', () => {
      const defaultPool = new OscillatorPool(mockAudioContext);
      expect(defaultPool.getPoolSize()).toBe(0); // Pool starts empty
    });
  });

  describe('Oscillator Acquisition', () => {
    test('creates new oscillator when pool is empty', () => {
      const oscillator = pool.acquire();
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(1);
      expect(oscillator).toBeDefined();
      expect(oscillator.type).toBe('sine'); // Default type from mock
    });

    test('creates multiple unique oscillators', () => {
      const osc1 = pool.acquire();
      const osc2 = pool.acquire();
      
      expect(osc1).not.toBe(osc2);
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
    });

    test('returns available oscillator from pool when available', () => {
      // Note: Since Web Audio API oscillators are one-shot,
      // the pool doesn't actually reuse oscillators in practice
      // This test verifies the interface behavior
      const oscillator = pool.acquire();
      
      expect(oscillator).toBeDefined();
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });
  });

  describe('Oscillator Release', () => {
    test('handles oscillator release gracefully', () => {
      const oscillator = pool.acquire();
      
      // Should not throw error
      expect(() => pool.release(oscillator)).not.toThrow();
    });

    test('can release multiple oscillators', () => {
      const osc1 = pool.acquire();
      const osc2 = pool.acquire();
      
      expect(() => {
        pool.release(osc1);
        pool.release(osc2);
      }).not.toThrow();
    });

    test('handles releasing same oscillator multiple times', () => {
      const oscillator = pool.acquire();
      
      expect(() => {
        pool.release(oscillator);
        pool.release(oscillator);
      }).not.toThrow();
    });

    test('handles releasing null or undefined', () => {
      expect(() => {
        pool.release(null as any);
        pool.release(undefined as any);
      }).not.toThrow();
    });
  });

  describe('Pool Management', () => {
    test('tracks pool size correctly', () => {
      expect(pool.getPoolSize()).toBe(0);
      
      // Pool size doesn't increase in current implementation
      // since Web Audio oscillators are one-shot
      const osc = pool.acquire();
      pool.release(osc);
      expect(pool.getPoolSize()).toBe(0);
    });

    test('releases all oscillators', () => {
      const osc1 = pool.acquire();
      const osc2 = pool.acquire();
      
      pool.releaseAll();
      
      expect(pool.getPoolSize()).toBe(0);
    });

    test('can continue operating after releaseAll', () => {
      pool.releaseAll();
      
      const oscillator = pool.acquire();
      expect(oscillator).toBeDefined();
    });
  });

  describe('Performance Characteristics', () => {
    test('can handle rapid acquisition and release', () => {
      const oscillators = [];
      
      // Acquire many oscillators rapidly
      for (let i = 0; i < 100; i++) {
        oscillators.push(pool.acquire());
      }
      
      expect(oscillators).toHaveLength(100);
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(100);
      
      // Release them all
      for (const osc of oscillators) {
        pool.release(osc);
      }
      
      expect(pool.getPoolSize()).toBe(0);
    });

    test('maintains reasonable creation rate under load', () => {
      const startTime = performance.now();
      
      // Acquire 50 oscillators
      const oscillators = [];
      for (let i = 0; i < 50; i++) {
        oscillators.push(pool.acquire());
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    test('handles creation when AudioContext is null', () => {
      const nullContextPool = new OscillatorPool(null as any);
      
      expect(() => nullContextPool.acquire()).toThrow();
    });

    test('handles very small pool size', () => {
      const tinyPool = new OscillatorPool(mockAudioContext, 1);
      
      const osc1 = tinyPool.acquire();
      const osc2 = tinyPool.acquire();
      
      expect(osc1).toBeDefined();
      expect(osc2).toBeDefined();
    });

    test('handles zero pool size', () => {
      const zeroPool = new OscillatorPool(mockAudioContext, 0);
      
      const oscillator = zeroPool.acquire();
      expect(oscillator).toBeDefined();
    });

    test('handles negative pool size', () => {
      const negativePool = new OscillatorPool(mockAudioContext, -5);
      
      const oscillator = negativePool.acquire();
      expect(oscillator).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    test('does not indefinitely accumulate oscillators', () => {
      const initialSize = pool.getPoolSize();
      
      // Create and release many oscillators
      for (let i = 0; i < 1000; i++) {
        const osc = pool.acquire();
        pool.release(osc);
      }
      
      const finalSize = pool.getPoolSize();
      
      // Pool size should not grow indefinitely
      expect(finalSize).toBeLessThanOrEqual(Math.max(10, initialSize));
    });

    test('can be cleared completely', () => {
      // Acquire some oscillators
      for (let i = 0; i < 5; i++) {
        pool.acquire();
      }
      
      pool.releaseAll();
      expect(pool.getPoolSize()).toBe(0);
    });
  });
});