/**
 * Utility to convert emoji data files to Unicode equivalents
 */

import { UnicodeMapper } from './UnicodeMapper';
import { Logger } from './Logger';

export interface ConversionResult {
  originalEmoji: string;
  convertedUnicode: string;
  mapping: any;
  wasConverted: boolean;
}

export class ConvertEmojiData {
  private static logger = Logger.getInstance();

  /**
   * Convert all emojis in a data object to Unicode equivalents
   */
  static convertDataObject(data: any, path: string = ''): { converted: any, results: ConversionResult[] } {
    const results: ConversionResult[] = [];
    const converted = this.deepConvertObject(data, results, path);
    return { converted, results };
  }

  /**
   * Recursively convert emojis in nested objects/arrays
   */
  private static deepConvertObject(obj: any, results: ConversionResult[], path: string): any {
    if (typeof obj === 'string') {
      return this.convertStringWithTracking(obj, results, path);
    }
    
    if (Array.isArray(obj)) {
      return obj.map((item, index) => 
        this.deepConvertObject(item, results, `${path}[${index}]`)
      );
    }
    
    if (obj && typeof obj === 'object') {
      const converted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const newPath = path ? `${path}.${key}` : key;
        converted[key] = this.deepConvertObject(value, results, newPath);
      }
      return converted;
    }
    
    return obj;
  }

  /**
   * Convert string and track what changed
   */
  private static convertStringWithTracking(str: string, results: ConversionResult[], path: string): string {
    let converted = str;
    let changed = false;

    // Check each emoji in our mapping
    for (const [emoji] of UnicodeMapper['emojiMap']) {
      if (str.includes(emoji)) {
        const mappingInfo = UnicodeMapper.getMappingInfo(emoji);
        const unicodeChar = UnicodeMapper.convertEmoji(emoji);
        
        results.push({
          originalEmoji: emoji,
          convertedUnicode: unicodeChar,
          mapping: mappingInfo,
          wasConverted: unicodeChar !== emoji
        });
        
        converted = converted.replace(new RegExp(emoji, 'g'), unicodeChar);
        changed = true;
        
        this.logger.debug(`Converted ${emoji} → ${unicodeChar} at ${path}`);
      }
    }

    return converted;
  }

  /**
   * Convert and save JSON file with backup
   */
  static async convertJsonFile(inputPath: string, outputPath?: string): Promise<ConversionResult[]> {
    const fs = await import('fs').then(m => m.promises);
    
    try {
      // Read original file
      const originalData = JSON.parse(await fs.readFile(inputPath, 'utf8'));
      
      // Convert emojis
      const { converted, results } = this.convertDataObject(originalData, inputPath);
      
      // Create backup of original
      const backupPath = inputPath.replace(/\.json$/, '.backup.json');
      await fs.writeFile(backupPath, JSON.stringify(originalData, null, 2));
      this.logger.info(`Created backup: ${backupPath}`);
      
      // Write converted file
      const targetPath = outputPath || inputPath;
      await fs.writeFile(targetPath, JSON.stringify(converted, null, 2));
      this.logger.info(`Converted file saved: ${targetPath}`);
      
      // Log conversion summary
      const convertedCount = results.filter(r => r.wasConverted).length;
      this.logger.info(`Converted ${convertedCount} emojis in ${inputPath}`);
      
      return results;
      
    } catch (error) {
      this.logger.error(`Failed to convert ${inputPath}:`, error);
      throw error;
    }
  }

  /**
   * Generate conversion report
   */
  static generateReport(results: ConversionResult[]): string {
    const converted = results.filter(r => r.wasConverted);
    const unconverted = results.filter(r => !r.wasConverted);
    
    let report = `\n=== EMOJI CONVERSION REPORT ===\n`;
    report += `Total emojis found: ${results.length}\n`;
    report += `Successfully converted: ${converted.length}\n`;
    report += `Unchanged: ${unconverted.length}\n\n`;
    
    if (converted.length > 0) {
      report += `CONVERTED:\n`;
      for (const result of converted) {
        report += `  ${result.originalEmoji} → ${result.convertedUnicode} (${result.mapping?.description || 'no description'})\n`;
      }
    }
    
    if (unconverted.length > 0) {
      report += `\nNEEDS MAPPING:\n`;
      for (const result of unconverted) {
        report += `  ${result.originalEmoji} (no mapping available)\n`;
      }
    }
    
    return report;
  }

  /**
   * Preview conversion without saving
   */
  static previewConversion(data: any): string {
    const { results } = this.convertDataObject(data);
    return this.generateReport(results);
  }
}