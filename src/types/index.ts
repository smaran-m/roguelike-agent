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
  damageResistances?: DamageResistance;
  damageVulnerabilities?: DamageResistance;
  damageImmunities?: DamageType[];
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
  damageResistances?: DamageResistance;
  damageVulnerabilities?: DamageResistance;
  damageImmunities?: DamageType[];
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

export enum DamageType {
  // Physical damage types
  SLASHING = 'slashing',
  PIERCING = 'piercing', 
  BLUDGEONING = 'bludgeoning',
  
  // Elemental damage types
  FIRE = 'fire',
  COLD = 'cold',
  LIGHTNING = 'lightning',
  ACID = 'acid',
  POISON = 'poison',
  
  // Magical damage types
  FORCE = 'force',
  NECROTIC = 'necrotic',
  RADIANT = 'radiant',
  PSYCHIC = 'psychic'
}

export enum ItemCategory {
  WEAPON = 'weapon',
  ARMOR = 'armor', 
  CONSUMABLE = 'consumable',
  TOOL = 'tool',
  MISC = 'misc'
}

export enum WeaponType {
  MELEE = 'melee',
  RANGED = 'ranged',
  MAGIC = 'magic'
}

export interface DamageResistance {
  [DamageType.SLASHING]?: number;
  [DamageType.PIERCING]?: number;
  [DamageType.BLUDGEONING]?: number;
  [DamageType.FIRE]?: number;
  [DamageType.COLD]?: number;
  [DamageType.LIGHTNING]?: number;
  [DamageType.ACID]?: number;
  [DamageType.POISON]?: number;
  [DamageType.FORCE]?: number;
  [DamageType.NECROTIC]?: number;
  [DamageType.RADIANT]?: number;
  [DamageType.PSYCHIC]?: number;
}

export interface AttackResult {
  hit: boolean;
  damage: number;
  critical: boolean;
  attackRoll: number;
  damageRoll: string;
  damageType?: DamageType;
  finalDamage?: number; // After resistance/vulnerability calculation
}

export interface Item {
  id: string;
  name: string;
  description: string;
  glyph: string;
  color: number;
  isEmoji: boolean;
  type: ItemCategory;
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
  weight: number; // Weight in pounds (D&D standard)
  damage?: string; // D&D dice notation like "1d6+1"
  damageType?: DamageType; // Type of damage dealt (for weapons)
  weaponType?: WeaponType; // Melee, ranged, or magic (for weapons)
  armorClass?: number; // AC bonus for armor
  abilities?: string[]; // Special abilities granted by the item
  statusEffects?: string[]; // Status effects applied when used
  quantity?: number; // For stackable items
  value?: number; // Gold piece value
}

export interface ItemDefinition {
  name: string;
  description: string;
  glyph: string;
  color: string; // Hex color as string
  type: ItemCategory;
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
  weight: number;
  damage?: string;
  damageType?: DamageType;
  weaponType?: WeaponType;
  armorClass?: number;
  abilities?: string[];
  statusEffects?: string[];
  quantity?: number;
  value?: number;
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