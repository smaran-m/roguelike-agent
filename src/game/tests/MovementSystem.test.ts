import { describe, it, expect, beforeEach } from 'vitest';
import { MovementSystem, MovementState } from '../MovementSystem';
import { TileMap } from '../TileMap';
import { Entity } from '../../types';
import { CombatSystem } from '../CombatSystem';

describe('MovementSystem', () => {
  let movementSystem: MovementSystem;
  let tileMap: TileMap;
  let player: Entity;
  let movementState: MovementState;
  let entities: Entity[];

  beforeEach(() => {
    movementSystem = new MovementSystem(0.1);
    tileMap = new TileMap(20, 20); // Larger map to reduce random wall conflicts
    
    // Find a safe spawn position
    const spawnPos = tileMap.findValidSpawnPosition();
    const safeX = spawnPos ? spawnPos.x : 10;
    const safeY = spawnPos ? spawnPos.y : 10;
    
    player = {
      id: 'player',
      x: safeX,
      y: safeY,
      glyph: '🧙',
      color: 0x4169E1,
      name: 'Player',
      isEmoji: true,
      stats: CombatSystem.createPlayerStats(),
      isPlayer: true
    };

    movementState = {
      displayX: safeX,
      displayY: safeY,
      lastValidX: safeX,
      lastValidY: safeY
    };

    entities = [player];
  });

  it('should initialize with correct movement speed', () => {
    expect(movementSystem.getMovementSpeed()).toBe(0.1);
  });

  it('should update movement speed', () => {
    movementSystem.setMovementSpeed(0.2);
    expect(movementSystem.getMovementSpeed()).toBe(0.2);
  });

  it('should not update movement when no keys pressed', () => {
    const keysPressed = new Set<string>();
    const initialX = movementState.displayX;
    const initialY = movementState.displayY;
    
    const moved = movementSystem.updateMovement(keysPressed, movementState, tileMap, player);
    
    expect(moved).toBe(false);
    expect(movementState.displayX).toBe(initialX);
    expect(movementState.displayY).toBe(initialY);
  });

  it('should update movement when keys are pressed', () => {
    // Find a safe starting position with room to move up
    let safeX = 10, safeY = 10;
    for (let y = 5; y < 15; y++) {
      for (let x = 5; x < 15; x++) {
        if (tileMap.getTile(x, y).walkable && tileMap.getTile(x, y - 1).walkable) {
          safeX = x;
          safeY = y;
          break;
        }
      }
    }
    
    // Reset player and movement state to safe position
    player.x = safeX;
    player.y = safeY;
    movementState.displayX = safeX;
    movementState.displayY = safeY;
    movementState.lastValidX = safeX;
    movementState.lastValidY = safeY;
    
    const keysPressed = new Set(['w']);
    const initialY = movementState.displayY;
    
    const moved = movementSystem.updateMovement(keysPressed, movementState, tileMap, player, entities);
    
    expect(moved).toBe(true);
    expect(movementState.displayY).toBeLessThan(initialY);
  });

  it('should validate position within bounds', () => {
    // Test with a known walkable position (center of a large map should be walkable)
    const spawnPos = tileMap.findValidSpawnPosition();
    const safeX = spawnPos ? spawnPos.x : 10;
    const safeY = spawnPos ? spawnPos.y : 10;
    
    expect(movementSystem.isValidPosition(safeX, safeY, tileMap)).toBe(true);
    expect(movementSystem.isValidPosition(-1, safeY, tileMap)).toBe(false);
    expect(movementSystem.isValidPosition(safeX, -1, tileMap)).toBe(false);
    expect(movementSystem.isValidPosition(tileMap.width, safeY, tileMap)).toBe(false);
    expect(movementSystem.isValidPosition(safeX, tileMap.height, tileMap)).toBe(false);
  });

  it('should validate grid position', () => {
    const spawnPos = tileMap.findValidSpawnPosition();
    const safeX = spawnPos ? spawnPos.x : 10;
    const safeY = spawnPos ? spawnPos.y : 10;
    
    expect(movementSystem.isValidGridPosition(safeX, safeY, tileMap)).toBe(true);
    expect(movementSystem.isValidGridPosition(-1, safeY, tileMap)).toBe(false);
    expect(movementSystem.isValidGridPosition(tileMap.width, safeY, tileMap)).toBe(false);
  });

  it('should snap player to grid successfully', () => {
    const spawnPos = tileMap.findValidSpawnPosition();
    const safeX = spawnPos ? spawnPos.x : 10;
    const safeY = spawnPos ? spawnPos.y : 10;
    
    movementState.displayX = safeX + 0.4;
    movementState.displayY = safeY + 0.6;
    
    const snapped = movementSystem.snapPlayerToGrid(movementState, player, entities, tileMap);
    
    expect(snapped).toBe(true);
    expect(player.x).toBe(safeX);
    expect(player.y).toBe(safeY + 1);
    expect(movementState.displayX).toBe(safeX);
    expect(movementState.displayY).toBe(safeY + 1);
  });

  it('should handle collision with other entities', () => {
    const spawnPos = tileMap.findValidSpawnPosition();
    const safeX = spawnPos ? spawnPos.x : 10;
    const safeY = spawnPos ? spawnPos.y : 10;
    
    const enemy: Entity = {
      id: 'enemy',
      x: safeX + 1,
      y: safeY,
      glyph: '👺',
      color: 0xFF0000,
      name: 'Enemy',
      isEmoji: true,
      stats: CombatSystem.createEnemyStats()
    };
    
    entities.push(enemy);
    movementState.displayX = safeX + 0.8;
    movementState.displayY = safeY + 0.2;
    
    const snapped = movementSystem.snapPlayerToGrid(movementState, player, entities, tileMap);
    
    expect(snapped).toBe(false);
    // Should snap back to last valid position
    expect(movementState.displayX).toBe(safeX);
    expect(movementState.displayY).toBe(safeY);
  });
});