import { Application, Container, Graphics, Text } from 'pixi.js';
import { Tile, Entity } from '../types';
import { CharacterSheet } from '../ui/components/CharacterSheet';
import { AnimationSystem } from '../systems/animation/AnimationSystem';
import { CameraSystem } from '../systems/camera/CameraSystem';
import { FontSystem } from '../systems/font/FontSystem';
import { ResourceManager } from '../managers/ResourceManager';
import { Logger } from '../utils/Logger';

export class Renderer {
  app: Application;
  tileSize: number = 32;
  gridWidth: number;
  gridHeight: number;
  viewportWidth: number = 25; // Tiles visible horizontally
  viewportHeight: number = 15; // Tiles visible vertically
  cameraSystem: CameraSystem;
  tileContainer: Container;
  entityContainer: Container;
  messageContainer: Container;
  entityTextMap: Map<string, Text> = new Map(); // Track text objects by entity ID
  hpTextMap: Map<string, Text> = new Map(); // Track HP text objects by entity ID
  entityPositions: Map<string, {x: number, y: number}> = new Map(); // Track entity world positions
  messages: string[] = [];
  messageText: Text;
  characterSheet: CharacterSheet;
  animationSystem: AnimationSystem;
  private readonly characterSheetWidth = 220; // Width of character sheet panel
  
  // Bottom corner UI elements
  private controlsText!: Text;
  private positionText!: Text;
  
  constructor(width: number, height: number) {
    this.gridWidth = width;
    this.gridHeight = height;
    
    this.app = new Application({
      width: this.characterSheetWidth + this.viewportWidth * this.tileSize + 350, // Character sheet + viewport + message area
      height: Math.max(this.viewportHeight * this.tileSize, 600), // Ensure minimum height for character sheet
      backgroundColor: 0x000000,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    
    // Layer containers
    this.tileContainer = new Container();
    this.entityContainer = new Container();
    this.messageContainer = new Container();
    
    // Offset game containers to make room for character sheet
    this.tileContainer.x = this.characterSheetWidth;
    this.entityContainer.x = this.characterSheetWidth;
    
    this.app.stage.addChild(this.tileContainer);
    this.app.stage.addChild(this.entityContainer);
    this.app.stage.addChild(this.messageContainer);
    
    // Initialize character sheet
    this.characterSheet = new CharacterSheet(this.app);
    this.characterSheet.setPosition(10, 10);
    
    // Initialize animation system
    this.animationSystem = new AnimationSystem(
      this.tileSize,
      this.entityContainer,
      this.entityTextMap,
      this.hpTextMap
    );
    
    // Initialize camera system
    this.cameraSystem = new CameraSystem(
      this.gridWidth,
      this.gridHeight,
      this.viewportWidth,
      this.viewportHeight,
      this.animationSystem
    );
    
    // Initialize bottom corner UI elements
    this.setupBottomCornerUI();
    
    // Add a separator line between game area and message area  
    const separator = new Graphics();
    separator.beginFill(0x444444);
    separator.drawRect(0, 0, 2, Math.max(this.viewportHeight * this.tileSize, 600));
    separator.endFill();
    separator.x = this.characterSheetWidth + this.viewportWidth * this.tileSize + 10;
    separator.y = 0;
    this.messageContainer.addChild(separator);
    
    // Add title
    const titleText = new Text('Combat Log:', FontSystem.getUIStyles().title);
    titleText.x = this.characterSheetWidth + this.viewportWidth * this.tileSize + 20;
    titleText.y = 10;
    this.messageContainer.addChild(titleText);
    
    // Initialize message display (positioned on the right side)
    this.messageText = new Text('Move near enemies and press SPACE to attack', {
      ...FontSystem.getUIStyles().messageLog,
      wordWrap: true,
      wordWrapWidth: 320
    });
    this.messageText.x = this.characterSheetWidth + this.viewportWidth * this.tileSize + 20; // Right of the game area
    this.messageText.y = 40;
    this.messageContainer.addChild(this.messageText);
    
    // Add to DOM
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.app.view as HTMLCanvasElement);
    }
  }

