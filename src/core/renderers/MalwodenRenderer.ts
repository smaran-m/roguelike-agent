import { Tile, Entity, TileVisibility } from '../../types';
import { IRenderer } from './IRenderer';
import { Terminal, Color, Glyph, FOV } from 'malwoden';
import { Logger } from '../../utils/Logger';
import { CameraSystem } from '../../systems/camera/CameraSystem';

export class MalwodenRenderer implements IRenderer {
  tileSize: number = 16;
  gridWidth: number;
  gridHeight: number;
  viewportWidth: number = 50;
  viewportHeight: number = 30;
  
  // Camera integration
  private cameraSystem?: CameraSystem;
  
  // Malwoden components
  private terminal?: Terminal.RetroTerminal;
  private fov?: FOV.PreciseShadowcasting;
  private lightPasses: (pos: {x: number, y: number}) => boolean = () => true;
  
  // Entity and message tracking
  private renderedEntities: Set<string> = new Set();
  private entityPositions: Map<string, {x: number, y: number}> = new Map();
  private lastFOVCells: Set<string> = new Set();
  private messages: string[] = [];
  
  // PixiJS compatibility properties
  characterSheet?: any = null;
  entityTextMap?: Map<string, any> = new Map();
  hpTextMap?: Map<string, any> = new Map();
  
  // Animation tracking
  private animatingEntities: Map<string, any> = new Map();
  private floatingDamageEffects: Array<{entityId: string, damage: number, startTime: number}> = [];
  
  constructor(width: number, height: number, cameraSystem?: CameraSystem) {
    this.gridWidth = width;
    this.gridHeight = height;
    this.cameraSystem = cameraSystem;
    
    // Light passes function - will be set by game
    this.lightPasses = () => true;
    
    this.initializeTerminal();
    this.initializeFOV();
    
    Logger.debug('Malwoden renderer initialized with native FOV');
  }
  
  private initializeTerminal() {
    const container = document.getElementById('game-container');
    if (!container) {
      Logger.error('No game-container found for Malwoden');
      return;
    }
    
    Logger.debug('Initializing RetroTerminal...');
    
    try {
      this.terminal = new Terminal.RetroTerminal({
        width: this.viewportWidth,
        height: this.viewportHeight,
        charWidth: 16,
        charHeight: 16,
        imageURL: "/fonts/agm_16x16.png",
        mountNode: container,
        foreColor: Color.White,
        backColor: Color.Black,
      });
      
      Logger.debug('RetroTerminal created successfully');
    } catch (error) {
      Logger.error('Error creating RetroTerminal:', error);
    }
  }
  
  
  
  private mapToAscii(char: string): string {
    // Map Unicode characters to very basic ASCII for RetroTerminal bitmap font
    switch (char) {
      case '·': // Middle dot -> period
        return '.';
      case '#': // Hash -> keep as hash 
        return '#';
      default:
        // For any non-ASCII character, use simple fallback
        const charCode = char.charCodeAt(0);
        if (charCode > 127) {
          return 'A'; // Use 'A' as fallback - definitely in the font
        }
        return char;
    }
  }
  
  private mapEntityToAscii(glyph: string): string {
    // Map emoji entity glyphs to ASCII characters for RetroTerminal
    switch (glyph) {
      case '🤺': // Wizard emoji -> @ symbol for player
        return '@';
      case '👺': // Goblin emoji -> 'o' for enemy  
        return 'o';
      default:
        // Try general ASCII mapping first
        return this.mapToAscii(glyph);
    }
  }
  
  get cameraX(): number { 
    return this.cameraSystem?.x ?? 0; 
  }
  
  get cameraY(): number { 
    return this.cameraSystem?.y ?? 0; 
  }
  
  private initializeFOV() {
    try {
      this.fov = new FOV.PreciseShadowcasting({
        lightPasses: this.lightPasses,
        topology: "eight",
        returnAll: false,
        cartesianRange: true
      });
      Logger.debug('Malwoden FOV initialized with PreciseShadowcasting');
    } catch (error) {
      Logger.error('Error initializing FOV:', error);
    }
  }
  
  // Set the light passes function for FOV calculation
  setLightPassesFunction(lightPasses: (x: number, y: number) => boolean) {
    // Adapt the (x, y) function to Vector2 format
    this.lightPasses = (pos: {x: number, y: number}) => lightPasses(pos.x, pos.y);
    
    // Recreate FOV with new lightPasses function
    if (this.fov) {
      this.fov = new FOV.PreciseShadowcasting({
        lightPasses: this.lightPasses,
        topology: "eight",
        returnAll: false,
        cartesianRange: true
      });
    }
  }
  
