import { Entity } from '../types';
import { TileMap } from './TileMap';

export interface MovementState {
  displayX: number;
  displayY: number;
  lastValidX: number;
  lastValidY: number;
}

export class MovementSystem {
  private movementSpeed: number = 0.1; // tiles per frame
  
  constructor(speed: number = 0.1) {
    this.movementSpeed = speed;
  }

  updateMovement(
    keysPressed: Set<string>, 
    movementState: MovementState, 
    tileMap: TileMap,
    player: Entity,
    entities: Entity[] = []
  ): boolean {
    if (keysPressed.size === 0) return false;
    
    let dx = 0, dy = 0;
    
    if (keysPressed.has('arrowup') || keysPressed.has('w')) dy -= this.movementSpeed;
    if (keysPressed.has('arrowdown') || keysPressed.has('s')) dy += this.movementSpeed;
    if (keysPressed.has('arrowleft') || keysPressed.has('a')) dx -= this.movementSpeed;
    if (keysPressed.has('arrowright') || keysPressed.has('d')) dx += this.movementSpeed;
    
    const newDisplayX = movementState.displayX + dx;
    const newDisplayY = movementState.displayY + dy;
    
    // Check if the new position is valid (both tiles and entities)
    if (this.isValidPosition(newDisplayX, newDisplayY, tileMap, entities, player.id)) {
      movementState.displayX = newDisplayX;
      movementState.displayY = newDisplayY;
      
      // Update last valid grid position if we're on a valid grid cell
      const gridX = Math.round(movementState.displayX);
      const gridY = Math.round(movementState.displayY);
      if (this.isValidGridPosition(gridX, gridY, tileMap, entities, player.id)) {
        movementState.lastValidX = gridX;
        movementState.lastValidY = gridY;
        player.x = gridX;
        player.y = gridY;
      }
      return true;
    }
    return false;
  }

  isValidPosition(x: number, y: number, tileMap: TileMap, entities: Entity[] = [], excludeEntityId?: string): boolean {
    // Check bounds
    if (x < 0 || x >= tileMap.width || y < 0 || y >= tileMap.height) {
      return false;
    }
    
    // Check if the position overlaps with any non-walkable tiles
    const minX = Math.floor(x);
    const maxX = Math.ceil(x);
    const minY = Math.floor(y);
    const maxY = Math.ceil(y);
    
    for (let checkX = minX; checkX <= maxX; checkX++) {
      for (let checkY = minY; checkY <= maxY; checkY++) {
        if (checkX >= 0 && checkX < tileMap.width && 
            checkY >= 0 && checkY < tileMap.height) {
          if (!tileMap.getTile(checkX, checkY).walkable) {
            return false;
          }
          
          // Check for entity collisions at this grid position
          const occupyingEntity = entities.find(entity => 
            entity.x === checkX && 
            entity.y === checkY && 
            entity.id !== excludeEntityId
          );
          if (occupyingEntity) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  isValidGridPosition(x: number, y: number, tileMap: TileMap, entities: Entity[] = [], excludeEntityId?: string): boolean {
    if (x < 0 || x >= tileMap.width || y < 0 || y >= tileMap.height) {
      return false;
    }
    
    if (!tileMap.getTile(x, y).walkable) {
      return false;
    }
    
    // Check for entity collisions
    const occupyingEntity = entities.find(entity => 
      entity.x === x && 
      entity.y === y && 
      entity.id !== excludeEntityId
    );
    
    return !occupyingEntity;
  }

  snapPlayerToGrid(
    movementState: MovementState, 
    player: Entity, 
    entities: Entity[], 
    tileMap: TileMap
  ): boolean {
    const gridX = Math.round(movementState.displayX);
    const gridY = Math.round(movementState.displayY);
    
    // Check if the snapped position is valid (includes entity collision checking)
    if (this.isValidGridPosition(gridX, gridY, tileMap, entities, player.id)) {
      // Valid position, snap to it
      player.x = gridX;
      player.y = gridY;
      movementState.displayX = gridX;
      movementState.displayY = gridY;
      movementState.lastValidX = gridX;
      movementState.lastValidY = gridY;
      return true;
    } else {
      // Invalid position, snap to last valid position
      this.snapToLastValidPosition(movementState, player);
      return false;
    }
  }

  private snapToLastValidPosition(movementState: MovementState, player: Entity) {
    player.x = movementState.lastValidX;
    player.y = movementState.lastValidY;
    movementState.displayX = movementState.lastValidX;
    movementState.displayY = movementState.lastValidY;
  }

  setMovementSpeed(speed: number) {
    this.movementSpeed = speed;
  }

  getMovementSpeed(): number {
    return this.movementSpeed;
  }
}