  // Camera position getters for compatibility
  get cameraX(): number {
    return this.cameraSystem.x;
  }

  get cameraY(): number {
    return this.cameraSystem.y;
  }
  
  private setupBottomCornerUI() {
    // Controls text in bottom left of gameplay area
    this.controlsText = new Text('WASD/Arrows: Move  Space: Attack', FontSystem.getUIStyles().controls);
    this.controlsText.x = this.characterSheetWidth + 5;
    this.controlsText.y = this.viewportHeight * this.tileSize - 20;
    this.messageContainer.addChild(this.controlsText);
    
    // Position text in bottom right of gameplay area  
    this.positionText = new Text('(0, 0)', FontSystem.getUIStyles().position);
    this.positionText.x = this.characterSheetWidth + this.viewportWidth * this.tileSize - 60;
    this.positionText.y = this.viewportHeight * this.tileSize - 20;
    this.messageContainer.addChild(this.positionText);
  }
  
  renderTile(worldX: number, worldY: number, tile: Tile, visibility: import('../types').TileVisibility) {
    // Convert world coordinates to screen coordinates
    const screenX = worldX - this.cameraX;
    const screenY = worldY - this.cameraY;
    
    // Only render if within viewport
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return;
    }
    
    // Don't render unexplored tiles
    if (!visibility.explored) {
      return;
    }
    
    // Determine colors based on visibility
    let bgColor = tile.bgColor;
    let fgColor = tile.fgColor;
    let alpha = 1.0;
    
    if (!visibility.visible) {
      // Explored but not currently visible - make it darker
      fgColor = this.darkenColor(fgColor, 0.4);
      alpha = 0.6;
    }
    
    // Background
    const bg = new Graphics();
    bg.beginFill(bgColor);
    bg.alpha = alpha;
    bg.drawRect(
      screenX * this.tileSize,
      screenY * this.tileSize,
      this.tileSize,
      this.tileSize
    );
    bg.endFill();
    this.tileContainer.addChild(bg);
    
    // Glyph
    const fontConfig = FontSystem.getTileFont(tile.isEmoji);
    const text = new Text(tile.glyph, {
      ...fontConfig,
      fill: fgColor
    });
    
    text.x = screenX * this.tileSize + this.tileSize / 2;
    text.y = screenY * this.tileSize + this.tileSize / 2;
    text.anchor.set(0.5);
    text.alpha = alpha;
    
