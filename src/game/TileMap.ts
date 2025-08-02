import { Tile } from '../types';

export class TileMap {
  width: number;
  height: number;
  tiles: Tile[][];
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = [];
    
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
            bgColor: 0x000000,
            isEmoji: false,
            walkable: false
          };
        } else {
          // Floor
          this.tiles[y][x] = {
            glyph: '·',
            fgColor: 0x404040,
            bgColor: 0x000000,
            isEmoji: false,
            walkable: true
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
        bgColor: 0x000000,
        isEmoji: false,
        walkable: false
      };
    }
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
}