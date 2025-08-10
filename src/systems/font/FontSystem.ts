import { TextStyle } from 'pixi.js';
import { UnicodeMapper } from '../../utils/UnicodeMapper';

export interface FontConfig {
  fontFamily: string;
  fontSize: number;
  fill: number;
  align: string;
}

export class FontSystem {
  // Font families
  private static readonly EMOJI_FONT = 'Noto Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif';
  private static readonly MONO_FONT = 'GNU Unifont, monospace';

  // Font sizes
  private static readonly EMOJI_SIZE_LARGE = 28;
  private static readonly MONO_SIZE_LARGE = 24;
  private static readonly MONO_SIZE_MEDIUM = 16;
  private static readonly MONO_SIZE_NORMAL = 14;
  private static readonly MONO_SIZE_SMALL = 11;
  private static readonly MONO_SIZE_TINY = 10;

  /**
   * Get font configuration for tile rendering
   */
  static getTileFont(isEmoji: boolean): Partial<any> {
    return {
      fontFamily: isEmoji ? this.EMOJI_FONT : this.MONO_FONT,
      fontSize: isEmoji ? this.EMOJI_SIZE_LARGE : this.MONO_SIZE_LARGE,
      fill: 0xFFFFFF,
      align: 'center'
    };
  }

  /**
   * Get font configuration for entity rendering
   */
  static getEntityFont(isEmoji: boolean, color: number = 0xFFFFFF): Partial<any> {
    return {
      fontFamily: isEmoji ? this.EMOJI_FONT : this.MONO_FONT,
      fontSize: isEmoji ? this.EMOJI_SIZE_LARGE : this.MONO_SIZE_LARGE,
      fill: isEmoji ? 0xFFFFFF : color,
      align: 'center'
    };
  }

  /**
   * Get font configuration for UI elements
   */
  static getUIFont(size: 'large' | 'medium' | 'normal' | 'small' | 'tiny' = 'normal'): FontConfig {
    const sizeMap = {
      large: this.MONO_SIZE_MEDIUM,
      medium: this.MONO_SIZE_NORMAL,
      normal: this.MONO_SIZE_SMALL,
      small: this.MONO_SIZE_TINY,
      tiny: this.MONO_SIZE_TINY
    };

    return {
      fontFamily: this.MONO_FONT,
      fontSize: sizeMap[size],
      fill: 0xFFFFFF,
      align: 'left'
    };
  }

  /**
   * Get font configuration for HP text
   */
  static getHPFont(): Partial<any> {
    return {
      fontFamily: this.MONO_FONT,
      fontSize: this.MONO_SIZE_TINY,
      fill: 0xFFFFFF,
      align: 'center'
    };
  }

  /**
   * Get font configuration for damage numbers
   */
  static getDamageFont(): FontConfig {
    return {
      fontFamily: this.MONO_FONT,
      fontSize: this.MONO_SIZE_NORMAL,
      fill: 0xFF4444,
      align: 'center'
    };
  }

  /**
   * Create a TextStyle object from FontConfig
   */
  static createTextStyle(config: FontConfig): TextStyle {
    return new TextStyle({
      fontFamily: config.fontFamily,
      fontSize: config.fontSize,
      fill: config.fill,
      align: config.align as any
    });
  }

  /**
   * Create a partial TextStyle object for simple usage
   */
  static createSimpleStyle(
    fontFamily: string, 
    fontSize: number, 
    fill: number = 0xFFFFFF, 
    align: string = 'left'
  ): Partial<TextStyle> {
    return {
      fontFamily,
      fontSize,
      fill,
      align: align as any
    };
  }

  /**
   * Apply color tinting for emoji entities
   */
  static shouldApplyColorTint(isEmoji: boolean): boolean {
    return isEmoji;
  }

  /**
   * Get the appropriate color for entity rendering
   */
  static getEntityColor(isEmoji: boolean, entityColor: number): number {
    return isEmoji ? 0xFFFFFF : entityColor;
  }

  /**
   * Convert emoji to Unicode character for textmode rendering
   */
  static convertToTextmode(character: string): string {
    return UnicodeMapper.convertEmoji(character);
  }

  /**
   * Check if character needs conversion from emoji to Unicode
   */
  static shouldConvertEmoji(character: string): boolean {
    return UnicodeMapper.hasMappingFor(character);
  }

  /**
   * Get processed character for rendering (converts emojis to Unicode)
   */
  static getProcessedCharacter(character: string): { 
    glyph: string, 
    useMonospace: boolean,
    wasConverted: boolean 
  } {
    const converted = this.convertToTextmode(character);
    const wasConverted = converted !== character;
    
    return {
      glyph: converted,
      useMonospace: true, // Always use monospace font for textmode aesthetic
      wasConverted
    };
  }

  /**
   * Get font configuration with automatic emoji-to-Unicode conversion
   */
  static getTextmodeFont(character: string, size: 'large' | 'medium' | 'normal' | 'small' | 'tiny' = 'large'): Partial<any> {
    const processed = this.getProcessedCharacter(character);
    
    const sizeMap = {
      large: this.MONO_SIZE_LARGE,
      medium: this.MONO_SIZE_MEDIUM, 
      normal: this.MONO_SIZE_NORMAL,
      small: this.MONO_SIZE_SMALL,
      tiny: this.MONO_SIZE_TINY
    };

    return {
      fontFamily: this.MONO_FONT,
      fontSize: sizeMap[size],
      fill: 0xFFFFFF,
      align: 'center'
    };
  }

  /**
   * Get UI text styles for different components
   */
  static getUIStyles() {
    return {
      title: this.createSimpleStyle(this.MONO_FONT, this.MONO_SIZE_MEDIUM, 0xAAAAAA, 'left'),
      messageLog: this.createSimpleStyle(this.MONO_FONT, this.MONO_SIZE_SMALL, 0xFFFFFF, 'left'),
      controls: this.createSimpleStyle(this.MONO_FONT, this.MONO_SIZE_TINY, 0x888888, 'left'),
      position: this.createSimpleStyle(this.MONO_FONT, this.MONO_SIZE_TINY, 0x888888, 'right')
    };
  }
}