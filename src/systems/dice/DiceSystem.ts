import { Logger } from '../../utils/Logger';

export interface DiceResult {
  total: number;
  rolls: number[];
  modifier: number;
  criticalSuccess?: boolean;
  criticalFailure?: boolean;
}

export interface AttackRollResult {
  d20Roll: number;
  total: number;
  isCritical: boolean;
  isCriticalFailure: boolean;
}

export class DiceSystem {
  /**
   * Roll a single die with specified number of sides
   */
  static rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  /**
   * Roll a d20 (standard D&D attack/ability check die)
   */
  static rollD20(): number {
    return this.rollDie(20);
  }

  /**
   * Roll a d4 (damage die)
   */
  static rollD4(): number {
    return this.rollDie(4);
  }

  /**
   * Roll a d6 (damage die)
   */
  static rollD6(): number {
    return this.rollDie(6);
  }

  /**
   * Roll a d8 (damage die)
   */
  static rollD8(): number {
    return this.rollDie(8);
  }

  /**
   * Roll a d10 (damage die)
   */
  static rollD10(): number {
    return this.rollDie(10);
  }

  /**
   * Roll a d12 (damage die)
   */
  static rollD12(): number {
    return this.rollDie(12);
  }

  /**
   * Roll multiple dice (e.g., "2d6+3", "1d8", "4d4+2")
   * Supports format: [count]d[sides][+/-modifier]
   */
  static rollDice(diceString: string): DiceResult {
    const match = diceString.match(/(\d+)d(\d+)(?:([+-])(\d+))?/);
    if (!match) {
      Logger.warn(`Invalid dice string: ${diceString}`);
      return { total: 1, rolls: [1], modifier: 0 };
    }

    const diceCount = parseInt(match[1]);
    const diceSides = parseInt(match[2]);
    const modifierSign = match[3] || '+';
    const modifierValue = match[4] ? parseInt(match[4]) : 0;
    const modifier = modifierSign === '-' ? -modifierValue : modifierValue;

    const rolls: number[] = [];
    let total = 0;

    for (let i = 0; i < diceCount; i++) {
      const roll = this.rollDie(diceSides);
      rolls.push(roll);
      total += roll;
    }

    total += modifier;

    return { 
      total: Math.max(0, total), // Prevent negative damage
      rolls, 
      modifier,
      criticalSuccess: rolls.length === 1 && diceSides === 20 && rolls[0] === 20,
      criticalFailure: rolls.length === 1 && diceSides === 20 && rolls[0] === 1
    };
  }

  /**
   * Roll an attack roll (d20 + modifier)
   */
  static rollAttack(modifier: number = 0): AttackRollResult {
    const d20Roll = this.rollD20();
    const total = d20Roll + modifier;

    return {
      d20Roll,
      total,
      isCritical: d20Roll === 20,
      isCriticalFailure: d20Roll === 1
    };
  }

  /**
   * Roll damage with optional critical hit handling
   */
  static rollDamage(
    diceString: string, 
    modifier: number = 0, 
    isCritical: boolean = false,
    criticalRule: 'double' | 'max-plus-roll' | 'double-dice' = 'double-dice'
  ): DiceResult {
    const baseDamage = this.rollDice(diceString);
    
    if (!isCritical) {
      return {
        total: baseDamage.total + modifier,
        rolls: baseDamage.rolls,
        modifier: baseDamage.modifier + modifier
      };
    }

    // Handle critical hit based on rule
    switch (criticalRule) {
      case 'double':
        // Double the total damage
        return {
          total: (baseDamage.total + modifier) * 2,
          rolls: baseDamage.rolls,
          modifier: (baseDamage.modifier + modifier) * 2
        };

      case 'max-plus-roll':
        // Maximum damage on first roll + normal roll
        const maxRollTotal = baseDamage.rolls.length * this.getDieSidesFromString(diceString);
        const secondRoll = this.rollDice(diceString);
        return {
          total: maxRollTotal + secondRoll.total + modifier,
          rolls: [...baseDamage.rolls, ...secondRoll.rolls],
          modifier: baseDamage.modifier + modifier
        };

      case 'double-dice':
      default:
        // Roll damage dice twice (standard D&D 5e)
        const critRoll = this.rollDice(diceString);
        return {
          total: baseDamage.total + critRoll.total + modifier,
          rolls: [...baseDamage.rolls, ...critRoll.rolls],
          modifier: baseDamage.modifier + modifier
        };
    }
  }

  /**
   * Roll multiple different dice expressions and sum them
   */
  static rollMultiple(diceExpressions: string[]): DiceResult {
    let totalSum = 0;
    let allRolls: number[] = [];
    let totalModifier = 0;

    for (const expression of diceExpressions) {
      const result = this.rollDice(expression);
      totalSum += result.total;
      allRolls = allRolls.concat(result.rolls);
      totalModifier += result.modifier;
    }

    return {
      total: totalSum,
      rolls: allRolls,
      modifier: totalModifier
    };
  }

  /**
   * Roll with advantage (roll twice, take higher)
   */
  static rollWithAdvantage(diceString: string = '1d20'): DiceResult {
    const roll1 = this.rollDice(diceString);
    const roll2 = this.rollDice(diceString);
    
    return roll1.total >= roll2.total ? roll1 : roll2;
  }

  /**
   * Roll with disadvantage (roll twice, take lower)
   */
  static rollWithDisadvantage(diceString: string = '1d20'): DiceResult {
    const roll1 = this.rollDice(diceString);
    const roll2 = this.rollDice(diceString);
    
    return roll1.total <= roll2.total ? roll1 : roll2;
  }

  /**
   * Get the number of sides for a die type from a dice string
   */
  private static getDieSidesFromString(diceString: string): number {
    const match = diceString.match(/\d+d(\d+)/);
    return match ? parseInt(match[1]) : 6; // Default to d6
  }

  /**
   * Format dice result for display
   */
  static formatDiceResult(result: DiceResult, showRolls: boolean = true): string {
    if (!showRolls) {
      return result.total.toString();
    }

    let formatted = result.rolls.join(' + ');
    if (result.modifier !== 0) {
      formatted += result.modifier >= 0 ? ` + ${result.modifier}` : ` - ${Math.abs(result.modifier)}`;
    }
    formatted += ` = ${result.total}`;
    
    return formatted;
  }
}