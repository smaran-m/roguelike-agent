import { Tile, Entity, TileVisibility } from '../../types';
import { ResourceManager } from '../../managers/ResourceManager';
import { Logger } from '../../utils/Logger';
import { IRenderer } from './IRenderer';
import * as ROT from 'rot-js';

export class ROTRenderer implements IRenderer {
  // Core properties
  tileSize: number = 16; // Terminal cell size
  gridWidth: number;
  gridHeight: number;
  viewportWidth: number = 80; // Classic terminal width
  viewportHeight: number = 25; // Classic terminal height
  
  // Camera system
  private _cameraX: number = 0;
  private _cameraY: number = 0;
  
  // ROT.js specific
  private rotDisplay: ROT.Display;
  private rotFOV: any; // ROT.js FOV class
  private lightPasses: (x: number, y: number) => boolean;
  
  // Entity tracking for proper clearing
  private renderedEntities: Set<string> = new Set();
  private entityPositions: Map<string, {x: number, y: number}> = new Map();
  private lastFOVCells: Set<string> = new Set();
  
  // Messages
  messages: string[] = [];
  
  // Optional compatibility properties
  characterSheet?: any = null;
  entityTextMap?: Map<string, any> = new Map();
  hpTextMap?: Map<string, any> = new Map();
  
