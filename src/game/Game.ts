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
      this.renderer.addMessage("No enemies in range!");
      return;
    }
    
    // For now, attack the first target in range
    const target = targets[0];
    const attackResult = CombatSystem.meleeAttack(this.player, target);
    
    // Player nudges toward enemy when attacking
    this.renderer.nudgeEntity(this.player, target.x, target.y);
    
    this.renderer.addMessage(`${this.player.name} attacks ${target.name}!`);
    this.renderer.addMessage(`Attack: ${attackResult.attackRoll} vs AC ${target.stats.ac}`);
    
    if (attackResult.hit) {
      const died = CombatSystem.applyDamage(target, attackResult.damage);
      
      if (attackResult.critical) {
        this.renderer.addMessage(`CRITICAL HIT! ${attackResult.damageRoll} = ${attackResult.damage} damage`);
      } else {
        this.renderer.addMessage(`Hit! ${attackResult.damageRoll} = ${attackResult.damage} damage`);
      }
      
      // Visual effects for hit
      this.renderer.shakeEntity(target);
      this.renderer.showFloatingDamage(target, attackResult.damage);
      
      if (died) {
        this.renderer.addMessage(`${target.name} died!`);
        this.entities = this.entities.filter(entity => entity.id !== target.id);
      } else {
        this.renderer.addMessage(`${target.name}: ${target.stats.hp}/${target.stats.maxHp} HP`);
      }
      
      // Re-render to update HP display
      this.render();
      
    } else {
      this.renderer.addMessage("Miss!");
      // Shake player to indicate miss
      this.renderer.shakeEntity(this.player);
    }
  }

  updateVisuals() {
    // Check if camera needs to move based on player position
    const cameraMoved = this.renderer.updateCameraForPlayer({ 
      x: Math.round(this.playerDisplayX), 
      y: Math.round(this.playerDisplayY) 
    } as Entity);
    
    // If camera moved, need to re-render everything
    if (cameraMoved) {
      this.render();
      return; // render() will handle entity positioning
    }
    
    // Otherwise, just update entity visual positions
    const playerText = this.renderer.entityTextMap.get(this.player.id);
    const playerHp = this.renderer.hpTextMap.get(this.player.id);
    
    if (playerText) {
      const screenPos = this.renderer.worldToScreen(this.playerDisplayX, this.playerDisplayY);
      playerText.x = screenPos.x * this.renderer.tileSize + this.renderer.tileSize / 2;
      playerText.y = screenPos.y * this.renderer.tileSize + this.renderer.tileSize / 2;
    }
    
    if (playerHp) {
      const screenPos = this.renderer.worldToScreen(this.playerDisplayX, this.playerDisplayY);
      playerHp.x = screenPos.x * this.renderer.tileSize + this.renderer.tileSize / 2;
      playerHp.y = screenPos.y * this.renderer.tileSize + this.renderer.tileSize / 2 - 10;
      // Update HP text content and color
      const hpRatio = this.player.stats.hp / this.player.stats.maxHp;
      const hpColor = hpRatio > 0.5 ? 0x00FF00 : hpRatio > 0.25 ? 0xFFFF00 : 0xFF0000;
      playerHp.text = `${this.player.stats.hp}/${this.player.stats.maxHp}`;
      playerHp.style.fill = hpColor;
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
    // Update camera to follow player
    this.renderer.centerCameraOn(this.player);
    
    // Clear previous frame
    this.renderer.clearTiles();
    this.renderer.clearEntities();
    
    // Only render tiles that are visible in the camera viewport
    const startX = Math.max(0, this.renderer.cameraX);
    const endX = Math.min(this.tileMap.width, this.renderer.cameraX + this.renderer.viewportWidth);
    const startY = Math.max(0, this.renderer.cameraY);
    const endY = Math.min(this.tileMap.height, this.renderer.cameraY + this.renderer.viewportHeight);
    
    // Render tiles
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.tileMap.getTile(x, y);
        this.renderer.renderTile(x, y, tile);
      }
    }
    
    // Render entities (renderer will cull those outside viewport)
    for (const entity of this.entities) {
      this.renderer.renderEntity(entity);
    }
  }
}