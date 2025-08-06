import { Position, PathfindingNode, PathfindingResult, PathfindingOptions, MOVEMENT_COSTS, PATHFINDING_CONFIG } from './PathfindingTypes.js';
import { BinaryHeap } from './BinaryHeap.js';
import { Heuristics } from './Heuristics.js';
import { TileMap } from '../../core/TileMap.js';
import { Logger } from '../../utils/Logger.js';

export class AStar {
  private openSet: BinaryHeap;
  private closedSet: Set<string>;
  private nodeGrid: Map<string, PathfindingNode>;
  private logger: Logger;

  constructor(logger: Logger) {
    this.openSet = new BinaryHeap();
    this.closedSet = new Set();
    this.nodeGrid = new Map();
    this.logger = logger;
  }

  findPath(
    start: Position, 
    goal: Position, 
    tileMap: TileMap, 
    options: Partial<PathfindingOptions> = {}
  ): PathfindingResult {
    const startTime = performance.now();
    
    // Set default options
    const opts: PathfindingOptions = {
      allowDiagonal: true,
      heuristicWeight: 1.0,
      maxIterations: PATHFINDING_CONFIG.DEFAULT_MAX_ITERATIONS,
      cacheResults: true,
      ...options
    };

    this.reset();

    // Validate start and goal positions
    if (!this.isValidPosition(start, tileMap) || !this.isValidPosition(goal, tileMap)) {
      return {
        path: [],
        found: false,
        nodesExpanded: 0,
        computeTime: performance.now() - startTime,
        distance: 0
      };
    }

    // Create start node
    const startNode = this.createNode(start, goal, null, opts.heuristicWeight);
    this.openSet.add(startNode);
    this.nodeGrid.set(this.positionToString(start), startNode);

    let nodesExpanded = 0;
    let iterations = 0;

    while (this.openSet.count > 0 && iterations < opts.maxIterations) {
      iterations++;
      
      // Get node with lowest f cost
      const currentNode = this.openSet.removeFirst();
      this.closedSet.add(this.positionToString(currentNode.position));
      nodesExpanded++;

      // Check if we've reached the goal
      if (this.positionsEqual(currentNode.position, goal)) {
        const path = this.reconstructPath(currentNode);
        const computeTime = performance.now() - startTime;
        
        this.logger.debug('Pathfinding completed', {
          pathLength: path.length,
          nodesExpanded,
          computeTime,
          iterations
        });

        return {
          path,
          found: true,
          nodesExpanded,
          computeTime,
          distance: currentNode.gCost
        };
      }

      // Examine neighbors
      const neighbors = this.getNeighbors(currentNode.position, tileMap, opts.allowDiagonal);
      
      for (const neighborPos of neighbors) {
        const neighborKey = this.positionToString(neighborPos);
        
        // Skip if already processed
        if (this.closedSet.has(neighborKey)) {
          continue;
        }

        // Calculate movement cost
        const movementCost = this.getMovementCost(currentNode.position, neighborPos);
        const tentativeGCost = currentNode.gCost + movementCost;

        let neighborNode = this.nodeGrid.get(neighborKey);
        
        if (!neighborNode) {
          // Create new node
          neighborNode = this.createNode(neighborPos, goal, currentNode, opts.heuristicWeight);
          neighborNode.gCost = tentativeGCost;
          neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;
          
          this.nodeGrid.set(neighborKey, neighborNode);
          this.openSet.add(neighborNode);
        } else if (tentativeGCost < neighborNode.gCost) {
          // Found a better path to this node
          neighborNode.parent = currentNode;
          neighborNode.gCost = tentativeGCost;
          neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;
          
          if (this.openSet.contains(neighborNode)) {
            this.openSet.updateItem(neighborNode);
          } else {
            this.openSet.add(neighborNode);
          }
        }
      }
    }

    // No path found
    const computeTime = performance.now() - startTime;
    
    this.logger.debug('Pathfinding failed', {
      reason: iterations >= opts.maxIterations ? 'max_iterations' : 'no_path',
      nodesExpanded,
      computeTime,
      iterations
    });

    return {
      path: [],
      found: false,
      nodesExpanded,
      computeTime,
      distance: 0
    };
  }

  private reset(): void {
    this.openSet.clear();
    this.closedSet.clear();
    this.nodeGrid.clear();
  }

  private createNode(
    position: Position, 
    goal: Position, 
    parent: PathfindingNode | null,
    heuristicWeight: number
  ): PathfindingNode {
    const gCost = parent ? parent.gCost + this.getMovementCost(parent.position, position) : 0;
    const hCost = Heuristics.octileDistance(position, goal) * heuristicWeight;
    
    return {
      position,
      gCost,
      hCost,
      fCost: gCost + hCost,
      parent,
      heapIndex: -1
    };
  }

  private getNeighbors(position: Position, tileMap: TileMap, allowDiagonal: boolean): Position[] {
    const neighbors: Position[] = [];
    
    // Cardinal directions (N, E, S, W)
    const cardinalDirections = [
      { x: 0, y: -1 },  // North
      { x: 1, y: 0 },   // East
      { x: 0, y: 1 },   // South
      { x: -1, y: 0 }   // West
    ];
    
    // Add cardinal neighbors
    for (const dir of cardinalDirections) {
      const newPos = { x: position.x + dir.x, y: position.y + dir.y };
      if (this.isValidPosition(newPos, tileMap)) {
        neighbors.push(newPos);
      }
    }

    // Add diagonal neighbors if allowed
    if (allowDiagonal) {
      const diagonalDirections = [
        { x: -1, y: -1 }, // Northwest
        { x: 1, y: -1 },  // Northeast
        { x: 1, y: 1 },   // Southeast
        { x: -1, y: 1 }   // Southwest
      ];

      for (const dir of diagonalDirections) {
        const newPos = { x: position.x + dir.x, y: position.y + dir.y };
        
        // For diagonal movement, check that we can move through adjacent cardinal tiles
        // This prevents "cutting corners" through walls
        const cardinalX = { x: position.x + dir.x, y: position.y };
        const cardinalY = { x: position.x, y: position.y + dir.y };
        
        if (this.isValidPosition(newPos, tileMap) && 
            this.isValidPosition(cardinalX, tileMap) && 
            this.isValidPosition(cardinalY, tileMap)) {
          neighbors.push(newPos);
        }
      }
    }

    return neighbors;
  }

  private isValidPosition(position: Position, tileMap: TileMap): boolean {
    // Check bounds
    if (position.x < 0 || position.x >= tileMap.width || 
        position.y < 0 || position.y >= tileMap.height) {
      return false;
    }

    // Check if tile is walkable
    const tile = tileMap.getTile(position.x, position.y);
    return tile?.walkable ?? false;
  }

  private getMovementCost(from: Position, to: Position): number {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    
    // Diagonal movement
    if (dx === 1 && dy === 1) {
      return MOVEMENT_COSTS.DIAGONAL;
    }
    
    // Cardinal movement
    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      return MOVEMENT_COSTS.STRAIGHT;
    }
    
    // Shouldn't happen with proper neighbor generation
    return MOVEMENT_COSTS.STRAIGHT;
  }

  private reconstructPath(goalNode: PathfindingNode): Position[] {
    const path: Position[] = [];
    let currentNode: PathfindingNode | null = goalNode;

    while (currentNode !== null) {
      path.unshift(currentNode.position);
      currentNode = currentNode.parent;
    }

    return path;
  }

  private positionsEqual(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }

  private positionToString(position: Position): string {
    return `${position.x},${position.y}`;
  }
}