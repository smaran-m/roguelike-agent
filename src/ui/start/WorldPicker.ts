import { WorldConfigLoader } from '../../loaders/WorldConfigLoader';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, GameErrorCode } from '../../utils/ErrorHandler';

interface WorldDisplayInfo {
  id: string;
  name: string;
  description: string;
  theme: string;
}

export class WorldPicker {
  private element: HTMLElement;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private onWorldSelected: (worldId: string) => Promise<void>;
  private worlds: WorldDisplayInfo[] = [];
  private selectedIndex: number = 0;

  constructor(
    containerElement: HTMLElement,
    onWorldSelected: (worldId: string) => Promise<void>
  ) {
    this.element = containerElement;
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.onWorldSelected = onWorldSelected;
    
    this.initialize();
    this.setupKeyboardEvents();
  }

  private async initialize(): Promise<void> {
    try {
      this.worlds = WorldConfigLoader.getWorldDisplayList();
      this.render();
      this.logger.info('WorldPicker initialized', { worldCount: this.worlds.length });
    } catch (error) {
      this.errorHandler.handle(GameErrorCode.WORLD_PICKER_INIT_FAILED, error as Error);
      this.renderError();
    }
  }

  private render(): void {
    const worldList = this.worlds.map((world, index) => 
      this.createWorldListItem(world, index === this.selectedIndex)
    ).join('\n');
    
    const display = [
      'SELECT WORLD:',
      '',
      worldList,
      '',
      'Arrow keys to navigate, ENTER to select'
    ].join('\n');
    
    this.element.innerHTML = `<pre style="color: #ffffff; background: #000; font-size: 14px; line-height: 1.2; margin: 0; padding: 20px;">${display}</pre>`;
  }

  private createWorldListItem(world: WorldDisplayInfo, isSelected: boolean): string {
    const cursor = isSelected ? '→' : ' ';
    return `${cursor} ${world.name} - ${world.description}`;
  }


  private setupKeyboardEvents(): void {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.selectedIndex = Math.max(0, this.selectedIndex - 1);
          this.updateSelection();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.selectedIndex = Math.min(this.worlds.length - 1, this.selectedIndex + 1);
          this.updateSelection();
          break;
        case 'Enter':
          e.preventDefault();
          if (this.worlds[this.selectedIndex]) {
            this.selectWorld(this.worlds[this.selectedIndex].id);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    // Store reference to remove later if needed
    (this.element as any).keyboardHandler = handleKeyPress;
  }

  private updateSelection(): void {
    this.render();
  }

  private async selectWorld(worldId: string): Promise<void> {
    try {
      this.logger.info('World selected in picker', { worldId });
      await this.onWorldSelected(worldId);
    } catch (error) {
      this.errorHandler.handle(GameErrorCode.WORLD_SELECTION_ERROR, error as Error, { worldId });
      throw error; // Re-throw so StartScreen can handle fallback
    }
  }

  private renderError(): void {
    const display = [
      'ERROR: FAILED TO LOAD WORLDS',
      '',
      'USING FANTASY WORLD AS FALLBACK...'
    ].join('\n');
    
    this.element.innerHTML = `<pre style="color: #ffffff; background: #000; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.2; margin: 0; padding: 20px;">${display}</pre>`;

    // Automatically select fantasy after a delay
    setTimeout(() => {
      this.onWorldSelected('fantasy');
    }, 2000);
  }
}