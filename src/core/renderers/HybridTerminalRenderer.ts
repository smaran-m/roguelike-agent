import { Tile, Entity, TileVisibility } from '../../types';
import { IRenderer } from './IRenderer';
import { Application, Container, Graphics, Text, BitmapFont, BitmapText } from 'pixi.js';
import { Terminal, Color, FOV } from 'malwoden';
import { Logger } from '../../utils/Logger';
import { CameraSystem } from '../../systems/camera/CameraSystem';
import { AnimationSystem } from '../../systems/animation/AnimationSystem';
import { CharacterManager } from '../../managers/CharacterManager';
import { ResourceManager } from '../../managers/ResourceManager';
import { WorldConfigLoader } from '../../loaders/WorldConfigLoader';

/**
 * Hybrid renderer that combines PixiJS for the main game area with Malwoden terminals for UI
 * - Game area: Full PixiJS with animations, camera transitions, smooth effects
 * - UI areas: Native Malwoden terminals for authentic terminal styling
 * - Layout: Separate HTML containers for organized positioning
 */
export class HybridTerminalRenderer implements IRenderer {
  // Core properties
  tileSize: number = 32;
  gridWidth: number;
  gridHeight: number;
  viewportWidth: number = 25;
  viewportHeight: number = 15;

  // Layout configuration
  private readonly leftPanelWidth = 24;   // Character sheet terminal width
  private readonly rightPanelWidth = 40;  // Combat log terminal width
  private readonly leftPanelHeight = 35;  // Terminal height
  private readonly rightPanelHeight = 35; // Terminal height
  
  // PixiJS game area
  app!: Application;
  tileContainer!: Container;
  entityContainer!: Container;
  cameraSystem!: CameraSystem;
  animationSystem!: AnimationSystem;
  entityTextMap: Map<string, any> = new Map();
  hpTextMap: Map<string, any> = new Map();
  entityPositions: Map<string, {x: number, y: number}> = new Map();
  
  // Tile tracking for FOV updates
  private tileGraphicsMap: Map<string, {bg: Graphics, text: Text, originalColor: number}> = new Map();
  
  // Malwoden FOV system
  private fov?: FOV.PreciseShadowcasting;
  private lightPasses: (pos: {x: number, y: number}) => boolean = () => true;
  private lastFOVCells: Set<string> = new Set();
  
  // Bitmap font configuration
  private useBitmapFont: boolean = true;
  private bitmapFontName: string = 'terminal-font';
  
  // Malwoden UI terminals (can be either RetroTerminal or CanvasTerminal)
  private leftTerminal?: Terminal.RetroTerminal | Terminal.CanvasTerminal;   // Character sheet
  private rightTerminal?: Terminal.RetroTerminal | Terminal.CanvasTerminal;  // Combat log
  
  // HTML containers
  private mainContainer?: HTMLElement;
  private leftPanel?: HTMLElement;
  private gamePanel?: HTMLElement;
  private rightPanel?: HTMLElement;
  
  // UI state
  private messages: string[] = [];
  private currentPlayer?: Entity;
  private uiNeedsRedraw = true;
  
  // PixiJS compatibility
  characterSheet?: any = null;

  constructor(width: number, height: number) {
    this.gridWidth = width;
    this.gridHeight = height;
    
    this.initializeContainers();
    this.initializeBitmapFont();
    this.initializePixiGameArea();
    this.initializeMalwodenUI();
    this.initializeFOV();
    this.initializeSystems();
  }

  private initializeContainers() {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
      Logger.error('No game-container found for HybridTerminalRenderer');
      return;
    }
    
    // Clear existing content
    gameContainer.innerHTML = '';
    
    // Create main flex container
    this.mainContainer = document.createElement('div');
    this.mainContainer.style.cssText = `
      display: flex;
      background: #000;
      font-family: 'Courier New', monospace;
      height: 100vh;
      overflow: hidden;
    `;
    
    // Left panel for character sheet (Malwoden terminal)
    this.leftPanel = document.createElement('div');
    this.leftPanel.id = 'character-sheet-terminal';
    this.leftPanel.style.cssText = `
      width: ${this.leftPanelWidth * 12}px;
      background: #000;
      border-right: 2px solid #444;
    `;
    
    // Center panel for PixiJS game area
    this.gamePanel = document.createElement('div');
    this.gamePanel.id = 'pixi-game-area';
    this.gamePanel.style.cssText = `
      flex: 1;
      background: #000;
      position: relative;
    `;
    
    // Right panel for combat log (Malwoden terminal)
    this.rightPanel = document.createElement('div');
    this.rightPanel.id = 'combat-log-terminal';
    this.rightPanel.style.cssText = `
      width: ${this.rightPanelWidth * 12}px;
      background: #000;
      border-left: 2px solid #444;
    `;
    
