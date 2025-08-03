export enum GameErrorCode {
  RENDERING_ERROR = 'RENDERING_ERROR',
  RESOURCE_LOADING_ERROR = 'RESOURCE_LOADING_ERROR',
  MOVEMENT_ERROR = 'MOVEMENT_ERROR',
  COMBAT_ERROR = 'COMBAT_ERROR',
  INPUT_ERROR = 'INPUT_ERROR',
  GAME_STATE_ERROR = 'GAME_STATE_ERROR',
  LINE_OF_SIGHT_ERROR = 'LINE_OF_SIGHT_ERROR',
  TILEMAP_ERROR = 'TILEMAP_ERROR'
}

export class GameError extends Error {
  public readonly code: GameErrorCode;
  public readonly context?: any;
  public readonly timestamp: Date;

  constructor(message: string, code: GameErrorCode, context?: any) {
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

  handleError(error: Error | GameError, code?: GameErrorCode, context?: any): void {
    let gameError: GameError;

    if (error instanceof GameError) {
      gameError = error;
    } else {
      gameError = new GameError(
        error.message,
        code || GameErrorCode.GAME_STATE_ERROR,
        context
      );
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
    return new GameError(message, GameErrorCode.RENDERING_ERROR, context);
  }

  static createResourceError(message: string, context?: any): GameError {
    return new GameError(message, GameErrorCode.RESOURCE_LOADING_ERROR, context);
  }

  static createMovementError(message: string, context?: any): GameError {
    return new GameError(message, GameErrorCode.MOVEMENT_ERROR, context);
  }

  static createCombatError(message: string, context?: any): GameError {
    return new GameError(message, GameErrorCode.COMBAT_ERROR, context);
  }

  static createInputError(message: string, context?: any): GameError {
    return new GameError(message, GameErrorCode.INPUT_ERROR, context);
  }

  static createLineOfSightError(message: string, context?: any): GameError {
    return new GameError(message, GameErrorCode.LINE_OF_SIGHT_ERROR, context);
  }

  static createTilemapError(message: string, context?: any): GameError {
    return new GameError(message, GameErrorCode.TILEMAP_ERROR, context);
  }
}

// Global error handler setup
export function setupGlobalErrorHandling(): void {
  const errorHandler = ErrorHandler.getInstance();

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleError(
      new Error(event.reason),
      GameErrorCode.GAME_STATE_ERROR,
      { type: 'unhandledrejection', reason: event.reason }
    );
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    errorHandler.handleError(
      event.error || new Error(event.message),
      GameErrorCode.GAME_STATE_ERROR,
      { 
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    );
  });
}