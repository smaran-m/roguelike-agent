import { WorldPicker } from './WorldPicker';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, GameErrorCode } from '../../utils/ErrorHandler';

export class StartScreen {
  private element: HTMLElement;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private onGameStart?: (worldId: string) => void;

  constructor(containerElement: HTMLElement) {
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.element = containerElement;
    
    this.setupHTML();
    new WorldPicker(
      this.element.querySelector('#world-picker-container')!,
      this.handleWorldSelected.bind(this)
    );
  }

  private setupHTML(): void {
    this.element.innerHTML = `
      <div class="start-screen">
        <div class="start-screen__header">
          <h1 class="start-screen__title">Roguelike Agent</h1>
          <p class="start-screen__subtitle">Choose your world to begin</p>
        </div>
        <div id="world-picker-container"></div>
        <div id="loading-overlay" class="loading-overlay hidden">
          <div class="loading-spinner"></div>
          <p>Loading world...</p>
        </div>
      </div>
    `;
  }

  private async handleWorldSelected(worldId: string): Promise<void> {
    try {
      this.showLoading(true);
      this.logger.info('World selected', { worldId });
      
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (this.onGameStart) {
        this.onGameStart(worldId);
      }
    } catch (error) {
      this.errorHandler.handle(GameErrorCode.WORLD_SELECTION_FAILED, error as Error, { worldId });
      this.showError('Failed to load world. Using fantasy world as fallback.');
      
      // Fallback to fantasy
      if (this.onGameStart) {
        this.onGameStart('fantasy');
      }
    } finally {
      this.showLoading(false);
    }
  }

  private showLoading(show: boolean): void {
    const overlay = this.element.querySelector('#loading-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !show);
    }
  }

  private showError(message: string): void {
    // Simple error display - could be enhanced
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff4444;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      z-index: 1000;
    `;
    
    document.body.appendChild(errorDiv);
    setTimeout(() => {
      document.body.removeChild(errorDiv);
    }, 3000);
  }

  public onWorldStart(callback: (worldId: string) => void): void {
    this.onGameStart = callback;
  }

  public hide(): void {
    this.element.style.display = 'none';
  }

  public show(): void {
    this.element.style.display = 'block';
  }
}