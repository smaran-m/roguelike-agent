# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Running
- `npm run dev` - Start development server (Vite) on port 3000 with auto-open
- `npm run build` - Build production version (TypeScript compilation + Vite build)
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking without emitting files

### Development Workflow
The project uses Vite for development with hot module replacement. The game automatically opens in the browser at http://localhost:3000 when running `npm run dev`.

## Architecture Overview

This is an emoji-based roguelike game built with TypeScript, PixiJS for rendering, and featuring smooth animations. The architecture follows a layered approach:

### Core Structure
- **Game Layer** (`src/game/Game.ts`) - Main game logic, input handling, entity management
- **Rendering Layer** (`src/game/Renderer.ts`) - PixiJS-based rendering with emoji support and animations
- **World Layer** (`src/game/TileMap.ts`) - Tile-based world generation and collision detection
- **Type Definitions** (`src/types/index.ts`) - Shared interfaces for Tile, Entity, and WorldSchema

### Key Components

**Game Class**: Central coordinator that manages:
- Player input (arrow keys/WASD)
- Entity movement with collision detection
- Animation triggers for smooth movement
- Game state updates

**Renderer Class**: PixiJS-based renderer featuring:
- Emoji rendering with proper font support (Noto Emoji)
- Layered rendering (tiles + entities)
- Move animations (150ms duration)
- Shake effects for collisions
- Entity text object caching for performance

**TileMap Class**: World representation with:
- 2D tile array with walkability data
- Simple procedural generation (borders + random walls)
- Collision checking for movement validation

### Emoji System
The game uses Unicode emojis as glyphs for both tiles and entities. The rendering system automatically switches between `Noto Emoji` font for emojis and `Noto Sans Mono` for ASCII characters based on the `isEmoji` flag.

### Animation System
Smooth movement animations are implemented using requestAnimationFrame with linear interpolation. Collision feedback is provided through entity shake animations.

### Entity System
Entities are defined by the `Entity` interface with position, visual representation (glyph/emoji), and metadata. The system supports both ASCII characters and Unicode emojis with proper rendering.

## Technical Notes

- Uses ES modules (`"type": "module"` in package.json)
- Targets modern browsers with `esnext` build target
- Dependencies: PixiJS 7.4+, MobX ecosystem (state management), GSAP (animations)
- TypeScript configuration includes both main and Node.js configs
- No test framework currently configured