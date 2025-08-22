import { Tile, Entity, TileVisibility } from '../../types';
import { IRenderer } from './IRenderer';
import { Application, Container, Graphics } from 'pixi.js';
import { Logger } from '../../utils/Logger';
import { CameraSystem } from '../../systems/camera/CameraSystem';
import { AnimationSystem } from '../../systems/animation/AnimationSystem';
import { HTMLUIRenderer } from './HTMLUIRenderer';
import { ResourceManager } from '../../managers/ResourceManager';
import { Text } from 'pixi.js';
import { getFontFamily } from '../../config/fonts';

/**
 * Hybrid renderer that combines PixiJS for the main game area with Malwoden terminals for UI
 * - Game area: Full PixiJS with animations, camera transitions, smooth effects
 * - UI areas: Native Malwoden terminals for authentic terminal styling
 * - Layout: Separate HTML containers for organized positioning
 */
export class DefaultRenderer implements IRenderer {
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
  
  // Tile tracking for FOV updates
  private tileGraphicsMap: Map<string, {bg: Graphics, text: Graphics | any, originalColor: number}> = new Map();
  
  // Entity rendering maps
  entityTextMap: Map<string, any> = new Map();
  hpTextMap: Map<string, any> = new Map();
  private entityPositions: Map<string, {x: number, y: number}> = new Map();
  
  // Composed renderer classes
  private htmlUIRenderer!: HTMLUIRenderer;
  
  // PixiJS compatibility
  characterSheet?: any = null;

  constructor(width: number, height: number) {
    Logger.debug('HYBRID: HybridTerminalRenderer constructor called');
    this.gridWidth = width;
    this.gridHeight = height;
    
    this.initializeContainers();
    this.initializePixiGameArea();
    this.initializeSystems();
    this.initializeRenderers();
  }


  private initializeContainers() {
    this.htmlUIRenderer = new HTMLUIRenderer(this.viewportWidth, this.viewportHeight, this.tileSize);
    const gamePanel = this.htmlUIRenderer.initializeContainers();
    
    if (!gamePanel) {
      Logger.error('Failed to initialize HTML UI containers');
      return;
    }
    
    Logger.debug('Hybrid renderer containers initialized');
  }


  private initializePixiGameArea() {
    const gamePanel = this.htmlUIRenderer.getGamePanel();
    if (!gamePanel) return;
    
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
    gamePanel.appendChild(this.app.view as HTMLCanvasElement);
    
    Logger.debug('PixiJS game area initialized');
  }

  private initializeRenderers() {
    // Initialize HTML UI elements
    this.htmlUIRenderer.initializeUIElements();
    
    // Initialize FOV renderer
    // FOV functionality moved directly into this renderer
    Logger.debug('All renderers initialized');
  }

  // Set the light passes function for FOV calculation
  setLightPassesFunction(_lightPasses: (x: number, y: number) => boolean) {
    // Since Malwoden FOV is disabled, this is a no-op
    // FOV calculations use the game's LineOfSight system
  }

  private initializeSystems() {
    // Initialize animation system with our entity maps
    this.animationSystem = new AnimationSystem(
      this.tileSize,
      this.entityContainer,
      this.entityTextMap,
      this.hpTextMap
    );
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

  // Rendering methods - PixiJS for game, HTML for UI
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
    
    // Create text directly
    const displayChar = this.getDisplayCharacter(tile.glyph);
    const textColor = visibility.visible ? tile.fgColor : this.darkenColor(tile.fgColor, 0.4);
    const text = this.createMalwodenStyleText(displayChar, textColor);
    
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
      this.htmlUIRenderer.setCurrentPlayer(entity);
      
      // Force immediate render to update player stats
      setTimeout(() => {
        this.render();
      }, 0);
    }
    
    // Render entity directly
    const isPlayer = this.renderEntityInternal(entity, visible, this.cameraX, this.cameraY);
    
