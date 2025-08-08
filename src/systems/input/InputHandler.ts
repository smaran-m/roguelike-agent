import { Logger } from '../../utils/Logger';

export interface InputCallbacks {
  onMovementKey: (keys: Set<string>) => void;
  onMovementKeyRelease: (keys: Set<string>) => void;
  onAttack: () => void;
}

export class InputHandler {
  private keysPressed: Set<string> = new Set();
  private callbacks: InputCallbacks;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor(callbacks: InputCallbacks) {
    this.callbacks = callbacks;
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
    
    // Debug toggle (F12)
    if (e.key === 'F12') {
      e.preventDefault();
      const isVerbose = Logger.toggleVerboseMode();
      this.showDebugToggleIndicator(isVerbose);
      return;
    }
    
    // Movement keys
    if (this.isMovementKey(key)) {
      e.preventDefault();
      this.keysPressed.add(key);
      this.callbacks.onMovementKey(new Set(this.keysPressed));
    }
    
    // Attack key (spacebar)
    if (key === ' ') {
      e.preventDefault();
      this.callbacks.onAttack();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    if (this.isMovementKey(key)) {
      e.preventDefault();
      this.keysPressed.delete(key);
      this.callbacks.onMovementKeyRelease(new Set(this.keysPressed));
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
      font-family: 'Noto Sans Mono', monospace;
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
    return new Set(this.keysPressed);
  }

  destroy() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.keysPressed.clear();
  }
}