# Renderer Abstraction System

This system allows hot-swapping between different rendering backends for testing terminal-style interfaces without changing the core game logic.

## Available Renderers

### 1. PixiJS Renderer (Default)
- **Type**: `'pixi'`
- Full-featured graphical renderer with smooth animations
- Emoji support with proper fonts
- Character sheet UI, floating damage, visual effects
- Best for production gameplay

### 2. ROT.js Terminal Renderer
- **Type**: `'rot'`
- Classic roguelike ASCII terminal interface
- Uses ROT.js Display with Canvas rendering
- Converts emojis to ASCII characters (@, o, #, .)
- Perfect grid alignment with monospace fonts

### 3. Malwoden Terminal Renderer  
- **Type**: `'malwoden'`
- Bitmap font terminal with retro styling
- Uses Malwoden's RetroTerminal with CP437 tileset support
- **Requires**: Bitmap font file at `/public/fonts/font_16.png` (16x16 character grid)
- **Fallback**: Uses mock implementation if font/initialization fails

### 4. PixiJS Terminal-Styled Renderer
- **Type**: `'pixi-terminal'`
- PixiJS-based but styled like a terminal
- Monospace fonts, scanline filters, CRT effects
- ASCII character conversion with terminal aesthetics

## How to Switch Renderers

### Option 1: Change the Constant (Recommended)
```typescript
// In src/core/renderers/RendererFactory.ts
export const RENDERER_TYPE: RendererType = 'rot'; // Change this line
```

### Option 2: Programmatic Switching
```typescript
// In Game.ts constructor
this.renderer = RendererFactory.createRenderer(50, 30, 'pixi-terminal');
```

### Option 3: Environment Variable (Future Enhancement)
```bash
VITE_RENDERER_TYPE=rot npm run dev
```

## Character Mapping

Terminal renderers convert emoji glyphs to ASCII:

| Entity | Emoji | ASCII | Description |
|--------|--------|-------|-------------|
| Player | 🧙 | @ | Player character |
| Enemy | 👺 | o | Generic enemy |
| Bat | 🦇 | b | Flying enemy |
| Rat | 🐀 | r | Small enemy |
| Wall | 🟫 | # | Solid wall |
| Floor | ⬛ | . | Walkable floor |

## Features by Renderer Type

| Feature | PixiJS | ROT.js | Malwoden | PixiJS-Terminal |
|---------|---------|---------|----------|-----------------|
| Smooth Animations | ✅ | ❌ | ❌ | ✅ |
| Character Sheet | ✅ | ❌ | ❌ | ✅ |
| Floating Damage | ✅ | ❌ | ❌ | ✅ |
| Visual Effects | ✅ | ❌ | ❌ | ✅ |
| ASCII Rendering | ❌ | ✅ | ✅ | ✅ |
| Perfect Grid | ❌ | ✅ | ✅ | ✅ |
| Retro Styling | ❌ | ✅ | ✅ | ✅ |

## Implementation Details

### Interface Abstraction
All renderers implement `IRenderer` interface ensuring consistent API:
- Core rendering methods (`renderTile`, `renderEntity`)
- Camera management (`updateCameraForPlayer`, `worldToScreen`)
- Animation methods (`animateMove`, `shakeEntity`)
- UI methods (`addMessage`, `updatePositionText`)

### Compatibility Layer
Terminal renderers provide mock implementations for PixiJS-specific features:
- `characterSheet`: null for terminals
- `entityTextMap`/`hpTextMap`: empty Maps
- Animation methods: log-only implementations

### Performance Considerations
- ROT.js: Efficient canvas-based rendering
- Malwoden: Optimized for bitmap fonts and tile-based graphics
- PixiJS-Terminal: Uses PixiJS performance with terminal aesthetics
- All renderers handle viewport culling and efficient re-rendering

## Testing Different Renderers

1. Change `RENDERER_TYPE` in `RendererFactory.ts`
2. Run `npm run dev`
3. Game will use new renderer automatically
4. Compare performance, visual style, and functionality

## Font Requirements

### Malwoden Bitmap Font
Malwoden requires a bitmap font file to render characters. You can:

1. **Download a CP437 tileset** (16x16 characters in a grid)
   - Classic terminal fonts like `curses_640x300.png`
   - Rogue/NetHack style fonts
   - Terminal emulator fonts

2. **Place the font** at `/public/fonts/font_16.png`

3. **Font format**: PNG with 16x16 pixel characters arranged in a 16x16 grid (256 characters total)

**Without a font file**, Malwoden will use the fallback mock implementation.

## Extending the System

To add a new renderer:

1. Create new renderer class implementing `IRenderer`
2. Add new type to `RendererType` union
3. Add case to `RendererFactory.createRenderer()`
4. Implement required methods for your rendering system

Example:
```typescript
export class CustomRenderer implements IRenderer {
  // Implement all IRenderer methods
  renderTile(x: number, y: number, tile: Tile, visibility: TileVisibility) {
    // Your custom rendering logic
  }
  // ... other methods
}
```