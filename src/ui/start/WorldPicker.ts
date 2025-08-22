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
  private static instance: WorldPicker | null = null;
  
  private element: HTMLElement;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private onWorldSelected: (worldId: string) => Promise<void>;
  private worlds: WorldDisplayInfo[] = [];
  private selectedIndex: number = 0;
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  private constructor(
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

  public static getInstance(
    containerElement: HTMLElement,
    onWorldSelected: (worldId: string) => Promise<void>
  ): WorldPicker {
    if (!WorldPicker.instance) {
      WorldPicker.instance = new WorldPicker(containerElement, onWorldSelected);
    }
    return WorldPicker.instance;
  }

  public destroy(): void {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    WorldPicker.instance = null;
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
    
    this.element.innerHTML = `<pre class="world-picker__pre">${display}</pre>`;
  }

  private createWorldListItem(world: WorldDisplayInfo, isSelected: boolean): string {
    const cursor = isSelected ? '→' : ' ';
    return `${cursor} ${world.name} - ${world.description}`;
  }

  private setupKeyboardEvents(): void {
    this.keyboardHandler = (e: KeyboardEvent) => {
      if (!WorldPicker.instance) return;

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

    document.addEventListener('keydown', this.keyboardHandler);
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
    
    this.element.innerHTML = `<pre class="world-picker__pre world-picker__pre--error">${display}</pre>`;

    // Automatically select fantasy after a delay
    setTimeout(() => {
      this.onWorldSelected('fantasy');
    }, 2000);
  }
}