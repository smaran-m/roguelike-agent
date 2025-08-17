import { Tile, Entity, TileVisibility } from '../../types';
import { IRenderer } from './IRenderer';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { FOV } from 'malwoden';
import { Logger } from '../../utils/Logger';
import { getFontFamily } from '../../config/fonts';
import { CameraSystem } from '../../systems/camera/CameraSystem';
import { AnimationSystem } from '../../systems/animation/AnimationSystem';
import { CharacterManager } from '../../managers/CharacterManager';
import { ResourceManager } from '../../managers/ResourceManager';
import { WorldConfigLoader } from '../../loaders/WorldConfigLoader';

/**
 * Hybrid renderer that combines PixiJS for the main game area with Malwoden terminals for UI
 * - Game area: Full PixiJS with animations, camera transitions, smooth effects
 * - UI areas: Native Malwoden terminals for authentic terminal styling1
 * - Layout: Separate HTML containers for organized positioning
 */
export class HybridTerminalRenderer implements IRenderer {
  // Core properties
  tileSize: number = 32;
  gridWidth: number;
  gridHeight: number;
  viewportWidth: number = 20;
  viewportHeight: number = 20;

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
  
  // Font configuration (using TTF fonts now)
  // Removed bitmap font configuration - using Perfect DOS VGA 437 TTF fonts instead
  
  // HTML containers
  private mainContainer?: HTMLElement;
  private leftPanel?: HTMLElement;
  private gamePanel?: HTMLElement;
  private rightPanel?: HTMLElement;
  
  // UI state
  private messages: string[] = [];
  private currentPlayer?: Entity;
  private uiNeedsRedraw = true;
  private hasRenderedOnce = false;
  private lastMessageCount = 0;
  
  // PixiJS compatibility
  characterSheet?: any = null;

  constructor(width: number, height: number) {
    Logger.debug('HYBRID: HybridTerminalRenderer constructor called');
    this.gridWidth = width;
    this.gridHeight = height;
    
    this.initializeContainers();
    this.initializePixiGameArea();
    this.initializeMalwodenUI();
    this.initializeFOV();
    this.initializeSystems();
    
    // Mark UI as needing redraw for first render
    this.uiNeedsRedraw = true;
  }

  private initializeContainers() {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
      Logger.error('No game-container found for HybridTerminalRenderer');
      return;
    }
    
    // Clear existing content
    gameContainer.innerHTML = '';
    
    // Create wrapper for vertical centering
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      background: #000;
    `;
    
    // Create main flex container for the game interface
    this.mainContainer = document.createElement('div');
    this.mainContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      background: #000;
      font-family: 'Courier New', monospace;
      border: 2px solid #444;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
      max-width: 1400px;
      max-height: 800px;
      overflow: hidden;
    `;
    
    wrapper.appendChild(this.mainContainer);
    gameContainer.appendChild(wrapper);
    
    // Create middle container for main panels
    const middleContainer = document.createElement('div');
    middleContainer.style.cssText = `
      display: flex;
      flex-direction: row;
      flex: 1;
    `;
    
    // Left panel for character sheet
    this.leftPanel = document.createElement('div');
    this.leftPanel.id = 'character-sheet-terminal';
    this.leftPanel.style.cssText = `
      width: 300px;
      height: 620px;
      background: #000;
      border-right: 2px solid #444;
      overflow-y: auto;
    `;
    
    // Center panel for PixiJS game area
    this.gamePanel = document.createElement('div');
    this.gamePanel.id = 'pixi-game-area';
    this.gamePanel.style.cssText = `
      width: ${this.viewportWidth * this.tileSize}px;
      height: ${this.viewportHeight * this.tileSize}px;
      background: #000;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    `;
    
    // Right panel for combat log
    this.rightPanel = document.createElement('div');
    this.rightPanel.id = 'combat-log-terminal';
    this.rightPanel.style.cssText = `
      width: 400px;
      height: 620px;
      background: #000;
      border-left: 2px solid #444;
      overflow-y: auto;
    `;
    
    // Bottom UI area for position and controls
    const bottomUI = document.createElement('div');
    bottomUI.id = 'bottom-ui';
    bottomUI.style.cssText = `
      height: 40px;
      background: #000;
      border-top: 2px solid #444;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      color: #cccccc;
      font-family: var(--font-family);
      font-size: var(--font-size-medium);
    `;
    
    // Assemble layout
    middleContainer.appendChild(this.leftPanel);
    middleContainer.appendChild(this.gamePanel);
    middleContainer.appendChild(this.rightPanel);
    
    this.mainContainer.appendChild(middleContainer);
    this.mainContainer.appendChild(bottomUI);
    
