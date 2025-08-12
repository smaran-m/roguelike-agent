import { Application, Container, Text, Graphics } from 'pixi.js';
import { Entity } from '../../types';
import { CharacterPortrait } from './CharacterPortrait';
import { CharacterManager } from '../../managers/CharacterManager';
import { ResourceManager } from '../../managers/ResourceManager';
import { WorldConfigLoader } from '../../loaders/WorldConfigLoader';

export class CharacterSheet {
  private app: Application;
  private container: Container;
  private backgroundPanel!: Graphics;
  private portraitText!: Text;
  private nameText!: Text;
  private classText!: Text;
  private levelText!: Text;
  private statsLabel!: Text;
  private statsContainer!: Container;
  private inventoryLabel!: Text;
  private inventoryContainer!: Container;
  
  // Cached resource UI elements
  private resourceLabels: Map<string, Text> = new Map();
  private resourceTexts: Map<string, Text> = new Map();
  private resourcesInitialized: boolean = false;
  
  private readonly panelWidth = 200;
  private readonly panelHeight = 600;
  private readonly padding = 10;
  
  constructor(app: Application) {
    this.app = app;
    this.container = new Container();
    this.setupUI();
  }
  
  private setupUI() {
    // Create background panel
    this.backgroundPanel = new Graphics();
    this.backgroundPanel.beginFill(0x000000);
    this.backgroundPanel.drawRect(0, 0, this.panelWidth, this.panelHeight);
    this.backgroundPanel.endFill();
    
    // Add right border line
    const rightBorder = new Graphics();
    rightBorder.lineStyle(2, 0x444444);
    rightBorder.moveTo(this.panelWidth, 0);
    rightBorder.lineTo(this.panelWidth, this.panelHeight);
    this.container.addChild(rightBorder);
    this.container.addChild(this.backgroundPanel);
    
    // Title
    const titleText = new Text('CHARACTER', {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 14,
      fill: 0xFFFFFF,
      fontWeight: 'bold'
    });
    titleText.x = this.padding;
    titleText.y = this.padding;
    this.container.addChild(titleText);
    
    // Portrait (large emoji)
    this.portraitText = new Text('😊', {
      fontFamily: 'Noto Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif',
      fontSize: 36,
      fill: 0xFFFFFF
    });
    this.portraitText.x = this.panelWidth / 2 - 24; // Center the emoji
    this.portraitText.y = 40;
    this.container.addChild(this.portraitText);
    
    // Character Name
    this.nameText = new Text('Hero', {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 16,
      fill: 0xFFFFFF,
      fontWeight: 'bold'
    });
    this.nameText.x = this.padding;
    this.nameText.y = 100;
    this.container.addChild(this.nameText);
    
    // Character Class
    this.classText = new Text('Warrior', {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 12,
      fill: 0xCCCCCC
    });
    this.classText.x = this.padding;
    this.classText.y = 120;
    this.container.addChild(this.classText);
    
    // Level
    this.levelText = new Text('Level 1', {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 12,
      fill: 0xFFD700
    });
    this.levelText.x = this.panelWidth - this.padding - 50;
    this.levelText.y = 120;
    this.container.addChild(this.levelText);
    
    // Stats Section
    this.setupStatsSection();
    
    // Inventory Section (placeholder for future)
    this.setupInventorySection();
    
    // Add main container to app
    this.app.stage.addChild(this.container);
  }
  
  private setupStatsSection() {
    const startY = 200;
    
    // Stats label
    this.statsLabel = new Text('STATS', {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 12,
      fill: 0xFFFFFF,
      fontWeight: 'bold'
    });
    this.statsLabel.x = this.padding;
    this.statsLabel.y = startY;
    this.container.addChild(this.statsLabel);
    
    // Stats container
    this.statsContainer = new Container();
    this.statsContainer.x = this.padding;
    this.statsContainer.y = startY + 25;
    this.container.addChild(this.statsContainer);
  }
  
  private setupInventorySection() {
    // Initial setup - positioning will be done dynamically in updateInventory
    this.inventoryLabel = new Text('EQUIPMENT', {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 12,
      fill: 0xFFFFFF,
      fontWeight: 'bold'
    });
    this.inventoryLabel.x = this.padding;
    this.container.addChild(this.inventoryLabel);
    
    // Inventory container
    this.inventoryContainer = new Container();
    this.inventoryContainer.x = this.padding;
    this.container.addChild(this.inventoryContainer);
  }
  
