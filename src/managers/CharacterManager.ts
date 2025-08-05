import { PlayerCharacter, CharacterClass, EntityStats } from '../types';
import { CombatSystem } from '../game/CombatSystem';
import { EnemyLoader } from '../utils/EnemyLoader';
import { ItemSystem } from '../game/Item';
import characterClassesData from '../data/characterClasses.json';

export class CharacterManager {
  private static instance: CharacterManager;
  private currentCharacter: PlayerCharacter | null = null;
  private characterClasses: { [key: string]: CharacterClass } = characterClassesData;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): CharacterManager {
    if (!CharacterManager.instance) {
      CharacterManager.instance = new CharacterManager();
    }
    return CharacterManager.instance;
  }

  /**
   * Get all available character classes
   */
  getAvailableClasses(): string[] {
    return Object.keys(this.characterClasses);
  }

  /**
   * Get a specific character class definition
   */
  getCharacterClass(className: string): CharacterClass | null {
    return this.characterClasses[className] || null;
  }

  /**
   * Create a new player character
   */
  createCharacter(
    characterName: string = 'Hero',
    className: string = 'warrior',
    customization?: {
      selectedGlyph?: string;
      selectedColor?: string;
      customName?: string;
    }
  ): PlayerCharacter | null {
    const characterClass = this.getCharacterClass(className);
    if (!characterClass) {
      console.warn(`Unknown character class: ${className}`);
      return null;
    }

    // Generate stats using the same dice system as enemies
    const stats = this.generateCharacterStats(className);
    if (!stats) {
      console.warn(`Failed to generate stats for class: ${className}`);
      return null;
    }

    // Determine appearance
    const selectedGlyph = customization?.selectedGlyph || characterClass.appearance.defaultGlyph;
    const selectedColor = customization?.selectedColor || characterClass.appearance.defaultColor;

    // Create starting inventory with weapon
    const startingWeapon = ItemSystem.getStartingWeapon(characterClass.startingEquipment.weapon);
    const inventory: import('../types').Item[] = [];
    if (startingWeapon) {
      inventory.push(startingWeapon);
    }

    const character: PlayerCharacter = {
      id: 'player',
      name: customization?.customName || characterName,
      className,
      level: 1,
      experience: 0,
      stats,
      appearance: {
        glyph: selectedGlyph,
        color: EnemyLoader.parseColor(selectedColor)
      },
      equipment: { ...characterClass.startingEquipment },
      features: [...characterClass.classFeatures],
      inventory,
      customization: customization || {}
    };

    this.currentCharacter = character;
    return character;
  }

  /**
   * Generate character stats based on class
   */
  private generateCharacterStats(className: string): EntityStats | null {
    const characterClass = this.getCharacterClass(className);
    if (!characterClass) return null;

    const baseStats = characterClass.baseStats;
    
    // Roll for HP and set maxHp to the same value
    const hp = CombatSystem.rollDice(baseStats.hp).total;
    
    return {
      hp,
      maxHp: hp,
      ac: baseStats.ac,
      strength: CombatSystem.rollDice(baseStats.strength).total,
      dexterity: CombatSystem.rollDice(baseStats.dexterity).total,
      constitution: CombatSystem.rollDice(baseStats.constitution).total,
      intelligence: CombatSystem.rollDice(baseStats.intelligence).total,
      wisdom: CombatSystem.rollDice(baseStats.wisdom).total,
      charisma: CombatSystem.rollDice(baseStats.charisma).total,
      proficiencyBonus: baseStats.proficiencyBonus,
      level: baseStats.level
    };
  }

  /**
   * Get the current player character
   */
  getCurrentCharacter(): PlayerCharacter | null {
    return this.currentCharacter;
  }

  /**
   * Set the current player character
   */
  setCurrentCharacter(character: PlayerCharacter): void {
    this.currentCharacter = character;
  }

  /**
   * Update character appearance
   */
  updateAppearance(glyph?: string, color?: string): boolean {
    if (!this.currentCharacter) return false;

    const characterClass = this.getCharacterClass(this.currentCharacter.className);
    if (!characterClass) return false;

    if (glyph) {
      // Validate glyph is available for this class
      const availableGlyphs = [
        characterClass.appearance.defaultGlyph,
        ...characterClass.appearance.alternativeGlyphs
      ];
      if (availableGlyphs.includes(glyph)) {
        this.currentCharacter.appearance.glyph = glyph;
        this.currentCharacter.customization.selectedGlyph = glyph;
      } else {
        console.warn(`Glyph ${glyph} not available for class ${this.currentCharacter.className}`);
        return false;
      }
    }

    if (color) {
      this.currentCharacter.appearance.color = EnemyLoader.parseColor(color);
      this.currentCharacter.customization.selectedColor = color;
    }

    return true;
  }

  /**
   * Level up the character (increases stats and level)
   */
  levelUp(): boolean {
    if (!this.currentCharacter) return false;

    this.currentCharacter.level++;
    
    // Increase HP (roll hit die + con modifier)
    const characterClass = this.getCharacterClass(this.currentCharacter.className);
    if (characterClass) {
      const hitDie = characterClass.baseStats.hp.split('d')[1]?.split('+')[0] || '8';
      const hpGain = CombatSystem.rollDice(`1d${hitDie}`).total + 
                     CombatSystem.getModifier(this.currentCharacter.stats.constitution);
      
      this.currentCharacter.stats.hp = (this.currentCharacter.stats.hp || 0) + Math.max(1, hpGain);
      this.currentCharacter.stats.maxHp = this.currentCharacter.stats.hp;
    }

    // Increase proficiency bonus at certain levels
    if (this.currentCharacter.level >= 5) {
      this.currentCharacter.stats.proficiencyBonus = 3;
    }
    if (this.currentCharacter.level >= 9) {
      this.currentCharacter.stats.proficiencyBonus = 4;
    }

    return true;
  }

  /**
   * Add experience and check for level up
   */
  addExperience(amount: number): boolean {
    if (!this.currentCharacter) return false;

    this.currentCharacter.experience += amount;
    
    // Simple level up formula: level up every 1000 XP
    const requiredXP = this.currentCharacter.level * 1000;
    if (this.currentCharacter.experience >= requiredXP) {
      return this.levelUp();
    }

    return false;
  }

  /**
   * Get available glyphs for current character class
   */
  getAvailableGlyphs(): string[] {
    if (!this.currentCharacter) return [];

    const characterClass = this.getCharacterClass(this.currentCharacter.className);
    if (!characterClass) return [];

    return [
      characterClass.appearance.defaultGlyph,
      ...characterClass.appearance.alternativeGlyphs
    ];
  }

  /**
   * Reset character (for new game)
   */
  resetCharacter(): void {
    this.currentCharacter = null;
  }

  /**
   * Save character data (returns JSON string for persistence)
   */
  saveCharacter(): string | null {
    if (!this.currentCharacter) return null;
    return JSON.stringify(this.currentCharacter);
  }

  /**
   * Load character data from JSON string
   */
  loadCharacter(characterData: string): boolean {
    try {
      const character = JSON.parse(characterData) as PlayerCharacter;
      this.currentCharacter = character;
      return true;
    } catch (error) {
      console.error('Failed to load character:', error);
      return false;
    }
  }

  /**
   * Get character's equipped weapon (first weapon in inventory)
   */
  getEquippedWeapon(): import('../types').Item | null {
    if (!this.currentCharacter) return null;
    
    const weapon = this.currentCharacter.inventory.find(item => item.type === 'weapon');
    return weapon || null;
  }

  /**
   * Get weapon damage for combat
   */
  getWeaponDamage(): string {
    const weapon = this.getEquippedWeapon();
    return weapon?.damage || '1d4'; // Default unarmed damage
  }

  /**
   * Add item to character inventory
   */
  addItemToInventory(item: import('../types').Item): boolean {
    if (!this.currentCharacter) return false;
    
    this.currentCharacter.inventory.push(item);
    return true;
  }

  /**
   * Remove item from character inventory
   */
  removeItemFromInventory(itemId: string): boolean {
    if (!this.currentCharacter) return false;
    
    const initialLength = this.currentCharacter.inventory.length;
    this.currentCharacter.inventory = this.currentCharacter.inventory.filter(item => item.id !== itemId);
    return this.currentCharacter.inventory.length < initialLength;
  }
}