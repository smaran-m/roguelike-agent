/**
 * Font Configuration System
 * 
 * To switch fonts: Just change the CURRENT_FONT constant below!
 * All font references throughout the app will automatically update.
 */

export interface FontConfig {
  name: string;
  family: string;
  description: string;
  size: {
    small: number;
    medium: number;
    large: number;
  };
  filename?: string;
}

// Available font options
export const AVAILABLE_FONTS: Record<string, FontConfig> = {
  'perfect-dos': {
    name: 'Perfect DOS VGA 437',
    family: '"Perfect DOS VGA 437 Win", "Perfect DOS VGA 437", monospace',
    description: 'Classic DOS VGA font with 1:1 ratio',
    size: { small: 8, medium: 16, large: 24 },
    filename: 'Perfect_DOS_VGA_437_Win.ttf'
  },
  
  'square': {
    name: 'Square',
    family: '"Square", monospace',
    description: 'Purpose-built roguelike font with perfect square ratio',
    size: { small: 8, medium: 16, large: 24 },
    filename: 'square.ttf'
  },
  
  'cozette': {
    name: 'Cozette',
    family: '"Cozette", monospace',
    description: 'Chunky bitmap terminal font with excellent readability',
    size: { small: 10, medium: 16, large: 24 },
    filename: 'cozette.ttf'
  },
  
  'roguelike-8x8': {
    name: '8x8 Square Roguelike',
    family: '"RoguelikeSquare8x8", monospace',
    description: 'Authentic 8x8 square roguelike ASCII font',
    size: { small: 8, medium: 16, large: 24 },
    filename: '8x8-square-roguelike-ascii-font.ttf'
  },
  
  // Working chunky alternatives
  'courier-chunky': {
    name: 'Courier New Chunky',
    family: '"Courier New", monospace',
    description: 'Chunky Courier New with larger sizing for bold look',
    size: { small: 12, medium: 20, large: 28 }
  },
  
  'consolas-chunky': {
    name: 'Consolas Chunky',
    family: '"Consolas", monospace',
    description: 'Chunky Consolas with larger sizing for bold terminal feel',
    size: { small: 12, medium: 20, large: 28 }
  },
  
  // System fallbacks for testing
  'courier': {
    name: 'Courier New',
    family: '"Courier New", monospace',
    description: 'System fallback - standard monospace font',
    size: { small: 10, medium: 14, large: 20 }
  },
  
  'consolas': {
    name: 'Consolas', 
    family: '"Consolas", monospace',
    description: 'System fallback - Microsoft terminal font',
    size: { small: 10, medium: 14, large: 20 }
  }
};

// 🎯 CHANGE THIS TO SWITCH FONTS EVERYWHERE!
export const CURRENT_FONT = 'square';

// Convenience getters
export const getCurrentFont = () => AVAILABLE_FONTS[CURRENT_FONT];
export const getFontFamily = () => getCurrentFont().family;
export const getFontSizes = () => getCurrentFont().size;

// For easy font loading
export const getFontsToLoad = () => {
  const current = getCurrentFont();
  if (!current.filename) return [];
  
  return [
    `${current.size.small}px "${current.name}"`,
    `${current.size.medium}px "${current.name}"`, 
    `${current.size.large}px "${current.name}"`
  ];
};