    // Update UI if this is the player
    if (isPlayer) {
      this.htmlUIRenderer.markForRedraw();
    }
  }

  private renderEntityInternal(entity: Entity, visible: boolean, cameraX: number, cameraY: number): boolean {
    if (!visible) return false;
    
    // Render entity in PixiJS with full animation support
    const screenX = entity.x - cameraX;
    const screenY = entity.y - cameraY;
    
    if (screenX < 0 || screenX >= this.viewportWidth || 
        screenY < 0 || screenY >= this.viewportHeight) {
      return false;
    }
    
    // Use glyph directly with Unicode fallback
    const displayChar = this.getDisplayCharacter(entity.glyph);
    const text = this.createMalwodenStyleText(displayChar, entity.color);
    
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
    
    return entity.isPlayer || false;
  }

  renderEntityWithVisibility(entity: Entity, distance: number, hasLOS: boolean) {
    // Store current player for UI updates
    if (entity.isPlayer) {
      this.htmlUIRenderer.setCurrentPlayer(entity);
      
      // Force immediate render to update player stats
      setTimeout(() => {
        this.render();
      }, 0);
    }
    
    // Render entity directly
    const isPlayer = this.renderEntityWithVisibilityInternal(entity, distance, hasLOS, this.cameraX, this.cameraY);
    
    // Update UI if this is the player
    if (isPlayer) {
      this.htmlUIRenderer.markForRedraw();
      this.updatePositionText(entity.x, entity.y);
    }
  }

  private renderEntityWithVisibilityInternal(entity: Entity, distance: number, hasLOS: boolean, cameraX: number, cameraY: number): boolean {
    const screenX = entity.x - cameraX;
    const screenY = entity.y - cameraY;
    
    const inViewport = screenX >= 0 && screenX < this.viewportWidth && 
                      screenY >= 0 && screenY < this.viewportHeight;
    
    let alpha = 0;
    if (hasLOS) {
      const maxDistance = 8;
      alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
    }
    
    // Get or create entity text object (persistent across frames)
    let text = this.entityTextMap.get(entity.id);
    if (!text) {
      // Use glyph directly with Unicode fallback
      const displayChar = this.getDisplayCharacter(entity.glyph);
      text = this.createMalwodenStyleText(displayChar, entity.color);
      text.anchor.set(0.5);
      
      this.entityTextMap.set(entity.id, text);
      this.entityContainer.addChild(text);
    }
    
    text.x = screenX * this.tileSize + this.tileSize / 2;
    text.y = screenY * this.tileSize + this.tileSize / 2;
    text.alpha = alpha;
    text.visible = (alpha > 0) && inViewport;
    
    this.entityPositions.set(entity.id, {x: entity.x, y: entity.y});
    
    // HP text handling
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
      
      // Set text color
      hpText.style.fill = hpColor;
      hpText.x = screenX * this.tileSize + this.tileSize / 2;
      hpText.y = screenY * this.tileSize + this.tileSize / 2 - 20;
      hpText.text = `${currentHp}/${maxHp}`;
      hpText.alpha = alpha;
      hpText.visible = (alpha > 0) && inViewport;
    }
    
    return entity.isPlayer || false;
  }

  renderTileWithVisibility(worldX: number, worldY: number, tile: Tile, distance: number, hasLOS: boolean) {
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
    
    // Create text directly
    const displayChar = this.getDisplayCharacter(tile.glyph);
    const text = this.createMalwodenStyleText(displayChar, fgColor);
    
    text.x = screenX * this.tileSize + this.tileSize / 2;
    text.y = screenY * this.tileSize + this.tileSize / 2;
    text.anchor.set(0.5);
    text.alpha = alpha;
    
    this.tileContainer.addChild(text);
    
    // Store tile graphics for FOV updates
    const key = `${worldX},${worldY}`;
    this.tileGraphicsMap.set(key, { bg, text, originalColor: tile.fgColor });
  }



  // PixiJS methods with full animation support
  clearTiles() {
    this.tileContainer.removeChildren();
    this.tileGraphicsMap.clear();
  }

  clearEntities() {
    for (const text of this.entityTextMap.values()) {
      if (text && text.destroy) text.destroy();
    }
    for (const text of this.hpTextMap.values()) {
      if (text && text.destroy) text.destroy();
    }
    
    this.entityTextMap.clear();
    this.hpTextMap.clear();
    this.entityPositions.clear();
    this.entityContainer.removeChildren();
  }

  removeEntity(entityId: string) {
    const text = this.entityTextMap.get(entityId);
    const hpText = this.hpTextMap.get(entityId);
    
    if (text) {
      this.entityContainer.removeChild(text);
      if (text.destroy) text.destroy();
      this.entityTextMap.delete(entityId);
    }
    
    if (hpText) {
      this.entityContainer.removeChild(hpText);
      if (hpText.destroy) hpText.destroy();
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

  // Animation methods
  animateMove(_entity: Entity, _fromX: number, _fromY: number, _toX: number, _toY: number) {
    // For PixiJS, Game.ts handles position updates directly via entityTextMap
    // This method exists for interface compatibility but does nothing 
    // since movement is handled by Game.updateVisuals()
  }

  shakeEntity(entity: Entity) {
    this.animationSystem.shakeEntity(entity);
  }

  nudgeEntity(entity: Entity, targetX: number, targetY: number) {
    this.animationSystem.nudgeEntity(entity, targetX, targetY);
  }

  showFloatingDamage(entity: Entity, damage: number) {
    // Create a simple floating damage text effect
    const text = this.createMalwodenStyleText(`-${damage}`, 0xFF0000, 14);
    const screenPos = this.worldToScreen(entity.x, entity.y);
    text.x = screenPos.x * this.tileSize + this.tileSize / 2;
    text.y = screenPos.y * this.tileSize + this.tileSize / 2 - 30;
    text.anchor.set(0.5);
    this.entityContainer.addChild(text);
    
    // Simple animation: fade out and move up
    let alpha = 1.0;
    const animate = () => {
      alpha -= 0.02;
      text.alpha = alpha;
      text.y -= 1;
      
      if (alpha <= 0) {
        this.entityContainer.removeChild(text);
        if (text.destroy) text.destroy();
      } else {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
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

  // Pure UI rendering method - no state management
  renderUI(player: Entity, messages: readonly string[]) {
    this.htmlUIRenderer.setCurrentPlayer(player);
    this.htmlUIRenderer.setMessages(messages);
    this.htmlUIRenderer.updateUI();
  }

  updatePositionText(x: number, y: number) {
    this.htmlUIRenderer.updatePositionText(x, y);
  }

  updateEntityPosition(entityId: string, x: number, y: number) {
    // Update cached position for this entity
    this.entityPositions.set(entityId, {x, y});
    
    // Update screen position if entity text exists
    const text = this.entityTextMap.get(entityId);
    const hpText = this.hpTextMap.get(entityId);
    
    if (text) {
      const screenPos = this.worldToScreen(x, y);
      text.x = screenPos.x * this.tileSize + this.tileSize / 2;
      text.y = screenPos.y * this.tileSize + this.tileSize / 2;
      
      if (hpText) {
        hpText.x = screenPos.x * this.tileSize + this.tileSize / 2;
        hpText.y = screenPos.y * this.tileSize + this.tileSize / 2 - 20;
      }
    }
  }

  updateVisibilityAlpha(playerX: number, playerY: number, tileMap: any, lineOfSight: any, entities?: Entity[]) {
    // Update tile visibility based on LineOfSight (since Malwoden FOV is disabled)
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
    
    // Update entity visibility based on FOV using current entity positions
    if (entities) {
      // Use live entity positions for accuracy with moving entities
      for (const entity of entities) {
        const text = this.entityTextMap.get(entity.id);
        const hpText = this.hpTextMap.get(entity.id);
        
        if (text) {
          const screenX = entity.x - this.cameraX;
          const screenY = entity.y - this.cameraY;
          const inViewport = screenX >= 0 && screenX < this.viewportWidth && 
                            screenY >= 0 && screenY < this.viewportHeight;
          
          // Skip player - they should always be fully visible
          if (entity.id === 'player') {
            text.alpha = 1.0;
            text.visible = inViewport;
            if (hpText) {
              hpText.alpha = 1.0;
              hpText.visible = inViewport;
            }
            continue;
          }
          
          // Apply LOS calculations only to non-player entities
          const hasLOS = lineOfSight.hasLineOfSight(tileMap, safePlayerX, safePlayerY, entity.x, entity.y);
          
          let alpha = 0;
          if (hasLOS) {
            const distance = Math.sqrt((entity.x - safePlayerX) ** 2 + (entity.y - safePlayerY) ** 2);
            const maxDistance = 8;
            alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
          }
          
          text.alpha = alpha;
          text.visible = (alpha > 0) && inViewport;
          
          if (hpText) {
            hpText.alpha = alpha;
            hpText.visible = (alpha > 0) && inViewport;
          }
        }
      }
    } else {
      // Fallback to cached positions if entities not provided
      for (const [entityId, worldPos] of this.entityPositions.entries()) {
        const text = this.entityTextMap.get(entityId);
        const hpText = this.hpTextMap.get(entityId);
        
        if (text) {
          const screenX = worldPos.x - this.cameraX;
          const screenY = worldPos.y - this.cameraY;
          const inViewport = screenX >= 0 && screenX < this.viewportWidth && 
                            screenY >= 0 && screenY < this.viewportHeight;
          
          // Skip player - they should always be fully visible
          if (entityId === 'player') {
            text.alpha = 1.0;
            text.visible = inViewport;
            if (hpText) {
              hpText.alpha = 1.0;
              hpText.visible = inViewport;
            }
            continue;
          }
          
          // Apply LOS calculations only to non-player entities
          const hasLOS = lineOfSight.hasLineOfSight(tileMap, safePlayerX, safePlayerY, worldPos.x, worldPos.y);
          
          let alpha = 0;
          if (hasLOS) {
            const distance = Math.sqrt((worldPos.x - safePlayerX) ** 2 + (worldPos.y - safePlayerY) ** 2);
            const maxDistance = 8;
            alpha = Math.max(0.3, 1.0 - (distance / maxDistance) * 0.7);
          }
          
          text.alpha = alpha;
          text.visible = (alpha > 0) && inViewport;
          
          if (hpText) {
            hpText.alpha = alpha;
            hpText.visible = (alpha > 0) && inViewport;
          }
        }
      }
    }
  }

  // Check if a cell is currently visible in FOV (Malwoden compatibility)
  isCellVisible(_x: number, _y: number): boolean {
    // Since Malwoden FOV is disabled, always return false
    // FOV calculations are handled through LineOfSight system
    return false;
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
    // Since Malwoden FOV is disabled, we don't have native LOS
    return false;
  }


  startDeathRipple(x: number, y: number) {
    console.log(`HybridRenderer: Starting death ripple at (${x}, ${y})`);
    this.animationSystem.startTileRipple(x, y);
  }

  startColorRipple(x: number, y: number, color: number, intensity: number = 1.0, radius: number = 10) {
    console.log(`HybridRenderer: Starting color ripple at (${x}, ${y}) with color 0x${color.toString(16)}`);
    this.animationSystem.startColorRipple(x, y, color, intensity, radius);
  }

  startLinearWave(startX: number, startY: number, direction: number, length: number, amplitude: number = 4, waveWidth: number = 1) {
    console.log(`HybridRenderer: Starting linear wave from (${startX}, ${startY}) width ${waveWidth}`);
    this.animationSystem.startLinearWave(startX, startY, direction, length, amplitude, waveWidth);
  }

  startColorFlash(x: number, y: number, color: number, intensity: number = 1.0, radius: number = 10) {
    console.log(`HybridRenderer: Starting color flash at (${x}, ${y}) with color 0x${color.toString(16)}`);
    this.animationSystem.startColorFlash(x, y, color, intensity, radius);
  }

  startConicalWave(startX: number, startY: number, startAngle: number, endAngle: number, length: number, amplitude: number = 6) {
    console.log(`HybridRenderer: Starting conical wave from (${startX}, ${startY}) angles ${startAngle}°-${endAngle}°`);
    this.animationSystem.startConicalWave(startX, startY, startAngle, endAngle, length, amplitude);
  }

  // Main render method to ensure UI consistency
  render() {
    // Delegate to HTML UI renderer
    this.htmlUIRenderer.updateUI();
  }

  // ========================================
  // Integrated Rendering Utilities
  // ========================================

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

  // Simple character display - use glyph directly, with emoji fallback for unsupported fonts
  private getDisplayCharacter(glyph: string): string {
    // Handle multi-character sequences (compound emojis)
    if (glyph.length > 1) {
      return '@'; // Multi-character sequences are likely emojis
    }
    
    const charCode = glyph.charCodeAt(0);
    
    // ASCII characters (0-127) always work
    if (charCode <= 127) {
      return glyph;
    }
    
    // Basic Unicode ranges that work well in most fonts
    if (
      (charCode >= 0x0080 && charCode <= 0x024F) || // Latin Extended A & B
      (charCode >= 0x2500 && charCode <= 0x257F) || // Box Drawing
      (charCode >= 0x2580 && charCode <= 0x259F) || // Block Elements
      (charCode >= 0x25A0 && charCode <= 0x25FF)    // Geometric Shapes (basic)
    ) {
      return glyph; // Allow basic Unicode symbols like ·, ─, █, etc.
    }
    
    // Block emoji ranges
    if (
      (charCode >= 0x1F000) ||                      // All high Unicode (emojis)
      (charCode >= 0x2600 && charCode <= 0x26FF) || // Miscellaneous Symbols
      (charCode >= 0x2700 && charCode <= 0x27BF)    // Dingbats
    ) {
      return '?'; // Replace emojis with fallback
    }
    
    // For other Unicode, try to display (might work in some fonts)
    return glyph;
  }

}