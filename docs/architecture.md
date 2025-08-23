# Roguelike Agent - Technical Architecture Documentation

## Overview

This document provides detailed technical documentation of the roguelike game's architecture, focusing on system interconnections, data flow, and implementation specifics for logical vs rendering positions, animation systems, component relationships, and advanced game systems including procedural audio, pathfinding, and multi-world mechanics.

## Core Architecture Pattern

The system follows a **modular layered architecture** with **dependency injection**, **EventBus-driven communication**, and **callback-based decoupling**:

```
┌─────────────────────────────────┐
│      Application Layer          │  main.ts (entry point)
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│       Game Layer                │  Game.ts (orchestrator)
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│    System Layer                 │  Specialized systems (input, movement, combat, audio, pathfinding)
│  ┌─────────────────────────────┐ │
│  │     EventBus System         │ │  High-performance event communication
│  └─────────────────────────────┘ │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Management Layer              │  Managers (GameState, Character, Resource)
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Data & Utility Layer          │  Loaders, ErrorHandler, Logger, utilities
└─────────────────────────────────┘
```

## EventBus Architecture

### High-Performance Event System
**Files**: `src/core/events/EventBus.ts`, `EventAggregator.ts`, `EventPool.ts`

The EventBus system provides high-performance, decoupled communication between game systems:

#### Ring Buffer Event Processing
- **Buffer size**: 64 events with overflow handling (oldest events dropped)
- **FIFO ordering**: Events processed in chronological order
- **Performance target**: Sub-millisecond event processing
- **Memory efficiency**: Ring buffer prevents memory allocation spikes

#### Event Aggregation
- **Batching**: Similar events aggregated within time windows (100ms default)
- **Damage aggregation**: Multiple damage events to same target combined
- **Performance optimization**: Reduces event processing overhead

#### Object Pooling
- **Event reuse**: Events recycled to minimize garbage collection
- **Memory management**: Pre-allocated event objects for common types
- **Performance impact**: Reduces allocation pressure in tight game loops

#### Integration Points
- **Audio System**: Reactive sound generation based on game events
- **PathCache**: Intelligent cache invalidation on world changes
- **Combat System**: Event-driven damage and death notifications
- **Animation System**: Visual effect triggers from game events

## Position Management Architecture

### Dual Position System

The game implements a sophisticated dual position system to handle smooth movement with grid-based logic:

#### 1. Logical Positions (Grid-based)
- **Location**: `Entity.x` and `Entity.y` (integers)
- **Purpose**: Game logic, collision detection, combat range, line-of-sight
- **Updates**: Discrete grid movements when player reaches valid positions
- **Validation**: Through `MovementSystem.isValidGridPosition()`

#### 2. Display Positions (Continuous)
- **Location**: `MovementState.displayX` and `MovementState.displayY` (floats)
- **Purpose**: Smooth visual movement, camera following, rendering interpolation
- **Updates**: Every frame during movement input
- **Bounds**: Constrained by logical position validation

#### Position Flow:
```
User Input → MovementSystem.updateMovement() 
  ↓
Continuous displayX/Y updates (smooth movement)
  ↓
Grid position validation (when crossing grid boundaries)
  ↓
Logical Entity.x/y updates (discrete)
  ↓
Visual rendering at display positions
```

### Movement State Management

The `MovementState` interface tracks position information:

```typescript
interface MovementState {
  displayX: number;      // Current smooth position
  displayY: number;      // Current smooth position  
  lastValidX: number;    // Last confirmed valid grid position
  lastValidY: number;    // Last confirmed valid grid position
}
```

**Key Behaviors:**
- Display positions move smoothly with input
- Last valid positions serve as fallback for collision recovery
- Grid snapping occurs when movement keys are released
- Invalid positions trigger automatic snap-back to last valid position

## Advanced System Architecture

### 1. Procedural Audio System
**Files**: `src/systems/audio/AudioSystem.ts`, `AudioSettings.ts`, `SoundSynthesizer.ts`, `MusicGenerator.ts`, `AudioEnvelope.ts`, `WaveformGenerator.ts`, `OscillatorPool.ts`

