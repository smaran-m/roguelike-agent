import { Renderer } from './Renderer';
import { TileMap } from './TileMap';
import { Entity } from '../types';

export class Game {
  renderer: Renderer;
  tileMap: TileMap;
  player: Entity;
  entities: Entity[] = [];
  
  constructor() {
    this.renderer = new Renderer(50, 30);
    this.tileMap = new TileMap(50, 30);
    
    // Create player
    this.player = {
      id: 'player',
      x: 25,
      y: 15,
      glyph: '🧙',
      color: 0xFFFFFF,
      name: 'Player',
      isEmoji: true
    };
    
    this.entities.push(this.player);
    
    // Add some test enemies
    this.entities.push({
      id: 'goblin1',
      x: 20,
      y: 10,
      glyph: '👺',
      color: 0x00FF00,
      name: 'Goblin',
      isEmoji: true
    });
    
    // Setup input
    this.setupInput();
    
    // Initial render
    this.render();
  }
  
  setupInput() {
    window.addEventListener('keydown', (e) => {
      let dx = 0, dy = 0;
      
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
          dy = -1;
          break;
        case 'ArrowDown':
        case 's':
          dy = 1;
          break;
        case 'ArrowLeft':
        case 'a':
          dx = -1;
          break;
        case 'ArrowRight':
        case 'd':
          dx = 1;
          break;
        default:
          return;
      }
      
      e.preventDefault();
      this.movePlayer(dx, dy);
    });
  }
  
  movePlayer(dx: number, dy: number) {
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;
    
    // Check bounds
    if (newX < 0 || newX >= this.tileMap.width ||
        newY < 0 || newY >= this.tileMap.height) {
      return;
    }
    
    // Check collision with walls
    if (!this.tileMap.getTile(newX, newY).walkable) {
      // Shake effect on collision
      this.renderer.shakeEntity(this.player);
      return;
    }
    
    // Check collision with other entities
    const collidedEntity = this.entities.find(e => 
      e.id !== this.player.id && e.x === newX && e.y === newY
    );
    
    if (collidedEntity) {
      // Shake both entities when they collide
      this.renderer.shakeEntity(this.player);
      this.renderer.shakeEntity(collidedEntity);
      return;
    }
    
    // Animate move
    const oldX = this.player.x;
    const oldY = this.player.y;
    
    this.player.x = newX;
    this.player.y = newY;
    
    this.renderer.animateMove(this.player, oldX, oldY, newX, newY);
  }
  
  render() {
    // Clear previous frame
    this.renderer.clearTiles();
    this.renderer.clearEntities();
    
    // Render tiles
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const tile = this.tileMap.getTile(x, y);
        this.renderer.renderTile(x, y, tile);
      }
    }
    
    // Render entities
    for (const entity of this.entities) {
      this.renderer.renderEntity(entity);
    }
  }
}