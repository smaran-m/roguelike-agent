import { Tile, TileVisibility } from '../types';

export class TileMap {
  width: number;
  height: number;
  tiles: Tile[][];
  visibility: TileVisibility[][];
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = [];
    this.visibility = [];
    
    // Initialize visibility grid
    for (let y = 0; y < this.height; y++) {
      this.visibility[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.visibility[y][x] = {
          explored: false,
          visible: false
        };
      }
    }
    
    // Generate simple test map
    this.generateTestMap();
  }
  
  generateTestMap() {
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        // Border walls
        if (x === 0 || x === this.width - 1 ||
            y === 0 || y === this.height - 1) {
          this.tiles[y][x] = {
            glyph: '#',
            fgColor: 0x808080,
            bgColor: 0x222222,
            isEmoji: false,
            walkable: false,
            blocksLight: true
          };
        } else {
          // Floor
          this.tiles[y][x] = {
            glyph: '·',
            fgColor: 0x404040,
            bgColor: 0x222222,
            isEmoji: false,
            walkable: true,
            blocksLight: false
          };
        }
      }
    }
    
    // Add some random walls
    for (let i = 0; i < 50; i++) {
      const x = Math.floor(Math.random() * (this.width - 2)) + 1;
      const y = Math.floor(Math.random() * (this.height - 2)) + 1;
      
      this.tiles[y][x] = {
        glyph: '#',
        fgColor: 0x808080,
        bgColor: 0x222222,
        isEmoji: false,
        walkable: false,
        blocksLight: true
      };
    }
  }
  
  findValidSpawnPosition(): { x: number, y: number } | null {
    // Try to find a walkable position, starting from center and working outward
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    
    // Check center first
    if (this.getTile(centerX, centerY).walkable) {
      return { x: centerX, y: centerY };
    }
    
    // Spiral outward from center
    for (let radius = 1; radius < Math.max(this.width, this.height) / 2; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const x = centerX + dx;
            const y = centerY + dy;
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
              if (this.getTile(x, y).walkable) {
                return { x, y };
              }
            }
          }
        }
      }
    }
    
    return null; // No valid position found
  }

  getTile(x: number, y: number): Tile {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return {
        glyph: ' ',
        fgColor: 0x000000,
        bgColor: 0x000000,
        isEmoji: false,
        walkable: false
      };
    }
    return this.tiles[y][x];
  }
  
  setTile(x: number, y: number, tile: Tile) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.tiles[y][x] = tile;
    }
  }
  
  getVisibility(x: number, y: number): TileVisibility {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return { explored: false, visible: false };
    }
    return this.visibility[y][x];
  }
  
  setVisibility(x: number, y: number, visibility: TileVisibility) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.visibility[y][x] = visibility;
    }
  }
  
  clearVisibility() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.visibility[y][x].visible = false;
      }
    }
  }
}