    Logger.debug('Hybrid renderer containers initialized');
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
    // Initialize UI panels with HTML/CSS instead of Malwoden terminals for better text rendering
    Logger.debug('Initializing UI panels with HTML/CSS for better text control');
    this.setupHTMLUIPanel(this.leftPanel!, 'character-sheet');
    this.setupHTMLUIPanel(this.rightPanel!, 'combat-log');
    
    // We'll skip Malwoden terminals and use direct HTML rendering for UI text
    // This avoids the 1-character-per-cell spacing issue
  }

  private setupHTMLUIPanel(panel: HTMLElement, panelType: string) {
    panel.style.cssText += `
      color: #ffffff;
      font-family: var(--font-family), monospace;
      font-size: 14px;
      line-height: 1.2;
      padding: 10px;
      overflow-y: auto;
      white-space: pre-wrap;
    `;
    
    // Create content container
    const content = document.createElement('div');
    content.id = `${panelType}-content`;
    content.style.cssText = `
      height: 100%;
      font-family: inherit;
      color: inherit;
      position: relative;
    `;
    
    panel.appendChild(content);
    Logger.debug(`HTML UI panel setup complete for ${panelType}`);
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
    
    // Give animation system access to tile graphics map
    this.animationSystem.setTileGraphicsMap(this.tileGraphicsMap);
    
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
    
      // Use malwoden-style drawGlyph approach for consistent terminal rendering
    const asciiChar = this.tileToASCII(tile);
    const text = this.createMalwodenStyleText(asciiChar, visibility.visible ? tile.fgColor : this.darkenColor(tile.fgColor, 0.4));
    
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
      
      // Force immediate render to update player stats
      setTimeout(() => {
        this.render();
      }, 0);
    }
    
    // Render entity in PixiJS with full animation support (same as PixiRenderer)
    const screenX = entity.x - this.cameraX;
    const screenY = entity.y - this.cameraY;
    
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return;
    }
    
    // Convert to ASCII and use malwoden-style terminal font
    const asciiChar = this.entityToASCII(entity);
    const text = this.createMalwodenStyleText(asciiChar, entity.color);
    
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
      
      const hpText = this.createMalwodenStyleText(`${currentHp}/${maxHp}`, hpColor, 12);
      
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
      
      // Force immediate render to update player stats
      setTimeout(() => {
        this.render();
      }, 0);
    }
    
    // Get or create entity text object (persistent across frames)
    let text = this.entityTextMap.get(entity.id);
    if (!text) {
      // Convert to ASCII and use malwoden-style terminal font
      const asciiChar = this.entityToASCII(entity);
      text = this.createMalwodenStyleText(asciiChar, entity.color);
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
        hpText = this.createMalwodenStyleText('', 0x00FF00, 10);
        hpText.anchor.set(0.5);
        this.hpTextMap.set(entity.id, hpText);
        this.entityContainer.addChild(hpText);
      }
      
      const currentHp = ResourceManager.getCurrentValue(entity, 'hp');
      const maxHp = ResourceManager.getMaximumValue(entity, 'hp') || currentHp;
      const hpRatio = currentHp / maxHp;
      const hpColor = hpRatio > 0.5 ? 0x00FF00 : hpRatio > 0.25 ? 0xFFFF00 : 0xFF0000;
      
      //hpText.text = `${currentHp}/${maxHp}`;
      
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
    
    // Update character sheet and position text if this is the player (same as PixiRenderer)
    if (entity.isPlayer) {
      // We don't have characterSheet.updateResourcesOnly, but the UI is already updated above
      this.updatePositionText(entity.x, entity.y);
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
    
    // Convert to ASCII and use malwoden-style terminal font
    const asciiChar = this.tileToASCII(tile);
    const text = this.createMalwodenStyleText(asciiChar, fgColor);
    
    text.x = screenX * this.tileSize + this.tileSize / 2;
    text.y = screenY * this.tileSize + this.tileSize / 2;
    text.anchor.set(0.5);
    text.alpha = alpha;
    
    this.tileContainer.addChild(text);
    
    // Store tile graphics for FOV updates
    const key = `${worldX},${worldY}`;
    this.tileGraphicsMap.set(key, { bg, text, originalColor: tile.fgColor });
  }

  // HTML UI update methods
  private updateUITerminals() {
    Logger.debug('Updating HTML UI panels...');
    this.updateCharacterSheetHTML();
    this.updateCombatLogHTML();
    this.updateBottomUI();
    Logger.debug('HTML UI panels updated');
  }

  private updateCharacterSheetHTML() {
    const content = document.getElementById('character-sheet-content');
    if (!content || !this.currentPlayer) {
      Logger.debug('No character sheet content container or current player');
      return;
    }

    const player = this.currentPlayer;
    let html = '';
    
    // Title
    html += '<span style="color: #ffffff; font-weight: bold;">CHARACTER</span>\n\n';
    
    // Portrait
    html += '<span style="color: #ffff00;">@</span> (Player)\n\n';
    
    // Name and info
    html += `<span style="color: #ffffff;">Name: ${player.name}</span>\n`;
    
    // Character class info
    const characterManager = CharacterManager.getInstance();
    const currentCharacter = characterManager.getCurrentCharacter();
    if (currentCharacter) {
      html += `<span style="color: #cccccc;">Class: ${currentCharacter.className}</span>\n`;
      html += `<span style="color: #ffff00;">Level: ${currentCharacter.level}</span>\n`;
      html += `<span style="color: #cccccc;">XP: ${currentCharacter.experience}</span>\n\n`;
    }
    
    // Resources
    html += this.renderCharacterResourcesHTML(player);
    html += '\n';
    
    // Stats
    html += '<span style="color: #ffffff; font-weight: bold;">STATS</span>\n';
    html += `<span style="color: #00ffff;">AC: ${player.stats.ac}</span>\n`;
    html += `<span style="color: #ffffff;">STR: ${player.stats.strength} (${this.getModifier(player.stats.strength)})</span>\n`;
    html += `<span style="color: #ffffff;">DEX: ${player.stats.dexterity} (${this.getModifier(player.stats.dexterity)})</span>\n`;
    html += `<span style="color: #ffffff;">CON: ${player.stats.constitution} (${this.getModifier(player.stats.constitution)})</span>\n`;
    html += `<span style="color: #ffffff;">INT: ${player.stats.intelligence} (${this.getModifier(player.stats.intelligence)})</span>\n`;
    html += `<span style="color: #ffffff;">WIS: ${player.stats.wisdom} (${this.getModifier(player.stats.wisdom)})</span>\n`;
    html += `<span style="color: #ffffff;">CHA: ${player.stats.charisma} (${this.getModifier(player.stats.charisma)})</span>\n\n`;
    
    // Equipment/Inventory
    html += this.renderCharacterInventoryHTML(player);
    
    content.innerHTML = html;
  }

  private updateCombatLogHTML() {
    const content = document.getElementById('combat-log-content');
    if (!content) {
      Logger.debug('No combat log content container');
      return;
    }

    let html = '';
    
    // Title
    html += '<span style="color: #ffffff; font-weight: bold;">COMBAT LOG</span>\n\n';
    
    // Display recent messages
    const maxLines = 25; // Enough for the panel height
    const messagesToShow = this.messages.slice(-maxLines);
    
    messagesToShow.forEach((message) => {
      html += `<span style="color: #ffffff;">${message}</span>\n`;
    });
    
    content.innerHTML = html;
    
    // Auto-scroll to bottom
    content.scrollTop = content.scrollHeight;
  }

  private updateBottomUI() {
    const bottomUI = document.getElementById('bottom-ui');
    if (!bottomUI || !this.currentPlayer) {
      return;
    }

    // Controls help (left side)
    const controlsText = 'WASD/Arrows: Move  Space: Attack';
    
    // Position display (right side)
    const positionText = `(${this.currentPlayer.x}, ${this.currentPlayer.y})`;
    
    bottomUI.innerHTML = `
      <span>${controlsText}</span>
      <span>${positionText}</span>
    `;
  }

  private renderCharacterResourcesHTML(player: Entity): string {
    let html = '';
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
        const colorHex = this.numberToHexColor(colorValue);
        
        html += `<span style="color: #ffffff;">${displayName}:</span>\n`;
        html += `<span style="color: ${colorHex};">${barDisplay} ${current}/${max}</span>\n`;
      }
    });
    
    return html;
  }

  private renderCharacterInventoryHTML(_player: Entity): string {
    let html = '<span style="color: #ffffff; font-weight: bold;">EQUIPMENT</span>\n';
    
    const characterManager = CharacterManager.getInstance();
    const currentCharacter = characterManager.getCurrentCharacter();
    
    if (!currentCharacter || !currentCharacter.inventory || currentCharacter.inventory.length === 0) {
      html += '<span style="color: #cccccc;">(Empty)</span>\n';
      return html;
    }
    
    const maxDisplayItems = Math.min(currentCharacter.inventory.length, 5);
    for (let i = 0; i < maxDisplayItems; i++) {
      const item = currentCharacter.inventory[i];
      const itemName = item.name.length > 12 ? item.name.substring(0, 12) : item.name;
      let itemLine = `${itemName}`;
      
      if (item.type === 'weapon' && item.damage) {
        const damageInfo = item.damage.length > 6 ? item.damage.substring(0, 6) : item.damage;
        itemLine += ` (${damageInfo})`;
      }
      
      html += `<span style="color: #ffffff;">${itemLine}</span>\n`;
    }
    
    if (currentCharacter.inventory.length > maxDisplayItems) {
      html += '<span style="color: #cccccc;">...</span>\n';
    }
    
    return html;
  }

  private numberToHexColor(colorValue: number): string {
    return `#${colorValue.toString(16).padStart(6, '0')}`;
  }

  // Helper method to create malwoden-style terminal text with proper 1:1 ratio font
  private createMalwodenStyleText(text: string, color: number, fontSize?: number): Text {
    // Perfect DOS VGA 437 fonts work best at specific pixel sizes (8, 16, 24, 32, etc.)
    // Choose the closest multiple of 8 that fits our tile size
    const baseSize = Math.round((fontSize || this.tileSize * 0.75) / 8) * 8;
    const actualFontSize = Math.max(8, baseSize); // Minimum size of 8px
    
    // Use the Perfect DOS VGA 437 fonts for authentic terminal rendering
    const textObject = new Text(text, {
      fontFamily: getFontFamily(),
      fontSize: actualFontSize,
      fill: color,
      align: 'center',
      fontWeight: 'normal',
      letterSpacing: 0,
      lineHeight: actualFontSize,
      // Additional properties for crisp rendering
      strokeThickness: 0,
      dropShadow: false,
    });
    
    // Ensure pixel-perfect rendering
    textObject.resolution = 1;
    textObject.roundPixels = true;
    
    return textObject;
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
    Logger.debug(`HYBRID: addMessage called with: "${message}"`);
    this.messages.push(message);
    
    if (this.messages.length > 30) {
      this.messages = this.messages.slice(-30);
    }
    
    this.uiNeedsRedraw = true;
    
    // Force immediate render when message is added
    setTimeout(() => {
      this.render();
    }, 0);
  }

  updatePositionText(x: number, y: number) {
    if (this.currentPlayer) {
      this.currentPlayer.x = x;
      this.currentPlayer.y = y;
      this.uiNeedsRedraw = true;
    }
    Logger.debug(`Position updated: (${x}, ${y})`);
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


  startDeathRipple(x: number, y: number) {
    console.log(`🌊 HybridRenderer: Starting death ripple at (${x}, ${y})`);
    this.animationSystem.startTileRipple(x, y);
  }

  startColorRipple(x: number, y: number, color: number, intensity: number = 1.0, radius: number = 10) {
    console.log(`🎨 HybridRenderer: Starting color ripple at (${x}, ${y}) with color 0x${color.toString(16)}`);
    this.animationSystem.startColorRipple(x, y, color, intensity, radius);
  }

  startLinearWave(startX: number, startY: number, direction: number, length: number, amplitude: number = 4, waveWidth: number = 1) {
    console.log(`🌊 HybridRenderer: Starting linear wave from (${startX}, ${startY}) width ${waveWidth}`);
    this.animationSystem.startLinearWave(startX, startY, direction, length, amplitude, waveWidth);
  }

  startColorFlash(x: number, y: number, color: number, intensity: number = 1.0, radius: number = 10) {
    console.log(`🎨 HybridRenderer: Starting color flash at (${x}, ${y}) with color 0x${color.toString(16)}`);
    this.animationSystem.startColorFlash(x, y, color, intensity, radius);
  }

  startConicalWave(startX: number, startY: number, startAngle: number, endAngle: number, length: number, amplitude: number = 6) {
    console.log(`🎆 HybridRenderer: Starting conical wave from (${startX}, ${startY}) angles ${startAngle}°-${endAngle}°`);
    this.animationSystem.startConicalWave(startX, startY, startAngle, endAngle, length, amplitude);
  }

  // Main render method to ensure UI consistency
  render() {
    // Always update HTML UI panels (we no longer use Malwoden terminals)
    const messageCountChanged = this.messages.length !== this.lastMessageCount;
    if (this.uiNeedsRedraw || !this.hasRenderedOnce || messageCountChanged) {
      try {
        this.updateUITerminals(); // This calls our HTML methods now
        this.uiNeedsRedraw = false;
        this.hasRenderedOnce = true;
        this.lastMessageCount = this.messages.length;
      } catch (error) {
        Logger.error('HYBRID: Error rendering HTML UI panels:', error);
      }
    }
  }
}