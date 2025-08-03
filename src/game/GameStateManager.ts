import { Entity } from '../types';
import { CombatSystem } from './CombatSystem';

export class GameStateManager {
  private entities: Entity[] = [];
  private gameLoopRunning: boolean = false;
  private gameLoopId: number | null = null;

  constructor() {
    // Initialize with empty state
  }

  initializeEntities(tileMap?: any): Entity[] {
    let playerX = 25, playerY = 15;
    let enemyX = 20, enemyY = 10;
    
    // If tileMap is provided, find safe spawn positions
    if (tileMap && tileMap.findValidSpawnPosition) {
      const playerSpawn = tileMap.findValidSpawnPosition();
      if (playerSpawn) {
        playerX = playerSpawn.x;
        playerY = playerSpawn.y;
      }
      
      // Find a different position for enemy
      let enemySpawn = tileMap.findValidSpawnPosition();
      if (enemySpawn) {
        // Try to find a position that's not the same as player
        for (let attempts = 0; attempts < 10; attempts++) {
          const testSpawn = tileMap.findValidSpawnPosition();
          if (testSpawn && (testSpawn.x !== playerX || testSpawn.y !== playerY)) {
            enemySpawn = testSpawn;
            break;
          }
        }
        enemyX = enemySpawn.x;
        enemyY = enemySpawn.y;
      }
    }
    
    // Create player
    const player: Entity = {
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
    
    this.entities = [player];
    
    // Add some test enemies
    this.addEntity({
      id: 'goblin1',
      x: enemyX,
      y: enemyY,
      glyph: '👺',
      color: 0x00FF00,
      name: 'Goblin',
      isEmoji: true,
      stats: CombatSystem.createEnemyStats()
    });
    
    return [...this.entities];
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
    return this.entities.filter(entity => entity.stats.hp > 0);
  }

  getDeadEntities(): Entity[] {
    return this.entities.filter(entity => entity.stats.hp <= 0);
  }

  cleanup(): void {
    this.stopGameLoop();
    this.entities = [];
  }
}