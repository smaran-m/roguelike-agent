import { Entity } from '../types';
import { CreateEntity } from './CreateEntity';

export class GameStateManager {
  private entities: Entity[] = [];
  private gameLoopRunning: boolean = false;
  private gameLoopId: number | null = null;

  constructor() {
    // Initialize with empty state
  }

  initializeEntities(tileMap?: any): Entity[] {
    // Create player using CreateEntity class
    const player = CreateEntity.createPlayer(tileMap);
    this.entities = [player];
    
    // Create multiple enemies to demonstrate improved collision avoidance
    const goblin1 = CreateEntity.createGoblin('goblin1', tileMap, this.entities);
    if (goblin1) {
      this.addEntity(goblin1);
    }
    
    const goblin2 = CreateEntity.createGoblin('goblin2', tileMap, this.entities);
    if (goblin2) {
      this.addEntity(goblin2);
    }
    
    const goblin3 = CreateEntity.createGoblin('goblin3', tileMap, this.entities);
    if (goblin3) {
      this.addEntity(goblin3);
    }
    
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