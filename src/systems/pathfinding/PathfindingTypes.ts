// Pathfinding types and interfaces

export interface Position {
  x: number;
  y: number;
}

export interface PathfindingNode {
  position: Position;
  gCost: number;  // Distance from start
  hCost: number;  // Heuristic distance to goal
  fCost: number;  // gCost + hCost
  parent: PathfindingNode | null;
  heapIndex: number; // For binary heap optimization
}

export interface PathfindingResult {
  path: Position[];
  found: boolean;
  nodesExpanded: number;
  computeTime: number;
  distance: number;
}

export interface PathfindingOptions {
  allowDiagonal: boolean;
  heuristicWeight: number; // Multiplier for heuristic (1.0 = A*, >1.0 = weighted A*)
  maxIterations: number;   // Prevent infinite loops
  cacheResults: boolean;   // Whether to cache this path
}

export interface CachedPath {
  path: Position[];
  timestamp: number;
  startPos: Position;
  goalPos: Position;
  hash: string;
}

export interface PathfindingMetrics {
  totalPathsComputed: number;
  cacheHits: number;
  cacheSize: number;
  averageComputeTime: number;
  averagePathLength: number;
  totalNodesExpanded: number;
}

// Heuristic functions
export enum HeuristicFunction {
  MANHATTAN = 'manhattan',
  EUCLIDEAN = 'euclidean', 
  CHEBYSHEV = 'chebyshev'
}

// Movement costs
export const MOVEMENT_COSTS = {
  STRAIGHT: 10,
  DIAGONAL: 14  // Approximately sqrt(2) * 10
} as const;

// Maximum cache size and age
export const PATHFINDING_CONFIG = {
  MAX_CACHE_SIZE: 1000,
  MAX_CACHE_AGE_MS: 60000, // 1 minute
  DEFAULT_MAX_ITERATIONS: 10000,
  PERFORMANCE_TARGET_MS: 5 // Target: <5ms for typical pathfinding
} as const;