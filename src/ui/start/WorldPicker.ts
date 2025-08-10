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
    ).join('');
    
    this.element.innerHTML = `
      <div class="world-selector">
        <div class="world-selector__title">
          SELECT WORLD
        </div>
        <div class="world-selector__controls">
          ↑↓ Navigate  •  ENTER Select
        </div>
        <div class="world-selector__list">
          ${worldList}
        </div>
      </div>
    `;
  }

  private createWorldListItem(world: WorldDisplayInfo, isSelected: boolean): string {
    const themeIcon = this.getThemeIcon(world.theme);
    const cursor = isSelected ? '>' : ' ';
    const selectedClass = isSelected ? 'world-item--selected' : '';
    
    return `
      <div class="world-item ${selectedClass}" data-world-id="${world.id}">
        <div class="world-item__line">
          <span class="world-item__cursor">${cursor}</span>
          <span class="world-item__icon">${themeIcon}</span>
          <span class="world-item__name">${world.name}</span>
        </div>
        <div class="world-item__description">
          ${world.description}
        </div>
      </div>
    `;
  }

  private getThemeIcon(theme: string): string {
    const iconMap: Record<string, string> = {
      fantasy: '[FANTASY]',
      cyberpunk: '[CYBER]'
    };
    return iconMap[theme] || '[UNKNOWN]';
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
    // Update visual selection without full re-render
    const items = this.element.querySelectorAll('.world-item');
    items.forEach((item, index) => {
      const cursor = item.querySelector('.world-item__cursor');
      if (cursor) {
        cursor.textContent = index === this.selectedIndex ? '>' : ' ';
      }
      
      if (index === this.selectedIndex) {
        item.classList.add('world-item--selected');
      } else {
        item.classList.remove('world-item--selected');
      }
    });
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
    this.element.innerHTML = `
      <div class="world-selector">
        <div class="world-selector__title">
          ERROR: FAILED TO LOAD WORLDS
        </div>
        <div class="world-selector__message">
          USING FANTASY WORLD AS FALLBACK...
        </div>
      </div>
    `;

    // Automatically select fantasy after a delay
    setTimeout(() => {
      this.onWorldSelected('fantasy');
    }, 2000);
  }
}