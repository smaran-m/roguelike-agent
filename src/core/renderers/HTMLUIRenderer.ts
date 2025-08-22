import { Entity } from '../../types';
import { Logger } from '../../utils/Logger';
import { CharacterManager } from '../../managers/CharacterManager';
import { ResourceManager } from '../../managers/ResourceManager';
import { WorldConfigLoader } from '../../loaders/WorldConfigLoader';

export class HTMLUIRenderer {
  private mainContainer?: HTMLElement;
  private leftPanel?: HTMLElement;
  private gamePanel?: HTMLElement;
  private rightPanel?: HTMLElement;
  private messages: string[] = [];
  private currentPlayer?: Entity;
  private uiNeedsRedraw = true;
  private hasRenderedOnce = false;
  private lastMessageCount = 0;

  constructor(private viewportWidth: number, private viewportHeight: number, private tileSize: number) {}

  initializeContainers(): HTMLElement | null {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
      Logger.error('No game-container found for HTMLUIRenderer');
      return null;
    }
    
    // Clear existing content
    gameContainer.innerHTML = '';
    
    // Create wrapper for vertical centering
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      background: #000;
    `;
    
    // Create main flex container for the game interface
    this.mainContainer = document.createElement('div');
    this.mainContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      background: #000;
      font-family: 'Courier New', monospace;
      border: 2px solid #444;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
      max-width: 1400px;
      max-height: 800px;
      overflow: hidden;
    `;
    
    wrapper.appendChild(this.mainContainer);
    gameContainer.appendChild(wrapper);
    
    // Create middle container for main panels
    const middleContainer = document.createElement('div');
    middleContainer.style.cssText = `
      display: flex;
      flex-direction: row;
      flex: 1;
    `;
    
    // Left panel for character sheet
    this.leftPanel = document.createElement('div');
    this.leftPanel.id = 'character-sheet-terminal';
    this.leftPanel.style.cssText = `
      width: 300px;
      height: 620px;
      background: #000;
      border-right: 2px solid #444;
      overflow-y: auto;
    `;
    
    // Center panel for PixiJS game area
    this.gamePanel = document.createElement('div');
    this.gamePanel.id = 'pixi-game-area';
    this.gamePanel.style.cssText = `
      width: ${this.viewportWidth * this.tileSize}px;
      height: ${this.viewportHeight * this.tileSize}px;
      background: #000;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    `;
    
    // Right panel for combat log
    this.rightPanel = document.createElement('div');
    this.rightPanel.id = 'combat-log-terminal';
    this.rightPanel.style.cssText = `
      width: 400px;
      height: 620px;
      background: #000;
      border-left: 2px solid #444;
      overflow-y: auto;
    `;
    
    // Bottom UI area for position and controls
    const bottomUI = document.createElement('div');
    bottomUI.id = 'bottom-ui';
    bottomUI.style.cssText = `
      height: 40px;
      background: #000;
      border-top: 2px solid #444;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      color: #cccccc;
      font-family: var(--font-family);
      font-size: var(--font-size-medium);
    `;
    
    // Assemble layout
    middleContainer.appendChild(this.leftPanel);
    middleContainer.appendChild(this.gamePanel);
    middleContainer.appendChild(this.rightPanel);
    
    this.mainContainer.appendChild(middleContainer);
    this.mainContainer.appendChild(bottomUI);
    