  /**
   * Update the character sheet with current player data
   * This should only be called when data actually changes, not on every render
   */
  updateCharacterSheet(player: Entity) {
    // Update portrait based on health
    const portraitEmoji = CharacterPortrait.getPortraitEmoji(player);
    this.portraitText.text = portraitEmoji;
    
    // Update character info
    this.nameText.text = player.name;
    
    // Get character class info from CharacterManager
    const characterManager = CharacterManager.getInstance();
    const currentCharacter = characterManager.getCurrentCharacter();
    if (currentCharacter) {
      this.classText.text = currentCharacter.className.charAt(0).toUpperCase() + currentCharacter.className.slice(1);
      this.levelText.text = `Level ${currentCharacter.level}`;
      
      // Show experience
      const nextLevelXP = currentCharacter.level * 1000;
      const progressText = new Text(`XP: ${currentCharacter.experience}/${nextLevelXP}`, {
        fontFamily: 'Noto Sans Mono, monospace',
        fontSize: 10,
        fill: 0xCCCCCC
      });
      progressText.x = this.padding;
      progressText.y = 135;
      
      // Remove old XP text if exists
      this.container.children.forEach(child => {
        if (child instanceof Text && child.text.startsWith('XP:')) {
          this.container.removeChild(child);
        }
      });
      this.container.addChild(progressText);
    }
    
    // Update resources (HP, mana, etc.) and get the next Y position
    const statsYPosition = this.updateResources(player);
    
    // Update stats with dynamic positioning and get the next Y position
    const inventoryYPosition = this.updateStats(player, statsYPosition);
    
    // Update inventory with correct positioning
    this.updateInventory(inventoryYPosition);
  }
  
  private initializeResourceUI(player: Entity): number {
    // Only initialize resources UI once
    if (this.resourcesInitialized) {
      return this.updateResourcesContent(player);
    }

    // First, ensure the player has resources initialized
    if (!ResourceManager.hasResource(player, 'hp')) {
      ResourceManager.initializeResources(player);
    }

    // Create cached UI elements for all available resources - inline layout
    const availableResources = WorldConfigLoader.getAvailableResourceIds();
    const startY = 150;
    let currentY = startY;

    availableResources.forEach((resourceId: string, index: number) => {
      if (ResourceManager.hasResource(player, resourceId)) {
        const resourceDef = WorldConfigLoader.getResourceDefinition(resourceId);
        const displayName = resourceDef?.displayName || resourceId.toUpperCase();
        
        // Create cached resource display as single line: "HP: [##########] 20/20"
        const isFirstResource = index === 0;
        const fontSize = isFirstResource ? 11 : 9;

        const resourceText = new Text('', {
          fontFamily: 'Noto Sans Mono, monospace',
          fontSize: fontSize,
          fill: 0xFFFFFF
        });
        resourceText.x = this.padding;
        resourceText.y = currentY;
        this.resourceTexts.set(resourceId, resourceText);
        this.container.addChild(resourceText);
        
        // Store the display name for later use
        this.resourceLabels.set(resourceId, new Text(displayName, { fontFamily: 'Noto Sans Mono, monospace', fontSize: 12, fill: 0xFFFFFF }));
        
        currentY += isFirstResource ? 20 : 12; // Less spacing for secondary resources
      }
    });

    this.resourcesInitialized = true;
    return this.updateResourcesContent(player);
  }

  private updateResourcesContent(player: Entity): number {
    const availableResources = WorldConfigLoader.getAvailableResourceIds();
    let maxYOffset = 150;

    availableResources.forEach((resourceId: string, index: number) => {
      if (ResourceManager.hasResource(player, resourceId)) {
        const resourceText = this.resourceTexts.get(resourceId);
        const resourceLabel = this.resourceLabels.get(resourceId);
        if (resourceText && resourceLabel) {
          // Create inline format: "HP: [##########] 20/20"
          const isFirstResource = index === 0;
          const barSize = isFirstResource ? 10 : 8;
          const barDisplay = ResourceManager.getResourceDisplay(player, resourceId, barSize);
          const color = ResourceManager.getResourceColor(player, resourceId);
          const displayName = resourceLabel.text;

          // Combine label and bar into single line
          resourceText.text = `${displayName}: ${barDisplay}`;
          resourceText.style.fill = color;
          
          maxYOffset = Math.max(maxYOffset, resourceText.y + (isFirstResource ? 25 : 20));
        }
      }
    });

    return maxYOffset + 10; // Add some padding before stats
  }

  private updateResources(player: Entity): number {
    return this.initializeResourceUI(player);
  }

  /**
   * Lightweight update for just resource values (called more frequently)
   */
  updateResourcesOnly(player: Entity) {
    if (this.resourcesInitialized) {
      this.updateResourcesContent(player);
    }
  }
  
