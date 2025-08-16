import { Tile, Entity, TileVisibility } from '../../types';
import { ResourceManager } from '../../managers/ResourceManager';
import { Logger } from '../../utils/Logger';
import { IRenderer } from './IRenderer';

// PixiJS imports for terminal-styled renderer
import { Application, Container, Text, filters, Graphics } from 'pixi.js';

export class TerminalRenderer implements IRenderer {
  // Core properties
  tileSize: number = 20; // Larger than pure terminals, smaller than full PixiJS
  gridWidth: number;
  gridHeight: number;
  viewportWidth: number = 40; // Different from PixiJS and pure terminals
  viewportHeight: number = 20; // Different viewport size
  
  // Camera system
  private _cameraX: number = 0;
  private _cameraY: number = 0;
  
  // Entity tracking
  entityPositions: Map<string, {x: number, y: number}> = new Map();
  messages: string[] = [];
  
  // PixiJS compatibility properties
  characterSheet?: any = null;
  entityTextMap?: Map<string, any> = new Map();
  hpTextMap?: Map<string, any> = new Map();
  
  // PixiJS Terminal implementation
  private pixiApp!: Application;
  private pixiContainer!: Container;
  private pixiTerminalChars: Map<string, Text> = new Map();
  private animationSystem?: any;
  private messageText?: Text;
  
  constructor(width: number, height: number) {
    this.gridWidth = width;
    this.gridHeight = height;
    
    this.initializePixiTerminal();
  }
  