    Logger.debug('HTMLUIRenderer containers initialized');
    return this.gamePanel;
  }

  initializeUIElements() {
    Logger.debug('Initializing UI panels with HTML/CSS for better text control');
    this.setupHTMLUIPanel(this.leftPanel!, 'character-sheet');
    this.setupHTMLUIPanel(this.rightPanel!, 'combat-log');
    this.uiNeedsRedraw = true;
  }

  private setupHTMLUIPanel(panel: HTMLElement, panelType: string) {
    panel.style.cssText += `
      color: #ffffff;
      font-family: var(--font-family), monospace;
      font-size: 14px;
      line-height: 1.2;
      padding: 10px;
      overflow-y: auto;
      white-space: pre-wrap;
    `;
    
    // Create content container
    const content = document.createElement('div');
    content.id = `${panelType}-content`;
    content.style.cssText = `
      height: 100%;
      font-family: inherit;
      color: inherit;
      position: relative;
    `;
    
    panel.appendChild(content);
    Logger.debug(`HTML UI panel setup complete for ${panelType}`);
  }

  updateUI() {
    const messageCountChanged = this.messages.length !== this.lastMessageCount;
    if (this.uiNeedsRedraw || !this.hasRenderedOnce || messageCountChanged) {
      try {
        this.updateCharacterSheetHTML();
        this.updateCombatLogHTML();
        this.updateBottomUI();
        this.uiNeedsRedraw = false;
        this.hasRenderedOnce = true;
        this.lastMessageCount = this.messages.length;
      } catch (error) {
        Logger.error('HTMLUIRenderer: Error rendering HTML UI panels:', error);
      }
    }
  }

  private updateCharacterSheetHTML() {
    const content = document.getElementById('character-sheet-content');
    if (!content || !this.currentPlayer) {
      Logger.debug('No character sheet content container or current player');
      return;
    }

    const player = this.currentPlayer;
    let html = '';
    
    // Title
    html += '<span style="color: #ffffff; font-weight: bold;">CHARACTER</span>\n\n';
    
    // Portrait
    html += '<span style="color: #ffff00;">@</span> (Player)\n\n';
    
    // Name and info
    html += `<span style="color: #ffffff;">Name: ${player.name}</span>\n`;
    
    // Character class info
    const characterManager = CharacterManager.getInstance();
    const currentCharacter = characterManager.getCurrentCharacter();
    if (currentCharacter) {
      html += `<span style="color: #cccccc;">Class: ${currentCharacter.className}</span>\n`;
      html += `<span style="color: #ffff00;">Level: ${currentCharacter.level}</span>\n`;
      html += `<span style="color: #cccccc;">XP: ${currentCharacter.experience}</span>\n\n`;
    }
    
    // Resources
    html += this.renderCharacterResourcesHTML(player);
    html += '\n';
    
    // Stats
    html += '<span style="color: #ffffff; font-weight: bold;">STATS</span>\n';
    html += `<span style="color: #00ffff;">AC: ${player.stats.ac}</span>\n`;
    html += `<span style="color: #ffffff;">STR: ${player.stats.strength} (${this.getModifier(player.stats.strength)})</span>\n`;
    html += `<span style="color: #ffffff;">DEX: ${player.stats.dexterity} (${this.getModifier(player.stats.dexterity)})</span>\n`;
    html += `<span style="color: #ffffff;">CON: ${player.stats.constitution} (${this.getModifier(player.stats.constitution)})</span>\n`;
    html += `<span style="color: #ffffff;">INT: ${player.stats.intelligence} (${this.getModifier(player.stats.intelligence)})</span>\n`;
    html += `<span style="color: #ffffff;">WIS: ${player.stats.wisdom} (${this.getModifier(player.stats.wisdom)})</span>\n`;
    html += `<span style="color: #ffffff;">CHA: ${player.stats.charisma} (${this.getModifier(player.stats.charisma)})</span>\n\n`;
    
    // Equipment/Inventory
    html += this.renderCharacterInventoryHTML(player);
    
    content.innerHTML = html;
  }

  private updateCombatLogHTML() {
    const content = document.getElementById('combat-log-content');
    if (!content) {
      Logger.debug('No combat log content container');
      return;
    }

    let html = '';
    
    // Title
    html += '<span style="color: #ffffff; font-weight: bold;">COMBAT LOG</span>\n\n';
    
    // Display recent messages
    const maxLines = 25; // Enough for the panel height
    const messagesToShow = this.messages.slice(-maxLines);
    
    messagesToShow.forEach((message) => {
      html += `<span style="color: #ffffff;">${message}</span>\n`;
    });
    
    content.innerHTML = html;
    
    // Auto-scroll to bottom
    content.scrollTop = content.scrollHeight;
  }

  private updateBottomUI() {
    const bottomUI = document.getElementById('bottom-ui');
    if (!bottomUI || !this.currentPlayer) {
      return;
    }

    // Controls help (left side)
    const controlsText = 'WASD/Arrows: Move  Space: Attack';
    
    // Position display (right side)
    const positionText = `(${this.currentPlayer.x}, ${this.currentPlayer.y})`;
    
    bottomUI.innerHTML = `
      <span>${controlsText}</span>
      <span>${positionText}</span>
    `;
  }

  private renderCharacterResourcesHTML(player: Entity): string {
    let html = '';
    const availableResources = WorldConfigLoader.getAvailableResourceIds();
    
    availableResources.forEach((resourceId: string) => {
      if (ResourceManager.hasResource(player, resourceId)) {
        const resourceDef = WorldConfigLoader.getResourceDefinition(resourceId);
        const displayName = resourceDef?.displayName || resourceId.toUpperCase();
        
        const current = ResourceManager.getCurrentValue(player, resourceId);
        const max = ResourceManager.getMaximumValue(player, resourceId) || current;
        const barSize = 8;
        const barDisplay = this.createASCIIBar(current, max, barSize);
        
        const colorValue = ResourceManager.getResourceColor(player, resourceId);
        const colorHex = this.numberToHexColor(colorValue);
        
        html += `<span style="color: #ffffff;">${displayName}:</span>\n`;
        html += `<span style="color: ${colorHex};">${barDisplay} ${current}/${max}</span>\n`;
      }
    });
    
    return html;
  }

  private renderCharacterInventoryHTML(_player: Entity): string {
    let html = '<span style="color: #ffffff; font-weight: bold;">EQUIPMENT</span>\n';
    
    const characterManager = CharacterManager.getInstance();
    const currentCharacter = characterManager.getCurrentCharacter();
    
    if (!currentCharacter || !currentCharacter.inventory || currentCharacter.inventory.length === 0) {
      html += '<span style="color: #cccccc;">(Empty)</span>\n';
      return html;
    }
    
    const maxDisplayItems = Math.min(currentCharacter.inventory.length, 5);
    for (let i = 0; i < maxDisplayItems; i++) {
      const item = currentCharacter.inventory[i];
      const itemName = item.name.length > 12 ? item.name.substring(0, 12) : item.name;
      let itemLine = `${itemName}`;
      
      if (item.type === 'weapon' && item.damage) {
        const damageInfo = item.damage.length > 6 ? item.damage.substring(0, 6) : item.damage;
        itemLine += ` (${damageInfo})`;
      }
      
      html += `<span style="color: #ffffff;">${itemLine}</span>\n`;
    }
    
    if (currentCharacter.inventory.length > maxDisplayItems) {
      html += '<span style="color: #cccccc;">...</span>\n';
    }
    
    return html;
  }

  private numberToHexColor(colorValue: number): string {
    return `#${colorValue.toString(16).padStart(6, '0')}`;
  }

  private createASCIIBar(current: number, max: number, width: number): string {
    const ratio = Math.max(0, Math.min(1, current / max));
    const filled = Math.floor(ratio * width);
    const empty = width - filled;
    
    return `[${'\u2588'.repeat(filled)}${' '.repeat(empty)}]`;
  }

  private getModifier(abilityScore: number): string {
    const mod = Math.floor((abilityScore - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  // Public interface methods
  setCurrentPlayer(player: Entity) {
    this.currentPlayer = player;
    this.uiNeedsRedraw = true;
  }

  // Set messages from external source (pure rendering approach)
  setMessages(messages: readonly string[]) {
    this.messages = [...messages]; // Copy the array
    this.uiNeedsRedraw = true;
  }

  // Legacy method for backward compatibility
  addMessage(message: string) {
    Logger.debug(`HTMLUIRenderer: addMessage called with: "${message}"`);
    this.messages.push(message);
    
    if (this.messages.length > 30) {
      this.messages = this.messages.slice(-30);
    }
    
    this.uiNeedsRedraw = true;
  }

  updatePositionText(x: number, y: number) {
    if (this.currentPlayer) {
      this.currentPlayer.x = x;
      this.currentPlayer.y = y;
      this.uiNeedsRedraw = true;
    }
    Logger.debug(`Position updated: (${x}, ${y})`);
  }

  markForRedraw() {
    this.uiNeedsRedraw = true;
  }

  getGamePanel(): HTMLElement | undefined {
    return this.gamePanel;
  }
}