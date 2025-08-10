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
  private healthBarText!: Text;
  private healthText!: Text;
  private statsLabel!: Text;
  private statsContainer!: Container;
  private inventoryLabel!: Text;
  private inventoryContainer!: Container;
  
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
    
    // Health Bar
    this.setupHealthBar();
    
    // Stats Section
    this.setupStatsSection();
    
    // Inventory Section (placeholder for future)
    this.setupInventorySection();
    
    // Add main container to app
    this.app.stage.addChild(this.container);
  }
  
  private setupHealthBar() {
    const startY = 150;
    
    // Health label
    const healthLabel = new Text('Health', {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 12,
      fill: 0xFFFFFF
    });
    healthLabel.x = this.padding;
    healthLabel.y = startY;
    this.container.addChild(healthLabel);
    
    // ASCII Health bar
    this.healthBarText = new Text('[##########] 20/20', {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 11,
      fill: 0xFFFFFF
    });
    this.healthBarText.x = this.padding;
    this.healthBarText.y = startY + 20;
    this.container.addChild(this.healthBarText);
    
    // Health text (numeric display)
    this.healthText = new Text('20/20', {
      fontFamily: 'Noto Sans Mono, monospace',
      fontSize: 11,
      fill: 0xFFFFFF
    });
    this.healthText.x = this.padding;
    this.healthText.y = startY + 40;
    this.container.addChild(this.healthText);
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
  
  private updateResources(player: Entity): number {
    // First, ensure the player has resources initialized
    if (!ResourceManager.hasResource(player, 'hp')) {
      ResourceManager.initializeResources(player);
    }

    // Update the existing health bar elements
    if (this.healthBarText && this.healthText) {
      const healthDisplay = ResourceManager.getResourceDisplay(player, 'hp', 10);
      const healthColor = ResourceManager.getResourceColor(player, 'hp');
      
      this.healthBarText.text = healthDisplay;
      this.healthBarText.style.fill = healthColor;
      
      // Hide the duplicate numeric health text
      this.healthText.visible = false;
    }

    // Add additional resources display below the health bar
    const availableResources = WorldConfigLoader.getAvailableResourceIds();
    let yOffset = 210; // Start below the health bar

    // Remove any existing additional resource displays first
    this.container.children.forEach(child => {
      if (child instanceof Text && child.y >= 210 && child.y <= 400) {
        const text = child as Text;
        if (text.text.includes(':') && (text.text.includes('[') || /\d+/.test(text.text))) {
          this.container.removeChild(child);
        }
      }
    });

    // Count and display additional resources (excluding HP which is already displayed)
    const additionalResources = availableResources.filter(id => id !== 'hp');
    additionalResources.forEach((resourceId: string) => {
      if (ResourceManager.hasResource(player, resourceId)) {
        const resourceDef = WorldConfigLoader.getResourceDefinition(resourceId);
        const display = ResourceManager.getResourceDisplay(player, resourceId, 8); // Smaller bars for additional resources
        const color = ResourceManager.getResourceColor(player, resourceId);

        // Create resource display text
        const resourceText = new Text(`${resourceDef?.displayName || resourceId}: ${display}`, {
          fontFamily: 'Noto Sans Mono, monospace',
          fontSize: 9,
          fill: color
        });
        resourceText.x = this.padding;
        resourceText.y = yOffset;
        
        this.container.addChild(resourceText);
        yOffset += 12; // Move down for next resource
      }
    });

    // Return the next available Y position for the stats section
    return yOffset + 10; // Add some padding before stats
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
      const yPos = index * 20;
      
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
    return this.statsContainer.y + (stats.length * 20) + 20; // Add padding
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