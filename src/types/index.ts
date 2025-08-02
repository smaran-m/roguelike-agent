export interface Tile {
  glyph: string;
  fgColor: number;
  bgColor: number;
  isEmoji: boolean;
  walkable: boolean;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  glyph: string;
  color: number;
  name: string;
  isEmoji: boolean;
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