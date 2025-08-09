import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputHandler, InputCallbacks } from '../../../src/systems/input/InputHandler';
import { Logger } from '../../../src/utils/Logger';

// Mock Logger for debug toggle testing
vi.mock('../../../src/utils/Logger', () => ({
  Logger: {
    toggleVerboseMode: vi.fn().mockReturnValue(true)
  }
}));

// Mock DOM methods for indicator testing
Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    style: { cssText: '' },
    textContent: '',
    setAttribute: vi.fn()
  }))
});

Object.defineProperty(document, 'body', {
  value: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
});

describe('InputHandler', () => {
  let inputHandler: InputHandler;
  let mockCallbacks: InputCallbacks;
  let keyDownEvents: KeyboardEvent[] = [];
  let keyUpEvents: KeyboardEvent[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock callback functions
    mockCallbacks = {
      onMovementKey: vi.fn(),
      onMovementKeyRelease: vi.fn(),
      onAttack: vi.fn()
    };

    // Mock addEventListener to capture event handlers
    vi.spyOn(window, 'addEventListener').mockImplementation((event: string, handler: any) => {
      if (event === 'keydown') {
        keyDownEvents.push = (e: KeyboardEvent) => handler(e);
      } else if (event === 'keyup') {
        keyUpEvents.push = (e: KeyboardEvent) => handler(e);
      }
    });

    vi.spyOn(window, 'removeEventListener');

    inputHandler = new InputHandler(mockCallbacks);
  });

  afterEach(() => {
    inputHandler.destroy();
    vi.restoreAllMocks();
    keyDownEvents = [];
    keyUpEvents = [];
  });

  describe('Movement Key Detection', () => {
    const movementKeys = [
      { key: 'ArrowUp', normalized: 'arrowup' },
      { key: 'ArrowDown', normalized: 'arrowdown' },
      { key: 'ArrowLeft', normalized: 'arrowleft' },
      { key: 'ArrowRight', normalized: 'arrowright' },
      { key: 'w', normalized: 'w' },
      { key: 'W', normalized: 'w' }, // Test case normalization
      { key: 'a', normalized: 'a' },
      { key: 's', normalized: 's' },
      { key: 'd', normalized: 'd' }
    ];

    movementKeys.forEach(({ key, normalized }) => {
      it(`should recognize ${key} as movement key`, () => {
        const event = new KeyboardEvent('keydown', { key });
        event.preventDefault = vi.fn();
        
        // Simulate the key event
        inputHandler['handleKeyDown'](event);
        
        expect(event.preventDefault).toHaveBeenCalled();
        expect(mockCallbacks.onMovementKey).toHaveBeenCalledWith(new Set([normalized]));
        expect(inputHandler.getKeysPressed()).toContain(normalized);
      });
    });

    const nonMovementKeys = ['Enter', 'Escape', 'Tab', 'Shift', 'q', 'e', 'r'];
    
    nonMovementKeys.forEach(key => {
      it(`should not recognize ${key} as movement key`, () => {
        const event = new KeyboardEvent('keydown', { key });
        event.preventDefault = vi.fn();
        
        inputHandler['handleKeyDown'](event);
        
        expect(mockCallbacks.onMovementKey).not.toHaveBeenCalled();
        expect(inputHandler.getKeysPressed()).not.toContain(key.toLowerCase());
      });
    });
  });

  describe('Key State Management', () => {
    it('should track multiple simultaneous key presses', () => {
      const event1 = new KeyboardEvent('keydown', { key: 'w' });
      const event2 = new KeyboardEvent('keydown', { key: 'a' });
      event1.preventDefault = vi.fn();
      event2.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](event1);
      inputHandler['handleKeyDown'](event2);
      
      const keysPressed = inputHandler.getKeysPressed();
      expect(keysPressed).toContain('w');
      expect(keysPressed).toContain('a');
      expect(keysPressed.size).toBe(2);
      
      // Should call movement callback with both keys
      expect(mockCallbacks.onMovementKey).toHaveBeenCalledTimes(2);
      expect(mockCallbacks.onMovementKey).toHaveBeenLastCalledWith(new Set(['w', 'a']));
    });

    it('should handle key releases correctly', () => {
      // Press two keys
      const downEvent1 = new KeyboardEvent('keydown', { key: 'w' });
      const downEvent2 = new KeyboardEvent('keydown', { key: 'd' });
      downEvent1.preventDefault = vi.fn();
      downEvent2.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](downEvent1);
      inputHandler['handleKeyDown'](downEvent2);
      
      expect(inputHandler.getKeysPressed().size).toBe(2);
      
      // Release one key
      const upEvent = new KeyboardEvent('keyup', { key: 'w' });
      upEvent.preventDefault = vi.fn();
      
      inputHandler['handleKeyUp'](upEvent);
      
      const remainingKeys = inputHandler.getKeysPressed();
      expect(remainingKeys).not.toContain('w');
      expect(remainingKeys).toContain('d');
      expect(remainingKeys.size).toBe(1);
      
      expect(mockCallbacks.onMovementKeyRelease).toHaveBeenCalledWith(new Set(['d']));
    });

    it('should prevent duplicate key presses from being added', () => {
      const event = new KeyboardEvent('keydown', { key: 'w' });
      event.preventDefault = vi.fn();
      
      // Press same key twice
      inputHandler['handleKeyDown'](event);
      inputHandler['handleKeyDown'](event);
      
      const keysPressed = inputHandler.getKeysPressed();
      expect(keysPressed.size).toBe(1);
      expect(keysPressed).toContain('w');
      
      // Should only call callback twice (once per press attempt)
      expect(mockCallbacks.onMovementKey).toHaveBeenCalledTimes(2);
    });
  });

  describe('Attack Input', () => {
    it('should handle spacebar as attack input', () => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      event.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockCallbacks.onAttack).toHaveBeenCalledTimes(1);
    });

    it('should not add spacebar to movement keys', () => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      event.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](event);
      
      expect(inputHandler.getKeysPressed()).not.toContain(' ');
      expect(mockCallbacks.onMovementKey).not.toHaveBeenCalled();
    });

    it('should handle multiple attack presses', () => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      event.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](event);
      inputHandler['handleKeyDown'](event);
      inputHandler['handleKeyDown'](event);
      
      expect(mockCallbacks.onAttack).toHaveBeenCalledTimes(3);
    });
  });

  describe('Debug Toggle (F12)', () => {
    it('should handle F12 key press for debug toggle', () => {
      const event = new KeyboardEvent('keydown', { key: 'F12' });
      event.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(Logger.toggleVerboseMode).toHaveBeenCalledTimes(1);
    });

    it('should not treat F12 as movement or attack key', () => {
      const event = new KeyboardEvent('keydown', { key: 'F12' });
      event.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](event);
      
      expect(mockCallbacks.onMovementKey).not.toHaveBeenCalled();
      expect(mockCallbacks.onAttack).not.toHaveBeenCalled();
      expect(inputHandler.getKeysPressed()).not.toContain('f12');
    });

    it('should create debug indicator element', () => {
      const event = new KeyboardEvent('keydown', { key: 'F12' });
      event.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](event);
      
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(document.body.appendChild).toHaveBeenCalled();
    });
  });

  describe('Key Normalization', () => {
    it('should normalize keys to lowercase', () => {
      const upperCaseEvent = new KeyboardEvent('keydown', { key: 'W' });
      upperCaseEvent.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](upperCaseEvent);
      
      expect(inputHandler.getKeysPressed()).toContain('w');
      expect(inputHandler.getKeysPressed()).not.toContain('W');
    });

    it('should handle arrow key normalization correctly', () => {
      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      arrowEvent.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](arrowEvent);
      
      expect(inputHandler.getKeysPressed()).toContain('arrowup');
      expect(mockCallbacks.onMovementKey).toHaveBeenCalledWith(new Set(['arrowup']));
    });
  });

  describe('Event Prevention', () => {
    it('should prevent default for movement keys to avoid browser navigation', () => {
      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      arrowEvent.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](arrowEvent);
      
      expect(arrowEvent.preventDefault).toHaveBeenCalled();
    });

    it('should prevent default for attack key to avoid form submission', () => {
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      spaceEvent.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](spaceEvent);
      
      expect(spaceEvent.preventDefault).toHaveBeenCalled();
    });

    it('should prevent default for debug key to avoid dev tools', () => {
      const f12Event = new KeyboardEvent('keydown', { key: 'F12' });
      f12Event.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](f12Event);
      
      expect(f12Event.preventDefault).toHaveBeenCalled();
    });

    it('should prevent default on keyup for movement keys', () => {
      const keyUpEvent = new KeyboardEvent('keyup', { key: 'w' });
      keyUpEvent.preventDefault = vi.fn();
      
      inputHandler['handleKeyUp'](keyUpEvent);
      
      expect(keyUpEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Complex Input Scenarios', () => {
    it('should handle diagonal movement correctly', () => {
      const wEvent = new KeyboardEvent('keydown', { key: 'w' });
      const dEvent = new KeyboardEvent('keydown', { key: 'd' });
      wEvent.preventDefault = vi.fn();
      dEvent.preventDefault = vi.fn();
      
      // Press W and D for diagonal movement
      inputHandler['handleKeyDown'](wEvent);
      inputHandler['handleKeyDown'](dEvent);
      
      const keysPressed = inputHandler.getKeysPressed();
      expect(keysPressed).toContain('w');
      expect(keysPressed).toContain('d');
      expect(keysPressed.size).toBe(2);
      
      // Should have called movement callback with both keys
      expect(mockCallbacks.onMovementKey).toHaveBeenLastCalledWith(new Set(['w', 'd']));
    });

    it('should handle mixed WASD and arrow key input', () => {
      const wEvent = new KeyboardEvent('keydown', { key: 'w' });
      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      wEvent.preventDefault = vi.fn();
      arrowEvent.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](wEvent);
      inputHandler['handleKeyDown'](arrowEvent);
      
      const keysPressed = inputHandler.getKeysPressed();
      expect(keysPressed).toContain('w');
      expect(keysPressed).toContain('arrowright');
      expect(keysPressed.size).toBe(2);
    });

    it('should handle rapid key press and release sequences', () => {
      const key = 'w';
      
      // Rapid press-release-press sequence
      for (let i = 0; i < 5; i++) {
        const downEvent = new KeyboardEvent('keydown', { key });
        const upEvent = new KeyboardEvent('keyup', { key });
        downEvent.preventDefault = vi.fn();
        upEvent.preventDefault = vi.fn();
        
        inputHandler['handleKeyDown'](downEvent);
        inputHandler['handleKeyUp'](upEvent);
      }
      
      // Should end with no keys pressed
      expect(inputHandler.getKeysPressed().size).toBe(0);
      
      // Should have called callbacks for each press/release
      expect(mockCallbacks.onMovementKey).toHaveBeenCalledTimes(5);
      expect(mockCallbacks.onMovementKeyRelease).toHaveBeenCalledTimes(5);
    });
  });

  describe('Resource Cleanup', () => {
    it('should remove event listeners when destroyed', () => {
      inputHandler.destroy();
      
      expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    it('should clear key state when destroyed', () => {
      // Press some keys first
      const wEvent = new KeyboardEvent('keydown', { key: 'w' });
      const dEvent = new KeyboardEvent('keydown', { key: 'd' });
      wEvent.preventDefault = vi.fn();
      dEvent.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](wEvent);
      inputHandler['handleKeyDown'](dEvent);
      
      expect(inputHandler.getKeysPressed().size).toBe(2);
      
      // Destroy should clear state
      inputHandler.destroy();
      
      expect(inputHandler.getKeysPressed().size).toBe(0);
    });
  });

  describe('Input State Queries', () => {
    it('should return immutable copy of keys pressed', () => {
      const wEvent = new KeyboardEvent('keydown', { key: 'w' });
      wEvent.preventDefault = vi.fn();
      
      inputHandler['handleKeyDown'](wEvent);
      
      const keys1 = inputHandler.getKeysPressed();
      const keys2 = inputHandler.getKeysPressed();
      
      // Should be different Set instances (immutable copies)
      expect(keys1).not.toBe(keys2);
      expect(keys1).toEqual(keys2);
      
      // Modifying returned set shouldn't affect internal state
      keys1.add('fake-key');
      expect(inputHandler.getKeysPressed()).not.toContain('fake-key');
    });
  });
});