  renderTile(worldX: number, worldY: number, tile: Tile, visibility: TileVisibility) {
    if (!this.terminal || !visibility.explored) {
      return;
    }
    
    const screenPos = this.worldToScreen(worldX, worldY);
    
    if (screenPos.x < 0 || screenPos.x >= this.viewportWidth || 
        screenPos.y < 0 || screenPos.y >= this.viewportHeight) {
      return;
    }
    
    const char = this.mapToAscii(tile.glyph);
    let fgColor = this.getTileColor(tile.glyph);
    const bgColor = Color.Black;
    
    // Darken if not currently visible
    if (!visibility.visible) {
      // For now, use a different approach since we don't have color manipulation
      fgColor = Color.Gray;
    }
    
    const glyph = new Glyph(char, fgColor, bgColor);
    this.terminal.drawGlyph({x: screenPos.x, y: screenPos.y}, glyph);
  }
  
  renderEntity(entity: Entity, visible: boolean) {
    if (!this.terminal || !visible) return;
    
    const screenPos = this.worldToScreen(entity.x, entity.y);
    
    if (screenPos.x < 0 || screenPos.x >= this.viewportWidth || 
        screenPos.y < 0 || screenPos.y >= this.viewportHeight) {
      return;
    }
    
    // Track entity for proper clearing
    this.renderedEntities.add(entity.id);
    this.entityPositions.set(entity.id, {x: entity.x, y: entity.y});
    
    const char = this.mapEntityToAscii(entity.glyph);
    const color = this.getEntityColor(entity);
    
    const glyph = new Glyph(char, color, Color.Black);
    this.terminal.drawGlyph({x: screenPos.x, y: screenPos.y}, glyph);
  }
  
  renderEntityWithVisibility(entity: Entity, distance: number, hasLOS: boolean) {
    // For entities within FOV range and with line of sight
    if (distance <= 8 && hasLOS) {
      this.renderEntity(entity, true);
    }
  }
  
  renderTileWithVisibility(worldX: number, worldY: number, tile: Tile, distance: number, hasLOS: boolean) {
    // Tiles are explored if they've been seen before, visible if currently in FOV
    const visibility: TileVisibility = {
      explored: distance <= 12, // Larger exploration radius
      visible: hasLOS && distance <= 8
    };
    this.renderTile(worldX, worldY, tile, visibility);
  }
  
  clearTiles() {
    if (this.terminal) {
      this.terminal.clear();
    }
  }
  
  clearEntities() {
    // Clear tracked entities for next frame
    this.renderedEntities.clear();
  }
  
  removeEntity(entityId: string) {
    this.renderedEntities.delete(entityId);
    this.entityPositions.delete(entityId);
    this.animatingEntities.delete(entityId);
  }
  
  animateMove(entity: Entity, fromX: number, fromY: number, toX: number, toY: number) {
    // For terminal rendering, we can show a brief trail or just update position
    Logger.debug(`Entity ${entity.id} moved from (${fromX},${fromY}) to (${toX},${toY})`);
    
    // Store animation state
    this.animatingEntities.set(entity.id, {
      type: 'move',
      startTime: Date.now(),
      duration: 150,
      fromX, fromY, toX, toY
    });
  }
  
  shakeEntity(entity: Entity) {
    Logger.debug(`Entity ${entity.id} shaking at (${entity.x},${entity.y})`);
    
    this.animatingEntities.set(entity.id, {
      type: 'shake',
      startTime: Date.now(),
      duration: 200
    });
  }
  
  nudgeEntity(entity: Entity, targetX: number, targetY: number) {
    Logger.debug(`Entity ${entity.id} nudged towards (${targetX},${targetY})`);
    
    this.animatingEntities.set(entity.id, {
      type: 'nudge',
      startTime: Date.now(),
      duration: 100,
      targetX, targetY
    });
  }
  
  showFloatingDamage(entity: Entity, damage: number) {
    Logger.debug(`Showing ${damage} damage on entity ${entity.id}`);
    
    // Add to floating damage effects
    this.floatingDamageEffects.push({
      entityId: entity.id,
      damage,
      startTime: Date.now()
    });
    
    // Remove after duration
    setTimeout(() => {
      this.floatingDamageEffects = this.floatingDamageEffects.filter(
        effect => effect.entityId !== entity.id || effect.startTime !== Date.now()
      );
    }, 1500);
  }
  
