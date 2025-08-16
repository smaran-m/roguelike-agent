import { Tile, Entity, TileVisibility } from '../../types';
import { IRenderer } from './IRenderer';
import { Terminal, Color, Glyph, FOV } from 'malwoden';
import { Logger } from '../../utils/Logger';
import { CameraSystem } from '../../systems/camera/CameraSystem';
import { CharacterManager } from '../../managers/CharacterManager';
import { ResourceManager } from '../../managers/ResourceManager';
import { WorldConfigLoader } from '../../loaders/WorldConfigLoader';

export class MalwodenRenderer implements IRenderer {
  tileSize: number = 16;
  gridWidth: number;
  gridHeight: number;
  viewportWidth: number = 50;
  viewportHeight: number = 30;
  
  // UI Layout constants
  private readonly terminalWidth = 100;
  private readonly terminalHeight = 40;
  // private readonly leftPanelWidth = 24;  // Character sheet area (reserved for future use)
  private readonly rightPanelWidth = 30; // Combat log area
  private readonly gameAreaWidth = 50;   // Game viewport
  private readonly bottomUIRows = 3;     // Bottom status area
  
  // UI Layout regions
  private readonly leftPanelX = 0;
  private readonly gameAreaX = 25;
  private readonly rightPanelX = 76;
  private readonly bottomUIY = 37;
  
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
  
  // UI state tracking
  private currentPlayer?: Entity;
  // private lastCharacterSheetUpdate = 0; // Reserved for future optimization
  private uiNeedsRedraw = true;
  
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
        width: this.terminalWidth,
        height: this.terminalHeight,
        charWidth: 16,  // Match the font file dimensions
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
    
    const screenPos = this.worldToGameScreen(worldX, worldY);
    
    if (screenPos.x < 0 || screenPos.x >= this.gameAreaWidth || 
        screenPos.y < 0 || screenPos.y >= (this.terminalHeight - this.bottomUIRows)) {
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
    // Offset to game area within terminal
    this.terminal.drawGlyph({x: screenPos.x + this.gameAreaX, y: screenPos.y}, glyph);
  }
  
  renderEntity(entity: Entity, visible: boolean) {
    if (!this.terminal || !visible) return;
    
    const screenPos = this.worldToGameScreen(entity.x, entity.y);
    
    if (screenPos.x < 0 || screenPos.x >= this.gameAreaWidth || 
        screenPos.y < 0 || screenPos.y >= (this.terminalHeight - this.bottomUIRows)) {
      return;
    }
    
    // Store current player for UI updates
    if (entity.isPlayer) {
      this.currentPlayer = entity;
      this.uiNeedsRedraw = true;
    }
    
    // Track entity for proper clearing
    this.renderedEntities.add(entity.id);
    this.entityPositions.set(entity.id, {x: entity.x, y: entity.y});
    
    const char = this.mapEntityToAscii(entity.glyph);
    const color = this.getEntityColor(entity);
    
    const glyph = new Glyph(char, color, Color.Black);
    // Offset to game area within terminal
    this.terminal.drawGlyph({x: screenPos.x + this.gameAreaX, y: screenPos.y}, glyph);
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
      this.uiNeedsRedraw = true; // UI needs to be redrawn after clearing
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
  
  // Convert world coordinates to game area screen coordinates (no terminal offset)
  worldToGameScreen(worldX: number, worldY: number): {x: number, y: number} {
    if (this.cameraSystem) {
      return this.cameraSystem.worldToScreen(worldX, worldY);
    }
    
    // Fallback implementation
    return {
      x: worldX - this.cameraX,
      y: worldY - this.cameraY
    };
  }
  
  worldToScreen(worldX: number, worldY: number): {x: number, y: number} {
    const gamePos = this.worldToGameScreen(worldX, worldY);
    return {
      x: gamePos.x + this.gameAreaX,
      y: gamePos.y
    };
  }
  
  screenToWorld(screenX: number, screenY: number): {x: number, y: number} {
    // Convert terminal screen coordinates to world coordinates
    const gameScreenX = screenX - this.gameAreaX;
    const gameScreenY = screenY;
    
    if (this.cameraSystem) {
      return this.cameraSystem.screenToWorld(gameScreenX, gameScreenY);
    }
    
    // Fallback implementation
    return {
      x: gameScreenX + this.cameraX,
      y: gameScreenY + this.cameraY
    };
  }
  
  addMessage(message: string) {
    this.messages.push(message);
    // Keep only last 30 messages for combat log display
    if (this.messages.length > 30) {
      this.messages = this.messages.slice(-30);
    }
    this.uiNeedsRedraw = true; // Trigger UI redraw
    Logger.debug(`Message added: ${message}`);
  }
  
  updatePositionText(x: number, y: number) {
    // Position is now rendered as part of bottom UI
    if (this.currentPlayer) {
      this.currentPlayer.x = x;
      this.currentPlayer.y = y;
      this.uiNeedsRedraw = true;
    }
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
    
    // Trigger UI redraw to update position display
    this.uiNeedsRedraw = true;
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
      // Render UI elements if needed
      if (this.uiNeedsRedraw) {
        this.renderUI();
        this.uiNeedsRedraw = false;
      }
      
      this.terminal.render();
    }
  }
  
