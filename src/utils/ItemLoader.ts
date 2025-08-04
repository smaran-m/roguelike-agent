import { ItemDefinition, Item } from '../types';
import itemsData from '../data/items.json';

export class ItemLoader {
  private static allItems: { [category: string]: { [key: string]: any } } = itemsData;

  /**
   * Get all available item categories (weapons, armor, consumables, tools)
   */
  static getAvailableCategories(): string[] {
    return Object.keys(this.allItems);
  }

  /**
   * Get all items in a specific category
   */
  static getItemsInCategory(category: string): { [key: string]: any } {
    return this.allItems[category] || {};
  }

  /**
   * Get all available item keys from all categories
   */
  static getAvailableItemKeys(): string[] {
    const keys: string[] = [];
    Object.values(this.allItems).forEach(category => {
      keys.push(...Object.keys(category));
    });
    return keys;
  }

  /**
   * Get a specific item definition by key (searches all categories)
   */
  static getItemDefinition(itemKey: string): any | null {
    for (const category of Object.values(this.allItems)) {
      if (category[itemKey]) {
        return category[itemKey] as ItemDefinition;
      }
    }
    return null;
  }

  /**
   * Get items by type (weapon, armor, consumable, tool, misc)
   */
  static getItemsByType(type: Item['type']): { [key: string]: any } {
    const result: { [key: string]: any } = {};
    
    Object.entries(this.allItems).forEach(([_category, items]) => {
      Object.entries(items).forEach(([key, item]) => {
        if (item.type === type) {
          result[key] = item;
        }
      });
    });
    
    return result;
  }

  /**
   * Get items by rarity
   */
  static getItemsByRarity(rarity: Item['rarity']): { [key: string]: any } {
    const result: { [key: string]: any } = {};
    
    Object.entries(this.allItems).forEach(([_category, items]) => {
      Object.entries(items).forEach(([key, item]) => {
        if (item.rarity === rarity) {
          result[key] = item;
        }
      });
    });
    
    return result;
  }

  /**
   * Create an Item instance from an ItemDefinition
   */
  static createItemFromDefinition(itemKey: string, definition: any, customId?: string): Item {
    return {
      id: customId || `${definition.type}_${itemKey}_${Date.now()}`,
      name: definition.name,
      description: definition.description,
      glyph: definition.glyph,
      color: this.parseColor(definition.color),
      isEmoji: definition.glyph.length > 1 || /[\u{1F000}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(definition.glyph),
      type: definition.type,
      rarity: definition.rarity,
      weight: definition.weight,
      damage: definition.damage,
      armorClass: definition.armorClass,
      abilities: definition.abilities ? [...definition.abilities] : [],
      statusEffects: definition.statusEffects ? [...definition.statusEffects] : [],
      quantity: definition.quantity || 1,
      value: definition.value || 0
    };
  }

  /**
   * Get an Item instance by key
   */
  static getItem(itemKey: string, customId?: string): Item | null {
    const definition = this.getItemDefinition(itemKey);
    if (!definition) {
      return null;
    }
    return this.createItemFromDefinition(itemKey, definition, customId);
  }

  /**
   * Parse color string to number (handles hex strings like "0xFF0000")
   */
  static parseColor(colorString: string): number {
    if (colorString.startsWith('0x')) {
      return parseInt(colorString, 16);
    }
    return parseInt(colorString, 16);
  }

  /**
   * Check if an item key exists
   */
  static hasItem(itemKey: string): boolean {
    return this.getItemDefinition(itemKey) !== null;
  }

  /**
   * Get a random item key from a specific category
   */
  static getRandomItemFromCategory(category: string): string | null {
    const items = this.getItemsInCategory(category);
    const keys = Object.keys(items);
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
  }

  /**
   * Get a random item key by type
   */
  static getRandomItemByType(type: Item['type']): string | null {
    const items = this.getItemsByType(type);
    const keys = Object.keys(items);
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
  }

  /**
   * Get a random item key by rarity
   */
  static getRandomItemByRarity(rarity: Item['rarity']): string | null {
    const items = this.getItemsByRarity(rarity);
    const keys = Object.keys(items);
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
  }

  /**
   * Validate item data integrity
   */
  static validateItemData(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    Object.entries(this.allItems).forEach(([category, items]) => {
      Object.entries(items).forEach(([key, item]) => {
        // Required fields
        if (!item.name) errors.push(`${category}.${key}: Missing name`);
        if (!item.description) errors.push(`${category}.${key}: Missing description`);
        if (!item.glyph) errors.push(`${category}.${key}: Missing glyph`);
        if (!item.color) errors.push(`${category}.${key}: Missing color`);
        if (!item.type) errors.push(`${category}.${key}: Missing type`);
        if (!item.rarity) errors.push(`${category}.${key}: Missing rarity`);
        if (item.weight === undefined || item.weight < 0) errors.push(`${category}.${key}: Invalid weight`);
        
        // Type-specific validation
        if (item.type === 'weapon' && !item.damage) {
          errors.push(`${category}.${key}: Weapon missing damage`);
        }
        if (item.type === 'armor' && item.armorClass === undefined) {
          errors.push(`${category}.${key}: Armor missing armorClass`);
        }
        
        // Color validation
        try {
          this.parseColor(item.color);
        } catch (e) {
          errors.push(`${category}.${key}: Invalid color format`);
        }
      });
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}