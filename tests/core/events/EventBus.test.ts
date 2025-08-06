import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus } from '../../../src/core/events/EventBus.js';
import { Logger } from '../../../src/utils/Logger.js';
import { ErrorHandler } from '../../../src/utils/ErrorHandler.js';
import { DamageDealtEvent, EnemyDiedEvent, EntityMovedEvent } from '../../../src/core/events/GameEvent.js';

describe('EventBus', () => {
  let eventBus: EventBus;
  let mockLogger: Logger;
  let mockErrorHandler: ErrorHandler;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    mockErrorHandler = {
      handle: vi.fn()
    } as any;

    eventBus = new EventBus(
      { bufferSize: 64, enableAggregation: false, enablePooling: false },
      mockLogger,
      mockErrorHandler
    );
  });

  afterEach(() => {
    eventBus.flush();
    vi.clearAllMocks();
  });

  describe('Event Publishing and Subscription', () => {
    test('should publish and handle events correctly', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.subscribe('EnemyDied', handler);
      
      const event: EnemyDiedEvent = {
        type: 'EnemyDied',
        timestamp: Date.now(),
        id: 'test-1',
        enemyId: 'orc-1',
        position: { x: 5, y: 5 }
      };
      
      eventBus.publish(event);
      eventBus.processEvents();
      
      expect(handler).toHaveBeenCalledWith(event);
      expect(handler).toHaveBeenCalledTimes(1);
      
      unsubscribe();
    });

    test('should handle multiple subscribers for same event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      eventBus.subscribe('DamageDealt', handler1);
      eventBus.subscribe('DamageDealt', handler2);
      
      const event: DamageDealtEvent = {
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'test-dmg-1',
        attackerId: 'player',
        targetId: 'orc-1',
        damage: 10,
        damageType: 'physical'
      };
      
      eventBus.publish(event);
      eventBus.processEvents();
      
      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test('should not deliver events to unsubscribed handlers', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.subscribe('EnemyDied', handler);
      
      const event: EnemyDiedEvent = {
        type: 'EnemyDied',
        timestamp: Date.now(),
        id: 'test-2',
        enemyId: 'goblin-1',
        position: { x: 3, y: 3 }
      };
      
      // Unsubscribe before publishing
      unsubscribe();
      
      eventBus.publish(event);
      eventBus.processEvents();
      
      expect(handler).not.toHaveBeenCalled();
    });

    test('should handle events with no subscribers gracefully', () => {
      const event: EntityMovedEvent = {
        type: 'EntityMoved',
        timestamp: Date.now(),
        id: 'test-move-1',
        entityId: 'player',
        oldPosition: { x: 0, y: 0 },
        newPosition: { x: 1, y: 1 }
      };
      
      // No subscribers registered
      expect(() => {
        eventBus.publish(event);
        eventBus.processEvents();
      }).not.toThrow();
    });
  });

  describe('Ring Buffer Behavior', () => {
    test('should handle ring buffer overflow correctly', () => {
      const handler = vi.fn();
      eventBus.subscribe('DamageDealt', handler);
      
      // Fill buffer beyond capacity (64 events)
      for (let i = 0; i < 100; i++) {
        eventBus.publish({
          type: 'DamageDealt',
          timestamp: Date.now(),
          id: `test-dmg-${i}`,
          attackerId: 'player',
          targetId: 'target',
          damage: i,
          damageType: 'physical'
        });
      }
      
      eventBus.processEvents();
      
      // Should have processed 64 events (buffer size)
      expect(handler).toHaveBeenCalledTimes(64);
      
      // Check that oldest events were dropped (should start from event 36)
      const firstCallDamage = handler.mock.calls[0][0].damage;
      expect(firstCallDamage).toBe(36); // 100 - 64 = 36
    });

    test('should maintain FIFO order for events', () => {
      const handler = vi.fn();
      eventBus.subscribe('DamageDealt', handler);
      
      const events = [
        { damage: 5, id: 'first' },
        { damage: 10, id: 'second' },
        { damage: 15, id: 'third' }
      ];
      
      events.forEach(({ damage, id }) => {
        eventBus.publish({
          type: 'DamageDealt',
          timestamp: Date.now(),
          id,
          attackerId: 'player',
          targetId: 'target',
          damage,
          damageType: 'physical'
        });
      });
      
      eventBus.processEvents();
      
      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler.mock.calls[0][0].damage).toBe(5);
      expect(handler.mock.calls[1][0].damage).toBe(10);
      expect(handler.mock.calls[2][0].damage).toBe(15);
    });
  });

  describe('Error Handling', () => {
    test('should handle event processing errors gracefully', () => {
      const faultyHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const goodHandler = vi.fn();
      
      eventBus.subscribe('DamageDealt', faultyHandler);
      eventBus.subscribe('DamageDealt', goodHandler);
      
      const event: DamageDealtEvent = {
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'test-error',
        attackerId: 'player',
        targetId: 'target',
        damage: 10,
        damageType: 'physical'
      };
      
      eventBus.publish(event);
      eventBus.processEvents();
      
      // Both handlers should have been called
      expect(faultyHandler).toHaveBeenCalledWith(event);
      expect(goodHandler).toHaveBeenCalledWith(event);
      
      // Error should have been logged and handled
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Event handler threw an exception',
        expect.objectContaining({
          eventType: 'DamageDealt',
          eventId: 'test-error'
        })
      );
      
      expect(mockErrorHandler.handle).toHaveBeenCalled();
    });

    test('should not break processing when one handler fails', () => {
      const handler1 = vi.fn();
      const faultyHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const handler3 = vi.fn();
      
      eventBus.subscribe('DamageDealt', handler1);
      eventBus.subscribe('DamageDealt', faultyHandler);
      eventBus.subscribe('DamageDealt', handler3);
      
      const event: DamageDealtEvent = {
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'test-resilience',
        attackerId: 'player',
        targetId: 'target',
        damage: 10,
        damageType: 'physical'
      };
      
      eventBus.publish(event);
      eventBus.processEvents();
      
      // All handlers should have been called despite the error in the middle one
      expect(handler1).toHaveBeenCalledWith(event);
      expect(faultyHandler).toHaveBeenCalledWith(event);
      expect(handler3).toHaveBeenCalledWith(event);
    });
  });

  describe('Performance and Metrics', () => {
    test('should provide accurate metrics', () => {
      const handler = vi.fn();
      eventBus.subscribe('DamageDealt', handler);
      eventBus.subscribe('EnemyDied', handler);
      
      // Publish several events
      for (let i = 0; i < 10; i++) {
        eventBus.publish({
          type: 'DamageDealt',
          timestamp: Date.now(),
          id: `dmg-${i}`,
          attackerId: 'player',
          targetId: 'target',
          damage: i,
          damageType: 'physical'
        });
      }
      
      eventBus.processEvents();
      
      const metrics = eventBus.getMetrics();
      
      expect(metrics.totalEventsProcessed).toBe(10);
      expect(metrics.activeHandlers).toBe(2); // 2 subscriptions
      expect(metrics.bufferUsage).toBe(0); // Buffer should be empty after processing
      expect(metrics.droppedEvents).toBe(0);
      expect(typeof metrics.eventsPerSecond).toBe('number');
    });

    test('should track dropped events correctly', () => {
      // Don't process events to fill buffer
      for (let i = 0; i < 100; i++) {
        eventBus.publish({
          type: 'DamageDealt',
          timestamp: Date.now(),
          id: `dmg-${i}`,
          attackerId: 'player',
          targetId: 'target',
          damage: i,
          damageType: 'physical'
        });
      }
      
      const metrics = eventBus.getMetrics();
      expect(metrics.droppedEvents).toBe(36); // 100 - 64 buffer size
      expect(metrics.bufferUsage).toBe(1); // Buffer is full
    });

    test('should process events efficiently under load', () => {
      const handler = vi.fn();
      eventBus.subscribe('DamageDealt', handler);
      
      const startTime = performance.now();
      
      // Process 1000 events
      for (let i = 0; i < 1000; i++) {
        eventBus.publish({
          type: 'DamageDealt',
          timestamp: Date.now(),
          id: `perf-${i}`,
          attackerId: 'player',
          targetId: 'target',
          damage: i,
          damageType: 'physical'
        });
        
        // Process in batches to avoid buffer overflow
        if (i % 50 === 49) {
          eventBus.processEvents();
        }
      }
      
      eventBus.processEvents(); // Process any remaining
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Should process 1000 events in reasonable time (less than 50ms)
      expect(processingTime).toBeLessThan(50);
      expect(handler).toHaveBeenCalledTimes(1000);
    });
  });

  describe('Event Aggregation', () => {
    test('should aggregate similar damage events when enabled', () => {
      // Create new EventBus with aggregation enabled
      const aggregatingEventBus = new EventBus(
        { bufferSize: 64, enableAggregation: true, enablePooling: false },
        mockLogger,
        mockErrorHandler
      );
      
      const handler = vi.fn();
      aggregatingEventBus.subscribe('DamageDealt', handler);
      
      // Publish multiple damage events to same target quickly
      aggregatingEventBus.publish({
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'dmg-1',
        attackerId: 'player',
        targetId: 'orc-1',
        damage: 5,
        damageType: 'physical'
      });
      
      aggregatingEventBus.publish({
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'dmg-2',
        attackerId: 'player',
        targetId: 'orc-1',
        damage: 3,
        damageType: 'physical'
      });
      
      // Wait for aggregation window
      setTimeout(() => {
        aggregatingEventBus.processEvents();
        
        // Should receive one aggregated event with combined damage
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].damage).toBe(8); // 5 + 3
      }, 150); // Wait longer than aggregation window
      
      aggregatingEventBus.flush();
    });
  });

  describe('Flush Behavior', () => {
    test('should clear all pending events when flushed', () => {
      const handler = vi.fn();
      eventBus.subscribe('DamageDealt', handler);
      
      // Add events without processing
      eventBus.publish({
        type: 'DamageDealt',
        timestamp: Date.now(),
        id: 'dmg-1',
        attackerId: 'player',
        targetId: 'target',
        damage: 5,
        damageType: 'physical'
      });
      
      // Flush before processing
      eventBus.flush();
      eventBus.processEvents();
      
      // Handler should not have been called
      expect(handler).not.toHaveBeenCalled();
      
      const metrics = eventBus.getMetrics();
      expect(metrics.bufferUsage).toBe(0);
    });
  });
});