  private renderUI() {
    this.renderCharacterSheet();
    this.renderCombatLog();
    this.renderBottomUI();
    this.renderPanelBorders();
  }
  
  // Character sheet rendering
  private renderCharacterSheet() {
    if (!this.terminal || !this.currentPlayer) return;
    
    const player = this.currentPlayer;
    const x = this.leftPanelX;
    let y = 0;
    
    // Title
    this.drawText(x, y++, "CHARACTER", Color.White);
    y++; // Skip line
    
    // Portrait - use ASCII representation
    const portrait = player.glyph === '🤺' ? '@' : this.mapEntityToAscii(player.glyph);
    this.drawText(x + 10, y++, portrait, Color.Yellow);
    y++; // Skip line
    
    // Name and basic info
    this.drawText(x, y++, `Name: ${player.name}`, Color.White);
    
    // Get character class info
    const characterManager = CharacterManager.getInstance();
    const currentCharacter = characterManager.getCurrentCharacter();
    if (currentCharacter) {
      const className = currentCharacter.className;
      this.drawText(x, y++, `Class: ${className}`, Color.Gray);
      this.drawText(x, y++, `Level: ${currentCharacter.level}`, Color.Yellow);
      
      // Experience
      // const nextLevelXP = currentCharacter.level * 1000; // Could be used for progress bar
      this.drawText(x, y++, `XP: ${currentCharacter.experience}`, Color.Gray);
      y++; // Skip line
    }
    
    // Resources (HP, mana, etc.)
    y = this.renderCharacterResources(x, y, player);
    y++; // Skip line
    
    // Stats
    this.drawText(x, y++, "STATS", Color.White);
    this.drawText(x, y++, `AC: ${player.stats.ac}`, Color.Cyan);
    this.drawText(x, y++, `STR: ${player.stats.strength} (${this.getModifier(player.stats.strength)})`, Color.White);
    this.drawText(x, y++, `DEX: ${player.stats.dexterity} (${this.getModifier(player.stats.dexterity)})`, Color.White);
    this.drawText(x, y++, `CON: ${player.stats.constitution} (${this.getModifier(player.stats.constitution)})`, Color.White);
    this.drawText(x, y++, `INT: ${player.stats.intelligence} (${this.getModifier(player.stats.intelligence)})`, Color.White);
    this.drawText(x, y++, `WIS: ${player.stats.wisdom} (${this.getModifier(player.stats.wisdom)})`, Color.White);
    this.drawText(x, y++, `CHA: ${player.stats.charisma} (${this.getModifier(player.stats.charisma)})`, Color.White);
  }
  
