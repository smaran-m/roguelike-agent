import { Entity } from '../types';
import { CombatSystem } from './CombatSystem';
import { TileMap } from './TileMap';

export class CreateEntity {
  /**
   * Creates a player entity at a valid spawn position
   */
  static createPlayer(tileMap?: TileMap): Entity {
    const spawnPos = tileMap?.findValidSpawnPosition();
    const playerX = spawnPos?.x ?? 25;
    const playerY = spawnPos?.y ?? 15;
    
    return {
      id: 'player',
      x: playerX,
      y: playerY,
      glyph: '🧙',
      color: 0x4169E1,
      name: 'Player',
      isEmoji: true,
      stats: CombatSystem.createPlayerStats(),
      isPlayer: true
    };
  }

  /**
   * Creates an enemy entity at a position that maintains proper distance from all existing entities
   * - Maintains minDistanceFromPlayer tiles from the player
   * - Maintains at least 1 tile distance from other enemies
   * - Ensures no exact position conflicts with any entity
   */
  static createEnemy(
    enemyId: string,
    name: string,
    glyph: string,
    color: number,
    tileMap: TileMap | undefined,
    existingEntities: Entity[],
    minDistanceFromPlayer: number = 2
  ): Entity | null {
    if (!tileMap) {
      // Fallback to default positions if no tileMap provided
      return {
        id: enemyId,
        x: 20,
        y: 10,
        glyph,
        color,
        name,
        isEmoji: true,
        stats: CombatSystem.createEnemyStats()
      };
    }
    
    const maxAttempts = 50;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let spawnPos: { x: number, y: number } | null = null;
      
      // For first 25 attempts, try random positions
      if (attempt < 25) {
        const randomX = Math.floor(Math.random() * (tileMap.width - 2)) + 1;
        const randomY = Math.floor(Math.random() * (tileMap.height - 2)) + 1;
        if (tileMap.getTile(randomX, randomY).walkable) {
          spawnPos = { x: randomX, y: randomY };
        }
      } else {
        // Fall back to deterministic method
        spawnPos = tileMap.findValidSpawnPosition();
      }
      
      if (!spawnPos) {
        continue;
      }
      
      // Check if position conflicts with existing entities (exact position)
      const conflictsWithEntity = existingEntities.some(entity => 
        entity.x === spawnPos.x && entity.y === spawnPos.y
      );
      
      if (conflictsWithEntity) {
        continue;
      }
      
      // Check minimum distance from ALL existing entities
      const tooCloseToExistingEntity = existingEntities.some(entity => {
        const distance = Math.sqrt(
          Math.pow(spawnPos.x - entity.x, 2) + 
          Math.pow(spawnPos.y - entity.y, 2)
        );
        // Use different minimum distances based on entity type
        const minDistance = entity.isPlayer ? minDistanceFromPlayer : 1; // At least 1 tile from other enemies
        return distance < minDistance;
      });
      
      if (tooCloseToExistingEntity) {
        continue;
      }
      
      // Valid position found
      return {
        id: enemyId,
        x: spawnPos.x,
        y: spawnPos.y,
        glyph,
        color,
        name,
        isEmoji: true,
        stats: CombatSystem.createEnemyStats()
      };
    }
    
    return null; // Failed to find valid position
  }

  /**
   * Creates a goblin enemy with default settings
   */
  static createGoblin(goblinId: string, tileMap: TileMap | undefined, existingEntities: Entity[]): Entity | null {
    return this.createEnemy(
      goblinId,
      'Goblin',
      '👺',
      0x00FF00,
      tileMap,
      existingEntities
      // Uses default minDistanceFromPlayer = 2
    );
  }

  /**
   * Creates multiple enemies with safe positioning
   */
  static createMultipleEnemies(
    enemyConfigs: Array<{
      id: string;
      name: string;
      glyph: string;
      color: number;
    }>,
    tileMap: TileMap | undefined,
    existingEntities: Entity[]
  ): Entity[] {
    const createdEnemies: Entity[] = [];
    
    for (const config of enemyConfigs) {
      const enemy = this.createEnemy(
        config.id,
        config.name,
        config.glyph,
        config.color,
        tileMap,
        [...existingEntities, ...createdEnemies] // Include already created enemies
      );
      
      if (enemy) {
        createdEnemies.push(enemy);
      }
    }
    
    return createdEnemies;
  }
}