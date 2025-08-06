# Roguelike Agent - Technical Architecture Documentation

## Overview

This document provides detailed technical documentation of the roguelike game's architecture, focusing on system interconnections, data flow, and implementation specifics for logical vs rendering positions, animation systems, and component relationships.

## Core Architecture Pattern

The system follows a **layered architecture** with **dependency injection** and **callback-based decoupling**:

```
┌─────────────────┐
│   Application   │  main.ts (entry point)
└─────────┬───────┘
          │
┌─────────▼───────┐
│   Game Layer    │  Game.ts (orchestrator)
└─────────┬───────┘
          │
┌─────────▼───────┐
│  System Layer   │  Individual systems with specific responsibilities
└─────────┬───────┘
          │
┌─────────▼───────┐
│ Utility Layer   │  ErrorHandler, Logger, utility functions
└─────────────────┘
```

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

## System Architecture Details

### 1. Game Class (Central Orchestrator)
**File**: `src/core/Game.ts` (221 lines)

**Role**: Main coordinator that manages system lifecycle and integration

**Key Responsibilities**:
- System initialization through dependency injection
- Game loop orchestration via `GameStateManager`
- Integration between input, movement, combat, and rendering systems
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
}
```

**Data Flow**:
1. Input callbacks trigger system responses
2. Movement system updates positions
3. Visual system updates camera and rendering
4. Combat system processes attacks through CombatManager

### 2. Renderer Class (Visual Engine)
**File**: `src/core/Renderer.ts`

**Role**: PixiJS-based rendering engine with sophisticated position and visibility management

**Key Features**:

#### Layer Management:
```typescript
tileContainer: Container;      // Background tiles
entityContainer: Container;    // Characters and objects
messageContainer: Container;   // UI and text overlays
```

#### Position Translation System:
```typescript
// World coordinates (game logic) → Screen coordinates (viewport) → Pixel coordinates (rendering)
worldToScreen(worldX, worldY) → {x: screenX, y: screenY}
screenToWorld(screenX, screenY) → {x: worldX, y: worldY}
```

#### Camera System:
- **Edge-following camera**: Moves when player approaches viewport edges
- **Smooth camera transitions**: Integrated with animation system
- **Dynamic viewport calculation**: Only renders visible tiles and entities
- **Camera bounds**: Constrained to map boundaries

#### Entity Rendering Strategy:
- **Persistent text objects**: Cached in `entityTextMap` and `hpTextMap`
- **Property-only updates**: Position and visibility changes without object recreation
- **Visibility-based culling**: Entities outside FOV are hidden, not destroyed
- **HP display management**: Separate text objects for health bars above entities

#### Font System:
- **Dual font support**: `Noto Emoji` for emojis, `Noto Sans Mono` for ASCII
- **Font loading coordination**: Async loading with fallback handling
- **Size differentiation**: Different font sizes for different UI elements

### 3. Movement System
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

#### Collision Detection:
- **Multi-tile validation**: Checks overlapping tiles for fractional positions
- **Entity collision**: Prevents movement into occupied grid spaces
- **Boundary checking**: Enforces map boundaries
- **Safe fallback**: Snaps to last valid position on collision

#### Position Validation:
```typescript
isValidPosition(x, y, tileMap, entities, excludeEntityId)  // Continuous positions
isValidGridPosition(x, y, tileMap, entities, excludeEntityId)  // Grid positions
```

### 4. Input Handler System
**File**: `src/systems/input/InputHandler.ts` (49 lines)

**Role**: Callback-based input management with decoupled architecture

**Callback Architecture**:
```typescript
interface InputCallbacks {
  onMovementKey: (keys: Set<string>) => void;
  onMovementKeyRelease: (keys: Set<string>) => void;
  onAttack: () => void;
}
```

**Benefits**:
- **System decoupling**: Input handler doesn't know about game systems
- **Flexible key mapping**: Easy to extend with new input types
- **State management**: Tracks pressed keys for smooth movement
- **Event cleanup**: Proper listener management for memory safety

### 5. Combat Manager System
**File**: `src/systems/combat/CombatManager.ts` (90 lines)

**Role**: Orchestrates combat between game logic and visual effects

**Combat Flow**:
1. **Range checking**: `CombatSystem.isInMeleeRange(attacker, target)`
2. **Attack calculation**: `CombatSystem.meleeAttack(attacker, target)` with damage type support
3. **Damage calculation**: Applies resistance/vulnerability multipliers based on damage types
4. **Resource application**: Multi-resource damage system (HP, stamina, etc.)
5. **Visual feedback**: Animation system triggers (shake, nudge, floating damage)
6. **Message logging**: Combat results displayed in UI
7. **Entity cleanup**: Removal of defeated entities

**Animation Integration**:
- **Attack feedback**: Nudge attacker toward target
- **Hit reactions**: Shake target on successful hit
- **Damage numbers**: Floating damage text with fade animation
- **Miss feedback**: Attacker shake on missed attacks

### 6. Game State Manager
**File**: `src/managers/GameStateManager.ts` (140 lines)

**Role**: Entity lifecycle management and game loop coordination

**Entity Management**:
- **Safe spawning**: Position validation during entity creation
- **Lifecycle tracking**: Add, remove, and query entities
- **Position queries**: Check for entity collisions at positions
- **Player identification**: Separate player from enemy entities

**Game Loop Management**:
- **RequestAnimationFrame coordination**: Manages the main game loop
- **Callback system**: Executes game logic each frame
- **Performance management**: Proper cleanup and memory management

### 7. Animation System
**File**: `src/systems/animation/AnimationSystem.ts`

**Role**: Handles all visual animations with camera-aware positioning

### 8. Camera System
**File**: `src/systems/camera/CameraSystem.ts`

**Role**: Manages viewport and camera positioning with entity following

**Key Features**:
- **Entity following**: Smooth camera tracking of player movement
- **Viewport management**: Handles camera bounds and constraints  
- **Coordinate conversion**: World-to-screen and screen-to-world transformations
- **Camera movement**: Threshold-based camera updates and smooth transitions

### 9. Font System
**File**: `src/systems/font/FontSystem.ts`

**Role**: Centralized font management for emoji and ASCII rendering

**Key Features**:
- **Automatic font detection**: Switches between emoji and ASCII fonts based on content
- **Font loading**: Manages Noto Emoji and Noto Sans Mono font resources
- **Consistent styling**: Standardized font configurations across UI elements
- **Size management**: Handles different font sizes for various game elements

### 10. Dice System  
**File**: `src/systems/dice/DiceSystem.ts`

**Role**: D&D-style dice rolling mechanics with notation support

**Key Features**:
- **Dice notation parsing**: Supports expressions like "2d6+3", "1d20", etc.
- **Deterministic testing**: Seeded randomness for consistent test results
- **Roll tracking**: Detailed results with individual dice outcomes
- **Modifier support**: Handles complex dice expressions with bonuses/penalties

### 11. User Interface Architecture

#### Character Sheet System
**File**: `src/ui/CharacterSheet.ts`

- **Fixed positioning**: Left panel (200px width)
- **Hierarchical containers**: Organized UI sections
- **Real-time updates**: Reflects current player state
- **Multi-resource display**: ASCII bars for HP, mana, and theme-specific resources
- **Dynamic theming**: Resource colors and types adapt to active world theme

#### Resource Display System
**File**: `src/ui/components/ResourceDisplay.ts`

**Features**:
- **Multi-resource support**: Handles HP, mana, and theme-specific resources dynamically
- **ASCII bar rendering**: Text-based progress bars with configurable colors
- **World theme integration**: Adapts to active world's resource configuration
- **Real-time updates**: Reflects current entity resource states

**UI Elements**:
```
Character Sheet (200x600px)
├── Portrait (36px emoji)
├── Name & Class Info
├── Multi-Resource Display (HP, mana, theme-specific)
├── ASCII Resource Bars (configurable colors)
├── Stats Section (7 D&D attributes)
└── Equipment Section (placeholder)
```

#### Message System:
- **Combat log**: Right-side panel with scrolling messages
- **Message queuing**: Maintains last 5 messages
- **Contextual feedback**: Attack results, damage, and status updates

## Data Flow Architecture

### Core Game Loop:
```
Input Events → InputHandler callbacks → System updates → Render updates
     ↓                ↓                      ↓              ↓
