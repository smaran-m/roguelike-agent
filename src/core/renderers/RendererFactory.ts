import { IRenderer } from './IRenderer';
import { PixiRenderer } from './PixiRenderer';
import { ROTRenderer } from './ROTRenderer';
import { MalwodenRenderer } from './MalwodenRenderer';
import { DefaultRenderer } from './DefaultRenderer';
import { Logger } from '@/utils/Logger';

export type RendererType = 'default' | 'pixi' | 'rot' | 'malwoden';

// Easy switching between renderer types
export const RENDERER_TYPE: RendererType = 'default'; // Change this to switch renderers

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
      case 'default':
        return new DefaultRenderer(width, height);
      default:
        Logger.error(`Unknown renderer type: ${rendererType}`);
        return new DefaultRenderer(width, height);
    }
  }
}