#### Asset-Free Audio Generation
- **Web Audio API**: Complete procedural synthesis without audio files
- **ADSR Envelopes**: Attack, Decay, Sustain, Release shaping for realistic sounds
- **Oscillator Types**: Sine, square, sawtooth, triangle, and custom waveforms
- **Sound Categories**: Combat, movement, UI, environmental, and musical

#### Performance Optimization
- **Oscillator Pooling**: Reuse Web Audio oscillators to reduce creation overhead
- **LRU Caching**: Cache generated sounds with least-recently-used eviction
- **Binary Heap**: Priority queue for efficient sound scheduling
- **Performance Target**: Sub-5ms sound generation and playback

#### Spatial Audio
- **HRTF Positioning**: Head-Related Transfer Function for 3D audio placement
- **Distance Attenuation**: Realistic volume falloff based on entity positions
- **Stereo Panning**: Dynamic left/right positioning based on player location
- **Accessibility**: Visual indicators for audio-impaired players

#### Algorithmic Music Composition
- **Chord Progressions**: Procedural generation of musical sequences
- **Music Theory**: Correct interval relationships and harmonic progressions
- **Pattern Generation**: Rhythmic and melodic pattern creation
- **Adaptive Composition**: Music responds to gameplay events and world themes

#### EventBus Integration
```typescript
// Audio responds to game events automatically
EventBus.publish(new DamageDealtEvent({ damage: 10, damageType: 'fire' }));
// → Triggers appropriate combat sound with fire-based synthesis parameters
```

### 2. A* Pathfinding System
**Files**: `src/systems/pathfinding/PathfindingSystem.ts`, `AStar.ts`, `BinaryHeap.ts`, `PathCache.ts`, `Heuristics.ts`

#### Algorithm Implementation
- **A* Search**: Optimal pathfinding with heuristic guidance
- **Binary Heap**: Min-heap priority queue for O(log n) node processing
- **Diagonal Movement**: 8-directional movement with corner-cutting prevention
- **Performance Target**: Sub-5ms path computation for 20x20 areas

#### Intelligent Caching
- **LRU Cache**: Least-Recently-Used eviction with configurable size limits
- **EventBus Integration**: Automatic cache invalidation on world changes
- **Path Invalidation**: Selective invalidation for affected paths only
- **Memory Management**: Deep copying prevents cache corruption

#### Heuristic Functions
- **Manhattan Distance**: Grid-based movement (4-directional)
- **Euclidean Distance**: Direct line distance calculation
- **Octile Distance**: 8-directional movement with accurate diagonal costs
- **Configurable**: Runtime selection based on movement constraints

#### Integration Points
- **AI Systems**: Enemy movement and behavior planning
- **Player Assistance**: Pathfinding hints and movement validation
- **World Changes**: Dynamic re-pathing when obstacles appear/disappear
- **Performance Monitoring**: Metrics tracking and optimization alerts

### 3. Game Class (Central Orchestrator)
**File**: `src/core/Game.ts` (364 lines)

**Role**: Main coordinator that manages system lifecycle and integration

**Key Responsibilities**:
- System initialization through dependency injection
- Game loop orchestration via `GameStateManager`
- Integration between input, movement, combat, audio, and rendering systems
- Camera position management and viewport updates
- Font loading and rendering coordination

**System Dependencies**:
```typescript
class Game {
  renderer: Renderer;                    // Visual output
  tileMap: TileMap;                     // World data
  inputHandler: InputHandler;           // Input processing
  movementSystem: MovementSystem;       // Movement logic
  combatManager: CombatManager;         // Combat orchestration
  gameStateManager: GameStateManager;   // Entity management
  pathfindingSystem: PathfindingSystem; // AI pathfinding
  audioSystem: AudioSystem;             // Procedural audio
}
```

**Data Flow**:
1. Input callbacks trigger system responses
2. Movement system updates positions with pathfinding assistance
3. Audio system generates reactive sounds based on EventBus events
4. Visual system updates camera and rendering
5. Combat system processes attacks through CombatManager

### 4. DefaultRenderer Class (Hybrid Visual Engine)
**File**: `src/core/renderers/DefaultRenderer.ts`

**Role**: Hybrid PixiJS + HTML rendering system with sophisticated position and visibility management

**Key Features**:

#### Hybrid Architecture:
- **PixiJS Game Area**: Central viewport (tiles, entities, game world)
- **HTML UI Panels**: Character sheet, combat log using styled HTML
- **HTMLUIRenderer**: Manages 3-panel layout (300px character | game area | 400px combat)

#### PixiJS Layer Management:
```typescript
tileContainer: Container;      // Background tiles (PixiJS)
entityContainer: Container;    // Characters and objects (PixiJS)
// UI handled by separate HTML system
```

#### Position Translation System:
```typescript
// World coordinates (game logic) → Screen coordinates (viewport) → Pixel coordinates (rendering)
worldToScreen(worldX, worldY) → {x: screenX, y: screenY}
screenToWorld(screenX, screenY) → {x: worldX, y: worldY}
```

#### Camera System Integration:
- **CameraSystem Integration**: Delegated camera logic for maintainability
- **Edge-following camera**: Moves when player approaches viewport edges
- **Smooth camera transitions**: Integrated with animation system
- **Dynamic viewport calculation**: Only renders visible tiles and entities
- **Camera bounds**: Constrained to map boundaries

#### Entity Rendering Strategy:
- **Persistent text objects**: Cached in `entityTextMap` and `hpTextMap`
- **Property-only updates**: Position and visibility changes without object recreation
- **Visibility-based culling**: Entities outside FOV are hidden, not destroyed
- **Multi-resource HP display**: Theme-aware resource bar management

#### Font System Integration:
- **FontSystem Integration**: Centralized font management
- **Dual font support**: `Noto Emoji` for emojis, `Noto Sans Mono` for ASCII
- **Font loading coordination**: Async loading with fallback handling
- **Size differentiation**: Different font sizes for different UI elements

### 5. Movement System
**File**: `src/systems/movement/MovementSystem.ts` (125 lines)

**Role**: Handles smooth movement with collision detection and grid validation

**Key Components**:

#### Movement Processing:
```typescript
updateMovement(keysPressed, movementState, tileMap, player, entities)
```
- Processes continuous input for smooth movement
- Updates display positions each frame
- Validates positions against tiles and entities
- Updates logical positions when crossing grid boundaries
- Integrates with pathfinding for movement assistance

#### Collision Detection:
- **Multi-tile validation**: Checks overlapping tiles for fractional positions
- **Entity collision**: Prevents movement into occupied grid spaces
- **Boundary checking**: Enforces map boundaries
- **Safe fallback**: Snaps to last valid position on collision
- **Pathfinding integration**: Uses A* for collision-free movement suggestions

### 6. Input Handler System
**File**: `src/systems/input/InputHandler.ts` (107 lines)

**Role**: Callback-based input management with decoupled architecture and debug features

**Callback Architecture**:
```typescript
interface InputCallbacks {
  onMovementKey: (keys: Set<string>) => void;
  onMovementKeyRelease: (keys: Set<string>) => void;
  onAttack: () => void;
}
```

**Debug Features**:
- **F12 Toggle**: Debug verbose logging mode with visual indicator
- **Key Normalization**: Consistent lowercase key handling
- **Event Prevention**: Prevents browser defaults for game keys
- **State Management**: Tracks pressed keys for smooth movement

**Benefits**:
- **System decoupling**: Input handler doesn't know about game systems
- **Flexible key mapping**: Easy to extend with new input types
- **State management**: Tracks pressed keys for smooth movement
- **Event cleanup**: Proper listener management for memory safety

### 7. Combat Manager System
**File**: `src/systems/combat/CombatManager.ts` (90 lines)

**Role**: Orchestrates combat between game logic, visual effects, and audio feedback

**Combat Flow**:
1. **Range checking**: `CombatSystem.isInMeleeRange(attacker, target)`
2. **Attack calculation**: `CombatSystem.meleeAttack(attacker, target)` with damage type support
3. **Damage calculation**: Applies resistance/vulnerability multipliers based on damage types
4. **Resource application**: Multi-resource damage system (HP, stamina, etc.)
5. **Audio feedback**: EventBus-driven procedural sound generation
6. **Visual feedback**: Animation system triggers (shake, nudge, floating damage)
7. **Message logging**: Combat results displayed in UI
8. **Entity cleanup**: Removal of defeated entities

