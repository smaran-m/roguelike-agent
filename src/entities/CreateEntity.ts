import { Entity } from '../types';
import { CombatSystem } from '../systems/combat/CombatSystem';
import { TileMap } from '../core/TileMap';
import { EnemyLoader } from '../loaders/EnemyLoader';
import { CharacterManager } from '../managers/CharacterManager';
import { ResourceManager } from '../managers/ResourceManager';

export class CreateEntity {
  /**
   * Creates a player entity using the CharacterManager system
   */
  static createPlayer(
    tileMap?: TileMap, 
    characterName?: string, 
    className?: string,
    customization?: {
      selectedGlyph?: string;
      selectedColor?: string;
      customName?: string;
    }
  ): Entity {
    const characterManager = CharacterManager.getInstance();
    
    // Create or get current character
    let character = characterManager.getCurrentCharacter();
    if (!character) {
      character = characterManager.createCharacter(
        characterName || 'Hero',
        className || 'mage',
        customization
      );
    }
    
    if (!character) {
      // Fallback to old system if character creation fails
      console.warn('Failed to create character, using fallback');
      const spawnPos = tileMap?.findValidSpawnPosition();
      const playerX = spawnPos?.x ?? 25;
      const playerY = spawnPos?.y ?? 15;
      
      const entity: Entity = {
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
      
      // Initialize resources for the player
      ResourceManager.initializeResources(entity);
      return entity;
    }

    // Find spawn position
    const spawnPos = tileMap?.findValidSpawnPosition();
    const playerX = spawnPos?.x ?? 25;
    const playerY = spawnPos?.y ?? 15;
    
    const entity: Entity = {
      id: character.id,
      x: playerX,
      y: playerY,
      glyph: character.appearance.glyph,
      color: character.appearance.color,
      name: character.name,
      isEmoji: true,
      stats: character.stats,
      isPlayer: true
    };
    
    // Initialize resources for the player
    ResourceManager.initializeResources(entity);
    return entity;
  }

  /**
   * Create a player with a specific character class (convenience method)
   */
  static createPlayerWithClass(className: string, tileMap?: TileMap, characterName?: string): Entity {
    return this.createPlayer(tileMap, characterName, className);
  }

  /**
   * Create a custom player with specific appearance
   */
  static createCustomPlayer(
    tileMap: TileMap | undefined,
    characterName: string,
    className: string,
    glyph: string,
    color: string
  ): Entity {
    return this.createPlayer(tileMap, characterName, className, {
      selectedGlyph: glyph,
      selectedColor: color,
      customName: characterName
    });
  }

  /**
   * Gets enemy parameters from enemy type
   */
  private static getEnemyParameters(enemyType: string): { 
    glyph: string; 
    color: number; 
    name: string; 
    stats: any 
  } | null {
    const enemyDefinition = EnemyLoader.getEnemyDefinition(enemyType);
    if (!enemyDefinition) {
      console.warn(`Unknown enemy type: ${enemyType}`);
      return null;
    }

    const stats = EnemyLoader.generateEnemyStats(enemyType);
    if (!stats) {
      console.warn(`Failed to generate stats for enemy type: ${enemyType}`);
      return null;
    }

    return {
      glyph: enemyDefinition.glyph,
      color: EnemyLoader.parseColor(enemyDefinition.color),
      name: enemyDefinition.name,
      stats
    };
  }

  /**
   * Creates an enemy entity with given parameters at a valid position
   */
  static createEnemy(
    enemyId: string,
    glyph: string,
    color: number,
    name: string,
    stats: any,
    tileMap: TileMap | undefined,
    existingEntities: Entity[],
    minDistanceFromPlayer: number = 2
  ): Entity | null {

    if (!tileMap) {
      // Fallback to default positions if no tileMap provided
      const entity: Entity = {
        id: enemyId,
        x: 20,
        y: 10,
        glyph,
        color,
        name,
        isEmoji: true,
        stats
      };
      
      // Initialize resources for the enemy
      ResourceManager.initializeResources(entity);
      return entity;
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
      const entity: Entity = {
        id: enemyId,
        x: spawnPos.x,
        y: spawnPos.y,
        glyph,
        color,
        name,
        isEmoji: true,
        stats
      };
      
      // Initialize resources for the enemy
      ResourceManager.initializeResources(entity);
      return entity;
    }
    
    return null; // Failed to find valid position
  }

  /**
   * Creates an enemy entity at a position that maintains proper distance from all existing entities
   * - Maintains minDistanceFromPlayer tiles from the player
   * - Maintains at least 1 tile distance from other enemies
   * - Ensures no exact position conflicts with any entity
   */
  static createEnemyFromType(
    enemyId: string,
    enemyType: string,
    tileMap: TileMap | undefined,
    existingEntities: Entity[],
    minDistanceFromPlayer: number = 2
  ): Entity | null {
    const enemyParams = this.getEnemyParameters(enemyType);
    if (!enemyParams) {
      return null;
    }

    return this.createEnemy(
      enemyId,
      enemyParams.glyph,
      enemyParams.color,
      enemyParams.name,
      enemyParams.stats,
      tileMap,
      existingEntities,
      minDistanceFromPlayer
    );
  }


  /**
   * Creates a random enemy from the available enemy types
   */
  static createRandomEnemy(enemyId: string, tileMap: TileMap | undefined, existingEntities: Entity[]): Entity | null {
    const enemyType = EnemyLoader.getRandomEnemyType();
    return this.createEnemyFromType(enemyId, enemyType, tileMap, existingEntities);
  }

  /**
   * Creates a specific enemy type (convenience method)
   */
  static createEnemyByType(enemyId: string, enemyType: string, tileMap: TileMap | undefined, existingEntities: Entity[]): Entity | null {
    return this.createEnemyFromType(enemyId, enemyType, tileMap, existingEntities);
  }

  /**
   * Creates multiple enemies with safe positioning
   */
  static createMultipleEnemies(
    enemyConfigs: Array<{
      id: string;
      type: string;
    }>,
    tileMap: TileMap | undefined,
    existingEntities: Entity[]
  ): Entity[] {
    const createdEnemies: Entity[] = [];
    
    for (const config of enemyConfigs) {
      const enemy = this.createEnemyFromType(
        config.id,
        config.type,
        tileMap,
        [...existingEntities, ...createdEnemies] // Include already created enemies
      );
      
      if (enemy) {
        createdEnemies.push(enemy);
      }
    }
    
    return createdEnemies;
  }

  /**
   * Get all available enemy types
   */
  static getAvailableEnemyTypes(): string[] {
    return EnemyLoader.getAvailableEnemyTypes();
  }

  /**
   * Get all available character classes
   */
  static getAvailableCharacterClasses(): string[] {
    return CharacterManager.getInstance().getAvailableClasses();
  }

  /**
   * Get character manager instance
   */
  static getCharacterManager(): CharacterManager {
    return CharacterManager.getInstance();
  }
}