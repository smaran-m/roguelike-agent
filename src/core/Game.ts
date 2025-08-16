import { IRenderer } from './renderers/IRenderer';
import { RendererFactory } from './renderers/RendererFactory';
import { TileMap } from './TileMap';
import { Entity } from '../types';
import { LineOfSight } from './LineOfSight';
import { InputHandler, InputCallbacks } from '../systems/input/InputHandler';
import { MovementSystem, MovementState } from '../systems/movement/MovementSystem';
import { CombatManager } from '../systems/combat/CombatManager';
import { GameStateManager } from '../managers/GameStateManager';
import { ResourceManager } from '../managers/ResourceManager';
import { EventBus, EventBusConfig } from './events/EventBus';
import { Logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { generateEventId } from './events/GameEvent';
import { AudioSystem } from '../systems/audio/AudioSystem';

export class Game {
  renderer: IRenderer;
  tileMap: TileMap;
  player: Entity;
  
  // Core systems
  private eventBus: EventBus;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private audioSystem: AudioSystem;
  
  // Game systems
  private inputHandler: InputHandler;
  private movementSystem: MovementSystem;
  private combatManager: CombatManager;
  private gameStateManager: GameStateManager;
  
  // Movement state
  private movementState: MovementState;
  
  constructor() {
    // Initialize core systems first
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    
    // Initialize EventBus
    const eventBusConfig: EventBusConfig = {
      bufferSize: 1024,
      enableAggregation: true,
      enablePooling: true,
      maxPoolSize: 100
    };
    this.eventBus = new EventBus(eventBusConfig, this.logger, this.errorHandler);
    
    // Initialize audio system with EventBus
    this.audioSystem = new AudioSystem(this.eventBus, this.logger, this.errorHandler);
    
    // Note: World configuration is now initialized in main.ts before Game creation
    
    this.renderer = RendererFactory.createRenderer(50, 30);
    this.tileMap = new TileMap(50, 30);
    
    // Initialize systems with EventBus
    this.gameStateManager = new GameStateManager();
    this.movementSystem = new MovementSystem(0.1);
    this.combatManager = new CombatManager(this.renderer, this.eventBus);
    
    // Initialize entities through game state manager with safe spawn positions
    this.gameStateManager.initializeEntities(this.tileMap);
    this.player = this.gameStateManager.getPlayer()!;
    
    // Initialize character sheet with player data (PixiJS only)
    if (this.renderer.characterSheet) {
      this.renderer.characterSheet.updateCharacterSheet(this.player);
    }
    
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
    this.waitForFontsAndRender();

    //this.startGameLoop();
    
    // Wait for Perfect DOS VGA 437 fonts to be fully available before rendering
  }
  
  
  startGameLoop() {
    this.gameStateManager.startGameLoop(() => {
      this.updateMovement();
      this.updateVisuals();
      this.updateEvents();
    });
  }
  
  updateEvents() {
    // Process all pending events each frame
    this.eventBus.processEvents();
  }
  
  updateMovement() {
    const keysPressed = this.inputHandler.getKeysPressed();
    const entities = this.gameStateManager.getAllEntities();
    
    // Store position before movement update
    const oldX = this.player.x;
    const oldY = this.player.y;
    
    this.movementSystem.updateMovement(
      keysPressed, 
      this.movementState, 
      this.tileMap, 
      this.player,
      entities
    );
    
    // Check if player moved to new grid position and publish event
    if (this.player.x !== oldX || this.player.y !== oldY) {
      const moveEvent = {
        type: 'EntityMoved' as const,
        id: generateEventId(),
        timestamp: Date.now(),
        entityId: this.player.id,
        oldPosition: { x: oldX, y: oldY },
        newPosition: { x: this.player.x, y: this.player.y }
      };
      this.logger.debug('📍 Publishing EntityMoved event', { 
        oldPosition: { x: oldX, y: oldY },
        newPosition: { x: this.player.x, y: this.player.y },
        xChanged: this.player.x !== oldX,
        yChanged: this.player.y !== oldY,
        eventId: moveEvent.id
      });
      this.eventBus.publish(moveEvent);
    }
  }
  
  
  

  updateVisuals() {
    // Check if camera needs to move based on player position
    const cameraMoved = this.renderer.updateCameraForPlayer({ 
      x: Math.round(this.movementState.displayX), 
      y: Math.round(this.movementState.displayY) 
    } as Entity);
    
    // Terminal renderers need full re-render each frame
    if (this.renderer.needsEntityClearingEachFrame?.()) {
      this.render();
      return;
    }
    
    // Re-render if camera moved (PixiJS only)
    if (cameraMoved) {
      this.render();
      return; // render() will handle entity positioning
    }
    
    // Update player visual position (PixiJS only)
    if (this.renderer.entityTextMap && this.renderer.hpTextMap) {
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
    }
    
    // Always update visibility alpha based on current player position
    // This handles smooth FOV updates as player moves between grid positions
    // Use rounded coordinates for line of sight calculations
    const playerGridX = Math.round(this.movementState.displayX);
    const playerGridY = Math.round(this.movementState.displayY);
    this.renderer.updateVisibilityAlpha(playerGridX, playerGridY, this.tileMap, LineOfSight);
  }
  
  async waitForFontsAndRender() {
    // Initialize audio system
    try {
      await this.audioSystem.initialize();
    } catch (e) {
      this.logger.warn('Audio initialization failed, continuing without audio');
    }
    
    // Load all fonts comprehensively
    try {
      await document.fonts.load('16px "Perfect DOS VGA 437 Win"');
      await document.fonts.load('12px "Perfect DOS VGA 437 Win"');
      await document.fonts.load('8px "Perfect DOS VGA 437 Win"'); // For HP text
    } catch (e) {
      this.logger.warn('Font failed to load, using fallback');
    }
    
    // Test all emojis we use to ensure they render consistently
    const testEmojis = ['🧙', '👺']; // Add all emojis used in game
    const testCanvas = document.createElement('canvas');
    const ctx = testCanvas.getContext('2d');
    
    if (ctx) {
      for (const emoji of testEmojis) {
        // Test each emoji with our font stack
        ctx.font = '16px "Perfect DOS VGA 437 Win", "Perfect DOS VGA 437", Apple Color Emoji, Segoe UI Emoji, sans-serif';
        const metrics = ctx.measureText(emoji);
        this.logger.debug(`Font test for ${emoji}: width=${metrics.width}`);
      }
      
      // Additional delay to ensure PixiJS can access fonts
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    this.render();
    this.startGameLoop();
  }

  render() {
    // Update camera to follow player (edge-following, not centering)
    this.renderer.updateCameraForPlayer(this.player);
    
    // Clear tiles each frame (needed for viewport changes)
    this.renderer.clearTiles();
    
    // Clear entities for terminal renderers that redraw everything each frame
    if (this.renderer.needsEntityClearingEachFrame?.()) {
      this.renderer.clearEntities();
    }
    
    // Set up light passes function for renderers with native LOS
    if (this.renderer.hasNativeLOS?.() && this.renderer.setLightPassesFunction) {
      this.renderer.setLightPassesFunction((x, y) => {
        const tile = this.tileMap.getTile(x, y);
        return tile.walkable && !tile.blocksLight;
      });
    }
    
    // Only render tiles that are visible in the camera viewport
    const startX = Math.max(0, this.renderer.cameraX);
    const endX = Math.min(this.tileMap.width, this.renderer.cameraX + this.renderer.viewportWidth);
    const startY = Math.max(0, this.renderer.cameraY);
    const endY = Math.min(this.tileMap.height, this.renderer.cameraY + this.renderer.viewportHeight);
    
    // Choose LOS algorithm based on renderer capabilities
    const useNativeLOS = this.renderer.hasNativeLOS?.();
    let visibleCells: Set<string> | null = null;
    
    if (useNativeLOS && (this.renderer as any).calculateFOV) {
      // Use renderer's native FOV calculation
      visibleCells = (this.renderer as any).calculateFOV(this.player.x, this.player.y, 8);
      if (visibleCells) {
        Logger.debug('Using native FOV algorithm:', Array.from(visibleCells).slice(0, 5));
      }
    }
    
    // Render tiles with appropriate line of sight check
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.tileMap.getTile(x, y);
        const distance = Math.sqrt((x - this.player.x) ** 2 + (y - this.player.y) ** 2);
        
        let hasLOS: boolean;
        if (useNativeLOS && visibleCells) {
          hasLOS = visibleCells.has(`${x},${y}`);
        } else {
          hasLOS = LineOfSight.hasLineOfSight(this.tileMap, this.player.x, this.player.y, x, y);
        }
        
        // Mark tiles as explored when they become visible
        if (hasLOS) {
          this.tileMap.setVisibility(x, y, { explored: true, visible: true });
        }
        
        this.renderer.renderTileWithVisibility(x, y, tile, distance, hasLOS);
      }
    }
    
    // Render entities with appropriate line of sight check
    const entities = this.gameStateManager.getAllEntities();
    for (const entity of entities) {
      const distance = Math.sqrt((entity.x - this.player.x) ** 2 + (entity.y - this.player.y) ** 2);
      
      let hasLOS: boolean;
      if (useNativeLOS && visibleCells) {
        hasLOS = visibleCells.has(`${entity.x},${entity.y}`);
      } else {
        hasLOS = LineOfSight.hasLineOfSight(this.tileMap, this.player.x, this.player.y, entity.x, entity.y);
      }
      
      this.renderer.renderEntityWithVisibility(entity, distance, hasLOS);
    }
    
    // Call render method for double-buffered renderers (like Malwoden)
    if (this.renderer.render) {
      this.renderer.render();
    }
  }

  // Audio testing utilities for debugging
  testAudio() {
    this.logger.debug('🔊 Audio system debug info:', this.audioSystem.getDebugInfo());
    this.audioSystem.testSound(); // Test basic tone
  }
  
  testFootstep() {
    this.audioSystem.testSound('footstep');
  }
  
  testMusic() {
    this.audioSystem.testMusic();
  }

  // Reset and test music
  resetMusic() {
    this.audioSystem.resetBackgroundMusic();
    setTimeout(() => {
      this.audioSystem.testMusic();
    }, 100);
  }

  // Test movement event publishing
  testMovementEvent() {
    const moveEvent = {
      type: 'EntityMoved' as const,
      id: generateEventId(),
      timestamp: Date.now(),
      entityId: this.player.id, // Should be 'player' based on isPlayer === true
      oldPosition: { x: this.player.x, y: this.player.y },
      newPosition: { x: this.player.x + 1, y: this.player.y }
    };
    
    this.logger.info('🧪 Manual test - publishing EntityMoved event', { 
      moveEvent,
      playerId: this.player.id,
      playerIsPlayer: this.player.isPlayer 
    });
    
    this.eventBus.publish(moveEvent);
  }

  // Debug player info
  debugPlayer() {
    this.logger.debug('🧪 Player debug info:', {
      id: this.player.id,
      isPlayer: this.player.isPlayer,
      position: { x: this.player.x, y: this.player.y },
      displayPosition: { x: this.movementState.displayX, y: this.movementState.displayY },
      fullPlayerObject: this.player
    });
  }

  // Cleanup method for proper resource management
  destroy() {
    this.inputHandler.destroy();
    this.gameStateManager.cleanup();
  }
}