Key presses → Movement/Combat → Entity state → Visual output
```

### Detailed Flow Example (Player Movement):
1. **Input**: User presses arrow key
2. **InputHandler**: Adds key to pressed set, calls `onMovementKey`
3. **Game**: `updateMovement()` called in game loop
4. **MovementSystem**: Updates display positions, validates against tiles/entities
5. **Entity**: Logical position updated when crossing grid boundaries
6. **Game**: `updateVisuals()` called
7. **Renderer**: Camera position updated, entity positions updated
8. **Animation**: Smooth interpolation between positions

### Combat Flow Example:
1. **Input**: User presses spacebar
2. **InputHandler**: Calls `onAttack` callback
3. **CombatManager**: Finds targets in range
4. **CombatSystem**: Calculates attack roll, damage types, and resistance modifiers
5. **ResourceManager**: Applies damage to appropriate resource pools
6. **AnimationSystem**: Triggers visual effects (nudge, shake, damage numbers)
7. **Renderer**: Updates multi-resource displays and message log
8. **GameStateManager**: Removes defeated entities if necessary

## Technical Implementation Details

### Position Coordinate Systems:

1. **World Coordinates**: Absolute positions in the game world (0, 0 to map.width, map.height)
2. **Screen Coordinates**: Positions relative to viewport (0, 0 to viewportWidth, viewportHeight)  
3. **Pixel Coordinates**: Actual PixiJS rendering positions (scaled by tileSize)

### Memory Management:
- **Text object pooling**: Entities reuse text objects rather than creating new ones
- **Proper cleanup**: Event listeners and animation frames cleaned up on destruction
- **Container management**: Layered containers for efficient rendering

### Performance Optimizations:
- **Viewport culling**: Only renders visible tiles and entities
- **Property-only updates**: Modifies existing objects rather than recreating
- **Efficient collision detection**: Grid-based spatial queries
- **Font caching**: Pre-loads and caches font resources

### Error Handling Architecture:
- **Typed error system**: `GameError` class with error codes and context
- **Graceful degradation**: Fallback behaviors for missing resources
- **Comprehensive logging**: Multi-level logging system with filtering

## System Integration Points

### Key Integration Patterns:

1. **Dependency Injection**: Systems receive dependencies through constructors
2. **Callback Architecture**: Loose coupling through callback interfaces
3. **Event-driven Updates**: Systems respond to state changes rather than polling
4. **Layered Responsibility**: Each system has well-defined, focused responsibilities

### Critical Integration Points:

1. **Game ↔ Renderer**: Position updates and visual feedback
2. **MovementSystem ↔ TileMap**: Collision detection and validation
3. **CombatManager ↔ AnimationSystem**: Visual effects coordination
4. **InputHandler ↔ Game**: Decoupled input processing
5. **GameStateManager ↔ All Systems**: Entity lifecycle management

## Testing Architecture

### Test Organization:
- **154 comprehensive tests** across 13 test files organized by system
- **Unit tests**: Individual system functionality validation
- **Integration tests**: System interaction validation  
- **Deterministic testing**: Seeded randomness for consistent results
- **Mock systems**: PixiJS mocking for renderer testing without graphics dependencies

### Test Structure:
```
tests/
├── core/                    # Core system tests (45 tests)
│   ├── Renderer.test.ts        # Rendering with PixiJS mocks (19 tests)
│   ├── TileMap.test.ts         # Map generation (14 tests)
│   └── LineOfSight.test.ts     # FOV algorithms (12 tests)
├── systems/                 # System tests (46 tests)
│   ├── CombatSystem.test.ts    # D&D mechanics (22 tests)
│   ├── CombatManager.test.ts   # Combat orchestration (11 tests)
│   ├── MovementSystem.test.ts  # Movement logic (8 tests)
│   └── InputHandler.test.ts    # Input handling (5 tests)
├── managers/                # Manager tests (23 tests)
│   ├── CharacterManager.test.ts # Character management (14 tests)
│   └── GameStateManager.test.ts # Entity lifecycle (9 tests)
├── loaders/                 # Data loader tests (35 tests)
│   ├── ItemLoader.test.ts      # Item system (16 tests)
│   ├── EnemyLoader.test.ts     # Enemy data (8 tests)
│   └── WorldConfigLoader.test.ts # World config (11 tests)
└── ui/components/           # UI component tests (5 tests)
    └── ResourceDisplay.test.ts # Resource UI (5 tests)
```

### Test Coverage Areas:
- **D&D combat mechanics** with seeded dice validation and damage type testing
- **Line-of-sight algorithms** with FOV calculation and visibility testing
- **Movement system** with collision detection and grid snapping validation
- **Entity lifecycle management** with safe spawning and state tracking
- **Input handling** with callback system and key mapping validation
- **Multi-resource system** with theme-specific resource management
- **Data loading** with JSON validation and error handling
- **UI components** with resource display and real-time updates

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

This architecture enables a maintainable, extensible roguelike game with smooth gameplay, professional error handling, comprehensive testing coverage, and rich thematic variety through the multi-world system.