import { Renderer } from './Renderer';
import { TileMap } from './TileMap';
import { Entity } from '../types';
import { CombatSystem } from './CombatSystem';

export class Game {
  renderer: Renderer;
  tileMap: TileMap;
  player: Entity;
  entities: Entity[] = [];
  keysPressed: Set<string> = new Set();
  movementSpeed: number = 0.1; // tiles per frame
  playerDisplayX: number = 25; // Visual position
  playerDisplayY: number = 15;
  lastValidX: number = 25; // Last valid grid position
  lastValidY: number = 15;
  
  constructor() {
    this.renderer = new Renderer(50, 30);
    this.tileMap = new TileMap(50, 30);
    
    // Create player
    this.player = {
      id: 'player',
      x: 25,
      y: 15,
      glyph: '🧙',
      color: 0x4169E1,
      name: 'Player',
      isEmoji: true,
      stats: CombatSystem.createPlayerStats(),
      isPlayer: true
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
      isEmoji: true,
      stats: CombatSystem.createEnemyStats()
    });
    
    // Setup input
    this.setupInput();
    
    // Start game loop
    this.startGameLoop();
    
    // Wait for Noto Emoji to be fully available before rendering
    this.waitForFontsAndRender();
  }
  
  setupInput() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      
      // Movement keys
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        this.keysPressed.add(key);
      }
      
      // Attack key (spacebar)
      if (key === ' ') {
        e.preventDefault();
        this.attemptMeleeAttack();
      }
    });
    
    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        this.keysPressed.delete(key);
        
        // Snap to grid when key is released
        if (this.keysPressed.size === 0) {
          this.snapPlayerToGrid();
        }
      }
    });
  }
  
  startGameLoop() {
    const gameLoop = () => {
      this.updateMovement();
      this.updateVisuals();
      requestAnimationFrame(gameLoop);
    };
    requestAnimationFrame(gameLoop);
  }
  
  updateMovement() {
    if (this.keysPressed.size === 0) return;
    
    let dx = 0, dy = 0;
    
    if (this.keysPressed.has('arrowup') || this.keysPressed.has('w')) dy -= this.movementSpeed;
    if (this.keysPressed.has('arrowdown') || this.keysPressed.has('s')) dy += this.movementSpeed;
    if (this.keysPressed.has('arrowleft') || this.keysPressed.has('a')) dx -= this.movementSpeed;
    if (this.keysPressed.has('arrowright') || this.keysPressed.has('d')) dx += this.movementSpeed;
    
    const newDisplayX = this.playerDisplayX + dx;
    const newDisplayY = this.playerDisplayY + dy;
    
    // Check if the new position is valid
    if (this.isValidPosition(newDisplayX, newDisplayY)) {
      this.playerDisplayX = newDisplayX;
      this.playerDisplayY = newDisplayY;
      
      // Update last valid grid position if we're on a valid grid cell
      const gridX = Math.round(this.playerDisplayX);
      const gridY = Math.round(this.playerDisplayY);
      if (this.isValidGridPosition(gridX, gridY)) {
        this.lastValidX = gridX;
        this.lastValidY = gridY;
        this.player.x = gridX;
        this.player.y = gridY;
      }
    }
  }
  
  isValidPosition(x: number, y: number): boolean {
    // Check bounds
    if (x < 0 || x >= this.tileMap.width || y < 0 || y >= this.tileMap.height) {
      return false;
    }
    
    // Check if the position overlaps with any non-walkable tiles
    const minX = Math.floor(x);
    const maxX = Math.ceil(x);
    const minY = Math.floor(y);
    const maxY = Math.ceil(y);
    
    for (let checkX = minX; checkX <= maxX; checkX++) {
      for (let checkY = minY; checkY <= maxY; checkY++) {
        if (checkX >= 0 && checkX < this.tileMap.width && 
            checkY >= 0 && checkY < this.tileMap.height) {
          if (!this.tileMap.getTile(checkX, checkY).walkable) {
            return false;
          }
        }
      }
    }
    
    return true;
  }
  
  isValidGridPosition(x: number, y: number): boolean {
    if (x < 0 || x >= this.tileMap.width || y < 0 || y >= this.tileMap.height) {
      return false;
    }
    
    return this.tileMap.getTile(x, y).walkable;
  }
  
  snapPlayerToGrid() {
    const gridX = Math.round(this.playerDisplayX);
    const gridY = Math.round(this.playerDisplayY);
    
    // Check if the snapped position is valid
    if (this.isValidGridPosition(gridX, gridY)) {
      // Check collision with other entities
      const collidedEntity = this.entities.find(e => 
        e.id !== this.player.id && e.x === gridX && e.y === gridY
      );
      
      if (collidedEntity) {
        // Don't allow movement into enemy space, but don't trigger combat
        // Combat is now handled separately via spacebar
        this.snapToLastValidPosition();
        return;
      }
      
      // Valid position, snap to it
      this.player.x = gridX;
      this.player.y = gridY;
      this.playerDisplayX = gridX;
      this.playerDisplayY = gridY;
      this.lastValidX = gridX;
      this.lastValidY = gridY;
    } else {
      // Invalid position, snap to last valid position
      this.snapToLastValidPosition();
    }
  }
  
  snapToLastValidPosition() {
    this.player.x = this.lastValidX;
    this.player.y = this.lastValidY;
    this.playerDisplayX = this.lastValidX;
    this.playerDisplayY = this.lastValidY;
  }
  
  
  attemptMeleeAttack() {
    // Find all enemies within melee range
    const targets = this.entities.filter(entity => 
      entity.id !== this.player.id && 
      CombatSystem.isInMeleeRange(this.player, entity)
    );
    
    if (targets.length === 0) {
      console.log("No enemies in range!");
      return;
    }
    
    // For now, attack the first target in range
    const target = targets[0];
    const attackResult = CombatSystem.meleeAttack(this.player, target);
    
    console.log(`${this.player.name} attacks ${target.name}!`);
    console.log(`Attack roll: ${attackResult.attackRoll} vs AC ${target.stats.ac}`);
    
    if (attackResult.hit) {
      const died = CombatSystem.applyDamage(target, attackResult.damage);
      console.log(`Hit! Damage: ${attackResult.damageRoll} = ${attackResult.damage}`);
      console.log(`${target.name} HP: ${target.stats.hp}/${target.stats.maxHp}`);
      
      if (died) {
        console.log(`${target.name} died!`);
        this.entities = this.entities.filter(entity => entity.id !== target.id);
      }
      
      // Shake target
      this.renderer.shakeEntity(target);
      
      // Re-render to update HP display
      this.render();
      
    } else {
      console.log("Miss!");
      // Shake player to indicate miss
      this.renderer.shakeEntity(this.player);
    }
  }

  updateVisuals() {
    // Update entity visual positions using display coordinates
    const playerText = this.renderer.entityTextMap.get(this.player.id);
    const playerHp = this.renderer.hpTextMap.get(this.player.id);
    
    if (playerText) {
      playerText.x = this.playerDisplayX * this.renderer.tileSize + this.renderer.tileSize / 2;
      playerText.y = this.playerDisplayY * this.renderer.tileSize + this.renderer.tileSize / 2;
    }
    
    if (playerHp) {
      playerHp.x = this.playerDisplayX * this.renderer.tileSize + this.renderer.tileSize / 2;
      playerHp.y = this.playerDisplayY * this.renderer.tileSize + this.renderer.tileSize / 2 - 10;
      // Update HP text content
      playerHp.text = this.player.stats.hp.toString();
    }
  }
  
  async waitForFontsAndRender() {
    // Load all fonts comprehensively
    try {
      await document.fonts.load('14px "Noto Emoji"');
      await document.fonts.load('12px "Noto Sans Mono"');
      await document.fonts.load('10px "Noto Sans Mono"'); // For HP text
    } catch (e) {
      console.warn('Font failed to load, using fallback');
    }
    
    // Test all emojis we use to ensure they render consistently
    const testEmojis = ['🧙', '👺']; // Add all emojis used in game
    const testCanvas = document.createElement('canvas');
    const ctx = testCanvas.getContext('2d');
    
    if (ctx) {
      for (const emoji of testEmojis) {
        // Test each emoji with our font stack
        ctx.font = '14px "Noto Emoji", Apple Color Emoji, Segoe UI Emoji, sans-serif';
        const metrics = ctx.measureText(emoji);
        console.log(`Font test for ${emoji}: width=${metrics.width}`);
      }
      
      // Additional delay to ensure PixiJS can access fonts
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    this.render();
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