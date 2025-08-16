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

  'disco': {
    name: 'DigitalDisco', 
    family: '"DigitalDisco", monospace',
    description: 'Bauhaus inspired pixel font',
    size: { small: 10, medium: 14, large: 20 },
    filename: 'DigitalDisco.ttf'
  },
  
  'test-system': {
    name: 'Test System Font',
    family: '"Arial", sans-serif',
    description: 'Testing system font without file',
    size: { small: 12, medium: 18, large: 24 }
    // No filename = system font, shouldn't generate @font-face
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

// CHANGE THIS TO SWITCH FONTS EVERYWHERE
export const CURRENT_FONT = 'disco';

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

// CSS Custom Properties generation for unified font management
export const generateFontCSSVariables = (): string => {
  const current = getCurrentFont();
  
  return `
    :root {
      --font-family: ${current.family};
      --font-name: "${current.name}";
      --font-size-small: ${current.size.small}px;
      --font-size-medium: ${current.size.medium}px;
      --font-size-large: ${current.size.large}px;
    }
  `.trim();
};

// Generate @font-face declarations for all custom fonts
export const generateFontFaceDeclarations = (): string => {
  const fontFaces = Object.values(AVAILABLE_FONTS)
    .filter(font => font.filename) // Only custom fonts with files
    .map(font => `
    @font-face {
      font-family: '${font.name}';
      src: url('/fonts/${font.filename}') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }`)
    .join('\n');
  
  return fontFaces;
};

// Generate preload links for all custom fonts
export const generateFontPreloadLinks = (): string => {
  const preloads = Object.values(AVAILABLE_FONTS)
    .filter(font => font.filename) // Only custom fonts with files
    .map(font => `  <link rel="preload" href="/fonts/${font.filename}" as="font" type="font/ttf" crossorigin>`)
    .join('\n');
  
  return preloads;
};

// Inject all font styles into the document
export const injectAllFontStyles = (): void => {
  const styleId = 'dynamic-fonts';
  
  // Remove existing style element if it exists
  const existing = document.getElementById(styleId);
  if (existing) {
    existing.remove();
  }
  
  // Create and inject new style element with both CSS variables and @font-face declarations
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    ${generateFontCSSVariables()}
    
    ${generateFontFaceDeclarations()}
  `;
  document.head.appendChild(style);
};

// Inject CSS variables into the document (keeping for backwards compatibility)
export const injectFontCSSVariables = (): void => {
  injectAllFontStyles();
};