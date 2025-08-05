import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStateManager } from '../GameStateManager';
import { Entity } from '../../types';
import { CombatSystem } from '../CombatSystem';
import { ResourceManager } from '../../utils/ResourceManager';
import { WorldConfigLoader } from '../../utils/WorldConfigLoader';

describe('GameStateManager', () => {
  let gameStateManager: GameStateManager;

  beforeEach(() => {
    // Initialize world configuration
    WorldConfigLoader.initialize('fantasy');
    
    gameStateManager = new GameStateManager();
  });

  it('should initialize with empty state', () => {
    expect(gameStateManager.getEntityCount()).toBe(0);
    expect(gameStateManager.getEnemyCount()).toBe(0);
    expect(gameStateManager.getAllEntities()).toHaveLength(0);
  });

  it('should initialize entities correctly', () => {
    const entities = gameStateManager.initializeEntities();
    
    expect(entities.length).toBeGreaterThan(0);
    expect(gameStateManager.getEntityCount()).toBeGreaterThan(0);
    
    const player = gameStateManager.getPlayer();
    expect(player).toBeDefined();
    expect(player?.isPlayer).toBe(true);
    expect(player?.id).toBe('player');
  });

  it('should add and remove entities', () => {
    const testEntity: Entity = {
      id: 'test',
      x: 0,
      y: 0,
      glyph: 'T',
      color: 0xFFFFFF,
      name: 'Test',
      isEmoji: false,
      stats: CombatSystem.createEnemyStats()
    };

    gameStateManager.addEntity(testEntity);
    expect(gameStateManager.getEntityCount()).toBe(1);
    expect(gameStateManager.getEntity('test')).toBe(testEntity);

    const removed = gameStateManager.removeEntity('test');
    expect(removed).toBe(true);
    expect(gameStateManager.getEntityCount()).toBe(0);
    expect(gameStateManager.getEntity('test')).toBeUndefined();
  });

  it('should update entity position', () => {
    gameStateManager.initializeEntities();
    const player = gameStateManager.getPlayer()!;
    const initialX = player.x;
    const initialY = player.y;

    const updated = gameStateManager.updateEntityPosition(player.id, 10, 10);
    expect(updated).toBe(true);
    expect(player.x).toBe(10);
    expect(player.y).toBe(10);
    expect(player.x).not.toBe(initialX);
    expect(player.y).not.toBe(initialY);
  });

  it('should check position occupation', () => {
    gameStateManager.initializeEntities();
    const player = gameStateManager.getPlayer()!;
    
    const occupyingEntity = gameStateManager.isPositionOccupied(player.x, player.y);
    expect(occupyingEntity).toBe(player);
    
    const emptyPosition = gameStateManager.isPositionOccupied(99, 99);
    expect(emptyPosition).toBeNull();
    
    const excludedCheck = gameStateManager.isPositionOccupied(player.x, player.y, player.id);
    expect(excludedCheck).toBeNull();
  });

  it('should manage game loop', () => {
    expect(gameStateManager.isGameLoopRunning()).toBe(false);
    
    const mockCallback = vi.fn();
    gameStateManager.startGameLoop(mockCallback);
    expect(gameStateManager.isGameLoopRunning()).toBe(true);
    
    gameStateManager.stopGameLoop();
    expect(gameStateManager.isGameLoopRunning()).toBe(false);
  });

  it('should get enemies correctly', () => {
    gameStateManager.initializeEntities();
    const enemies = gameStateManager.getEnemies();
    const player = gameStateManager.getPlayer();
    
    expect(enemies.length).toBeGreaterThan(0);
    expect(enemies.every(e => !e.isPlayer)).toBe(true);
    expect(enemies.includes(player!)).toBe(false);
  });

  it('should filter alive and dead entities', () => {
    gameStateManager.initializeEntities();
    const entities = gameStateManager.getAllEntities();
    
    // All entities should start alive
    const aliveEntities = gameStateManager.getAliveEntities();
    const deadEntities = gameStateManager.getDeadEntities();
    
    expect(aliveEntities.length).toBe(entities.length);
    expect(deadEntities.length).toBe(0);
    
    // Damage an entity to death
    const enemy = gameStateManager.getEnemies()[0];
    if (enemy) {
      ResourceManager.set(enemy, 'hp', 0);
      
      const newAliveEntities = gameStateManager.getAliveEntities();
      const newDeadEntities = gameStateManager.getDeadEntities();
      
      expect(newAliveEntities.length).toBe(entities.length - 1);
      expect(newDeadEntities.length).toBe(1);
      expect(newDeadEntities[0]).toBe(enemy);
    }
  });

  it('should cleanup properly', () => {
    gameStateManager.initializeEntities();
    gameStateManager.startGameLoop(() => {});
    
    expect(gameStateManager.getEntityCount()).toBeGreaterThan(0);
    expect(gameStateManager.isGameLoopRunning()).toBe(true);
    
    gameStateManager.cleanup();
    
    expect(gameStateManager.getEntityCount()).toBe(0);
    expect(gameStateManager.isGameLoopRunning()).toBe(false);
  });
});