**Animation Integration**:
- **Attack feedback**: Nudge attacker toward target
- **Hit reactions**: Shake target on successful hit
- **Damage numbers**: Floating damage text with fade animation
- **Miss feedback**: Attacker shake on missed attacks

**Audio Integration**:
- **Impact sounds**: Procedural generation based on damage type
- **Weapon sounds**: Synthesis parameters based on attack type
- **Environmental audio**: Spatial positioning for combat sounds

### 8. Game State Manager
**File**: `src/managers/GameStateManager.ts` (184 lines)

**Role**: Entity lifecycle management and game loop coordination

**Entity Management**:
- **Safe spawning**: Position validation during entity creation
- **Lifecycle tracking**: Add, remove, and query entities
- **Position queries**: Check for entity collisions at positions
- **Player identification**: Separate player from enemy entities
- **EventBus integration**: Publishes entity lifecycle events

**Game Loop Management**:
- **RequestAnimationFrame coordination**: Manages the main game loop
- **Callback system**: Executes game logic each frame
- **Performance management**: Proper cleanup and memory management
- **System coordination**: Orchestrates updates across all game systems

### 9. Specialized Support Systems

#### Camera System
**File**: `src/systems/camera/CameraSystem.ts`

**Role**: Manages viewport and camera positioning with entity following

**Key Features**:
- **Entity following**: Smooth camera tracking of player movement
- **Viewport management**: Handles camera bounds and constraints  
- **Coordinate conversion**: World-to-screen and screen-to-world transformations
- **Camera movement**: Threshold-based camera updates and smooth transitions
- **Animation integration**: Coordinates with animation system for smooth effects

#### Font System
**File**: `src/systems/font/FontSystem.ts`

**Role**: Centralized font management for emoji and ASCII rendering

**Key Features**:
- **Automatic font detection**: Switches between emoji and ASCII fonts based on content
- **Font loading**: Manages Noto Emoji and Noto Sans Mono font resources
- **Consistent styling**: Standardized font configurations across UI elements
- **Size management**: Handles different font sizes for various game elements
- **Color management**: Theme-appropriate font colors and styling

#### Dice System  
**File**: `src/systems/dice/DiceSystem.ts`

**Role**: D&D-style dice rolling mechanics with notation support

**Key Features**:
- **Dice notation parsing**: Supports expressions like "2d6+3", "1d20", etc.
- **Deterministic testing**: Seeded randomness for consistent test results
- **Roll tracking**: Detailed results with individual dice outcomes
- **Modifier support**: Handles complex dice expressions with bonuses/penalties
- **Critical hit detection**: Natural 1s and 20s for special combat outcomes

#### Animation System
**File**: `src/systems/animation/AnimationSystem.ts`

**Role**: Handles all visual animations with camera-aware positioning

**Key Features**:
- **Camera-aware positioning**: Animations account for camera movement
- **GSAP integration**: Professional animation library for smooth effects
- **Entity animations**: Shake, nudge, and movement effects
- **Floating damage**: Animated damage numbers with proper positioning
- **Performance optimization**: Efficient animation queuing and cleanup

### 10. User Interface Architecture

#### Character Sheet System
**Files**: 
- `src/ui/components/CharacterSheet.ts` - PixiJS-based character sheet (exists but unused)
- `src/core/renderers/HTMLUIRenderer.ts` - Actual HTML-based character sheet implementation

- **HTML Panel Implementation**: Left panel (300px width) with styled HTML
- **Dual Systems**: PixiJS CharacterSheet exists but HTMLUIRenderer handles actual display
- **Real-time updates**: Reflects current player state with multi-resource support
- **Multi-resource display**: HTML text displays for HP, mana, and theme-specific resources
- **Dynamic theming**: Resource colors and types adapt to active world theme
- **Note**: Architecture transitional - PixiJS system unused, HTML system functional

#### Resource Display System
**File**: `src/ui/components/ResourceDisplay.ts`

**Features**:
- **Multi-resource support**: Handles HP, mana, and theme-specific resources dynamically
- **ASCII bar rendering**: Text-based progress bars with configurable colors
- **World theme integration**: Adapts to active world's resource configuration
- **Real-time updates**: Reflects current entity resource states
- **Health color progression**: Dynamic color changes (green → yellow → orange → red)

