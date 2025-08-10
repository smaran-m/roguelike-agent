import { Entity } from '../types';
import { CreateEntity } from '../entities/CreateEntity';
import { ResourceManager } from './ResourceManager';
import { WorldConfigLoader } from '../loaders/WorldConfigLoader';
import { EnemyLoader } from '../loaders/EnemyLoader';
import { CharacterManager } from './CharacterManager';

export class GameStateManager {
  private entities: Entity[] = [];
  private gameLoopRunning: boolean = false;
  private gameLoopId: number | null = null;

  constructor() {
    // Initialize with empty state
  }

  initializeEntities(tileMap?: any): Entity[] {
    // Create player using world-appropriate character
    const worldConfig = WorldConfigLoader.getCurrentWorld();
    const playerConfig = this.getPlayerConfigForWorld(worldConfig?.theme || 'fantasy');
    
    const player = CreateEntity.createCustomPlayer(
      tileMap, 
      playerConfig.name, 
      playerConfig.class, 
      playerConfig.glyph, 
      playerConfig.color
    );
    this.entities = [player];
    
    // Create enemies based on current world configuration
    const enemyConfigs = this.getEnemyConfigsForWorld(worldConfig?.theme || 'fantasy');
    
    const createdEnemies = CreateEntity.createMultipleEnemies(enemyConfigs, tileMap, this.entities);
    createdEnemies.forEach(enemy => this.addEntity(enemy));
    
    return [...this.entities];
  }

  private getPlayerConfigForWorld(_worldTheme: string): {
    name: string;
    class: string;
    glyph: string;
    color: string;
  } {
    // Get first available character class dynamically
    const characterManager = CharacterManager.getInstance();
    const availableClasses = characterManager.getAvailableClasses();
    const defaultClassName = availableClasses[0] || 'warrior'; // Fallback to warrior if no classes available
    
    // Get the actual character class definition to extract glyph and color
    const characterClass = characterManager.getCharacterClass(defaultClassName);
    
    if (characterClass) {
      return {
        name: 'Hero',
        class: defaultClassName,
        glyph: characterClass.appearance.defaultGlyph,
        color: characterClass.appearance.defaultColor
      };
    }
    
    // Ultimate fallback if character class definition is missing
    return {
      name: 'Hero',
      class: defaultClassName,
      glyph: '@', // Only as absolute last resort
      color: '0xC0C0C0'
    };
  }

  private getEnemyConfigsForWorld(_worldTheme: string): Array<{ id: string; type: string }> {
    // Get available enemy types dynamically
    const availableEnemyTypes = EnemyLoader.getAvailableEnemyTypes();
    
    // Create 3 enemies using first 3 available types (or repeat if fewer available)
    const enemyConfigs: Array<{ id: string; type: string }> = [];
    for (let i = 0; i < 3; i++) {
      const enemyType = availableEnemyTypes[i % availableEnemyTypes.length];
      enemyConfigs.push({
        id: `enemy${i + 1}`,
        type: enemyType
      });
    }
    
    return enemyConfigs;
  }

  addEntity(entity: Entity): void {
    this.entities.push(entity);
  }

  removeEntity(entityId: string): boolean {
    const initialLength = this.entities.length;
    this.entities = this.entities.filter(entity => entity.id !== entityId);
    return this.entities.length < initialLength;
  }

  getEntity(entityId: string): Entity | undefined {
    return this.entities.find(entity => entity.id === entityId);
  }

  getPlayer(): Entity | undefined {
    return this.entities.find(entity => entity.isPlayer === true);
  }

  getAllEntities(): Entity[] {
    return [...this.entities];
  }

  getEnemies(): Entity[] {
    return this.entities.filter(entity => !entity.isPlayer);
  }

  updateEntityPosition(entityId: string, x: number, y: number): boolean {
    const entity = this.getEntity(entityId);
    if (entity) {
      entity.x = x;
      entity.y = y;
      return true;
    }
    return false;
  }

  isPositionOccupied(x: number, y: number, excludeEntityId?: string): Entity | null {
    const occupyingEntity = this.entities.find(entity => 
      entity.x === x && 
      entity.y === y && 
      entity.id !== excludeEntityId
    );
    return occupyingEntity || null;
  }

  startGameLoop(gameLoopCallback: () => void): void {
    if (this.gameLoopRunning) {
      return;
    }

    this.gameLoopRunning = true;
    
    const loop = () => {
      if (!this.gameLoopRunning) {
        return;
      }
      
      gameLoopCallback();
      this.gameLoopId = requestAnimationFrame(loop);
    };
    
    this.gameLoopId = requestAnimationFrame(loop);
  }

  stopGameLoop(): void {
    this.gameLoopRunning = false;
    if (this.gameLoopId !== null) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
  }

  isGameLoopRunning(): boolean {
    return this.gameLoopRunning;
  }

  getEntityCount(): number {
    return this.entities.length;
  }

  getEnemyCount(): number {
    return this.getEnemies().length;
  }

  getAliveEntities(): Entity[] {
    return this.entities.filter(entity => !ResourceManager.isAtMinimum(entity, 'hp'));
  }

  getDeadEntities(): Entity[] {
    return this.entities.filter(entity => ResourceManager.isAtMinimum(entity, 'hp'));
  }

  cleanup(): void {
    this.stopGameLoop();
    this.entities = [];
  }
}