  updateCameraForPlayer(entity: Entity): boolean {
    if (this.cameraSystem) {
      return this.cameraSystem.updateForPlayer(entity);
    }
    
    // Fallback implementation
    return false;
  }
  
  centerCameraOn(entity: Entity) {
    if (this.cameraSystem) {
      this.cameraSystem.setCenterOnEntity(entity);
    }
  }
  
  worldToScreen(worldX: number, worldY: number): {x: number, y: number} {
    if (this.cameraSystem) {
      return this.cameraSystem.worldToScreen(worldX, worldY);
    }
    
    // Fallback implementation
    return {
      x: worldX - this.cameraX,
      y: worldY - this.cameraY
    };
  }
  
  screenToWorld(screenX: number, screenY: number): {x: number, y: number} {
    if (this.cameraSystem) {
      return this.cameraSystem.screenToWorld(screenX, screenY);
    }
    
    // Fallback implementation
    return {
      x: screenX + this.cameraX,
      y: screenY + this.cameraY
    };
  }
  
  addMessage(message: string) {
    this.messages.push(message);
    // Keep only last 50 messages
    if (this.messages.length > 50) {
      this.messages = this.messages.slice(-50);
    }
    Logger.debug(`Message added: ${message}`);
  }
  
  updatePositionText(x: number, y: number) {
    // For terminal renderers, position could be shown in a status area
    Logger.debug(`Position updated: (${x}, ${y})`);
  }
  
  updateVisibilityAlpha(playerX: number, playerY: number, _tileMap: any, _lineOfSight: any) {
    if (!this.fov) return;
    
    // Clear previous FOV cells
    this.lastFOVCells.clear();
    
    try {
      // Use malwoden's native FOV calculation
      this.fov.calculateCallback(
        {x: playerX, y: playerY}, 
        8, // FOV radius
        (pos, range, visibility) => {
          // Add visible cells to our tracking set
          const cellKey = `${pos.x},${pos.y}`;
          this.lastFOVCells.add(cellKey);
          
          Logger.debug(`FOV: (${pos.x},${pos.y}) range=${range} vis=${visibility}`);
        }
      );
    } catch (error) {
      Logger.error('Error computing FOV:', error);
    }
  }
  
  updateEntityPositions() {
    // Update entity position tracking for animations
    this.entityPositions.forEach((_pos, _entityId) => {
      // Entity positions are updated during renderEntity
    });
    
    // Clean up old animation states
    const now = Date.now();
    for (const [entityId, animation] of this.animatingEntities.entries()) {
      if (now - animation.startTime > animation.duration) {
        this.animatingEntities.delete(entityId);
      }
    }
  }
  
  darkenColor(color: number, _factor: number): number {
    // For malwoden Color objects, create a darker version
    try {
      // This is a simplified approach - malwoden may have built-in color manipulation
      return color; // Placeholder - would need proper color manipulation
    } catch (error) {
      return color;
    }
  }
  
  needsEntityClearingEachFrame(): boolean {
    return true; // Terminal rendering needs full clear/redraw
  }
  
  hasNativeLOS(): boolean {
    return true; // Using malwoden's native FOV
  }
  
  render() {
    if (this.terminal) {
      this.terminal.render();
    }
  }
  
  // Helper methods for color and character mapping
  private getTileColor(glyph: string): Color {
    switch (glyph) {
      case '#': return Color.Red;
      case '·': return Color.Yellow;
      case '.': return Color.White;
      default: return Color.Gray;
    }
  }
  
  private getEntityColor(entity: Entity): Color {
    // Different colors for different entity types
    if (entity.glyph === '🧙' || entity.glyph === '@') {
      return Color.Yellow; // Player
    } else if (entity.glyph === '👺' || entity.glyph === 'o') {
      return Color.Red; // Enemy
    }
    return Color.White; // Default
  }
  
  // Check if a cell is currently visible in FOV
  isCellVisible(x: number, y: number): boolean {
    const cellKey = `${x},${y}`;
    return this.lastFOVCells.has(cellKey);
  }
  
  // Get the messages for display
  getMessages(): string[] {
    return [...this.messages];
  }
  
  // Clear all messages
  clearMessages() {
    this.messages = [];
  }
}