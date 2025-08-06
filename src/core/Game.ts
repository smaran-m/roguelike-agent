import { Renderer } from './Renderer';
import { TileMap } from './TileMap';
import { Entity } from '../types';
import { LineOfSight } from './LineOfSight';
import { InputHandler, InputCallbacks } from '../systems/input/InputHandler';
import { MovementSystem, MovementState } from '../systems/movement/MovementSystem';
import { CombatManager } from '../systems/combat/CombatManager';
import { GameStateManager } from '../managers/GameStateManager';
import { ResourceManager } from '../managers/ResourceManager';
import { WorldConfigLoader } from '../loaders/WorldConfigLoader';

export class Game {
  renderer: Renderer;
  tileMap: TileMap;
  player: Entity;
  
  // Extracted systems
  private inputHandler: InputHandler;
  private movementSystem: MovementSystem;
  private combatManager: CombatManager;
  private gameStateManager: GameStateManager;
  
  // Movement state
  private movementState: MovementState;
  
  constructor() {
    // Initialize world configuration system first
    WorldConfigLoader.initialize('fantasy');
    
    this.renderer = new Renderer(50, 30);
    this.tileMap = new TileMap(50, 30);
    
    // Initialize systems
    this.gameStateManager = new GameStateManager();
    this.movementSystem = new MovementSystem(0.1);
    this.combatManager = new CombatManager(this.renderer);
    
    // Initialize entities through game state manager with safe spawn positions
    this.gameStateManager.initializeEntities(this.tileMap);
    this.player = this.gameStateManager.getPlayer()!;
    
    // Initialize movement state
    this.movementState = {
      displayX: this.player.x,
      displayY: this.player.y,
      lastValidX: this.player.x,
      lastValidY: this.player.y
    };
    
    // Setup input with direct system callbacks
    const inputCallbacks: InputCallbacks = {
      onMovementKey: () => {}, // Movement handled in updateMovement
      onMovementKeyRelease: (keys) => {
        // Snap to grid when no keys are pressed
        if (keys.size === 0) {
          const entities = this.gameStateManager.getAllEntities();
          this.movementSystem.snapPlayerToGrid(
            this.movementState, 
            this.player, 
            entities, 
            this.tileMap
          );
        }
      },
      onAttack: () => {
        const entities = this.gameStateManager.getAllEntities();
        const result = this.combatManager.attemptMeleeAttack(this.player, entities);
        
        if (result.success && result.targetKilled && result.target) {
          this.gameStateManager.removeEntity(result.target.id);
        }
        
        if (result.success) {
          this.render();
        }
      }
    };
    this.inputHandler = new InputHandler(inputCallbacks);
    
    // Start game loop
    this.startGameLoop();
    
    // Wait for Noto Emoji to be fully available before rendering
    this.waitForFontsAndRender();
  }
  
  
  startGameLoop() {
    this.gameStateManager.startGameLoop(() => {
      this.updateMovement();
      this.updateVisuals();
    });
  }
  
  updateMovement() {
    const keysPressed = this.inputHandler.getKeysPressed();
    const entities = this.gameStateManager.getAllEntities();
    this.movementSystem.updateMovement(
      keysPressed, 
      this.movementState, 
      this.tileMap, 
      this.player,
      entities
    );
  }
  
  
  

  updateVisuals() {
    // Check if camera needs to move based on player position
    const cameraMoved = this.renderer.updateCameraForPlayer({ 
      x: Math.round(this.movementState.displayX), 
      y: Math.round(this.movementState.displayY) 
    } as Entity);
    
    // Check if player moved to a new grid position (for FOV updates)
    const currentGridX = Math.round(this.movementState.displayX);
    const currentGridY = Math.round(this.movementState.displayY);
    const playerMoved = currentGridX !== this.player.x || currentGridY !== this.player.y;
    
    // If camera moved or player moved to new grid position, need to re-render everything
    if (cameraMoved || playerMoved) {
      // Update player's logical position
      this.player.x = currentGridX;
      this.player.y = currentGridY;
      
      this.render();
      return; // render() will handle entity positioning
    }
    
    // Update player visual position
    const playerText = this.renderer.entityTextMap.get(this.player.id);
    const playerHp = this.renderer.hpTextMap.get(this.player.id);
    
    if (playerText) {
      const screenPos = this.renderer.worldToScreen(this.movementState.displayX, this.movementState.displayY);
      playerText.x = screenPos.x * this.renderer.tileSize + this.renderer.tileSize / 2;
      playerText.y = screenPos.y * this.renderer.tileSize + this.renderer.tileSize / 2;
    }
    
    if (playerHp) {
      const screenPos = this.renderer.worldToScreen(this.movementState.displayX, this.movementState.displayY);
      playerHp.x = screenPos.x * this.renderer.tileSize + this.renderer.tileSize / 2;
      playerHp.y = screenPos.y * this.renderer.tileSize + this.renderer.tileSize / 2 - 10;
      // Update HP text content and color
      const currentHp = ResourceManager.getCurrentValue(this.player, 'hp');
      const maxHp = ResourceManager.getMaximumValue(this.player, 'hp') || currentHp;
      const hpRatio = currentHp / maxHp;
      const hpColor = hpRatio > 0.5 ? 0x00FF00 : hpRatio > 0.25 ? 0xFFFF00 : 0xFF0000;
      playerHp.text = `${currentHp}/${maxHp}`;
      playerHp.style.fill = hpColor;
    }
    
    // Always update visibility alpha based on current player position
    // This handles smooth FOV updates as player moves between grid positions
    // Use rounded coordinates for line of sight calculations
    const playerGridX = Math.round(this.movementState.displayX);
    const playerGridY = Math.round(this.movementState.displayY);
    this.renderer.updateVisibilityAlpha(playerGridX, playerGridY, this.tileMap, LineOfSight);
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
    // Update camera to follow player (edge-following, not centering)
    this.renderer.updateCameraForPlayer(this.player);
    
    // Clear tiles each frame (needed for viewport changes)
    this.renderer.clearTiles();
    
    // Don't clear entities - they persist and update properties only
    
    // Only render tiles that are visible in the camera viewport
    const startX = Math.max(0, this.renderer.cameraX);
    const endX = Math.min(this.tileMap.width, this.renderer.cameraX + this.renderer.viewportWidth);
    const startY = Math.max(0, this.renderer.cameraY);
    const endY = Math.min(this.tileMap.height, this.renderer.cameraY + this.renderer.viewportHeight);
    
    // Render tiles with line of sight check (but no exploration tracking)
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.tileMap.getTile(x, y);
        const distance = Math.sqrt((x - this.player.x) ** 2 + (y - this.player.y) ** 2);
        const hasLOS = LineOfSight.hasLineOfSight(this.tileMap, this.player.x, this.player.y, x, y);
        this.renderer.renderTileWithVisibility(x, y, tile, distance, hasLOS);
      }
    }
    
    // Render entities with line of sight check
    const entities = this.gameStateManager.getAllEntities();
    for (const entity of entities) {
      const distance = Math.sqrt((entity.x - this.player.x) ** 2 + (entity.y - this.player.y) ** 2);
      const hasLOS = LineOfSight.hasLineOfSight(this.tileMap, this.player.x, this.player.y, entity.x, entity.y);
      this.renderer.renderEntityWithVisibility(entity, distance, hasLOS);
    }
  }

  // Cleanup method for proper resource management
  destroy() {
    this.inputHandler.destroy();
    this.gameStateManager.cleanup();
  }
}