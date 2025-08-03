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