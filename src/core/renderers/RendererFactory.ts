import { IRenderer } from './IRenderer';
import { PixiRenderer } from './PixiRenderer';
import { ROTRenderer } from './ROTRenderer';
import { MalwodenRenderer } from './MalwodenRenderer';
import { HybridTerminalRenderer } from './HybridTerminalRenderer';

export type RendererType = 'pixi' | 'rot' | 'malwoden' | 'pixi-terminal';

// Easy switching between renderer types
export const RENDERER_TYPE: RendererType = 'pixi-terminal'; // Change this to switch renderers

export class RendererFactory {
  static createRenderer(width: number, height: number, type?: RendererType): IRenderer {
    const rendererType = type || RENDERER_TYPE;
    
    switch (rendererType) {
      case 'pixi':
        return new PixiRenderer(width, height);
      case 'rot':
        return new ROTRenderer(width, height);
      case 'malwoden':
        return new MalwodenRenderer(width, height);
      case 'pixi-terminal':
        return new HybridTerminalRenderer(width, height);
      default:
        throw new Error(`Unknown renderer type: ${rendererType}`);
    }
  }
}