  private renderCharacterResources(x: number, startY: number, player: Entity): number {
    let y = startY;
    const availableResources = WorldConfigLoader.getAvailableResourceIds();
    
    availableResources.forEach((resourceId: string) => {
      if (ResourceManager.hasResource(player, resourceId)) {
        const resourceDef = WorldConfigLoader.getResourceDefinition(resourceId);
        const displayName = resourceDef?.displayName || resourceId.toUpperCase();
        
        // Create ASCII bar display
        const current = ResourceManager.getCurrentValue(player, resourceId);
        const max = ResourceManager.getMaximumValue(player, resourceId) || current;
        const barSize = 8; // Smaller for terminal
        const barDisplay = this.createASCIIBar(current, max, barSize);
        
        // Get resource color
        const colorValue = ResourceManager.getResourceColor(player, resourceId);
        const color = this.numberToMalwodenColor(colorValue);
        
        // Display as: "HP: [████████] 80/100"
        const valueText = `${current}/${max}`;
        this.drawText(x, y, `${displayName}:`, Color.White);
        this.drawText(x, y + 1, `${barDisplay} ${valueText}`, color);
        y += 2;
      }
    });
    
    return y;
  }
  
  private createASCIIBar(current: number, max: number, width: number): string {
    const ratio = Math.max(0, Math.min(1, current / max));
    const filled = Math.floor(ratio * width);
    const empty = width - filled;
    
    return `[${'\u2588'.repeat(filled)}${' '.repeat(empty)}]`;
  }
  
  private getModifier(abilityScore: number): string {
    const mod = Math.floor((abilityScore - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }
  
  private renderCombatLog() {
    if (!this.terminal) return;
    
    const x = this.rightPanelX;
    let y = 0;
    
    // Title
    this.drawText(x, y++, "COMBAT LOG", Color.White);
    y++; // Skip line
    
    // Display recent messages
    const maxLines = this.terminalHeight - this.bottomUIRows - 3; // Leave room for title and borders
    const messagesToShow = this.messages.slice(-maxLines);
    
    messagesToShow.forEach((message) => {
      // Simple word wrap for long messages
      const wrappedLines = this.wrapText(message, this.rightPanelWidth - 2);
      wrappedLines.forEach((line) => {
        if (y < this.terminalHeight - this.bottomUIRows) {
          this.drawText(x, y++, line, Color.White);
        }
      });
    });
  }
  
  private renderBottomUI() {
    if (!this.terminal || !this.currentPlayer) return;
    
    const y = this.bottomUIY;
    
    // Controls help
    this.drawText(1, y, "WASD/Arrows: Move  Space: Attack", Color.Gray);
    
    // Position display
    const posText = `(${this.currentPlayer.x}, ${this.currentPlayer.y})`;
    this.drawText(this.terminalWidth - posText.length - 1, y, posText, Color.Gray);
  }
  
  private renderPanelBorders() {
    if (!this.terminal) return;
    
    // Vertical separators
    for (let y = 0; y < this.terminalHeight - this.bottomUIRows; y++) {
      // Left panel border
      this.terminal.drawGlyph({x: this.gameAreaX - 1, y}, new Glyph('|', Color.DarkGray, Color.Black));
      // Right panel border  
      this.terminal.drawGlyph({x: this.rightPanelX - 1, y}, new Glyph('|', Color.DarkGray, Color.Black));
    }
    
    // Horizontal separator above bottom UI
    for (let x = 0; x < this.terminalWidth; x++) {
      this.terminal.drawGlyph({x, y: this.bottomUIY - 1}, new Glyph('-', Color.DarkGray, Color.Black));
    }
  }
  
  private drawText(x: number, y: number, text: string, color: Color = Color.White) {
    if (!this.terminal || y >= this.terminalHeight || x >= this.terminalWidth) return;
    
    for (let i = 0; i < text.length && (x + i) < this.terminalWidth; i++) {
      this.terminal.drawGlyph({x: x + i, y}, new Glyph(text[i], color, Color.Black));
    }
  }
  
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }
  
  private numberToMalwodenColor(colorValue: number): Color {
    // Convert common hex colors to Malwoden colors
    switch (colorValue) {
      case 0xFF0000: return Color.Red;
      case 0x00FF00: return Color.Green;
      case 0x0000FF: return Color.Blue;
      case 0xFFFF00: return Color.Yellow;
      case 0xFF00FF: return Color.Magenta;
      case 0x00FFFF: return Color.Cyan;
      case 0xFFFFFF: return Color.White;
      case 0x808080: return Color.Gray;
      case 0xFFA500: return Color.Orange;
      default: return Color.White;
    }
  }
  
  // Helper methods for color and character mapping
  private getTileColor(glyph: string): Color {
    switch (glyph) {
      case '#': return Color.Orange;
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