  private updateStats(player: Entity, yPosition: number = 200): number {
    // Reposition the stats label and container dynamically
    this.statsLabel.y = yPosition;
    this.statsContainer.y = yPosition + 25;
    
    // Clear existing stats
    this.statsContainer.removeChildren();
    
    const stats = [
      { label: 'AC', value: player.stats.ac, color: 0x87CEEB },
      { label: 'STR', value: player.stats.strength, modifier: this.getModifier(player.stats.strength) },
      { label: 'DEX', value: player.stats.dexterity, modifier: this.getModifier(player.stats.dexterity) },
      { label: 'CON', value: player.stats.constitution, modifier: this.getModifier(player.stats.constitution) },
      { label: 'INT', value: player.stats.intelligence, modifier: this.getModifier(player.stats.intelligence) },
      { label: 'WIS', value: player.stats.wisdom, modifier: this.getModifier(player.stats.wisdom) },
      { label: 'CHA', value: player.stats.charisma, modifier: this.getModifier(player.stats.charisma) }
    ];
    
    stats.forEach((stat, index) => {
      const yPos = index * 12;
      
      // Stat label
      const label = new Text(stat.label, {
        fontFamily: 'Noto Sans Mono, monospace',
        fontSize: 11,
        fill: stat.color || 0xFFFFFF,
        fontWeight: 'bold'
      });
      label.x = 0;
      label.y = yPos;
      this.statsContainer.addChild(label);
      
      // Stat value
      const value = new Text(stat.value.toString(), {
        fontFamily: 'Noto Sans Mono, monospace',
        fontSize: 11,
        fill: 0xFFFFFF
      });
      value.x = 35;
      value.y = yPos;
      this.statsContainer.addChild(value);
      
      // Modifier (for ability scores)
      if (stat.modifier !== undefined) {
        const modifierText = stat.modifier >= 0 ? `+${stat.modifier}` : stat.modifier.toString();
        const modifier = new Text(`(${modifierText})`, {
          fontFamily: 'Noto Sans Mono, monospace',
          fontSize: 9,
          fill: 0xCCCCCC
        });
        modifier.x = 60;
        modifier.y = yPos + 1;
        this.statsContainer.addChild(modifier);
      }
    });
    
    // Return the next available Y position after all stats
    return this.statsContainer.y + (stats.length * 12) + 12; // Add padding
  }
  
  private getModifier(abilityScore: number): number {
    return Math.floor((abilityScore - 10) / 2);
  }
  
  private updateInventory(yPosition: number = 400) {
    // Position the inventory label and container dynamically
    this.inventoryLabel.y = yPosition;
    this.inventoryContainer.y = yPosition + 25;
    
    // Clear existing inventory items
    this.inventoryContainer.removeChildren();
    
    const characterManager = CharacterManager.getInstance();
    const currentCharacter = characterManager.getCurrentCharacter();
    
    if (!currentCharacter || !currentCharacter.inventory || currentCharacter.inventory.length === 0) {
      // Show "empty" message
      const emptyText = new Text('(Empty)', {
        fontFamily: 'Noto Sans Mono, monospace',
        fontSize: 10,
        fill: 0x888888,
        fontStyle: 'italic'
      });
      emptyText.x = 0;
      emptyText.y = 0;
      this.inventoryContainer.addChild(emptyText);
      return;
    }
    
    // Display inventory items
    currentCharacter.inventory.forEach((item, index) => {
      const yPos = index * 25;
      
      // Item emoji
      const itemEmoji = new Text(item.glyph, {
        fontFamily: item.isEmoji ? 'Noto Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif' : 'Noto Sans Mono, monospace',
        fontSize: 16,
        fill: item.color
      });
      itemEmoji.x = 0;
      itemEmoji.y = yPos;
      this.inventoryContainer.addChild(itemEmoji);
      
      // Item name
      const itemName = new Text(item.name, {
        fontFamily: 'Noto Sans Mono, monospace',
        fontSize: 10,
        fill: 0xFFFFFF
      });
      itemName.x = 25;
      itemName.y = yPos + 3;
      this.inventoryContainer.addChild(itemName);
      
      // Item type/damage info
      let infoText = '';
      if (item.type === 'weapon' && item.damage) {
        infoText = `${item.damage} dmg`;
      } else if (item.type === 'armor' && item.armorClass) {
        infoText = `+${item.armorClass} AC`;
      }
      
      if (infoText) {
        const itemInfo = new Text(infoText, {
          fontFamily: 'Noto Sans Mono, monospace',
          fontSize: 9,
          fill: 0xCCCCCC
        });
        itemInfo.x = 25;
        itemInfo.y = yPos + 15;
        this.inventoryContainer.addChild(itemInfo);
      }
    });
  }
  
  /**
   * Get the container for positioning
   */
  getContainer(): Container {
    return this.container;
  }
  
  /**
   * Set position of the character sheet
   */
  setPosition(x: number, y: number) {
    this.container.x = x;
    this.container.y = y;
  }
  
  /**
   * Get panel width for layout calculations
   */
  getPanelWidth(): number {
    return this.panelWidth;
  }
}