  constructor(width: number, height: number) {
    this.gridWidth = width;
    this.gridHeight = height;
    
    // Initialize ROT.js display
    this.rotDisplay = new ROT.Display({
      width: this.viewportWidth,
      height: this.viewportHeight,
      fontSize: 16,
      fontFamily: 'monospace',
      forceSquareRatio: true,
      bg: '#000000',
      fg: '#ffffff'
    });
    
    // Initialize ROT.js FOV (Recursive Shadow Casting)
    this.rotFOV = new ROT.FOV.RecursiveShadowcasting((x, y) => this.lightPasses(x, y));
    
    // Light passes function - will be set by game
    this.lightPasses = () => true; // Default: all cells passable
    
    // Add to DOM
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.rotDisplay.getContainer()!);
    }
    
    Logger.debug('ROT.js renderer initialized with native FOV');
  }
  
  // Set the light passes function for FOV calculation
  setLightPassesFunction(lightPasses: (x: number, y: number) => boolean) {
    this.lightPasses = lightPasses;
    this.rotFOV = new ROT.FOV.RecursiveShadowcasting(lightPasses);
  }
  
  get cameraX(): number {
    return this._cameraX;
  }
  
  get cameraY(): number {
    return this._cameraY;
  }
  
  renderTile(worldX: number, worldY: number, tile: Tile, visibility: TileVisibility) {
    if (!visibility.explored) return;
    
    const screenX = worldX - this._cameraX;
    const screenY = worldY - this._cameraY;
    
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return;
    }
    
    const char = this.tileToChar(tile);
    let fg = this.colorToHex(tile.fgColor);
    let bg = this.colorToHex(tile.bgColor);
    
    if (!visibility.visible) {
      fg = '#000000';
      bg = '#000000'; // Explored, but not visible
    }
    
    this.rotDisplay.draw(screenX, screenY, char, fg, bg);
  }
  
  renderEntity(entity: Entity, visible: boolean) {
    if (!visible) return;
    
    const screenX = entity.x - this._cameraX;
    const screenY = entity.y - this._cameraY;
    
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return;
    }
    
    const char = this.entityToChar(entity);
    const color = this.colorToHex(entity.color);
    
    this.rotDisplay.draw(screenX, screenY, char, color, '#000000');
    this.renderedEntities.add(entity.id);
    this.entityPositions.set(entity.id, {x: entity.x, y: entity.y});
  }
  
  renderEntityWithVisibility(entity: Entity, distance: number, hasLOS: boolean) {
    if (!hasLOS) return;
    
    const screenX = entity.x - this._cameraX;
    const screenY = entity.y - this._cameraY;
    
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return;
    }
    
    const char = this.entityToChar(entity);
    let color = this.colorToHex(entity.color);
    
    // Fade based on distance
    const maxDistance = 8;
    const alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
    if (alpha < 1.0) {
      color = this.fadeHexColor(color, alpha);
    }
    
    this.rotDisplay.draw(screenX, screenY, char, color, '#000000');
    this.renderedEntities.add(entity.id);
    this.entityPositions.set(entity.id, {x: entity.x, y: entity.y});
    
    // Show HP for non-players above entity
    if (!entity.isPlayer && entity.stats && screenY > 0) {
      const currentHp = ResourceManager.getCurrentValue(entity, 'hp');
      const maxHp = ResourceManager.getMaximumValue(entity, 'hp') || currentHp;
      const hpRatio = currentHp / maxHp;
      
      let hpChar = '♥';
      let hpColor = '#00ff00';
      if (hpRatio <= 0.25) {
        hpColor = '#ff0000';
      } else if (hpRatio <= 0.5) {
        hpColor = '#ffff00';
      }
      
      this.rotDisplay.draw(screenX, screenY - 1, hpChar, hpColor, '#000000');
    }
  }
  
  renderTileWithVisibility(worldX: number, worldY: number, tile: Tile, distance: number, hasLOS: boolean) {
    const screenX = worldX - this._cameraX;
    const screenY = worldY - this._cameraY;
    
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return;
    }
    
    const char = this.tileToChar(tile);
    let fg = this.colorToHex(tile.fgColor);
    let bg = this.colorToHex(tile.bgColor);
    
    if (!hasLOS) {
      fg = '#000000';
      bg = '#000000'; // Explored, but not visible
    } else {
      const maxDistance = 8;
      const alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
      if (alpha < 1.0) {
        fg = this.fadeHexColor(fg, alpha);
        bg = this.fadeHexColor(bg, alpha);
      }
    }
    
    this.rotDisplay.draw(screenX, screenY, char, fg, bg);
  }
  
  // Use ROT.js native FOV calculation
  calculateFOV(playerX: number, playerY: number, radius: number = 8): Set<string> {
    const visibleCells = new Set<string>();
    
    this.rotFOV.compute(playerX, playerY, radius, (x: number, y: number, _r: number, visibility: number) => {
      if (visibility > 0) {
        visibleCells.add(`${x},${y}`);
      }
    });
    
    return visibleCells;
  }
  
  clearTiles() {
    // Clear entire display
    for (let y = 0; y < this.viewportHeight; y++) {
      for (let x = 0; x < this.viewportWidth; x++) {
        this.rotDisplay.draw(x, y, ' ', '#000000', '#000000');
      }
    }
    this.lastFOVCells.clear();
  }
  
  clearEntities() {
    // Clear old entity positions
    for (const entityId of this.renderedEntities) {
      const pos = this.entityPositions.get(entityId);
      if (pos) {
        const screenX = pos.x - this._cameraX;
        const screenY = pos.y - this._cameraY;
        
        if (screenX >= 0 && screenX < this.viewportWidth && 
            screenY >= 0 && screenY < this.viewportHeight) {
          // Clear the cell
          this.rotDisplay.draw(screenX, screenY, ' ', '#000000', '#000000');
          // Also clear HP indicator above
          if (screenY > 0) {
            this.rotDisplay.draw(screenX, screenY - 1, ' ', '#000000', '#000000');
          }
        }
      }
    }
    
    this.renderedEntities.clear();
    this.entityPositions.clear();
  }
  
  removeEntity(entityId: string) {
    const pos = this.entityPositions.get(entityId);
    if (pos) {
      const screenX = pos.x - this._cameraX;
      const screenY = pos.y - this._cameraY;
      
      if (screenX >= 0 && screenX < this.viewportWidth && 
          screenY >= 0 && screenY < this.viewportHeight) {
        // Clear the entity's position
        this.rotDisplay.draw(screenX, screenY, ' ', '#000000', '#000000');
        if (screenY > 0) {
          this.rotDisplay.draw(screenX, screenY - 1, ' ', '#000000', '#000000');
        }
      }
    }
    
    this.renderedEntities.delete(entityId);
    this.entityPositions.delete(entityId);
  }
  
  // Animation methods (no-op for terminal)
  animateMove(entity: Entity, _fromX: number, _fromY: number, toX: number, toY: number) {
    this.entityPositions.set(entity.id, {x: toX, y: toY});
  }
  
  shakeEntity(_entity: Entity) {
    Logger.debug('ROT.js: shake effect');
  }
  
  nudgeEntity(_entity: Entity, _targetX: number, _targetY: number) {
    Logger.debug('ROT.js: nudge effect');
  }
  
  showFloatingDamage(_entity: Entity, damage: number) {
    Logger.debug(`ROT.js: ${damage} damage`);
  }
  
  // Camera methods
  updateCameraForPlayer(entity: Entity): boolean {
    const oldX = this._cameraX;
    const oldY = this._cameraY;
    
    // Center camera on player
    this._cameraX = Math.max(0, Math.min(
      this.gridWidth - this.viewportWidth,
      entity.x - Math.floor(this.viewportWidth / 2)
    ));
    this._cameraY = Math.max(0, Math.min(
      this.gridHeight - this.viewportHeight,
      entity.y - Math.floor(this.viewportHeight / 2)
    ));
    
    return oldX !== this._cameraX || oldY !== this._cameraY;
  }
  
  centerCameraOn(entity: Entity) {
    this._cameraX = Math.max(0, Math.min(
      this.gridWidth - this.viewportWidth,
      entity.x - Math.floor(this.viewportWidth / 2)
    ));
    this._cameraY = Math.max(0, Math.min(
      this.gridHeight - this.viewportHeight,
      entity.y - Math.floor(this.viewportHeight / 2)
    ));
  }
  
  worldToScreen(worldX: number, worldY: number): {x: number, y: number} {
    return {
      x: worldX - this._cameraX,
      y: worldY - this._cameraY
    };
  }
  
  screenToWorld(screenX: number, screenY: number): {x: number, y: number} {
    return {
      x: screenX + this._cameraX,
      y: screenY + this._cameraY
    };
  }
  
  // UI methods
  addMessage(message: string) {
    this.messages.push(message);
    if (this.messages.length > 5) {
      this.messages.shift();
    }
    
    // Display messages at bottom of screen
    for (let i = 0; i < this.messages.length && i < 5; i++) {
      const msg = this.messages[this.messages.length - 1 - i];
      const y = this.viewportHeight - 1 - i;
      
      // Clear the line
      for (let x = 0; x < this.viewportWidth; x++) {
        this.rotDisplay.draw(x, y, ' ', '#ffffff', '#000000');
      }
      
      // Draw message
      for (let j = 0; j < Math.min(msg.length, this.viewportWidth); j++) {
        this.rotDisplay.draw(j, y, msg[j], '#ffffff', '#000000');
      }
    }
  }
  
  updatePositionText(x: number, y: number) {
    const posText = `(${x},${y})`;
    const startX = this.viewportWidth - posText.length;
    
    for (let i = 0; i < posText.length; i++) {
      this.rotDisplay.draw(startX + i, 0, posText[i], '#ffffff', '#000000');
    }
  }
  
  updateVisibilityAlpha(_playerX: number, _playerY: number, _tileMap: any, _lineOfSight: any) {
    // ROT.js handles visibility through render calls
  }
  
  updateEntityPositions() {
    // Entities are redrawn each frame
  }
  
  darkenColor(color: number, _factor: number): number {
    return this.darkenNumericColor(color);
  }
  
  needsEntityClearingEachFrame(): boolean {
    return true; // ROT.js redraws everything each frame
  }
  
  hasNativeLOS(): boolean {
    return true; // ROT.js has native FOV
  }
  
  // Utility methods
  private tileToChar(tile: Tile): string {
    if (tile.glyph === '🟫') return '#'; // Wall
    if (tile.glyph === '⬛') return '.'; // Floor
    return tile.glyph.charAt(0);
  }
  
  private entityToChar(entity: Entity): string {
    if (entity.glyph === '🧙') return '@'; // Player
    if (entity.glyph === '👺') return 'o'; // Enemy
    if (entity.glyph === '🦇') return 'b'; // Bat
    if (entity.glyph === '🐀') return 'r'; // Rat
    return entity.glyph.charAt(0);
  }
  
  private colorToHex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
  
  private darkenHexColor(hexColor: string): string {
    const color = parseInt(hexColor.slice(1), 16);
    const darkened = this.darkenNumericColor(color);
    return `#${darkened.toString(16).padStart(6, '0')}`;
  }
  
  private darkenNumericColor(color: number): number {
    const r = ((color >> 16) & 0xFF) * 0.4;
    const g = ((color >> 8) & 0xFF) * 0.4;
    const b = (color & 0xFF) * 0.4;
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }
  
  private fadeHexColor(hexColor: string, alpha: number): string {
    const color = parseInt(hexColor.slice(1), 16);
    const r = ((color >> 16) & 0xFF) * alpha;
    const g = ((color >> 8) & 0xFF) * alpha;
    const b = (color & 0xFF) * alpha;
    const faded = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    return `#${faded.toString(16).padStart(6, '0')}`;
  }
}