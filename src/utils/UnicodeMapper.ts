/**
 * Unicode Character Mapping System
 * Converts emojis to textmode-compatible Unicode characters with massive character palette
 */

export interface UnicodeMapping {
  unicode: string;
  category: string;
  description: string;
}

export class UnicodeMapper {
  private static emojiMap: Map<string, UnicodeMapping> = new Map([
    // === FANTASY CHARACTERS ===
    // Warriors & Combat
    ['⚔️', { unicode: '†', category: 'combat', description: 'Sword/Cross (Latin Cross)' }],
    ['🗡️', { unicode: '‡', category: 'combat', description: 'Blade (Double Dagger)' }],
    ['🛡️', { unicode: '○', category: 'combat', description: 'Shield (White Circle)' }],
    ['🏹', { unicode: '↤', category: 'combat', description: 'Arrow (Leftwards Arrow from Bar)' }],
    ['🪓', { unicode: '⟂', category: 'combat', description: 'Axe (Perpendicular)' }],
    ['🔨', { unicode: '⟘', category: 'combat', description: 'Hammer (Up Tack with Circle Above)' }],
    ['🪄', { unicode: '⚡', category: 'magic', description: 'Wand (Lightning Bolt)' }],
    
    // Magical Classes
    ['🧙', { unicode: 'ψ', category: 'magic', description: 'Wizard (Greek Psi)' }],
    ['🔮', { unicode: '◉', category: 'magic', description: 'Crystal Ball (Fisheye)' }],
    ['📚', { unicode: '≡', category: 'magic', description: 'Books (Identical To)' }],
    ['⭐', { unicode: '✦', category: 'magic', description: 'Star (Black Four Pointed Star)' }],
    ['✨', { unicode: '※', category: 'magic', description: 'Sparkles (Reference Mark)' }],
    
    // Religious/Divine
    ['⛪', { unicode: '⛨', category: 'divine', description: 'Church (Black Cross on Shield)' }],
    ['🕊️', { unicode: '◊', category: 'divine', description: 'Dove (White Diamond)' }],
    ['📿', { unicode: '○', category: 'divine', description: 'Prayer Beads (White Circle)' }],
    
    // Rogues & Stealth
    ['🥷', { unicode: '⟐', category: 'stealth', description: 'Ninja (White Diamond with Dot Inside)' }],
    ['💀', { unicode: '☠', category: 'death', description: 'Skull and Crossbones' }],
    
    // Rangers & Nature
    ['🌲', { unicode: 'Ψ', category: 'nature', description: 'Tree (Greek Capital Psi)' }],
    ['🐺', { unicode: 'ω', category: 'nature', description: 'Wolf (Greek Omega)' }],
    ['🦅', { unicode: 'Λ', category: 'nature', description: 'Eagle (Greek Lambda)' }],
    
    // === CYBERPUNK CHARACTERS ===
    // Tech & Cyber
    ['🤖', { unicode: '☰', category: 'cyber', description: 'Robot (Trigram for Heaven)' }],
    ['💻', { unicode: '▣', category: 'cyber', description: 'Computer (White Square with Rounded Corners)' }],
    ['🔌', { unicode: '⚡', category: 'cyber', description: 'Plug (High Voltage)' }],
    ['⚡', { unicode: '⟐', category: 'cyber', description: 'Lightning (White Diamond with Dot)' }],
    
    // Corporate & Street
    ['💼', { unicode: '▦', category: 'corporate', description: 'Briefcase (White Square with Vertical Bisecting Line)' }],
    ['🏢', { unicode: '⌂', category: 'corporate', description: 'Building (House)' }],
    ['💳', { unicode: '▬', category: 'corporate', description: 'Card (Black Rectangle)' }],
    ['👔', { unicode: '◊', category: 'corporate', description: 'Tie (White Diamond)' }],
    
    // Tech Specialist
    ['🔧', { unicode: '⚙', category: 'tech', description: 'Wrench (Gear)' }],
    ['⚙️', { unicode: '☸', category: 'tech', description: 'Gear (Wheel of Dharma)' }],
    ['🔬', { unicode: '◎', category: 'tech', description: 'Microscope (Bullseye)' }],
    ['🛠️', { unicode: '⚒', category: 'tech', description: 'Tools (Hammer and Pick)' }],
    
    // Nomad & Street
    ['🏍️', { unicode: '⟨', category: 'street', description: 'Motorcycle (Mathematical Left Angle Bracket)' }],
    ['🌵', { unicode: 'Ψ', category: 'street', description: 'Cactus (Greek Capital Psi)' }],
    ['🚗', { unicode: '◉', category: 'street', description: 'Car (Fisheye)' }],
    ['🛣️', { unicode: '≡', category: 'street', description: 'Road (Identical To)' }],
    
    // === ENEMIES ===
    // Fantasy Enemies (some already converted)
    ['👺', { unicode: '𓀀', category: 'humanoid', description: 'Goblin (Egyptian Hieroglyph A001 Man)' }],
    ['🧌', { unicode: 'ᚱ', category: 'humanoid', description: 'Orc (Runic Letter Raidho)' }],
    ['🐺', { unicode: 'ω', category: 'beast', description: 'Wolf (Greek Small Omega)' }],
    ['🕷️', { unicode: '⟐', category: 'vermin', description: 'Spider (White Diamond with Dot)' }],
    
    // Cyberpunk Enemies
    ['👮', { unicode: '☰', category: 'security', description: 'Security (Trigram Heaven)' }],
    ['😠', { unicode: '⟠', category: 'hostile', description: 'Gang Member (Square with Upper Right Diagonal Half Black)' }],
    ['🧑‍💻', { unicode: '◉', category: 'hacker', description: 'Hacker (Fisheye)' }],
    ['🤵', { unicode: '♦', category: 'corporate', description: 'Corporate (Black Diamond)' }],
    
    // === WEAPONS ===
    // Modern Weapons  
    ['🔫', { unicode: '⟂', category: 'weapon', description: 'Gun (Perpendicular)' }],
    ['💣', { unicode: '◉', category: 'weapon', description: 'Bomb (Fisheye)' }],
    ['💉', { unicode: '†', category: 'weapon', description: 'Syringe (Latin Cross)' }],
    
    // === ARMOR ===
    ['🦺', { unicode: '▦', category: 'armor', description: 'Vest (White Square with Vertical Line)' }],
    ['👘', { unicode: '◇', category: 'armor', description: 'Robe (White Diamond)' }],
    
    // === ITEMS & CONSUMABLES ===
    // Potions & Medical
    ['🧪', { unicode: '⚗', category: 'potion', description: 'Potion (Alembic)' }],
    ['💊', { unicode: '○', category: 'consumable', description: 'Pill (White Circle)' }],
    ['🧠', { unicode: 'Ω', category: 'consumable', description: 'Brain Enhancement (Greek Capital Omega)' }],
    
    // Tools & Equipment
    ['🪢', { unicode: '∞', category: 'tool', description: 'Rope (Infinity)' }],
    ['📡', { unicode: '◎', category: 'tech', description: 'Antenna (Bullseye)' }],
    
    // Fire & Elements
    ['🔥', { unicode: '※', category: 'element', description: 'Fire (Reference Mark)' }],
    
    // === EXTENDED UNICODE CATEGORIES ===
    // Egyptian Hieroglyphs (U+13000–U+1342F)
    ['𓀁', { unicode: '𓀁', category: 'hieroglyph', description: 'Man with Hand to Mouth' }],
    ['𓀂', { unicode: '𓀂', category: 'hieroglyph', description: 'Man Sitting' }],
    ['𓃰', { unicode: '𓃰', category: 'hieroglyph', description: 'Lion' }],
    ['𓃱', { unicode: '𓃱', category: 'hieroglyph', description: 'Lioness' }],
    ['𓊖', { unicode: '𓊖', category: 'hieroglyph', description: 'House' }],
    ['𓊗', { unicode: '𓊗', category: 'hieroglyph', description: 'Shrine' }],
    
    // Runic Scripts (U+16A0–U+16FF)
    ['ᚠ', { unicode: 'ᚠ', category: 'runic', description: 'Fehu (Wealth, Cattle)' }],
    ['ᚦ', { unicode: 'ᚦ', category: 'runic', description: 'Thurisaz (Giant, Thor)' }],
    ['ᚨ', { unicode: 'ᚨ', category: 'runic', description: 'Ansuz (Divine Power)' }],
    ['ᚱ', { unicode: 'ᚱ', category: 'runic', description: 'Raidho (Journey, Ride)' }],
    
    // Cuneiform (U+12000–U+123FF) - Sample characters
    ['𒀀', { unicode: '𒀀', category: 'cuneiform', description: 'A' }],
    ['𒀁', { unicode: '𒀁', category: 'cuneiform', description: 'A times A' }],
    ['𒈗', { unicode: '𒈗', category: 'cuneiform', description: 'King' }],
    
    // Mathematical Symbols (U+2200–U+22FF)
    ['∀', { unicode: '∀', category: 'math', description: 'For All' }],
    ['∃', { unicode: '∃', category: 'math', description: 'There Exists' }],
    ['⊕', { unicode: '⊕', category: 'math', description: 'Circled Plus' }],
    ['⊗', { unicode: '⊗', category: 'math', description: 'Circled Times' }],
    
    // === CHARACTER PORTRAIT FACES ===
    ['😵', { unicode: '✞', category: 'status', description: 'Dead (Orthodox Cross)' }],
    ['😰', { unicode: '⚠', category: 'status', description: 'Critical Health (Warning Sign)' }],
    ['😟', { unicode: '◔', category: 'status', description: 'Worried (Circle with Upper Half Black)' }],
    ['😐', { unicode: '○', category: 'status', description: 'Neutral (White Circle)' }],
    ['🙂', { unicode: '◐', category: 'status', description: 'Good Health (Circle with Left Half Black)' }],
    ['😊', { unicode: '☀', category: 'status', description: 'Full Health (Sun)' }],
    ['🤢', { unicode: '☣', category: 'status', description: 'Poisoned (Biohazard)' }],
    ['😵‍💫', { unicode: '※', category: 'status', description: 'Stunned (Reference Mark)' }],
    ['😠', { unicode: '⚡', category: 'status', description: 'Angry (Lightning)' }],
    ['😇', { unicode: '☆', category: 'status', description: 'Blessed (White Star)' }],
    ['😕', { unicode: '?', category: 'status', description: 'Confused (Question Mark)' }],
  ]);

