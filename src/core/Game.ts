import { DefaultRenderer } from './renderers/DefaultRenderer';
import { TileMap } from './TileMap';
import { Entity } from '../types';
import { LineOfSight } from './LineOfSight';
import { InputHandler, ModeCallbacks } from '../systems/input/InputHandler';
import { MovementSystem, MovementState } from '../systems/movement/MovementSystem';
import { CombatManager } from '../systems/combat/CombatManager';
import { GameStateManager } from '../managers/GameStateManager';
import { ResourceManager } from '../managers/ResourceManager';
import { UIManager } from '../managers/UIManager';
import { EventBus, EventBusConfig } from './events/EventBus';
import { Logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { generateEventId } from './events/GameEvent';
import { AudioSystem } from '../systems/audio/AudioSystem';
import { getFontsToLoad } from '../config/fonts';
import { GameModeManager } from '../systems/game-modes/GameModeManager';
import { TurnOrderManager } from '../systems/combat/TurnOrderManager';

export class Game {
  renderer: DefaultRenderer;
  tileMap: TileMap;
  player: Entity;

  // Global EventBus reference
  private static globalEventBus: EventBus | null = null;

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
  private uiManager: UIManager;
  private gameModeManager: GameModeManager;
  private turnOrderManager: TurnOrderManager;
  
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

    // Set global EventBus reference
    Game.globalEventBus = this.eventBus;
    
    // Initialize audio system with EventBus
    this.audioSystem = new AudioSystem(this.eventBus, this.logger, this.errorHandler);
    
    // Initialize UI manager with EventBus
    this.uiManager = new UIManager(this.eventBus, this.logger);
    
    // Note: World configuration is now initialized in main.ts before Game creation
    
    this.renderer = new DefaultRenderer(50, 30);
    
    // Set up UIManager to trigger renderer updates
    this.uiManager.onUIUpdate(() => {
      const player = this.uiManager.getCurrentPlayer() || this.player;
      const messages = this.uiManager.getMessages();
      this.renderer.renderUI(player, messages);
    });
    this.tileMap = new TileMap(50, 30);
    
    // Initialize systems with EventBus
    this.gameStateManager = new GameStateManager();
    this.movementSystem = new MovementSystem(0.1);
    this.combatManager = new CombatManager(this.renderer, this.eventBus, this.logger);

    // Set up action execution callback for turn management
    this.combatManager.setActionExecutedCallback((result, action) => {
      this.handleActionExecuted(result, action);
    });

    // Initialize game mode and turn order systems
    this.gameModeManager = new GameModeManager(this.eventBus, this.logger);
    this.turnOrderManager = new TurnOrderManager(this.eventBus, this.logger);
    
    // Initialize entities through game state manager with safe spawn positions
    this.gameStateManager.initializeEntities(this.tileMap);
    this.player = this.gameStateManager.getPlayer()!;
    
    // Initialize UI with player data
    this.uiManager.updatePlayer(this.player);
    
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
    
    // Setup input with mode-based callbacks
    const modeCallbacks: ModeCallbacks = {
      exploration: {
        onMovementKey: () => {}, // Movement handled in updateMovement
        onMovementKeyRelease: (keys) => {
          // Snap to grid when no keys are pressed in exploration mode
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
          // In exploration mode, show action selection UI
          const entities = this.gameStateManager.getAllEntities();

          // Check if action selection UI is already open
          if (this.combatManager.isActionSelectionVisible()) {
            return; // UI is already open, ignore additional spacebar presses
          }

          // Show action selection UI
          const shown = this.combatManager.showActionSelection(this.player, entities, this.tileMap);

          if (!shown) {
            this.eventBus.publish({
              type: 'MessageAdded',
              id: generateEventId(),
              timestamp: Date.now(),
              message: "No actions available right now.",
              category: 'system'
            });
          }
        }
      },
      combat: {
        onMovementKey: () => {}, // Movement handled in updateMovement
        onMovementKeyRelease: () => {
          // In combat mode, movement immediately commits to grid
          // No need to snap since combat movement is already grid-based
        },
        onAttack: () => {
          // In combat mode, check if it's the player's turn
          const currentTurn = this.turnOrderManager.getCurrentTurn();
          if (!currentTurn || currentTurn.entityId !== this.player.id) {
            this.eventBus.publish({
              type: 'MessageAdded',
              id: generateEventId(),
              timestamp: Date.now(),
              message: "It's not your turn!",
              category: 'combat'
            });
            return;
          }

          // Check if player has actions remaining
          const actionEconomy = this.turnOrderManager.getActionEconomy(this.player.id);
          if (!actionEconomy || actionEconomy.actions <= 0) {
            this.eventBus.publish({
              type: 'MessageAdded',
              id: generateEventId(),
              timestamp: Date.now(),
              message: "No actions remaining! Press Enter to end turn.",
              category: 'combat'
            });
            return;
          }

          // Check if action selection UI is already open
          if (this.combatManager.isActionSelectionVisible()) {
            return; // UI is already open, ignore additional spacebar presses
          }

          // In combat mode, show action selection UI
          const entities = this.gameStateManager.getAllEntities();
          const shown = this.combatManager.showActionSelection(this.player, entities, this.tileMap);

          if (!shown) {
            this.eventBus.publish({
              type: 'MessageAdded',
              id: generateEventId(),
              timestamp: Date.now(),
              message: "No actions available! Press Enter to end turn.",
              category: 'combat'
            });
            return;
          }
        },
        onEndTurn: () => {
          const currentTurn = this.turnOrderManager.getCurrentTurn();
          if (currentTurn && currentTurn.entityId === this.player.id) {
            // Show what was unused before ending turn
            const actionEconomy = this.turnOrderManager.getActionEconomy(this.player.id);
            if (actionEconomy) {
              const unused = [];
              if (actionEconomy.actions > 0) unused.push(`${actionEconomy.actions} action(s)`);
              if (actionEconomy.movement > 0) unused.push(`${actionEconomy.movement}ft movement`);
              if (actionEconomy.bonusActions > 0) unused.push(`${actionEconomy.bonusActions} bonus action(s)`);
              
              const unusedText = unused.length > 0 ? ` (Unused: ${unused.join(', ')})` : '';
              this.eventBus.publish({
                type: 'MessageAdded',
                id: generateEventId(),
                timestamp: Date.now(),
                message: `Turn ended${unusedText}.`,
                category: 'combat'
              });
            }
            
            this.turnOrderManager.endCurrentTurn();
          } else {
            this.eventBus.publish({
              type: 'MessageAdded',
              id: generateEventId(),
              timestamp: Date.now(),
              message: "It's not your turn!",
              category: 'combat'
            });
          }
        },
        onEscape: () => {
          this.eventBus.publish({
            type: 'MessageAdded',
            id: generateEventId(),
            timestamp: Date.now(),
            message: "Use Enter to end your turn. Fleeing not yet implemented.",
            category: 'combat'
          });
        }
      }
    };
    this.inputHandler = new InputHandler(modeCallbacks);
    
    // Set up game mode event handlers
    this.setupGameModeHandlers();
    
    // Start game loop
    this.waitForFontsAndRender();

    //this.startGameLoop();
    
    // Wait for Perfect DOS VGA 437 fonts to be fully available before rendering
  }
  
  startGameLoop() {
    this.gameStateManager.startGameLoop(() => {
      this.updateCombatDetection();
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
    const currentMode = this.gameModeManager.getCurrentMode();
    
    // In combat mode, enforce turn-based movement
    if (currentMode === 'combat') {
      const currentTurn = this.turnOrderManager.getCurrentTurn();
      if (!currentTurn || currentTurn.entityId !== this.player.id) {
        // Not the player's turn - ignore movement input
        return;
      }
      
      // Check if player has movement remaining
      const actionEconomy = this.turnOrderManager.getActionEconomy(this.player.id);
      if (!actionEconomy || actionEconomy.movement <= 0) {
        // No movement points left
        if (keysPressed.size > 0) {
          this.eventBus.publish({
            type: 'MessageAdded',
            id: generateEventId(),
            timestamp: Date.now(),
            message: "No movement points remaining! Press Enter to end turn.",
            category: 'combat'
          });
        }
        return;
      }
    }
    
    // Store position before movement update
    const oldX = this.player.x;
    const oldY = this.player.y;
    
    this.movementSystem.updateMovement(
      keysPressed, 
      this.movementState, 
      this.tileMap, 
      this.player,
      entities,
      currentMode
    );
    
    // Check if player moved to new grid position and publish event
    if (this.player.x !== oldX || this.player.y !== oldY) {
      // In combat mode, consume movement points for each grid square moved
      if (currentMode === 'combat') {
        const distance = Math.abs(this.player.x - oldX) + Math.abs(this.player.y - oldY);
        const movementCost = distance * 5; // D&D: 5 feet per square
        
        if (this.turnOrderManager.consumeMovement(this.player.id, movementCost)) {
          const remainingMovement = this.turnOrderManager.getActionEconomy(this.player.id)?.movement || 0;
          this.eventBus.publish({
            type: 'MessageAdded',
            id: generateEventId(),
            timestamp: Date.now(),
            message: `Moved ${distance} square(s). ${remainingMovement} movement remaining.`,
            category: 'combat'
          });
        }
      }
      
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
      
      // Also publish PlayerUpdated event for UI
      this.eventBus.publish({
        type: 'PlayerUpdated',
        id: generateEventId(),
        timestamp: Date.now(),
        player: { ...this.player } // Send complete player entity
      });
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
    const entities = this.gameStateManager.getAllEntities();
    this.renderer.updateVisibilityAlpha(playerGridX, playerGridY, this.tileMap, LineOfSight, entities);
  }
  
  async waitForFontsAndRender() {
    // Initialize audio system
    try {
      await this.audioSystem.initialize();
    } catch (e) {
      this.logger.warn('Audio initialization failed, continuing without audio');
    }
    
    // Load fonts using the centralized font system
    try {
      const fontsToLoad = getFontsToLoad();
      for (const fontString of fontsToLoad) {
        await document.fonts.load(fontString);
      }
    } catch (e) {
      this.logger.warn('Font failed to load, using fallback');
    }
    
    // Additional delay to ensure PixiJS can access fonts
    await new Promise(resolve => setTimeout(resolve, 200));
    
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
    
    // Use current visual position for FOV (consistent with updateVisuals)
    const fovPlayerX = Math.round(this.movementState.displayX);
    const fovPlayerY = Math.round(this.movementState.displayY);
    
    if (useNativeLOS && (this.renderer as any).calculateFOV) {
      // Use renderer's native FOV calculation
      visibleCells = (this.renderer as any).calculateFOV(fovPlayerX, fovPlayerY, 8);
      if (visibleCells) {
        Logger.debug('Using native FOV algorithm:', Array.from(visibleCells).slice(0, 5));
      }
    }
    
    // Render tiles with appropriate line of sight check
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.tileMap.getTile(x, y);
        const distance = Math.sqrt((x - fovPlayerX) ** 2 + (y - fovPlayerY) ** 2);
        
        let hasLOS: boolean;
        if (useNativeLOS && visibleCells) {
          hasLOS = visibleCells.has(`${x},${y}`);
        } else {
          hasLOS = LineOfSight.hasLineOfSight(this.tileMap, fovPlayerX, fovPlayerY, x, y);
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
      const distance = Math.sqrt((entity.x - fovPlayerX) ** 2 + (entity.y - fovPlayerY) ** 2);
      
      let hasLOS: boolean;
      if (useNativeLOS && visibleCells) {
        hasLOS = visibleCells.has(`${entity.x},${entity.y}`);
      } else {
        hasLOS = LineOfSight.hasLineOfSight(this.tileMap, fovPlayerX, fovPlayerY, entity.x, entity.y);
      }
      
      this.renderer.renderEntityWithVisibility(entity, distance, hasLOS);
    }
    
    // Call render method for double-buffered renderers (like Malwoden)
    if (this.renderer.render) {
      this.renderer.render();
    }
  }


  private setupGameModeHandlers(): void {
    // Listen for game mode changes to update input handler
    this.eventBus.subscribe('GameModeChanged', (event: any) => {
      this.inputHandler.setMode(event.newMode);
      
      // Handle combat entry transition
      if (event.newMode === 'combat' && event.oldMode === 'exploration') {
        // Snap visual position to grid center
        this.movementState.displayX = Math.round(this.movementState.displayX);
        this.movementState.displayY = Math.round(this.movementState.displayY);
        this.movementState.lastValidX = this.movementState.displayX;
        this.movementState.lastValidY = this.movementState.displayY;
        
        // Update player logical position to match
        this.player.x = this.movementState.displayX;
        this.player.y = this.movementState.displayY;
        
        // Freeze input for 500ms to prevent accidental movement
        this.inputHandler.freezeInput(500);
        
        // Show visual feedback about the transition - less redundant now that CombatTriggered shows the enemy
        this.eventBus.publish({
          type: 'MessageAdded',
          id: generateEventId(),
          timestamp: Date.now(),
          message: "ox{:::> COMBAT MODE <:::}xo",
          category: 'combat'
        });
        
        this.logger.info('Combat transition: snapped to grid and froze input', {
          position: { x: this.player.x, y: this.player.y }
        });
        
        // Re-render to show the position snap
        this.render();
      }
      
      this.logger.info('Game mode changed', {
        from: event.oldMode,
        to: event.newMode,
        reason: event.reason
      });
    });

    // Listen for combat triggered events to start turn-based combat
    this.eventBus.subscribe('CombatTriggered', (event: any) => {
      const entities = this.gameStateManager.getAllEntities();
      const hostileEntity = entities.find(e => e.id === event.hostileId);

      // Use the participants decided by GameModeManager (the "DM")
      const participantEntities = event.participants.map((p: any) =>
        entities.find(e => e.id === p.id)
      ).filter(Boolean); // Remove any null/undefined entities

      // Always include the player
      if (!participantEntities.find((e: any) => e.id === this.player.id)) {
        participantEntities.unshift(this.player);
      }

      this.turnOrderManager.startCombat(participantEntities);
      
      // Show who spotted the player
      const triggerMessage = hostileEntity 
        ? `Spotted by ${hostileEntity.name}!`
        : "Enemy spotted!";
        
      this.eventBus.publish({
        type: 'MessageAdded',
        id: generateEventId(),
        timestamp: Date.now(),
        message: `${triggerMessage} Rolling initiative...`,
        category: 'combat'
      });
    });

    // Listen for combat ended events
    this.eventBus.subscribe('CombatEnded', (event: any) => {
      this.eventBus.publish({
        type: 'MessageAdded',
        id: generateEventId(),
        timestamp: Date.now(),
        message: `Combat ended: ${event.reason.replace(/_/g, ' ')}`,
        category: 'combat'
      });
    });

    // Listen for turn changes
    this.eventBus.subscribe('TurnStarted', (event: any) => {
      const entities = this.gameStateManager.getAllEntities();
      const entity = entities.find(e => e.id === event.entityId);
      if (entity) {
        const isPlayerTurn = entity.id === this.player.id;
        const actionEconomy = this.turnOrderManager.getActionEconomy(entity.id);
        
        let turnMessage = `${entity.name}'s turn (Initiative: ${event.initiative})`;
        if (isPlayerTurn && actionEconomy) {
          turnMessage += `\n━━━ YOUR TURN ━━━`;
          turnMessage += `\nActions: ${actionEconomy.actions} | Movement: ${actionEconomy.movement}ft | Bonus: ${actionEconomy.bonusActions} | Reactions: ${actionEconomy.reactions}`;
          turnMessage += `\n• WASD/Arrows: Move • Space: Attack • Enter: End Turn`;
        }
        
        this.eventBus.publish({
          type: 'MessageAdded',
          id: generateEventId(),
          timestamp: Date.now(),
          message: turnMessage,
          category: 'combat'
        });
        
        // Update UI with combat status
        this.eventBus.publish({
          type: 'UIRefresh',
          id: generateEventId(),
          timestamp: Date.now(),
          reason: 'combat_resolved'
        });
      }
    });
  }

  private updateCombatDetection(): void {
    // Only check for combat triggers in exploration mode
    if (this.gameModeManager.getCurrentMode() === 'exploration') {
      const entities = this.gameStateManager.getAllEntities();
      const trigger = this.gameModeManager.checkForCombatTriggers(
        this.player,
        entities,
        this.tileMap
      );

      if (trigger) {
        this.gameModeManager.triggerCombat(trigger, entities, this.tileMap);
      }
    } else if (this.gameModeManager.getCurrentMode() === 'combat') {
      // Check if combat should end
      const entities = this.gameStateManager.getAllEntities();
      const endCondition = this.gameModeManager.checkCombatEndConditions(
        this.player,
        entities
      );

      if (endCondition) {
        this.gameModeManager.endCombat(endCondition);
      }
    }
  }

  // Developer methods for testing
  skipEnemyTurn(): void {
    if (this.gameModeManager.getCurrentMode() !== 'combat') {
      console.log('❌ Not in combat mode - cannot skip enemy turn');
      return;
    }

    const currentTurn = this.turnOrderManager.getCurrentTurn();
    if (!currentTurn) {
      console.log('❌ No current turn to skip');
      return;
    }

    if (currentTurn.entityId === this.player.id) {
      console.log('❌ It\'s the player\'s turn - cannot skip enemy turn');
      return;
    }

    // Find the entity whose turn it is
    const entities = this.gameStateManager.getAllEntities();
    const currentEntity = entities.find(e => e.id === currentTurn.entityId);

    console.log(`⏭️ Skipping ${currentEntity?.name || 'Unknown'}'s turn`);

    this.eventBus.publish({
      type: 'MessageAdded',
      id: generateEventId(),
      timestamp: Date.now(),
      message: `${currentEntity?.name || 'Enemy'} skips turn (dev)`,
      category: 'combat'
    });

    // End the current turn
    this.turnOrderManager.endCurrentTurn();
  }

  /**
   * Handle action execution from the action selection UI
   * This includes turn management and entity cleanup
   */
  private handleActionExecuted(result: any, action: any): void {
    // Handle entity removal if target was killed
    if (result.success && result.targetKilled && result.target) {
      this.gameStateManager.removeEntity(result.target.id);
    }

    // Handle turn management based on current game mode
    const currentMode = this.gameModeManager.getCurrentMode();

    if (currentMode === 'combat') {
      // In combat mode, consume an action point and update turn display
      if (this.turnOrderManager.consumeAction(this.player.id, 'action')) {
        const actionEconomy = this.turnOrderManager.getActionEconomy(this.player.id);
        const actionsLeft = actionEconomy?.actions || 0;
        const movementLeft = actionEconomy?.movement || 0;

        this.eventBus.publish({
          type: 'MessageAdded',
          id: generateEventId(),
          timestamp: Date.now(),
          message: `${action.name} complete. Actions: ${actionsLeft} | Movement: ${movementLeft}ft remaining`,
          category: 'combat'
        });
      }
    }

    // Always re-render after action execution
    if (result.success) {
      this.render();
    }
  }

  // Cleanup method for proper resource management
  destroy() {
    this.inputHandler.destroy();
    this.gameStateManager.cleanup();
    this.uiManager.destroy();
    this.gameModeManager.destroy();
    this.turnOrderManager.destroy();
  }

  /**
   * Get the global EventBus instance
   * This allows any module to access the shared EventBus without dependency injection
   */
  static getGlobalEventBus(): EventBus | null {
    return Game.globalEventBus;
  }
}