  private initializePixiTerminal() {
    // Create unique terminal-styled PixiJS setup
    const characterSheetWidth = 180; // Narrower than full PixiJS
    
    this.pixiApp = new Application({
      width: characterSheetWidth + this.viewportWidth * this.tileSize + 280, // Different layout
      height: Math.max(this.viewportHeight * this.tileSize, 500), // Different height
      backgroundColor: 0x001100, // Dark green terminal background
      antialias: false
    });
    
    this.pixiContainer = new Container();
    
    // Offset for character sheet
    this.pixiContainer.x = characterSheetWidth;
    
    // Add multiple terminal effects for distinction
    const scanlineFilter = new filters.AlphaFilter(0.85);
    const colorMatrix = new filters.ColorMatrixFilter();
    colorMatrix.sepia(true); // Slight sepia for retro feel
    this.pixiContainer.filters = [scanlineFilter, colorMatrix];
    
    this.pixiApp.stage.addChild(this.pixiContainer);
    
    // Initialize terminal-specific UI
    this.initTerminalUI();
    
    // Add to DOM
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.pixiApp.view as HTMLCanvasElement);
    }
    
    Logger.debug('PixiJS Terminal-styled renderer initialized with unique styling');
  }
  private initTerminalUI() {
    // Initialize character sheet with terminal styling
    this.initTerminalCharacterSheet();
    
    // Initialize message area with unique terminal layout
    this.initTerminalMessageArea();
    
    // Initialize animation system
    this.initTerminalAnimations();
  }
  
  private initTerminalCharacterSheet() {
    try {
      import('../../ui/components/CharacterSheet').then(({ CharacterSheet }) => {
        this.characterSheet = new CharacterSheet(this.pixiApp);
        this.characterSheet.setPosition(10, 10);
        // Apply terminal-specific styling to character sheet
        if (this.characterSheet.container) {
          this.characterSheet.container.alpha = 0.9; // Slightly transparent
        }
        Logger.debug('Terminal character sheet initialized');
      });
    } catch (e) {
      Logger.warn('Failed to initialize terminal character sheet:', e);
    }
  }
  
  private initTerminalMessageArea() {
    const characterSheetWidth = 180;
    
    // Add separator line with terminal green color
    const separator = new Graphics();
    separator.beginFill(0x00FF00); // Bright green separator
    separator.drawRect(0, 0, 2, Math.max(this.viewportHeight * this.tileSize, 500));
    separator.endFill();
    separator.x = characterSheetWidth + this.viewportWidth * this.tileSize + 10;
    separator.y = 0;
    this.pixiApp.stage.addChild(separator);
    
    // Terminal-styled title
    import('../../systems/font/FontSystem').then(({ FontSystem }) => {
      const titleText = new Text('TERMINAL LOG:', {
        ...FontSystem.getUIStyles().title,
        fontFamily: 'monospace',
        fill: 0x00FF00, // Bright green text
        fontSize: 14
      });
      titleText.x = characterSheetWidth + this.viewportWidth * this.tileSize + 20;
      titleText.y = 10;
      this.pixiApp.stage.addChild(titleText);
      
      // Terminal message display with unique styling
      this.messageText = new Text('> SYSTEM READY\n> USE WASD TO MOVE\n> SPACE TO ATTACK', {
        fontFamily: 'Courier New, monospace',
        fontSize: 12,
        fill: 0x00DD00, // Slightly dimmer green
        wordWrap: true,
        wordWrapWidth: 250,
        lineHeight: 16
      });
      this.messageText.x = characterSheetWidth + this.viewportWidth * this.tileSize + 20;
      this.messageText.y = 35;
      this.pixiApp.stage.addChild(this.messageText);
      
      Logger.debug('Terminal message area initialized');
    });
  }
  
  private initTerminalAnimations() {
    import('../../systems/animation/AnimationSystem').then(({ AnimationSystem }) => {
      if (this.pixiContainer && this.entityTextMap && this.hpTextMap) {
        this.animationSystem = new AnimationSystem(
          this.tileSize,
          this.pixiContainer,
          this.entityTextMap,
          this.hpTextMap
        );
        Logger.debug('Terminal animation system initialized');
      }
    });
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
    
    const char = this.tileToTerminalChar(tile);
    let color = tile.fgColor;
    
    if (!visibility.visible) {
      color = this.darkenColor(color, 0.4);
    }
    
    this.drawTerminalChar(screenX, screenY, char, color);
  }
  
  renderEntity(entity: Entity, visible: boolean) {
    if (!visible) return;
    
    const screenX = entity.x - this._cameraX;
    const screenY = entity.y - this._cameraY;
    
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return;
    }
    
    const char = this.entityToTerminalChar(entity);
    this.drawTerminalChar(screenX, screenY, char, entity.color);
    this.entityPositions.set(entity.id, {x: entity.x, y: entity.y});
  }
  
  renderEntityWithVisibility(entity: Entity, distance: number, hasLOS: boolean) {
    if (!hasLOS) return;
    
    const screenX = entity.x - this._cameraX;
    const screenY = entity.y - this._cameraY;
    
    const inViewport = screenX >= 0 && screenX < this.viewportWidth && 
                      screenY >= 0 && screenY < this.viewportHeight;
    
    if (!inViewport) return;
    
    // Calculate alpha based on distance
    const maxDistance = 8;
    let alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
    
    // Get or create entity text object
    let text = this.entityTextMap?.get(entity.id);
    if (!text) {
      const char = this.entityToTerminalChar(entity);
      text = new Text(char, {
        fontFamily: 'Courier New, monospace', // Terminal font
        fontSize: this.tileSize,
        fill: entity.color,
        align: 'center'
      });
      text.anchor.set(0.5);
      this.entityTextMap?.set(entity.id, text);
      this.pixiContainer.addChild(text);
    }
    
    if (text) {
      text.x = screenX * this.tileSize + this.tileSize / 2;
      text.y = screenY * this.tileSize + this.tileSize / 2;
      text.alpha = alpha;
      text.visible = alpha > 0;
      
      // Terminal-style HP display for non-players
      if (!entity.isPlayer && entity.stats) {
        let hpText = this.hpTextMap?.get(entity.id);
        if (!hpText) {
          hpText = new Text('', {
            fontFamily: 'Courier New, monospace',
            fontSize: 10,
            fill: 0x00FF00, // Terminal green
            align: 'center'
          });
          hpText.anchor.set(0.5);
          this.hpTextMap?.set(entity.id, hpText);
          this.pixiContainer.addChild(hpText);
        }
        
        if (hpText) {
          const currentHp = ResourceManager.getCurrentValue(entity, 'hp');
          const maxHp = ResourceManager.getMaximumValue(entity, 'hp') || currentHp;
          const hpRatio = currentHp / maxHp;
          
          // Terminal-style HP bar using ASCII
          const barLength = 6;
          const filledLength = Math.floor(hpRatio * barLength);
          const hpBar = '[' + '='.repeat(filledLength) + ' '.repeat(barLength - filledLength) + ']';
          
          hpText.text = hpBar;
          hpText.style.fill = hpRatio > 0.5 ? 0x00FF00 : hpRatio > 0.25 ? 0xFFFF00 : 0xFF0000;
          hpText.x = screenX * this.tileSize + this.tileSize / 2;
          hpText.y = screenY * this.tileSize + this.tileSize / 2 - 18;
          hpText.alpha = alpha;
          hpText.visible = alpha > 0;
        }
      }
      
      // Update character sheet if this is the player
      if (entity.isPlayer && this.characterSheet) {
        this.characterSheet.updateResourcesOnly(entity);
      }
    }
    
    this.entityPositions.set(entity.id, {x: entity.x, y: entity.y});
  }
  
  renderTileWithVisibility(worldX: number, worldY: number, tile: Tile, distance: number, hasLOS: boolean) {
    const screenX = worldX - this._cameraX;
    const screenY = worldY - this._cameraY;
    
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return;
    }
    
    const char = this.tileToTerminalChar(tile);
    let color = tile.fgColor;
    
    if (!hasLOS) {
      color = this.darkenColor(color, 0.3);
    } else {
      const maxDistance = 8;
      const alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
      if (alpha < 1.0) {
        color = this.fadeColor(color, alpha);
      }
    }
    
    this.drawTerminalChar(screenX, screenY, char, color);
  }
  
  private drawTerminalChar(x: number, y: number, char: string, color: number) {
    const key = `${x},${y}`;
    let text = this.pixiTerminalChars.get(key);
    
    if (!text) {
      text = new Text(char, {
        fontFamily: 'Courier New, monospace', // Terminal-specific font
        fontSize: this.tileSize,
        fill: color,
        align: 'center'
      });
      text.anchor.set(0.5);
      text.x = x * this.tileSize + this.tileSize / 2;
      text.y = y * this.tileSize + this.tileSize / 2;
      this.pixiContainer.addChild(text);
      this.pixiTerminalChars.set(key, text);
    } else {
      text.text = char;
      text.style.fill = color;
    }
  }
  
  private tileToTerminalChar(tile: Tile): string {
    // Convert emoji/unicode to ASCII for terminals
    if (tile.glyph === '🟫') return '#'; // Wall
    if (tile.glyph === '⬛') return '.'; // Floor
    return tile.glyph.charAt(0); // Take first character
  }
  
  private entityToTerminalChar(entity: Entity): string {
    // Convert entity emojis to ASCII
    if (entity.glyph === '🧙') return '@'; // Player
    if (entity.glyph === '👺') return 'o'; // Enemy
    if (entity.glyph === '🦇') return 'b'; // Bat
    if (entity.glyph === '🐀') return 'r'; // Rat
    return entity.glyph.charAt(0);
  }
  
  private darkenTerminalColor(color: number): number {
    const r = ((color >> 16) & 0xFF) * 0.4;
    const g = ((color >> 8) & 0xFF) * 0.4;
    const b = (color & 0xFF) * 0.4;
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }
  
  private fadeColor(color: number, alpha: number): number {
    const r = ((color >> 16) & 0xFF) * alpha;
    const g = ((color >> 8) & 0xFF) * alpha;
    const b = (color & 0xFF) * alpha;
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }
  
  clearTiles() {
    // Clear all terminal characters
    for (let y = 0; y < this.viewportHeight; y++) {
      for (let x = 0; x < this.viewportWidth; x++) {
        this.drawTerminalChar(x, y, ' ', 0x000000);
      }
    }
  }
  
  clearEntities() {
    this.entityPositions.clear();
    // Entities are drawn on same surface as tiles in terminal renderers
    // They get cleared when clearTiles() is called
  }
  
  removeEntity(entityId: string) {
    this.entityPositions.delete(entityId);
  }
  
  // Animation methods - simplified for terminal
  animateMove(entity: Entity, _fromX: number, _fromY: number, toX: number, toY: number) {
    // Terminal renderers typically don't have smooth animations
    // Just update the position immediately
    this.entityPositions.set(entity.id, {x: toX, y: toY});
  }
  
  shakeEntity(entity: Entity) {
    if (this.animationSystem) {
      this.animationSystem.shakeEntity(entity);
    } else {
      Logger.debug('Terminal shake effect for entity:', entity.id);
    }
  }
  
  nudgeEntity(entity: Entity, targetX: number, targetY: number) {
    if (this.animationSystem) {
      this.animationSystem.nudgeEntity(entity, targetX, targetY);
    } else {
      Logger.debug('Terminal nudge effect for entity:', entity.id);
    }
  }
  
  showFloatingDamage(entity: Entity, damage: number) {
    if (this.animationSystem) {
      this.animationSystem.showFloatingDamage(entity, damage);
    } else {
      Logger.debug(`Terminal damage display: ${damage} to entity ${entity.id}`);
    }
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
    
    const moved = oldX !== this._cameraX || oldY !== this._cameraY;
    
    if (moved) {
      Logger.debug(`Terminal camera moved: (${oldX},${oldY}) -> (${this._cameraX},${this._cameraY}), player at (${entity.x},${entity.y})`);
    }
    
    return moved;
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
  
  // UI methods - terminal-specific
  addMessage(message: string) {
    this.messages.push(`> ${message}`); // Terminal-style prefix
    
    // Keep terminal message limit
    if (this.messages.length > 20) {
      this.messages.shift();
    }
    
    // Update terminal message display with green styling
    if (this.messageText) {
      this.messageText.text = this.messages.join('\n');
    }
  }
  
  
  updatePositionText(x: number, y: number) {
    // Position display is handled by character sheet in terminal mode
    Logger.debug(`Terminal position: (${x},${y})`);
  }
  
  updateVisibilityAlpha(_playerX: number, _playerY: number, _tileMap: any, _lineOfSight: any) {
    // Terminal renderers handle visibility through tile rendering
    // No separate alpha updates needed
  }
  
  updateEntityPositions() {
    // Entities are redrawn each frame in terminal renderers
  }
  
  darkenColor(color: number, _factor: number): number {
    return this.darkenTerminalColor(color);
  }
  
  needsEntityClearingEachFrame(): boolean {
    return false; // PixiJS terminal has persistent entity objects
  }
  
  hasNativeLOS(): boolean {
    return false; // TerminalRenderer uses game's LOS system
  }
}