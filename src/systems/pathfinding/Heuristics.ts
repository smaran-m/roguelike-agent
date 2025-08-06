import { Position, HeuristicFunction } from './PathfindingTypes.js';

export class Heuristics {
  static calculate(start: Position, goal: Position, type: HeuristicFunction): number {
    switch (type) {
      case HeuristicFunction.MANHATTAN:
        return this.manhattan(start, goal);
      case HeuristicFunction.EUCLIDEAN:
        return this.euclidean(start, goal);
      case HeuristicFunction.CHEBYSHEV:
        return this.chebyshev(start, goal);
      default:
        return this.manhattan(start, goal);
    }
  }

  private static manhattan(start: Position, goal: Position): number {
    return (Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y)) * 10;
  }

  private static euclidean(start: Position, goal: Position): number {
    const dx = start.x - goal.x;
    const dy = start.y - goal.y;
    return Math.sqrt(dx * dx + dy * dy) * 10;
  }

  private static chebyshev(start: Position, goal: Position): number {
    const dx = Math.abs(start.x - goal.x);
    const dy = Math.abs(start.y - goal.y);
    return Math.max(dx, dy) * 10;
  }

  // Optimized heuristic for grid-based movement with diagonal allowed
  static octileDistance(start: Position, goal: Position): number {
    const dx = Math.abs(start.x - goal.x);
    const dy = Math.abs(start.y - goal.y);
    
    // Cost of diagonal movement (14) vs straight movement (10)
    // Octile distance: min(dx,dy) * diagonal + |dx-dy| * straight
    return Math.min(dx, dy) * 14 + Math.abs(dx - dy) * 10;
  }
}