    // Assemble layout
    this.mainContainer.appendChild(this.leftPanel);
    this.mainContainer.appendChild(this.gamePanel);
    this.mainContainer.appendChild(this.rightPanel);
    gameContainer.appendChild(this.mainContainer);
    
    Logger.debug('Hybrid renderer containers initialized');
  }

  private initializeBitmapFont() {
    // Use Malwoden's approach - load bitmap font from external image file
    Logger.debug('Using Malwoden-style bitmap font approach');
    
    // For now, disable PixiJS bitmap fonts and rely on Malwoden's RetroTerminal approach
    // This is much more reliable and uses actual bitmap font files
    this.useBitmapFont = false;
    
    // The RetroTerminal instances (when created) will handle their own bitmap fonts
    // using proper font image files loaded asynchronously
    Logger.debug('Bitmap font rendering will be handled by Malwoden RetroTerminal instances');
  }

  private initializePixiGameArea() {
    if (!this.gamePanel) return;
    
    // Create PixiJS application for game area only
    this.app = new Application({
      width: this.viewportWidth * this.tileSize,
      height: this.viewportHeight * this.tileSize,
      backgroundColor: 0x000000,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    
    // Layer containers
    this.tileContainer = new Container();
    this.entityContainer = new Container();
    
    this.app.stage.addChild(this.tileContainer);
    this.app.stage.addChild(this.entityContainer);
    
    // Add to game panel
    this.gamePanel.appendChild(this.app.view as HTMLCanvasElement);
    
    Logger.debug('PixiJS game area initialized');
  }

  private initializeMalwodenUI() {
    // Re-enable Malwoden terminals with proper bitmap font support
    Logger.debug('Initializing Malwoden UI terminals with RetroTerminal bitmap fonts');
    this.initializeCharacterSheetTerminal();
    this.initializeCombatLogTerminal();
  }

  private initializeCharacterSheetTerminal() {
    if (!this.leftPanel) return;
    
    try {
      // Use RetroTerminal with the existing bitmap font
      this.leftTerminal = new Terminal.RetroTerminal({
        width: this.leftPanelWidth,
        height: this.leftPanelHeight,
        foreColor: Color.White,
        backColor: Color.Black,
        charWidth: 16,
        charHeight: 16,
        imageURL: '/fonts/agm_16x16.png',
        mountNode: this.leftPanel
      });
      
      Logger.debug('Character sheet terminal initialized with RetroTerminal and bitmap font');
    } catch (error) {
      Logger.error('Error initializing character sheet terminal:', error);
      
      // Fallback to CanvasTerminal if RetroTerminal fails
      try {
        this.leftTerminal = new Terminal.CanvasTerminal({
          width: this.leftPanelWidth,
          height: this.leftPanelHeight,
          foreColor: Color.White,
          backColor: Color.Black,
          font: new Terminal.Font('Courier New, monospace', 14),
          mountNode: this.leftPanel
        });
        Logger.debug('Fallback: Character sheet terminal initialized with CanvasTerminal');
      } catch (fallbackError) {
        Logger.error('Error initializing fallback terminal:', fallbackError);
      }
    }
  }

  private initializeCombatLogTerminal() {
    if (!this.rightPanel) return;
    
    try {
      // Use RetroTerminal with the existing bitmap font
      this.rightTerminal = new Terminal.RetroTerminal({
        width: this.rightPanelWidth,
        height: this.rightPanelHeight,
        foreColor: Color.White,
        backColor: Color.Black,
        charWidth: 16,
        charHeight: 16,
        imageURL: '/fonts/agm_16x16.png',
        mountNode: this.rightPanel
      });
      
      Logger.debug('Combat log terminal initialized with RetroTerminal and bitmap font');
    } catch (error) {
      Logger.error('Error initializing combat log terminal:', error);
      
      // Fallback to CanvasTerminal if RetroTerminal fails
      try {
        this.rightTerminal = new Terminal.CanvasTerminal({
          width: this.rightPanelWidth,
          height: this.rightPanelHeight,
          foreColor: Color.White,
          backColor: Color.Black,
          font: new Terminal.Font('Courier New, monospace', 14),
          mountNode: this.rightPanel
        });
        Logger.debug('Fallback: Combat log terminal initialized with CanvasTerminal');
      } catch (fallbackError) {
        Logger.error('Error initializing fallback terminal:', fallbackError);
      }
    }
  }

  private initializeFOV() {
    try {
      // For now, let's disable Malwoden FOV to avoid blocking issues
      // We can re-enable this once we confirm the basic functionality works
      Logger.debug('Malwoden FOV temporarily disabled for debugging');
      this.fov = undefined;
      
      /* TODO: Re-enable Malwoden FOV once movement issue is resolved
      this.fov = new FOV.PreciseShadowcasting({
        lightPasses: this.lightPasses,
        topology: "eight",
        returnAll: false,
        cartesianRange: true
      });
      Logger.debug('Malwoden FOV initialized with PreciseShadowcasting');
      */
    } catch (error) {
      Logger.error('Error initializing FOV:', error);
      this.fov = undefined;
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

  private initializeSystems() {
    // Initialize animation system first
    this.animationSystem = new AnimationSystem(
      this.tileSize,
      this.entityContainer,
      this.entityTextMap,
      this.hpTextMap
    );
    
    // Initialize camera system for PixiJS area
    this.cameraSystem = new CameraSystem(
      this.gridWidth,
      this.gridHeight,
      this.viewportWidth,
      this.viewportHeight,
      this.animationSystem
    );
    
    Logger.debug('Hybrid renderer systems initialized');
  }

  // Camera getters
  get cameraX(): number {
    return this.cameraSystem.x;
  }

  get cameraY(): number {
    return this.cameraSystem.y;
  }

  // Rendering methods - PixiJS for game, Malwoden for UI
  renderTile(worldX: number, worldY: number, tile: Tile, visibility: TileVisibility) {
    // Render tiles in PixiJS game area (same as PixiRenderer)
    const screenX = worldX - this.cameraX;
    const screenY = worldY - this.cameraY;
    
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return;
    }
    
    if (!visibility.explored) {
      return;
    }
    
    // Use PixiJS Graphics for tiles with full visual effects
    const bg = new Graphics();
    bg.beginFill(tile.bgColor);
    bg.alpha = visibility.visible ? 1.0 : 0.6;
    bg.drawRect(
      screenX * this.tileSize,
      screenY * this.tileSize,
      this.tileSize,
      this.tileSize
    );
    bg.endFill();
    this.tileContainer.addChild(bg);
    
    // Convert to ASCII and use bitmap/terminal font
    const asciiChar = this.tileToASCII(tile);
    const text = this.createTerminalText(asciiChar, visibility.visible ? tile.fgColor : this.darkenColor(tile.fgColor, 0.4));
    
    text.x = screenX * this.tileSize + this.tileSize / 2;
    text.y = screenY * this.tileSize + this.tileSize / 2;
    text.anchor.set(0.5);
    text.alpha = visibility.visible ? 1.0 : 0.6;
    
    this.tileContainer.addChild(text);
    
    // Store tile graphics for FOV updates
    const key = `${worldX},${worldY}`;
    this.tileGraphicsMap.set(key, { bg, text, originalColor: tile.fgColor });
  }

  renderEntity(entity: Entity, visible: boolean) {
    if (!visible) return;
    
    // Store current player for UI updates
    if (entity.isPlayer) {
      this.currentPlayer = entity;
      this.uiNeedsRedraw = true;
    }
    
    // Render entity in PixiJS with full animation support (same as PixiRenderer)
    const screenX = entity.x - this.cameraX;
    const screenY = entity.y - this.cameraY;
    
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return;
    }
    
    // Convert to ASCII and use bitmap/terminal font
    const asciiChar = this.entityToASCII(entity);
    const text = this.createTerminalText(asciiChar, entity.color);
    
    text.x = screenX * this.tileSize + this.tileSize / 2;
    text.y = screenY * this.tileSize + this.tileSize / 2;
    text.anchor.set(0.5);
    
    this.entityTextMap.set(entity.id, text);
    this.entityPositions.set(entity.id, {x: entity.x, y: entity.y});
    this.entityContainer.addChild(text);
    
    // HP display
    if (!entity.isPlayer && entity.stats) {
      const currentHp = ResourceManager.getCurrentValue(entity, 'hp');
      const maxHp = ResourceManager.getMaximumValue(entity, 'hp') || currentHp;
      const hpRatio = currentHp / maxHp;
      const hpColor = hpRatio > 0.5 ? 0x00FF00 : hpRatio > 0.25 ? 0xFFFF00 : 0xFF0000;
      
      const hpText = this.createTerminalText(`${currentHp}/${maxHp}`, hpColor, 12);
      
      hpText.x = screenX * this.tileSize + this.tileSize / 2;
      hpText.y = screenY * this.tileSize + this.tileSize / 2 - 20;
      hpText.anchor.set(0.5);
      
      this.hpTextMap.set(entity.id, hpText);
      this.entityContainer.addChild(hpText);
    }
    
    // Update UI terminals
    if (this.uiNeedsRedraw) {
      this.updateUITerminals();
      this.uiNeedsRedraw = false;
    }
  }

  renderEntityWithVisibility(entity: Entity, distance: number, hasLOS: boolean) {
    // Similar to PixiRenderer implementation but with UI terminal updates
    const screenX = entity.x - this.cameraX;
    const screenY = entity.y - this.cameraY;
    
    const inViewport = screenX >= 0 && screenX < this.viewportWidth && 
                      screenY >= 0 && screenY < this.viewportHeight;
    
    let alpha = 0;
    if (hasLOS) {
      const maxDistance = 8;
      alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
    }
    
    // Store current player for UI updates
    if (entity.isPlayer) {
      this.currentPlayer = entity;
      this.uiNeedsRedraw = true;
    }
    
    // Get or create entity text object (persistent across frames)
    let text = this.entityTextMap.get(entity.id);
    if (!text) {
      // Convert to ASCII and use bitmap/terminal font
      const asciiChar = this.entityToASCII(entity);
      text = this.createTerminalText(asciiChar, entity.color);
      text.anchor.set(0.5);
      
      this.entityTextMap.set(entity.id, text);
      this.entityContainer.addChild(text);
    }
    
    text.x = screenX * this.tileSize + this.tileSize / 2;
    text.y = screenY * this.tileSize + this.tileSize / 2;
    text.alpha = alpha;
    text.visible = (alpha > 0) && inViewport;
    
    this.entityPositions.set(entity.id, {x: entity.x, y: entity.y});
    
    // HP text handling (same as PixiRenderer)
    if (!entity.isPlayer && entity.stats) {
      let hpText = this.hpTextMap.get(entity.id);
      if (!hpText) {
        hpText = this.createTerminalText('', 0x00FF00, 10);
        hpText.anchor.set(0.5);
        this.hpTextMap.set(entity.id, hpText);
        this.entityContainer.addChild(hpText);
      }
      
      const currentHp = ResourceManager.getCurrentValue(entity, 'hp');
      const maxHp = ResourceManager.getMaximumValue(entity, 'hp') || currentHp;
      const hpRatio = currentHp / maxHp;
      const hpColor = hpRatio > 0.5 ? 0x00FF00 : hpRatio > 0.25 ? 0xFFFF00 : 0xFF0000;
      
      hpText.text = `${currentHp}/${maxHp}`;
      
      // Set text color (only Text objects now)
      hpText.style.fill = hpColor;
      hpText.x = screenX * this.tileSize + this.tileSize / 2;
      hpText.y = screenY * this.tileSize + this.tileSize / 2 - 20;
      hpText.alpha = alpha;
      hpText.visible = (alpha > 0) && inViewport;
    }
    
    // Update terminals if needed
    if (this.uiNeedsRedraw) {
      this.updateUITerminals();
      this.uiNeedsRedraw = false;
    }
  }

  renderTileWithVisibility(worldX: number, worldY: number, tile: Tile, distance: number, hasLOS: boolean) {
    // Same as PixiRenderer implementation
    const screenX = worldX - this.cameraX;
    const screenY = worldY - this.cameraY;
    
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return;
    }
    
    let alpha = 1.0;
    let fgColor = tile.fgColor;
    
    if (!hasLOS) {
      alpha = 0.2;
      fgColor = this.darkenColor(fgColor, 0.7);
    } else {
      const maxDistance = 8;
      alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
    }
    
    const bg = new Graphics();
    bg.beginFill(tile.bgColor);
    bg.alpha = alpha;
    bg.drawRect(
      screenX * this.tileSize,
      screenY * this.tileSize,
      this.tileSize,
      this.tileSize
    );
    bg.endFill();
    this.tileContainer.addChild(bg);
    
    // Convert to ASCII and use bitmap/terminal font
    const asciiChar = this.tileToASCII(tile);
    const text = this.createTerminalText(asciiChar, fgColor);
    
    text.x = screenX * this.tileSize + this.tileSize / 2;
    text.y = screenY * this.tileSize + this.tileSize / 2;
    text.anchor.set(0.5);
    text.alpha = alpha;
    
    this.tileContainer.addChild(text);
    
    // Store tile graphics for FOV updates
    const key = `${worldX},${worldY}`;
    this.tileGraphicsMap.set(key, { bg, text, originalColor: tile.fgColor });
  }

  // Terminal UI update methods
  private updateUITerminals() {
    // Skip UI updates if terminals are disabled
    if (!this.leftTerminal || !this.rightTerminal) {
      Logger.debug('Skipping UI terminal updates - terminals not initialized');
      return;
    }
    this.updateCharacterSheetTerminal();
    this.updateCombatLogTerminal();
  }

  private updateCharacterSheetTerminal() {
    if (!this.leftTerminal || !this.currentPlayer) return;
    
    this.leftTerminal.clear();
    
    const player = this.currentPlayer;
    let y = 0;
    
    // Title
    this.leftTerminal.writeAt({x: 0, y: y++}, "CHARACTER", Color.White);
    y++; // Skip line
    
    // Portrait
    this.leftTerminal.writeAt({x: 10, y: y++}, "@", Color.Yellow);
    y++; // Skip line
    
    // Name and info
    this.leftTerminal.writeAt({x: 0, y: y++}, `Name: ${player.name}`, Color.White);
    
    // Character class info
    const characterManager = CharacterManager.getInstance();
    const currentCharacter = characterManager.getCurrentCharacter();
    if (currentCharacter) {
      this.leftTerminal.writeAt({x: 0, y: y++}, `Class: ${currentCharacter.className}`, Color.Gray);
      this.leftTerminal.writeAt({x: 0, y: y++}, `Level: ${currentCharacter.level}`, Color.Yellow);
      this.leftTerminal.writeAt({x: 0, y: y++}, `XP: ${currentCharacter.experience}`, Color.Gray);
      y++; // Skip line
    }
    
    // Resources
    y = this.renderCharacterResources(y, player);
    y++; // Skip line
    
    // Stats
    this.leftTerminal.writeAt({x: 0, y: y++}, "STATS", Color.White);
    this.leftTerminal.writeAt({x: 0, y: y++}, `AC: ${player.stats.ac}`, Color.Cyan);
    this.leftTerminal.writeAt({x: 0, y: y++}, `STR: ${player.stats.strength} (${this.getModifier(player.stats.strength)})`, Color.White);
    this.leftTerminal.writeAt({x: 0, y: y++}, `DEX: ${player.stats.dexterity} (${this.getModifier(player.stats.dexterity)})`, Color.White);
    this.leftTerminal.writeAt({x: 0, y: y++}, `CON: ${player.stats.constitution} (${this.getModifier(player.stats.constitution)})`, Color.White);
    this.leftTerminal.writeAt({x: 0, y: y++}, `INT: ${player.stats.intelligence} (${this.getModifier(player.stats.intelligence)})`, Color.White);
    this.leftTerminal.writeAt({x: 0, y: y++}, `WIS: ${player.stats.wisdom} (${this.getModifier(player.stats.wisdom)})`, Color.White);
    this.leftTerminal.writeAt({x: 0, y: y++}, `CHA: ${player.stats.charisma} (${this.getModifier(player.stats.charisma)})`, Color.White);
    
    // Bottom corner: position
    if (this.currentPlayer) {
      const posText = `(${this.currentPlayer.x}, ${this.currentPlayer.y})`;
      this.leftTerminal.writeAt({x: this.leftPanelWidth - posText.length, y: this.leftPanelHeight - 1}, posText, Color.Gray);
    }
  }

  private renderCharacterResources(startY: number, player: Entity): number {
    if (!this.leftTerminal) return startY;
    
    let y = startY;
    const availableResources = WorldConfigLoader.getAvailableResourceIds();
    
    availableResources.forEach((resourceId: string) => {
      if (ResourceManager.hasResource(player, resourceId)) {
        const resourceDef = WorldConfigLoader.getResourceDefinition(resourceId);
        const displayName = resourceDef?.displayName || resourceId.toUpperCase();
        
        const current = ResourceManager.getCurrentValue(player, resourceId);
        const max = ResourceManager.getMaximumValue(player, resourceId) || current;
        const barSize = 8;
        const barDisplay = this.createASCIIBar(current, max, barSize);
        
        const colorValue = ResourceManager.getResourceColor(player, resourceId);
        const color = this.numberToMalwodenColor(colorValue);
        
        this.leftTerminal!.writeAt({x: 0, y}, `${displayName}:`, Color.White);
        this.leftTerminal!.writeAt({x: 0, y: y + 1}, `${barDisplay} ${current}/${max}`, color);
        y += 2;
      }
    });
    
    return y;
  }

  private updateCombatLogTerminal() {
    if (!this.rightTerminal) return;
    
    this.rightTerminal.clear();
    
    let y = 0;
    
    // Title
    this.rightTerminal.writeAt({x: 0, y: y++}, "COMBAT LOG", Color.White);
    y++; // Skip line
    
    // Display recent messages
    const maxLines = this.rightPanelHeight - 5; // Leave room for title and controls
    const messagesToShow = this.messages.slice(-maxLines);
    
    messagesToShow.forEach((message) => {
      const wrappedLines = this.wrapText(message, this.rightPanelWidth - 2);
      wrappedLines.forEach((line) => {
        if (y < this.rightPanelHeight - 2) {
          this.rightTerminal!.writeAt({x: 0, y: y++}, line, Color.White);
        }
      });
    });
    
    // Bottom: controls
    const controlsText = "WASD: Move  Space: Attack";
    this.rightTerminal.writeAt({x: 0, y: this.rightPanelHeight - 1}, controlsText, Color.Gray);
  }

  // Helper method to create terminal text with proper monospace font
  private createTerminalText(text: string, color: number, fontSize?: number): Text {
    const actualFontSize = fontSize || this.tileSize * 0.8;
    
    // Always use Text with a proper monospace font for consistency
    // This avoids bitmap font complexity while maintaining terminal aesthetics
    return new Text(text, {
      fontFamily: '"Courier New", "Lucida Console", "Monaco", monospace',
      fontSize: actualFontSize,
      fill: color,
      align: 'center',
      // Add some terminal-like styling
      fontWeight: 'normal',
      letterSpacing: 0
    });
  }

  // ASCII conversion methods for terminal aesthetics
  private tileToASCII(tile: Tile): string {
    // Convert tile emojis/Unicode to ASCII for terminal look
    switch (tile.glyph) {
      case '🟫': return '#';  // Wall
      case '⬛': return '.';  // Floor  
      case '🟩': return '.';  // Grass
      case '🟦': return '~';  // Water
      case '🟧': return '+';  // Door
      case '⭐': return '*';  // Special
      case '🔥': return '^';  // Fire
      case '❄️': return '*';  // Ice
      case '⚡': return '%';  // Lightning
      case '🌪️': return '&';  // Wind
      default:
        // For any other character, try to get ASCII equivalent
        const charCode = tile.glyph.charCodeAt(0);
        if (charCode <= 127) {
          return tile.glyph; // Already ASCII
        }
        return '.'; // Default fallback
    }
  }

  private entityToASCII(entity: Entity): string {
    // Convert entity emojis to ASCII characters
    switch (entity.glyph) {
      case '🤺': return '@';  // Player (fencer)
      case '🧙': return '@';  // Player (wizard)
      case '👺': return 'o';  // Goblin
      case '🦇': return 'b';  // Bat
      case '🐀': return 'r';  // Rat
      case '🐺': return 'w';  // Wolf
      case '🐻': return 'B';  // Bear
      case '🐉': return 'D';  // Dragon
      case '👻': return 'g';  // Ghost
      case '💀': return 's';  // Skeleton
      case '🧟': return 'z';  // Zombie
      case '🕷️': return 's';  // Spider
      case '🐍': return 'S';  // Snake
      case '🦂': return 'a';  // Scorpion
      case '⚔️': return '/';  // Sword
      case '🛡️': return ']';  // Shield
      case '💎': return '*';  // Gem
      case '💰': return '$';  // Gold
      case '🧪': return '!';  // Potion
      case '📜': return '?';  // Scroll
      case '🗝️': return '=';  // Key
      case '🚪': return '+';  // Door
      case '📦': return '#';  // Chest
      default:
        // For ASCII characters, return as-is
        const charCode = entity.glyph.charCodeAt(0);
        if (charCode <= 127) {
          return entity.glyph;
        }
        // For unknown entities, use a generic character
        return entity.isPlayer ? '@' : 'M'; // M for Monster
    }
  }

  // Utility methods
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

  // PixiJS methods with full animation support
  clearTiles() {
    this.tileContainer.removeChildren();
    this.tileGraphicsMap.clear();
  }

  clearEntities() {
    this.entityContainer.removeChildren();
    
    for (const text of this.entityTextMap.values()) {
      text.destroy();
    }
    for (const text of this.hpTextMap.values()) {
      text.destroy();
    }
    
    this.entityTextMap.clear();
    this.hpTextMap.clear();
    this.entityPositions.clear();
  }

  removeEntity(entityId: string) {
    const text = this.entityTextMap.get(entityId);
    const hpText = this.hpTextMap.get(entityId);
    
    if (text) {
      this.entityContainer.removeChild(text);
      text.destroy();
      this.entityTextMap.delete(entityId);
    }
    
    if (hpText) {
      this.entityContainer.removeChild(hpText);
      hpText.destroy();
      this.hpTextMap.delete(entityId);
    }
    
    this.entityPositions.delete(entityId);
  }

  updateEntityPositions() {
    for (const [entityId, worldPos] of this.entityPositions.entries()) {
      const text = this.entityTextMap.get(entityId);
      const hpText = this.hpTextMap.get(entityId);
      
      if (text) {
        const screenX = worldPos.x - this.cameraX;
        const screenY = worldPos.y - this.cameraY;
        
        text.x = screenX * this.tileSize + this.tileSize / 2;
        text.y = screenY * this.tileSize + this.tileSize / 2;
        
        if (hpText) {
          hpText.x = screenX * this.tileSize + this.tileSize / 2;
          hpText.y = screenY * this.tileSize + this.tileSize / 2 - 20;
        }
      }
    }
  }

  // Full animation support from PixiRenderer
  animateMove(entity: Entity, _fromX: number, _fromY: number, toX: number, toY: number) {
    // Simple animation for hybrid renderer
    const text = this.entityTextMap.get(entity.id);
    const hpText = this.hpTextMap.get(entity.id);
    if (!text) return;
    
    const targetX = (toX - this.cameraX) * this.tileSize + this.tileSize / 2;
    const targetY = (toY - this.cameraY) * this.tileSize + this.tileSize / 2;
    
    // Simple position update - could be enhanced with GSAP later
    text.x = targetX;
    text.y = targetY;
    
    if (hpText) {
      hpText.x = targetX;
      hpText.y = targetY - 20;
    }
  }

  shakeEntity(entity: Entity) {
    this.animationSystem.shakeEntity(entity);
  }

  nudgeEntity(entity: Entity, targetX: number, targetY: number) {
    this.animationSystem.nudgeEntity(entity, targetX, targetY);
  }

  showFloatingDamage(entity: Entity, damage: number) {
    this.animationSystem.showFloatingDamage(entity, damage);
  }

  // Camera methods with smooth transitions
  updateCameraForPlayer(entity: Entity): boolean {
    const cameraMoved = this.cameraSystem.updateForPlayer(entity);
    if (cameraMoved) {
      this.updateEntityPositions();
    }
    return cameraMoved;
  }

  centerCameraOn(entity: Entity) {
    this.cameraSystem.setCenterOnEntity(entity);
  }

  worldToScreen(worldX: number, worldY: number): {x: number, y: number} {
    return this.cameraSystem.worldToScreen(worldX, worldY);
  }

  screenToWorld(screenX: number, screenY: number): {x: number, y: number} {
    return this.cameraSystem.screenToWorld(screenX, screenY);
  }

  // UI methods
  addMessage(message: string) {
    this.messages.push(message);
    
    if (this.messages.length > 30) {
      this.messages = this.messages.slice(-30);
    }
    
    this.uiNeedsRedraw = true;
    Logger.debug(`Hybrid renderer message added: ${message}`);
  }

  updatePositionText(x: number, y: number) {
    if (this.currentPlayer) {
      this.currentPlayer.x = x;
      this.currentPlayer.y = y;
      this.uiNeedsRedraw = true;
    }
  }

  updateVisibilityAlpha(playerX: number, playerY: number, tileMap: any, lineOfSight: any) {
    // Use Malwoden's native FOV system if available
    if (this.fov) {
      this.updateVisibilityWithMalwodenFOV(playerX, playerY);
    } else {
      this.updateVisibilityWithGameFOV(playerX, playerY, tileMap, lineOfSight);
    }
  }

  private updateVisibilityWithMalwodenFOV(playerX: number, playerY: number) {
    if (!this.fov) return;
    
    // Clear previous FOV cells
    this.lastFOVCells.clear();
    
    try {
      // Use malwoden's native FOV calculation
      this.fov.calculateCallback(
        {x: Math.round(playerX), y: Math.round(playerY)}, 
        8, // FOV radius
        (pos, _range, _visibility) => {
          // Add visible cells to our tracking set
          const cellKey = `${pos.x},${pos.y}`;
          this.lastFOVCells.add(cellKey);
        }
      );
      
      // Update tile graphics based on Malwoden FOV results
      this.tileGraphicsMap.forEach((graphics, key) => {
        const [x, y] = key.split(',').map(Number);
        const isVisible = this.lastFOVCells.has(key);
        const distance = Math.sqrt((x - playerX) ** 2 + (y - playerY) ** 2);
        
        let alpha = 1.0;
        let fgColor = graphics.originalColor;
        
        if (!isVisible) {
          alpha = 0.2;
          fgColor = this.darkenColor(graphics.originalColor, 0.7);
        } else {
          fgColor = graphics.originalColor;
          const maxDistance = 8;
          alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
        }
        
        graphics.bg.alpha = alpha;
        graphics.text.alpha = alpha;
        graphics.text.style.fill = fgColor;
      });
      
      // Update entities with Malwoden FOV
      this.updateEntitiesWithMalwodenFOV(playerX, playerY);
      
    } catch (error) {
      Logger.error('Error computing Malwoden FOV:', error);
    }
  }

  private updateVisibilityWithGameFOV(playerX: number, playerY: number, tileMap: any, lineOfSight: any) {
    // Fallback to original game FOV system
    const safePlayerX = Math.max(0, Math.min(tileMap.width - 1, Math.round(playerX)));
    const safePlayerY = Math.max(0, Math.min(tileMap.height - 1, Math.round(playerY)));
    
    // Update tile alphas and colors based on current player position
    this.tileGraphicsMap.forEach((graphics, key) => {
      const [x, y] = key.split(',').map(Number);
      
      if (x < 0 || x >= tileMap.width || y < 0 || y >= tileMap.height) {
        return;
      }
      
      const distance = Math.sqrt((x - safePlayerX) ** 2 + (y - safePlayerY) ** 2);
      const hasLOS = lineOfSight.hasLineOfSight(tileMap, safePlayerX, safePlayerY, x, y);
      
      let alpha = 1.0;
      let fgColor = graphics.originalColor;
      
      if (!hasLOS) {
        alpha = 0.2;
        fgColor = this.darkenColor(graphics.originalColor, 0.7);
      } else {
        fgColor = graphics.originalColor;
        const maxDistance = 8;
        alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
      }
      
      graphics.bg.alpha = alpha;
      graphics.text.alpha = alpha;
      graphics.text.style.fill = fgColor;
    });
    
    // Update entity alphas
    this.entityTextMap.forEach((entityText, entityId) => {
      const hpText = this.hpTextMap.get(entityId);
      const entityPos = this.entityPositions.get(entityId);
      
      if (!entityPos) return;
      
      if (entityId === 'player') {
        entityText.alpha = 1.0;
        entityText.visible = true;
        if (hpText) {
          hpText.alpha = 1.0;
          hpText.visible = true;
        }
        return;
      }
      
      if (entityPos.x < 0 || entityPos.x >= tileMap.width || entityPos.y < 0 || entityPos.y >= tileMap.height) {
        return;
      }
      
      const screenX = entityPos.x - this.cameraX;
      const screenY = entityPos.y - this.cameraY;
      const inViewport = screenX >= 0 && screenX < this.viewportWidth && 
                        screenY >= 0 && screenY < this.viewportHeight;
      
      const distance = Math.sqrt((entityPos.x - safePlayerX) ** 2 + (entityPos.y - safePlayerY) ** 2);
      const hasLOS = lineOfSight.hasLineOfSight(tileMap, safePlayerX, safePlayerY, entityPos.x, entityPos.y);
      
      let alpha = 0;
      if (hasLOS) {
        const maxDistance = 8;
        alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
      }
      
      entityText.alpha = alpha;
      entityText.visible = (alpha > 0) && inViewport;
      
      if (hpText) {
        hpText.alpha = alpha;
        hpText.visible = (alpha > 0) && inViewport;
      }
    });
  }

  private updateEntitiesWithMalwodenFOV(playerX: number, playerY: number) {
    this.entityTextMap.forEach((entityText, entityId) => {
      const hpText = this.hpTextMap.get(entityId);
      const entityPos = this.entityPositions.get(entityId);
      
      if (!entityPos) return;
      
      if (entityId === 'player') {
        entityText.alpha = 1.0;
        entityText.visible = true;
        if (hpText) {
          hpText.alpha = 1.0;
          hpText.visible = true;
        }
        return;
      }
      
      const screenX = entityPos.x - this.cameraX;
      const screenY = entityPos.y - this.cameraY;
      const inViewport = screenX >= 0 && screenX < this.viewportWidth && 
                        screenY >= 0 && screenY < this.viewportHeight;
      
      const cellKey = `${entityPos.x},${entityPos.y}`;
      const isVisible = this.lastFOVCells.has(cellKey);
      
      let alpha = 0;
      if (isVisible) {
        const distance = Math.sqrt((entityPos.x - playerX) ** 2 + (entityPos.y - playerY) ** 2);
        const maxDistance = 8;
        alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
      }
      
      entityText.alpha = alpha;
      entityText.visible = (alpha > 0) && inViewport;
      
      if (hpText) {
        hpText.alpha = alpha;
        hpText.visible = (alpha > 0) && inViewport;
      }
    });
  }

  // Check if a cell is currently visible in FOV (Malwoden compatibility)
  isCellVisible(x: number, y: number): boolean {
    const cellKey = `${x},${y}`;
    return this.lastFOVCells.has(cellKey);
  }

  darkenColor(color: number, factor: number): number {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);
    
    return (newR << 16) | (newG << 8) | newB;
  }

  needsEntityClearingEachFrame(): boolean {
    return false; // PixiJS entities persist across frames
  }

  hasNativeLOS(): boolean {
    return this.fov !== undefined; // Uses Malwoden's FOV if available
  }
}