**UI Layout** (HTML + PixiJS Hybrid):
```
HTML Container (3-Panel Layout)
├── Character Sheet Panel (300px HTML)
│   ├── Portrait and Name
│   ├── Multi-Resource Display (HTML text)
│   ├── Stats Section (6 D&D attributes + AC + Level)
│   └── Equipment Section
├── PixiJS Game Area (640x640px)
│   ├── Tiles with distance-based alpha
│   ├── Entities with visibility culling
│   ├── HP bars above non-player entities
│   └── Camera following with smooth transitions
└── Combat Log Panel (400px HTML)
    ├── Combat Log title
    ├── Scrolling message history
    ├── Attack results and damage
    └── Status updates
```

#### Bottom Corner UI:
- **Controls display** (bottom left): WASD/Arrows + Spacebar instructions
- **Position display** (bottom right): Current player coordinates
- **Debug indicator** (top right): F12 verbose mode status with fade animation

## Data Flow Architecture

### Core Game Loop with EventBus:
```
Input Events → InputHandler callbacks → System updates → EventBus events → Reactive systems → Render updates
     ↓                ↓                      ↓              ↓              ↓                ↓
Key presses → Movement/Combat → Entity state → Audio/Anim → Visual/Audio → Frame output
```

### Detailed Flow Example (Player Attack):
1. **Input**: User presses spacebar
2. **InputHandler**: Calls `onAttack` callback
3. **CombatManager**: Finds targets in range using pathfinding
4. **CombatSystem**: Calculates attack roll, damage types, and resistance modifiers
5. **EventBus**: Publishes `DamageDealtEvent` with combat details
6. **Audio System**: Generates procedural combat sounds based on damage type
7. **ResourceManager**: Applies damage to appropriate resource pools
8. **Animation System**: Triggers visual effects (nudge, shake, damage numbers)
9. **Renderer**: Updates multi-resource displays and message log
10. **GameStateManager**: Removes defeated entities if necessary, publishes `EnemyDiedEvent`

### Pathfinding Integration Flow:
1. **AI Request**: Enemy needs path to player
2. **PathfindingSystem**: Checks cache for existing path
3. **Cache Miss**: A* algorithm computes new path using BinaryHeap
4. **Path Caching**: Result stored in LRU cache with TTL
5. **World Change**: TileMap modification publishes `TileChangedEvent`
6. **EventBus**: Delivers event to PathCache
7. **Cache Invalidation**: Affected paths removed from cache
8. **Next Request**: Fresh computation for invalidated paths

### Audio System Integration:
1. **Game Event**: Combat, movement, or UI action occurs
2. **EventBus**: Event published to all subscribers
3. **Audio System**: Receives event, determines sound type
4. **Sound Generation**: ADSR envelope shaping with oscillator pool
5. **Spatial Positioning**: 3D audio placement based on entity positions
6. **Playback**: Web Audio API renders final sound output
7. **Performance**: Oscillator returned to pool for reuse

## Technical Implementation Details

### Position Coordinate Systems:

1. **World Coordinates**: Absolute positions in the game world (0, 0 to map.width, map.height)
2. **Screen Coordinates**: Positions relative to viewport (0, 0 to viewportWidth, viewportHeight)  
3. **Pixel Coordinates**: Actual PixiJS rendering positions (scaled by tileSize)

### Memory Management:
- **Text object pooling**: Entities reuse text objects rather than creating new ones
- **Event object pooling**: EventPool manages event lifecycle to prevent allocation spikes
- **Oscillator pooling**: Web Audio oscillators reused for performance
- **Proper cleanup**: Event listeners and animation frames cleaned up on destruction
- **Container management**: Layered containers for efficient rendering
- **LRU caches**: Automatic memory management with size limits

### Performance Optimizations:
- **Viewport culling**: Only renders visible tiles and entities
- **Property-only updates**: Modifies existing objects rather than recreating
- **Efficient collision detection**: Grid-based spatial queries with pathfinding optimization
- **Font caching**: Pre-loads and caches font resources
- **Binary heap algorithms**: O(log n) performance for pathfinding priority queues
- **EventBus batching**: Event aggregation reduces processing overhead
- **Audio synthesis caching**: LRU cache for generated sounds

