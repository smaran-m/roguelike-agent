import { TileMap } from './TileMap';

export class LineOfSight {
  static calculateFOV(tileMap: TileMap, centerX: number, centerY: number, radius: number = 8) {
    // Clear all current visibility
    tileMap.clearVisibility();
    
    // Player position is always visible and explored
    const centerVis = tileMap.getVisibility(centerX, centerY);
    tileMap.setVisibility(centerX, centerY, { explored: true, visible: true });
    
    // Cast rays in all directions
    const numRays = 360; // More rays = smoother visibility
    for (let i = 0; i < numRays; i++) {
      const angle = (i * 2 * Math.PI) / numRays;
      this.castRay(tileMap, centerX, centerY, angle, radius);
    }
  }
  
  private static castRay(tileMap: TileMap, startX: number, startY: number, angle: number, maxDistance: number) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    
    let currentX = startX + 0.5;
    let currentY = startY + 0.5;
    
    for (let distance = 0; distance < maxDistance; distance += 0.5) {
      currentX += dx * 0.5;
      currentY += dy * 0.5;
      
      const tileX = Math.floor(currentX);
      const tileY = Math.floor(currentY);
      
      // Check bounds
      if (tileX < 0 || tileX >= tileMap.width || tileY < 0 || tileY >= tileMap.height) {
        break;
      }
      
      // Mark this tile as visible and explored
      const currentVis = tileMap.getVisibility(tileX, tileY);
      tileMap.setVisibility(tileX, tileY, { explored: true, visible: true });
      
      // Check if this tile blocks light
      const tile = tileMap.getTile(tileX, tileY);
      if (tile.blocksLight) {
        break; // Stop the ray
      }
    }
  }
  
  // Simplified distance-based FOV for better performance
  static calculateSimpleFOV(tileMap: TileMap, centerX: number, centerY: number, radius: number = 8) {
    // Clear all current visibility
    tileMap.clearVisibility();
    
    // Check all tiles within radius
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        // Check bounds
        if (x < 0 || x >= tileMap.width || y < 0 || y >= tileMap.height) {
          continue;
        }
        
        // Calculate distance
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
          // Check if there's a clear line of sight
          if (this.hasLineOfSight(tileMap, centerX, centerY, x, y)) {
            const currentVis = tileMap.getVisibility(x, y);
            tileMap.setVisibility(x, y, { explored: true, visible: true });
          }
        }
      }
    }
  }
  
  static hasLineOfSight(tileMap: TileMap, x0: number, y0: number, x1: number, y1: number): boolean {
    // Bresenham's line algorithm to check for obstacles
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let currentX = x0;
    let currentY = y0;
    
    while (true) {
      // Don't check the starting position
      if (!(currentX === x0 && currentY === y0)) {
        // Check if current tile blocks light
        const tile = tileMap.getTile(currentX, currentY);
        if (tile.blocksLight) {
          // If we haven't reached the target yet, line of sight is blocked
          if (currentX !== x1 || currentY !== y1) {
            return false;
          }
        }
      }
      
      // If we've reached the target, line of sight is clear
      if (currentX === x1 && currentY === y1) {
        return true;
      }
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currentX += sx;
      }
      if (e2 < dx) {
        err += dx;
        currentY += sy;
      }
    }
  }
}