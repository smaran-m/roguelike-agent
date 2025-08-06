import { describe, test, expect, beforeEach, vi } from 'vitest';
import { EventPool } from '../../../src/core/events/EventPool.js';
import { Logger } from '../../../src/utils/Logger.js';
import { DamageDealtEvent, EnemyDiedEvent } from '../../../src/core/events/GameEvent.js';

describe('EventPool', () => {
  let eventPool: EventPool;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    eventPool = new EventPool(10, mockLogger); // Small pool for testing
  });

  describe('Object Acquisition', () => {
    test('should create new event objects when pool is empty', () => {
      const event = eventPool.acquire('DamageDealt');
      
      expect(event.type).toBe('DamageDealt');
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(typeof event.id).toBe('string');
      expect(typeof event.timestamp).toBe('number');
    });

    test('should generate unique IDs for each acquired event', () => {
      const event1 = eventPool.acquire('DamageDealt');
      // Small delay to ensure timestamp difference
      const delay = Date.now() + 1; // Ensure at least 1ms difference
      while(Date.now() < delay) {}
      const event2 = eventPool.acquire('DamageDealt');
      
      expect(event1.id).not.toBe(event2.id);
      expect(event1.timestamp).not.toBe(event2.timestamp);
    });

    test('should create events with different types', () => {
      const damageEvent = eventPool.acquire('DamageDealt');
      const deathEvent = eventPool.acquire('EnemyDied');
      const moveEvent = eventPool.acquire('EntityMoved');
      
      expect(damageEvent.type).toBe('DamageDealt');
      expect(deathEvent.type).toBe('EnemyDied');
      expect(moveEvent.type).toBe('EntityMoved');
    });
  });

  describe('Object Pooling and Reuse', () => {
    test('should pool released objects for reuse', () => {
      const originalEvent: DamageDealtEvent = {
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'test-1',
        attackerId: 'player',
        targetId: 'target',
        damage: 10,
        damageType: 'physical'
      };
      
      // Release the event to pool
      eventPool.release(originalEvent);
      
      // Acquire a new event of same type
      const reusedEvent = eventPool.acquire('DamageDealt');
      
      // Should be the same object reference but with reset properties
      expect(reusedEvent.type).toBe('DamageDealt');
      expect(reusedEvent.id).not.toBe('test-1'); // ID should be reset
      expect(reusedEvent.id).toBeDefined();
      expect(reusedEvent.timestamp).toBeDefined();
    });

    test('should respect maximum pool size', () => {
      const events: DamageDealtEvent[] = [];
      
      // Create and release more events than pool size (10)
      for (let i = 0; i < 15; i++) {
        const event: DamageDealtEvent = {
          type: 'DamageDealt',
          timestamp: Date.now(),
          id: `test-${i}`,
          attackerId: 'player',
          targetId: 'target',
          damage: i,
          damageType: 'physical'
        };
        events.push(event);
        eventPool.release(event);
      }
      
      const metrics = eventPool.getPoolMetrics();
      expect(metrics['DamageDealt']).toBe(10); // Should not exceed pool size
    });

    test('should track reuse statistics correctly', () => {
      // Create and release an event
      const event: EnemyDiedEvent = {
        type: 'EnemyDied',
        timestamp: Date.now(),
        id: 'test-death',
        enemyId: 'orc-1',
        position: { x: 5, y: 5 }
      };
      
      eventPool.release(event);
      
      // Reuse the event
      eventPool.acquire('EnemyDied');
      
      const totalMetrics = eventPool.getTotalMetrics();
      expect(totalMetrics.totalObjectsReused).toBe(1);
      expect(totalMetrics.totalObjectsPooled).toBe(1);
      expect(totalMetrics.memoryEfficiency).toBeGreaterThan(0);
    });
  });

  describe('Pool Management', () => {
    test('should provide accurate pool metrics', () => {
      // Add events to different pools
      const damageEvent: DamageDealtEvent = {
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'dmg-1',
        attackerId: 'player',
        targetId: 'target',
        damage: 10,
        damageType: 'physical'
      };
      
      const deathEvent: EnemyDiedEvent = {
        type: 'EnemyDied',
        timestamp: Date.now(),
        id: 'death-1',
        enemyId: 'orc-1',
        position: { x: 0, y: 0 }
      };
      
      eventPool.release(damageEvent);
      eventPool.release(deathEvent);
      
      const metrics = eventPool.getPoolMetrics();
      expect(metrics['DamageDealt']).toBe(1);
      expect(metrics['EnemyDied']).toBe(1);
      
      const totalMetrics = eventPool.getTotalMetrics();
      expect(totalMetrics.poolCount).toBe(2);
      expect(totalMetrics.totalPooledObjects).toBe(2);
    });

    test('should clear all pools when requested', () => {
      // Add several events
      for (let i = 0; i < 5; i++) {
        eventPool.release({
          type: 'DamageDealt',
          timestamp: Date.now(),
          id: `dmg-${i}`,
          attackerId: 'player',
          targetId: 'target',
          damage: i,
          damageType: 'physical'
        });
      }
      
      const metricsBeforeClear = eventPool.getPoolMetrics();
      expect(metricsBeforeClear['DamageDealt']).toBe(5);
      
      eventPool.clear();
      
      const metricsAfterClear = eventPool.getPoolMetrics();
      expect(metricsAfterClear['DamageDealt']).toBeUndefined();
      
      const totalMetrics = eventPool.getTotalMetrics();
      expect(totalMetrics.totalPooledObjects).toBe(0);
    });
  });

  describe('Memory Efficiency', () => {
    test('should calculate memory efficiency correctly', () => {
      // Create some objects
      for (let i = 0; i < 5; i++) {
        eventPool.acquire('DamageDealt');
      }
      
      // Release and reuse some objects
      for (let i = 0; i < 3; i++) {
        eventPool.release({
          type: 'DamageDealt',
          timestamp: Date.now(),
          id: `reuse-${i}`,
          attackerId: 'player',
          targetId: 'target',
          damage: i,
          damageType: 'physical'
        });
      }
      
      // Acquire again to trigger reuse
      for (let i = 0; i < 2; i++) {
        eventPool.acquire('DamageDealt');
      }
      
      const metrics = eventPool.getTotalMetrics();
      expect(metrics.memoryEfficiency).toBeGreaterThan(0);
      expect(metrics.totalObjectsReused).toBe(2);
      expect(metrics.totalObjectsCreated).toBe(5); // 5 initial objects, then 2 reused
    });

    test('should handle rapid acquire/release cycles efficiently', () => {
      const startTime = performance.now();
      
      // Simulate rapid event creation and pooling
      for (let cycle = 0; cycle < 100; cycle++) {
        const event = eventPool.acquire('DamageDealt');
        
        // Simulate using the event
        (event as any).attackerId = `attacker-${cycle}`;
        (event as any).damage = cycle;
        
        // Release back to pool
        eventPool.release(event as DamageDealtEvent);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete rapidly (less than 10ms for 100 cycles)
      expect(duration).toBeLessThan(10);
      
      const metrics = eventPool.getTotalMetrics();
      expect(metrics.totalObjectsReused).toBe(99); // First acquire creates, rest reuse
      expect(metrics.totalObjectsCreated).toBe(1); // Only 1 object created, then reused 99 times
      // Memory efficiency = reused / (created + reused) = 99 / (1 + 99) = 0.99
      expect(metrics.memoryEfficiency).toBeCloseTo(99, 0); // 99 reuses / 1 created = 99
    });
  });

  describe('Event Data Cleaning', () => {
    test('should clean sensitive data from pooled events', () => {
      const eventWithSensitiveData: any = {
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'test-sensitive',
        attackerId: 'player',
        targetId: 'target',
        damage: 10,
        damageType: 'physical',
        sensitiveData: 'should be removed',
        internalState: { secret: 'confidential' }
      };
      
      eventPool.release(eventWithSensitiveData);
      
      const reusedEvent = eventPool.acquire('DamageDealt') as any;
      
      // Basic properties should be present but reset
      expect(reusedEvent.type).toBe('DamageDealt');
      expect(reusedEvent.id).not.toBe('test-sensitive');
      
      // Sensitive data should be removed
      expect(reusedEvent.sensitiveData).toBeUndefined();
      expect(reusedEvent.internalState).toBeUndefined();
      expect(reusedEvent.attackerId).toBeUndefined();
      expect(reusedEvent.damage).toBeUndefined();
    });

    test('should reset timestamps and IDs on reuse', () => {
      const originalTimestamp = Date.now() - 1000; // 1 second ago
      
      const event: DamageDealtEvent = {
        type: 'DamageDealt',
        timestamp: originalTimestamp,
        id: 'original-id',
        attackerId: 'player',
        targetId: 'target',
        damage: 10,
        damageType: 'physical'
      };
      
      eventPool.release(event);
      
      // Small delay to ensure timestamp difference
      setTimeout(() => {
        const reusedEvent = eventPool.acquire('DamageDealt');
        
        expect(reusedEvent.id).not.toBe('original-id');
        expect(reusedEvent.timestamp).toBeGreaterThan(originalTimestamp);
        expect(reusedEvent.timestamp).toBeCloseTo(Date.now(), -2); // Within ~100ms
      }, 10);
    });
  });
});