import { Item } from '../types';
import { ItemLoader } from '../loaders/ItemLoader';

export class ItemSystem {
  
  /**
   * Create an item from JSON definition by key
   */
  static createItem(itemKey: string, customId?: string): Item | null {
    return ItemLoader.getItem(itemKey, customId);
  }

  /**
   * Create a weapon item by key
   */
  static createWeapon(itemKey: string, customId?: string): Item | null {
    const item = ItemLoader.getItem(itemKey, customId);
    return item && item.type === 'weapon' ? item : null;
  }

  /**
   * Create an armor item by key
   */
  static createArmor(itemKey: string, customId?: string): Item | null {
    const item = ItemLoader.getItem(itemKey, customId);
    return item && item.type === 'armor' ? item : null;
  }

  /**
   * Create a consumable item by key
   */
  static createConsumable(itemKey: string, customId?: string): Item | null {
    const item = ItemLoader.getItem(itemKey, customId);
    return item && item.type === 'consumable' ? item : null;
  }

  /**
   * Create a tool item by key
   */
  static createTool(itemKey: string, customId?: string): Item | null {
    const item = ItemLoader.getItem(itemKey, customId);
    return item && item.type === 'tool' ? item : null;
  }

  /**
   * Get starting weapon for a character class
   */
  static getStartingWeapon(weaponName: string): Item | null {
    const item = ItemLoader.getItem(weaponName, `starting_${weaponName}`);
    if (item && item.type === 'weapon') {
      return item;
    }
    
    // Fallback to dagger if weapon not found
    console.warn(`Starting weapon '${weaponName}' not found, falling back to dagger`);
    return ItemLoader.getItem('dagger', 'starting_dagger');
  }

  /**
   * Get item damage value or return default
   */
  static getItemDamage(item: Item): string {
    return item.damage || '1d4';
  }

  /**
   * Check if item grants specific ability
   */
  static hasAbility(item: Item, ability: string): boolean {
    return item.abilities?.includes(ability) || false;
  }

  /**
   * Get item rarity color for display
   */
  static getRarityColor(rarity: Item['rarity']): number {
    const rarityColors = {
      common: 0xFFFFFF,     // White
      uncommon: 0x1EFF00,   // Green
      rare: 0x0070DD,       // Blue
      very_rare: 0xA335EE,  // Purple
      legendary: 0xFF8000   // Orange
    };
    return rarityColors[rarity];
  }

  /**
   * Get all available item keys
   */
  static getAvailableItems(): string[] {
    return ItemLoader.getAvailableItemKeys();
  }

  /**
   * Get items by type
   */
  static getItemsByType(type: Item['type']): string[] {
    return Object.keys(ItemLoader.getItemsByType(type));
  }

  /**
   * Get items by rarity
   */
  static getItemsByRarity(rarity: Item['rarity']): string[] {
    return Object.keys(ItemLoader.getItemsByRarity(rarity));
  }

  /**
   * Get a random item by type
   */
  static getRandomItemByType(type: Item['type']): Item | null {
    const itemKey = ItemLoader.getRandomItemByType(type);
    return itemKey ? ItemLoader.getItem(itemKey) : null;
  }

  /**
   * Check if item exists
   */
  static hasItem(itemKey: string): boolean {
    return ItemLoader.hasItem(itemKey);
  }

  /**
   * Validate all item data and log any issues
   */
  static validateItemData(): boolean {
    const validation = ItemLoader.validateItemData();
    
    if (!validation.valid) {
      console.error('Item data validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      return false;
    }
    
    console.log(`✓ Item data validation passed. Found ${ItemLoader.getAvailableItemKeys().length} items.`);
    return true;
  }

  /**
   * Initialize and validate item system
   */
  static initialize(): boolean {
    console.log('Initializing Item System...');
    
    const isValid = this.validateItemData();
    if (!isValid) {
      console.error('Item system initialization failed due to data validation errors.');
      return false;
    }
    
    // Test loading a few key items
    const testItems = ['longsword', 'dagger', 'healing_potion'];
    for (const itemKey of testItems) {
      const item = ItemLoader.getItem(itemKey);
      if (!item) {
        console.error(`Failed to load test item: ${itemKey}`);
        return false;
      }
    }
    
    console.log('✓ Item System initialized successfully');
    return true;
  }
}