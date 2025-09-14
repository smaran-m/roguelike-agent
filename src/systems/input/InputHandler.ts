import { Logger } from '../../utils/Logger';
import { getFontFamily } from '../../config/fonts';
import { GameMode } from '../game-modes/GameModeTypes';

export interface InputCallbacks {
  onMovementKey: (keys: Set<string>) => void;
  onMovementKeyRelease: (keys: Set<string>) => void;
  onAttack: () => void;
}

export interface CombatInputCallbacks extends InputCallbacks {
  onEndTurn?: () => void;
  onEscape?: () => void; // For combat menu or flee
}

export interface ModeCallbacks {
  exploration: InputCallbacks;
  combat: CombatInputCallbacks;
}

export class InputHandler {
  private keysPressed: Set<string> = new Set();
  private callbacks: InputCallbacks;
  private modeCallbacks: ModeCallbacks | null = null;
  private currentMode: GameMode = 'exploration';
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private combatMovementProcessed: boolean = false;
  private inputFrozen: boolean = false;
  private frozenUntil: number = 0;

  constructor(callbacks: InputCallbacks | ModeCallbacks) {
    if ('exploration' in callbacks && 'combat' in callbacks) {
      // Mode-based callbacks
      this.modeCallbacks = callbacks as ModeCallbacks;
      this.callbacks = this.modeCallbacks.exploration;
    } else {
      // Single callback set (backwards compatibility)
      this.callbacks = callbacks as InputCallbacks;
    }
    
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    
    // Debug toggle (F12) - always allow
    if (e.key === 'F12') {
      e.preventDefault();
      const isVerbose = Logger.toggleVerboseMode();
      this.showDebugToggleIndicator(isVerbose);
      return;
    }
    
    // Check if input is frozen
    if (this.isInputFrozen()) {
      e.preventDefault();
      return;
    }
    
    // Movement keys
    if (this.isMovementKey(key)) {
      e.preventDefault();
      
      // In combat mode, only allow one movement command per key press
      if (this.currentMode === 'combat') {
        // Only process if this is a new key press (not held down)
        if (!this.keysPressed.has(key)) {
          this.keysPressed.add(key);
          this.combatMovementProcessed = false;
          this.callbacks.onMovementKey(new Set(this.keysPressed));
        }
      } else {
        // Exploration mode: continuous movement
        this.keysPressed.add(key);
        this.callbacks.onMovementKey(new Set(this.keysPressed));
      }
    }
    
    // Attack key (spacebar)
    if (key === ' ') {
      e.preventDefault();
      this.callbacks.onAttack();
    }
    
    // Combat-specific keys
    if (this.currentMode === 'combat') {
      const combatCallbacks = this.callbacks as CombatInputCallbacks;
      
      // End turn (Enter key)
      if (key === 'enter' && combatCallbacks.onEndTurn) {
        e.preventDefault();
        combatCallbacks.onEndTurn();
      }
      
      // Escape for combat menu or flee
      if (key === 'escape' && combatCallbacks.onEscape) {
        e.preventDefault();
        combatCallbacks.onEscape();
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    // Always process key up events to clear pressed keys, but ignore if frozen
    const key = e.key.toLowerCase();
    if (this.isMovementKey(key)) {
      e.preventDefault();
      this.keysPressed.delete(key);
      
      // Reset combat movement flag when all movement keys are released
      if (this.currentMode === 'combat' && this.keysPressed.size === 0) {
        this.combatMovementProcessed = false;
      }
      
      // Only call callbacks if input is not frozen
      if (!this.isInputFrozen()) {
        this.callbacks.onMovementKeyRelease(new Set(this.keysPressed));
      }
    }
  }

  private isMovementKey(key: string): boolean {
    return ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key);
  }

  private showDebugToggleIndicator(isVerbose: boolean): void {
    // Create a temporary visual indicator
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${isVerbose ? '#4CAF50' : '#FF9800'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-family: ${getFontFamily()};
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: opacity 0.3s ease;
    `;
    indicator.textContent = `Debug Verbose: ${isVerbose ? 'ON' : 'OFF'}`;
    
    document.body.appendChild(indicator);
    
    // Remove indicator after 2 seconds
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => {
        if (indicator.parentNode) {
          document.body.removeChild(indicator);
        }
      }, 300);
    }, 2000);
  }

  getKeysPressed(): Set<string> {
    // Return empty set if input is frozen
    if (this.isInputFrozen()) {
      return new Set();
    }
    
    if (this.currentMode === 'combat') {
      // In combat mode, only return movement keys once per press
      if (this.combatMovementProcessed) {
        return new Set(); // No keys if movement already processed this press
      } else {
        this.combatMovementProcessed = true;
        return new Set(this.keysPressed);
      }
    } else {
      // Exploration mode: normal continuous key detection
      return new Set(this.keysPressed);
    }
  }

  setMode(mode: GameMode): void {
    if (!this.modeCallbacks) {
      // Single callback mode, ignore mode switching
      return;
    }
    
    this.currentMode = mode;
    this.callbacks = mode === 'combat' 
      ? this.modeCallbacks.combat 
      : this.modeCallbacks.exploration;
      
    Logger.getInstance().debug('Input mode switched', { newMode: mode });
  }

  getCurrentMode(): GameMode {
    return this.currentMode;
  }

  freezeInput(duration: number = 500): void {
    this.inputFrozen = true;
    this.frozenUntil = Date.now() + duration;
    
    // Clear any currently pressed keys
    this.keysPressed.clear();
    this.combatMovementProcessed = false;
    
    Logger.getInstance().debug('Input frozen', { duration, until: this.frozenUntil });
  }

  private isInputFrozen(): boolean {
    if (this.inputFrozen && Date.now() >= this.frozenUntil) {
      this.inputFrozen = false;
      Logger.getInstance().debug('Input unfrozen');
      
      // Show a subtle indicator that input is active again
      const indicator = document.createElement('div');
      indicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.4);
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        border-color: white;
        font-family: ${getFontFamily()};
        font-size: 12px;
        z-index: 10000;
        pointer-events: none;
        transition: opacity 0.3s ease;
      `;
      indicator.textContent = 'ENTERING COMBAT';
      
      document.body.appendChild(indicator);
      
      // Remove after brief display
      setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => {
          if (indicator.parentNode) {
            document.body.removeChild(indicator);
          }
        }, 300);
      }, 800);
    }
    return this.inputFrozen;
  }

  destroy() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.keysPressed.clear();
  }
}