  /**
   * Convert emoji to Unicode character
   */
  static convertEmoji(emoji: string): string {
    const mapping = this.emojiMap.get(emoji);
    return mapping ? mapping.unicode : emoji;
  }

  /**
   * Get mapping info for an emoji
   */
  static getMappingInfo(emoji: string): UnicodeMapping | null {
    return this.emojiMap.get(emoji) || null;
  }

  /**
   * Get all characters by category
   */
  static getCharactersByCategory(category: string): Map<string, UnicodeMapping> {
    const result = new Map<string, UnicodeMapping>();
    for (const [emoji, mapping] of this.emojiMap.entries()) {
      if (mapping.category === category) {
        result.set(emoji, mapping);
      }
    }
    return result;
  }

  /**
   * Get all available categories
   */
  static getCategories(): string[] {
    const categories = new Set<string>();
    for (const mapping of this.emojiMap.values()) {
      categories.add(mapping.category);
    }
    return Array.from(categories).sort();
  }

  /**
   * Add or update emoji mapping
   */
  static addMapping(emoji: string, mapping: UnicodeMapping): void {
    this.emojiMap.set(emoji, mapping);
  }

  /**
   * Convert text containing emojis to Unicode equivalents
   */
  static convertText(text: string): string {
    let result = text;
    for (const [emoji, mapping] of this.emojiMap.entries()) {
      result = result.replace(new RegExp(emoji, 'g'), mapping.unicode);
    }
    return result;
  }

  /**
   * Check if character is in our mapping system
   */
  static hasMappingFor(character: string): boolean {
    return this.emojiMap.has(character);
  }

  /**
   * Get suggested alternatives for a category
   */
  static getSuggestedAlternatives(category: string): string[] {
    return Array.from(this.getCharactersByCategory(category).values())
      .map(mapping => mapping.unicode);
  }
}