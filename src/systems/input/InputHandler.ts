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

  getKeysPressed(): Set<string> {
    return new Set(this.keysPressed);
  }

  destroy() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.keysPressed.clear();
  }
}