    this.tileContainer.addChild(text);
  }
  
  clearTiles() {
    this.tileContainer.removeChildren();
    this.tileGraphicsMap.clear();
  }
  
  clearEntities() {
    // Full clear - used for cleanup/shutdown
    this.entityContainer.removeChildren();
    
    // Destroy text objects to free memory
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
    // Remove specific entity (e.g., when it dies)
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
    // Update screen positions for all visible entities after camera change
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

  renderTileWithVisibility(worldX: number, worldY: number, tile: Tile, distance: number, hasLOS: boolean) {
    // Convert world coordinates to screen coordinates
    const screenX = worldX - this.cameraX;
    const screenY = worldY - this.cameraY;
    
    // Only render if within viewport
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return;
    }
    
    // Calculate alpha based on distance and line of sight
    let alpha = 1.0;
    let fgColor = tile.fgColor;
    
    if (!hasLOS) {
      // No line of sight - very dim
      alpha = 0.2;
      fgColor = this.darkenColor(fgColor, 0.7);
    } else {
      // Line of sight - fade based on distance
      const maxDistance = 8;
      alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
    }
    
    // Background
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
    
    // Glyph
    const fontConfig = FontSystem.getTileFont(tile.isEmoji);
    const text = new Text(tile.glyph, {
      ...fontConfig,
      fill: fgColor
    });
    
    text.x = screenX * this.tileSize + this.tileSize / 2;
    text.y = screenY * this.tileSize + this.tileSize / 2;
    text.anchor.set(0.5);
    text.alpha = alpha;
    
    this.tileContainer.addChild(text);
    
    // Store graphics for alpha updates
    const key = `${worldX},${worldY}`;
    this.tileGraphicsMap.set(key, { bg, text, originalColor: tile.fgColor });
  }

  renderEntityWithVisibility(entity: Entity, distance: number, hasLOS: boolean) {
    // Convert world coordinates to screen coordinates
    const screenX = entity.x - this.cameraX;
    const screenY = entity.y - this.cameraY;
    
    // Check if within viewport
    const inViewport = screenX >= 0 && screenX < this.viewportWidth && 
                      screenY >= 0 && screenY < this.viewportHeight;
    
    // Calculate alpha based on distance and line of sight (independent of viewport)
    let alpha = 0;
    if (hasLOS) {
      const maxDistance = 8;
      alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
    }
    
    // Get or create entity text object (persistent across frames)
    let text = this.entityTextMap.get(entity.id);
    if (!text) {
      const entityFontConfig = FontSystem.getEntityFont(entity.isEmoji, entity.color);
      text = new Text(entity.glyph, entityFontConfig);
      text.anchor.set(0.5);
      
      // Apply color tint for emojis  
      if (FontSystem.shouldApplyColorTint(entity.isEmoji)) {
        text.tint = entity.color;
      }
      
      this.entityTextMap.set(entity.id, text);
      this.entityContainer.addChild(text);
    }
    
    // Update position and visibility (properties only, object persists)
    text.x = screenX * this.tileSize + this.tileSize / 2;
    text.y = screenY * this.tileSize + this.tileSize / 2;
    text.alpha = alpha;
    // Only show entity if it has line of sight AND is in viewport
    text.visible = (alpha > 0) && inViewport;
    
    // Store world position for animations
    this.entityPositions.set(entity.id, {x: entity.x, y: entity.y});
    
    // Handle HP text for non-player entities (persistent objects)
    if (!entity.isPlayer && entity.stats) {
      let hpText = this.hpTextMap.get(entity.id);
      if (!hpText) {
        hpText = new Text('', {
          ...FontSystem.getHPFont(),
          fill: 0x00FF00
        });
        hpText.anchor.set(0.5);
        this.hpTextMap.set(entity.id, hpText);
        this.entityContainer.addChild(hpText);
      }
      
      // Update HP display properties
      const currentHp = ResourceManager.getCurrentValue(entity, 'hp');
      const maxHp = ResourceManager.getMaximumValue(entity, 'hp') || currentHp;
      const hpRatio = currentHp / maxHp;
      const hpColor = hpRatio > 0.5 ? 0x00FF00 : hpRatio > 0.25 ? 0xFFFF00 : 0xFF0000;
      
      hpText.text = `${currentHp}/${maxHp}`;
      hpText.style.fill = hpColor;
      hpText.x = screenX * this.tileSize + this.tileSize / 2;
      hpText.y = screenY * this.tileSize + this.tileSize / 2 - 20;
      hpText.alpha = alpha;
      // Only show HP if entity has line of sight AND is in viewport
      hpText.visible = (alpha > 0) && inViewport;
    }
    
    // Update character sheet and position text if this is the player
    if (entity.isPlayer) {
      this.characterSheet.updateResourcesOnly(entity);
      this.updatePositionText(entity.x, entity.y);
    }
  }
  
  renderEntity(entity: Entity, visible: boolean) {
    // Convert world coordinates to screen coordinates
    const screenX = entity.x - this.cameraX;
    const screenY = entity.y - this.cameraY;
    
    // Only render if within viewport and visible
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight || !visible) {
      return;
    }
    
    const entityFontConfig = FontSystem.getEntityFont(entity.isEmoji, entity.color);
    const text = new Text(entity.glyph, entityFontConfig);
    
    // Apply color tint for emojis
    if (FontSystem.shouldApplyColorTint(entity.isEmoji)) {
      text.tint = entity.color;
    }
    
    text.x = screenX * this.tileSize + this.tileSize / 2;
    text.y = screenY * this.tileSize + this.tileSize / 2;
    text.anchor.set(0.5);
    
    // Store reference for animations and world position
    Logger.debug('Renderer: storing entity in entityTextMap with ID:', entity.id);
    this.entityTextMap.set(entity.id, text);
    this.entityPositions.set(entity.id, {x: entity.x, y: entity.y});
    this.entityContainer.addChild(text);
    
    // Render HP above entity with bar-like appearance
    const currentHp = ResourceManager.getCurrentValue(entity, 'hp');
    const maxHp = ResourceManager.getMaximumValue(entity, 'hp') || currentHp;
    const hpRatio = currentHp / maxHp;
    const hpColor = hpRatio > 0.5 ? 0x00FF00 : hpRatio > 0.25 ? 0xFFFF00 : 0xFF0000;
    const hpDisplay = `${currentHp}/${maxHp}`;
    
    const hpText = new Text(hpDisplay, {
      ...FontSystem.getHPFont(),
      fontSize: 14,
      fill: hpColor
    });
    
    hpText.x = screenX * this.tileSize + this.tileSize / 2;
    hpText.y = screenY * this.tileSize + this.tileSize / 2 - 20;
    hpText.anchor.set(0.5);
    
    // Store reference for animations
    this.hpTextMap.set(entity.id, hpText);
    this.entityContainer.addChild(hpText);
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
  
  animateMove(entity: Entity, fromX: number, fromY: number, toX: number, toY: number) {
    const text = this.entityTextMap.get(entity.id);
    const hpText = this.hpTextMap.get(entity.id);
    if (!text) return;
    
    text.x = fromX * this.tileSize + this.tileSize / 2;
    text.y = fromY * this.tileSize + this.tileSize / 2;
    
    if (hpText) {
      hpText.x = fromX * this.tileSize + this.tileSize / 2;
      hpText.y = fromY * this.tileSize + this.tileSize / 2 - 20;
    }
    
    // Simple linear animation
    const targetX = toX * this.tileSize + this.tileSize / 2;
    const targetY = toY * this.tileSize + this.tileSize / 2;
    
    const duration = 60; // ms
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      text.x = text.x + (targetX - text.x) * progress;
      text.y = text.y + (targetY - text.y) * progress;
      
      if (hpText) {
        hpText.x = hpText.x + (targetX - hpText.x) * progress;
        hpText.y = hpText.y + (targetY - 20 - hpText.y) * progress;
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  shakeEntity(entity: Entity) {
    this.animationSystem.shakeEntity(entity);
  }
  
  nudgeEntity(entity: Entity, targetX: number, targetY: number) {
    this.animationSystem.nudgeEntity(entity, targetX, targetY);
  }
  
  addMessage(message: string) {
    this.messages.push(message);
    
    // Keep only last 5 messages
    if (this.messages.length > 25) {
      this.messages.shift();
    }
    
    // Update message display
    this.messageText.text = this.messages.join('\n');
  }
  
  showFloatingDamage(entity: Entity, damage: number) {
    this.animationSystem.showFloatingDamage(entity, damage);
  }
  

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

  // Store tile graphics for alpha updates
  tileGraphicsMap: Map<string, {bg: Graphics, text: Text, originalColor: number}> = new Map();

  updatePositionText(x: number, y: number) {
    this.positionText.text = `(${x}, ${y})`;
  }
  
  updateVisibilityAlpha(playerX: number, playerY: number, tileMap: any, lineOfSight: any) {
    // Ensure player coordinates are within bounds and integers
    const safePlayerX = Math.max(0, Math.min(tileMap.width - 1, Math.round(playerX)));
    const safePlayerY = Math.max(0, Math.min(tileMap.height - 1, Math.round(playerY)));
    
    // Update tile alphas based on current player position
    this.tileGraphicsMap.forEach((graphics, key) => {
      const [x, y] = key.split(',').map(Number);
      
      // Ensure tile coordinates are valid
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
      
      // Skip player - they should always be fully visible
      if (entityId === 'player') {
        entityText.alpha = 1.0;
        entityText.visible = true;
        if (hpText) {
          hpText.alpha = 1.0;
          hpText.visible = true;
        }
        return;
      }
      
      // Ensure entity coordinates are valid
      if (entityPos.x < 0 || entityPos.x >= tileMap.width || entityPos.y < 0 || entityPos.y >= tileMap.height) {
        return;
      }
      
      // Check if entity is in viewport
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
}