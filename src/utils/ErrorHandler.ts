export enum GameErrorCode {
  RENDERING_ERROR = 'RENDERING_ERROR',
  RESOURCE_LOADING_ERROR = 'RESOURCE_LOADING_ERROR',
  MOVEMENT_ERROR = 'MOVEMENT_ERROR',
  COMBAT_ERROR = 'COMBAT_ERROR',
  INPUT_ERROR = 'INPUT_ERROR',
  GAME_STATE_ERROR = 'GAME_STATE_ERROR',
  LINE_OF_SIGHT_ERROR = 'LINE_OF_SIGHT_ERROR',
  TILEMAP_ERROR = 'TILEMAP_ERROR',
  EVENT_PUBLISHING_FAILED = 'EVENT_PUBLISHING_FAILED',
  EVENT_PROCESSING_FAILED = 'EVENT_PROCESSING_FAILED',
  EVENT_HANDLER_FAILED = 'EVENT_HANDLER_FAILED',
  PATHFINDING_ERROR = 'PATHFINDING_ERROR'
}

export class GameError extends Error {
  public readonly code: GameErrorCode;
  public readonly context?: any;
  public readonly timestamp: Date;

  constructor(code: GameErrorCode, message: string, context?: any) {
    super(message);
    this.name = 'GameError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, GameError.prototype);
  }

  toString(): string {
    return `[${this.code}] ${this.message}`;
  }

  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: GameError) => void> = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handle(code: GameErrorCode, error: Error | string, context?: any): void {
    let gameError: GameError;

    if (error instanceof GameError) {
      gameError = error;
    } else {
      const message = error instanceof Error ? error.message : error;
      gameError = new GameError(code, message, context);
    }

    // Log error
    console.error('Game Error:', gameError.toString(), gameError.context);

    // Notify listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(gameError);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  addErrorListener(listener: (error: GameError) => void): void {
    this.errorListeners.push(listener);
  }

  removeErrorListener(listener: (error: GameError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  // Utility methods for common error scenarios
  static createRenderingError(message: string, context?: any): GameError {
    return new GameError(GameErrorCode.RENDERING_ERROR, message, context);
  }

  static createResourceError(message: string, context?: any): GameError {
    return new GameError(GameErrorCode.RESOURCE_LOADING_ERROR, message, context);
  }

  static createMovementError(message: string, context?: any): GameError {
    return new GameError(GameErrorCode.MOVEMENT_ERROR, message, context);
  }

  static createCombatError(message: string, context?: any): GameError {
    return new GameError(GameErrorCode.COMBAT_ERROR, message, context);
  }

  static createInputError(message: string, context?: any): GameError {
    return new GameError(GameErrorCode.INPUT_ERROR, message, context);
  }

  static createLineOfSightError(message: string, context?: any): GameError {
    return new GameError(GameErrorCode.LINE_OF_SIGHT_ERROR, message, context);
  }

  static createTilemapError(message: string, context?: any): GameError {
    return new GameError(GameErrorCode.TILEMAP_ERROR, message, context);
  }
}

// Global error handler setup
export function setupGlobalErrorHandling(): void {
  const errorHandler = ErrorHandler.getInstance();

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handle(
      GameErrorCode.GAME_STATE_ERROR,
      new Error(event.reason),
      { type: 'unhandledrejection', reason: event.reason }
    );
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    errorHandler.handle(
      GameErrorCode.GAME_STATE_ERROR,
      event.error || new Error(event.message),
      { 
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    );
  });
}