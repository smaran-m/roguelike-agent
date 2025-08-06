import { Position, PathfindingResult, PathfindingOptions, PathfindingMetrics, PATHFINDING_CONFIG } from './PathfindingTypes.js';
import { AStar } from './AStar.js';
import { PathCache } from './PathCache.js';
import { TileMap } from '../../core/TileMap.js';
import { EventBus } from '../../core/events/EventBus.js';
import { Logger } from '../../utils/Logger.js';
import { ErrorHandler, GameErrorCode } from '../../utils/ErrorHandler.js';

export class PathfindingSystem {
  private static instance: PathfindingSystem;
  private aStar: AStar;
  private pathCache: PathCache;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  
  // Performance metrics
  private metrics: PathfindingMetrics = {
    totalPathsComputed: 0,
    cacheHits: 0,
    cacheSize: 0,
    averageComputeTime: 0,
    averagePathLength: 0,
    totalNodesExpanded: 0
  };

  private totalComputeTime = 0;
  private totalPathLength = 0;

  constructor(eventBus?: EventBus) {
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.aStar = new AStar(this.logger);
    this.pathCache = new PathCache(this.logger, eventBus);
  }

  static getInstance(eventBus?: EventBus): PathfindingSystem {
    if (!PathfindingSystem.instance) {
      PathfindingSystem.instance = new PathfindingSystem(eventBus);
    }
    return PathfindingSystem.instance;
  }

  findPath(
    start: Position,
    goal: Position,
    tileMap: TileMap,
    options: Partial<PathfindingOptions> = {}
  ): PathfindingResult {
    try {
      // Set default options
      const opts: PathfindingOptions = {
        allowDiagonal: true,
        heuristicWeight: 1.0,
        maxIterations: PATHFINDING_CONFIG.DEFAULT_MAX_ITERATIONS,
        cacheResults: true,
        ...options
      };

      // Check cache first if enabled
      if (opts.cacheResults) {
        const cachedPath = this.pathCache.get(start, goal);
        if (cachedPath) {
          this.metrics.cacheHits++;
          
          this.logger.debug('Using cached path', {
            start,
            goal,
            pathLength: cachedPath.length,
            cacheHits: this.metrics.cacheHits
          });

          return {
            path: cachedPath,
            found: true,
            nodesExpanded: 0, // Cache hit, no computation needed
            computeTime: 0,
            distance: this.calculatePathDistance(cachedPath)
          };
        }
      }

      // Compute path using A*
      const result = this.aStar.findPath(start, goal, tileMap, opts);

      // Update metrics
      this.updateMetrics(result);

      // Cache successful paths if enabled
      if (opts.cacheResults && result.found && result.path.length > 0) {
        this.pathCache.set(start, goal, result.path);
      }

      // Check for performance issues
      if (result.computeTime > PATHFINDING_CONFIG.PERFORMANCE_TARGET_MS * 2) {
        this.logger.warn('Pathfinding performance warning', {
          computeTime: result.computeTime,
          target: PATHFINDING_CONFIG.PERFORMANCE_TARGET_MS,
          nodesExpanded: result.nodesExpanded,
          pathLength: result.path.length
        });
      }

      return result;

    } catch (error) {
      this.errorHandler.handle(
        GameErrorCode.PATHFINDING_ERROR,
        error instanceof Error ? error : new Error(String(error)),
        { start, goal, options }
      );

      // Return empty path on error
      return {
        path: [],
        found: false,
        nodesExpanded: 0,
        computeTime: 0,
        distance: 0
      };
    }
  }

  // Simplified pathfinding for basic AI - returns next position toward goal
  findNextStep(
    start: Position,
    goal: Position,
    tileMap: TileMap,
    options: Partial<PathfindingOptions> = {}
  ): Position | null {
    const result = this.findPath(start, goal, tileMap, options);
    
    if (!result.found || result.path.length < 2) {
      return null;
    }

    // Return the first step in the path (after the starting position)
    return result.path[1];
  }

  // Check if a direct line of sight exists between two positions
  hasLineOfSight(start: Position, goal: Position, tileMap: TileMap): boolean {
    const dx = Math.abs(goal.x - start.x);
    const dy = Math.abs(goal.y - start.y);
    const stepX = start.x < goal.x ? 1 : -1;
    const stepY = start.y < goal.y ? 1 : -1;

    let x = start.x;
    let y = start.y;
    let error = dx - dy;

    while (x !== goal.x || y !== goal.y) {
      // Check if current position is walkable
      if (!this.isWalkable(x, y, tileMap)) {
        return false;
      }

      const e2 = 2 * error;
      if (e2 > -dy) {
        error -= dy;
        x += stepX;
      }
      if (e2 < dx) {
        error += dx;
        y += stepY;
      }
    }

    return true;
  }

  // Calculate Manhattan distance between two positions
  manhattanDistance(pos1: Position, pos2: Position): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  // Calculate Euclidean distance between two positions
  euclideanDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Get pathfinding performance metrics
  getMetrics(): PathfindingMetrics {
    return {
      ...this.metrics,
      cacheSize: this.pathCache.getMetrics().size
    };
  }

  // Clear all cached paths
  clearCache(): void {
    this.pathCache.clear();
    this.logger.info('Pathfinding cache cleared');
  }

  // Invalidate cached paths around a position (useful when tiles change)
  invalidateCache(position: Position): void {
    const invalidated = this.pathCache.invalidatePathsThrough(position);
    this.logger.debug('Invalidated pathfinding cache', { position, paths: invalidated });
  }

  // Reset all metrics
  resetMetrics(): void {
    this.metrics = {
      totalPathsComputed: 0,
      cacheHits: 0,
      cacheSize: 0,
      averageComputeTime: 0,
      averagePathLength: 0,
      totalNodesExpanded: 0
    };
    this.totalComputeTime = 0;
    this.totalPathLength = 0;
    
    this.logger.info('Pathfinding metrics reset');
  }

  destroy(): void {
    this.pathCache.destroy();
    PathfindingSystem.instance = undefined as any;
  }

  private updateMetrics(result: PathfindingResult): void {
    this.metrics.totalPathsComputed++;
    this.metrics.totalNodesExpanded += result.nodesExpanded;
    
    if (result.found) {
      this.totalComputeTime += result.computeTime;
      this.totalPathLength += result.path.length;
      
      this.metrics.averageComputeTime = this.totalComputeTime / this.metrics.totalPathsComputed;
      this.metrics.averagePathLength = this.totalPathLength / this.metrics.totalPathsComputed;
    }
  }

  private calculatePathDistance(path: Position[]): number {
    if (path.length < 2) return 0;
    
    let distance = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = Math.abs(path[i].x - path[i - 1].x);
      const dy = Math.abs(path[i].y - path[i - 1].y);
      
      // Diagonal movement costs more
      if (dx === 1 && dy === 1) {
        distance += 14; // Approximately sqrt(2) * 10
      } else {
        distance += 10; // Straight movement
      }
    }
    
    return distance;
  }

  private isWalkable(x: number, y: number, tileMap: TileMap): boolean {
    const tile = tileMap.getTile(x, y);
    return tile?.walkable ?? false;
  }
}