### Error Handling Architecture:
- **Typed error system**: `GameError` class with error codes and context
- **Graceful degradation**: Fallback behaviors for missing resources
- **Comprehensive logging**: Multi-level logging system with F12 debug toggle
- **Audio error handling**: Fallback to silent mode if Web Audio unavailable
- **Pathfinding error recovery**: Alternative routes when primary paths blocked

## System Integration Points

### Key Integration Patterns:

1. **Dependency Injection**: Systems receive dependencies through constructors
2. **Callback Architecture**: Loose coupling through callback interfaces
3. **EventBus Communication**: Reactive system interactions through events
4. **Layered Responsibility**: Each system has well-defined, focused responsibilities
5. **Performance-First Design**: Sub-millisecond event processing and audio generation

### Critical Integration Points:

1. **Game ↔ Renderer**: Position updates and visual feedback coordination
2. **MovementSystem ↔ PathfindingSystem**: Movement assistance and collision avoidance
3. **CombatManager ↔ AudioSystem**: Reactive combat audio via EventBus
4. **EventBus ↔ All Systems**: Decoupled communication and reactive behaviors
5. **InputHandler ↔ Game**: Decoupled input processing with debug features
6. **GameStateManager ↔ All Systems**: Entity lifecycle management with event notifications
7. **AudioSystem ↔ EventBus**: Reactive sound generation for all game events
8. **PathCache ↔ EventBus**: Intelligent cache invalidation on world changes

## Testing Architecture

### Test Quality and Coverage:
- **326 comprehensive tests** with **100% pass rate**
- **Functional behavior testing**: Tests actual game logic, not implementation details
- **Seeded randomness**: Deterministic testing across combat, audio, and map generation
- **Minimal strategic mocking**: Only mocks initialization dependencies, not core functionality
- **Mathematical accuracy validation**: Tests precise calculations for combat, pathfinding, and audio synthesis
- **Edge case coverage**: Comprehensive boundary conditions and error scenarios
- **Performance validation**: Timing tests for pathfinding, audio synthesis, and rendering systems

### Test Organization:
```
tests/                           # 100% Pass Rate - 326 tests
├── core/                        # Core system tests
│   ├── events/                     # EventBus system tests
│   │   ├── EventBus.test.ts          # Ring buffer event system (13 tests)
│   │   ├── EventAggregator.test.ts   # Event batching logic (7 tests)
│   │   └── EventPool.test.ts         # Object pooling optimization (12 tests)
│   ├── Renderer.test.ts            # Functional rendering behavior (22 tests) ✨ REWRITTEN
│   ├── TileMap.test.ts             # Map generation with seeded randomness (14 tests)
│   └── LineOfSight.test.ts         # FOV algorithms and edge cases (12 tests)
├── systems/                     # System tests
│   ├── combat/
│   │   ├── CombatSystem.test.ts      # D&D mechanics with deterministic testing (22 tests)
│   │   └── CombatManager.test.ts     # Combat orchestration (11 tests)
│   ├── input/
│   │   └── InputHandler.test.ts      # Comprehensive input behavior (37 tests) ✨ REWRITTEN
│   ├── movement/
│   │   └── MovementSystem.test.ts    # Movement logic and collision (8 tests)
│   ├── pathfinding/
│   │   ├── PathfindingSystem.test.ts # A* algorithm and performance (20 tests)
│   │   ├── BinaryHeap.test.ts        # Min-heap with performance tests (11 tests)
│   │   └── PathCache.test.ts         # LRU cache with EventBus integration (11 tests)
│   └── audio/
│       ├── AudioSettings.test.ts     # Audio configuration persistence (23 tests)
│       ├── WaveformGenerator.test.ts # Music theory and synthesis (20 tests)
│       └── OscillatorPool.test.ts    # Performance optimization (20 tests)
├── managers/                    # Manager tests
│   ├── CharacterManager.test.ts     # Character management and progression (14 tests)
│   └── GameStateManager.test.ts     # Entity lifecycle management (9 tests)
├── loaders/                     # Data loader tests
│   ├── ItemLoader.test.ts           # Item system validation (16 tests)
│   ├── EnemyLoader.test.ts          # Enemy data validation (8 tests)
│   └── WorldConfigLoader.test.ts    # World configuration (11 tests)
└── ui/components/               # UI component tests
    └── ResourceDisplay.test.ts     # Multi-resource display (5 tests)
```

