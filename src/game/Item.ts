import { Item } from '../types';
import { EnemyLoader } from '../utils/EnemyLoader';

export class ItemSystem {
  
  /**
   * Create a weapon item
   */
  static createWeapon(
    id: string,
    name: string,
    description: string,
    glyph: string,
    color: string,
    damage: string,
    weight: number,
    rarity: Item['rarity'] = 'common',
    abilities: string[] = [],
    value: number = 10
  ): Item {
    return {
      id,
      name,
      description,
      glyph,
      color: EnemyLoader.parseColor(color),
      isEmoji: glyph.length > 1 || /[\u{1F000}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(glyph),
      type: 'weapon',
      rarity,
      weight,
      damage,
      abilities,
      value,
      quantity: 1
    };
  }

  /**
   * Create an armor item
   */
  static createArmor(
    id: string,
    name: string,
    description: string,
    glyph: string,
    color: string,
    armorClass: number,
    weight: number,
    rarity: Item['rarity'] = 'common',
    abilities: string[] = [],
    value: number = 50
  ): Item {
    return {
      id,
      name,
      description,
      glyph,
      color: EnemyLoader.parseColor(color),
      isEmoji: glyph.length > 1 || /[\u{1F000}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(glyph),
      type: 'armor',
      rarity,
      weight,
      armorClass,
      abilities,
      value,
      quantity: 1
    };
  }

  /**
   * Create a consumable item
   */
  static createConsumable(
    id: string,
    name: string,
    description: string,
    glyph: string,
    color: string,
    weight: number,
    statusEffects: string[] = [],
    rarity: Item['rarity'] = 'common',
    abilities: string[] = [],
    value: number = 5,
    quantity: number = 1
  ): Item {
    return {
      id,
      name,
      description,
      glyph,
      color: EnemyLoader.parseColor(color),
      isEmoji: glyph.length > 1 || /[\u{1F000}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(glyph),
      type: 'consumable',
      rarity,
      weight,
      statusEffects,
      abilities,
      value,
      quantity
    };
  }

  /**
   * Get starting weapon for a character class
   */
  static getStartingWeapon(weaponName: string): Item {
    const weaponData = this.getWeaponData(weaponName);
    return this.createWeapon(
      `starting_${weaponName}`,
      weaponData.name,
      weaponData.description,
      weaponData.glyph,
      weaponData.color,
      weaponData.damage,
      weaponData.weight,
      'common',
      weaponData.abilities,
      weaponData.value
    );
  }

  /**
   * Get weapon data for different weapon types
   */
  private static getWeaponData(weaponName: string): {
    name: string;
    description: string;
    glyph: string;
    color: string;
    damage: string;
    weight: number;
    abilities: string[];
    value: number;
  } {
    const weapons: { [key: string]: any } = {
      longsword: {
        name: 'Longsword',
        description: 'A versatile martial weapon with a straight, double-edged blade.',
        glyph: '⚔️',
        color: '0xC0C0C0',
        damage: '1d8',
        weight: 3,
        abilities: ['Versatile'],
        value: 15
      },
      shortsword: {
        name: 'Shortsword',
        description: 'A light, finesse weapon perfect for quick strikes.',
        glyph: '🗡️',
        color: '0xC0C0C0',
        damage: '1d6',
        weight: 2,
        abilities: ['Finesse', 'Light'],
        value: 10
      },
      staff: {
        name: 'Quarterstaff',
        description: 'A simple wooden staff that can be used as a focus for magic.',
        glyph: '🪄',
        color: '0x8B4513',
        damage: '1d6',
        weight: 4,
        abilities: ['Versatile', 'Arcane Focus'],
        value: 2
      },
      mace: {
        name: 'Mace',
        description: 'A heavy bludgeoning weapon with a weighted head.',
        glyph: '🔨',
        color: '0x696969',
        damage: '1d6',
        weight: 4,
        abilities: [],
        value: 5
      },
      longbow: {
        name: 'Longbow',
        description: 'A martial ranged weapon for skilled archers.',
        glyph: '🏹',
        color: '0x8B4513',
        damage: '1d8',
        weight: 2,
        abilities: ['Ammunition', 'Heavy', 'Two-Handed'],
        value: 50
      }
    };

    return weapons[weaponName] || weapons.longsword;
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
}