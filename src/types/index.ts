export interface Tile {
  glyph: string;
  fgColor: number;
  bgColor: number;
  isEmoji: boolean;
  walkable: boolean;
  blocksLight?: boolean;
}

export interface TileVisibility {
  explored: boolean;
  visible: boolean;
}

export interface EntityStats {
  hp: number;
  maxHp: number;
  ac: number; // Armor Class
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  proficiencyBonus: number;
  level: number;
}

export interface EnemyStatRanges {
  hp: string; // D&D dice notation like "2d6+2" 
  ac: number;
  strength: string;
  dexterity: string;
  constitution: string;
  intelligence: string;
  wisdom: string;
  charisma: string;
  proficiencyBonus: number;
  level: number;
}

export interface EnemyDefinition {
  name: string;
  glyph: string;
  color: string;
  stats: EnemyStatRanges;
  description: string;
}

export interface CharacterAppearance {
  defaultGlyph: string;
  alternativeGlyphs: string[];
  defaultColor: string;
}

export interface StartingEquipment {
  weapon: string;
  armor: string;
  shield: boolean;
}

export interface CharacterClass {
  name: string;
  description: string;
  baseStats: EnemyStatRanges; // Reuse the same stat range system
  appearance: CharacterAppearance;
  startingEquipment: StartingEquipment;
  classFeatures: string[];
}

export interface PlayerCharacter {
  id: string;
  name: string;
  className: string;
  level: number;
  experience: number;
  stats: EntityStats;
  appearance: {
    glyph: string;
    color: number;
  };
  equipment: StartingEquipment;
  features: string[];
  inventory: Item[];
  customization: {
    selectedGlyph?: string;
    selectedColor?: string;
    customName?: string;
  };
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  glyph: string;
  color: number;
  name: string;
  isEmoji: boolean;
  stats: EntityStats;
  isPlayer?: boolean;
}

export interface AttackResult {
  hit: boolean;
  damage: number;
  critical: boolean;
  attackRoll: number;
  damageRoll: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  glyph: string;
  color: number;
  isEmoji: boolean;
  type: 'weapon' | 'armor' | 'consumable' | 'tool' | 'misc';
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
  weight: number; // Weight in pounds (D&D standard)
  damage?: string; // D&D dice notation like "1d6+1"
  armorClass?: number; // AC bonus for armor
  abilities?: string[]; // Special abilities granted by the item
  statusEffects?: string[]; // Status effects applied when used
  quantity?: number; // For stackable items
  value?: number; // Gold piece value
}

export interface WorldSchema {
  theme: string;
  playerClass: string;
  playerEmoji: string;
  enemies: Array<{
    name: string;
    emoji: string;
    stats: {
      hp: number;
      damage: string;
    };
  }>;
  tiles: {
    wall: string;
    floor: string;
    door: string;
  };
}