### Test Quality Standards:
- Tests validate **actual business logic** rather than mock interactions
- **Deterministic testing** with seeded randomness for reproducible results
- **Integration testing** between systems (EventBus, WorldConfig, ResourceManager)
- **Algorithm validation** - A*, binary heap, music theory calculations, combat mechanics
- **Error resilience testing** - localStorage failures, invalid data handling, audio fallbacks
- **Performance testing** - Pathfinding timing, audio synthesis, rendering optimization
- **Architecture Testing**: Tests reflect actual implementation patterns (HTML UI, hybrid rendering)

### Key Testing Improvements:
- **Renderer.test.ts**: Completely rewritten to test coordinate transformations, camera following, visibility calculations, and functional behavior instead of mock interactions
- **InputHandler.test.ts**: Completely rewritten to test key state management, event prevention, debug features, and complex input scenarios instead of trivial callback testing

## Multi-World System Architecture

### World Configuration System
**File**: `src/loaders/WorldConfigLoader.ts`

The game implements a sophisticated multi-world system supporting different themes with unique mechanics:

#### Supported World Themes:
1. **Fantasy Realm**: Traditional D&D-style mechanics with HP/Mana resources
2. **Neon City 2088**: Cyberpunk theme with Bio-Status, Heat, Neural Integrity, and Credits
3. **Victorian Steam Age**: Steampunk theme with Vitality, Steam Pressure, and Oil Reserves
4. **Eldritch Nightmare**: Horror theme with HP, Sanity, and Corruption mechanics

#### Theme-Specific Features:
- **Damage Types**: Each world has unique damage categories (physical/elemental/magical vs kinetic/energy/cyber)
- **Resistance Systems**: Configurable multipliers for immunity, resistance, vulnerability
- **Critical Hit Rules**: Multiple variants (double damage, max+roll, double dice)
- **Resource Systems**: Dynamic resource pools with configurable caps, colors, and mechanics
- **Combat Mechanics**: Theme-appropriate minimum damage and rounding rules
- **Audio Themes**: Procedural sound synthesis adapted to world atmosphere

#### Resource Management:
```typescript
interface Resource {
  id: string;
  displayName: string;
  current: number;
  maximum?: number;
  minimum: number;
  color: string;
  description: string;
  display: 'bar' | 'text';
  changeRate?: number;  // Automatic resource regeneration/decay
}
```

#### Integration Points:
- **CharacterSheet**: Dynamically displays resources based on active world theme
- **CombatSystem**: Applies theme-specific damage calculations and critical hit rules
- **ResourceManager**: Handles multi-resource entities with backward compatibility
- **UI Systems**: Automatically adapts colors and layout based on world configuration
- **Audio System**: Generates theme-appropriate procedural sounds and music
- **Pathfinding**: Considers theme-specific movement constraints and terrain types

## Performance Benchmarks and Targets

### System Performance Targets:
- **EventBus processing**: < 1ms for 50 events
- **Pathfinding computation**: < 5ms for 20x20 areas
- **Audio synthesis**: < 5ms per sound generation
- **Rendering frame rate**: 60 FPS with 100+ entities
- **Memory allocation**: < 10MB growth per hour of gameplay
- **Cache hit rates**: > 85% for pathfinding, > 90% for audio

### Optimization Strategies:
- **Event batching**: Aggregate similar events to reduce processing
- **Object pooling**: Reuse objects to minimize garbage collection
- **LRU caching**: Intelligent cache management with automatic cleanup
- **Binary heaps**: O(log n) algorithms for priority operations
- **Viewport culling**: Only process visible game elements
- **Property updates**: Modify existing objects rather than recreating

This architecture enables a maintainable, extensible roguelike game with smooth gameplay, professional error handling, comprehensive testing coverage, rich thematic variety through the multi-world system, advanced procedural audio generation, and intelligent pathfinding with sub-5ms performance targets.