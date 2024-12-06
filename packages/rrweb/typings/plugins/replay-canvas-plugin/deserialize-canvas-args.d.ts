import { Replayer } from '../../replay';
import { CanvasArg } from '../../types';
declare type CanvasContexts = CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext;
export declare const deserializeCanvasArg: (imageMap: Replayer['imageMap'], ctx: CanvasContexts | null, preload?: {
    isUnchanged: boolean;
} | undefined) => (arg: CanvasArg) => Promise<any>;
export {};
