import { Replayer } from '../../replay';
import { CanvasArg } from '../../types';

type GLVarMap = Map<string, any[]>;
type CanvasContexts =
    | CanvasRenderingContext2D
    | WebGLRenderingContext
    | WebGL2RenderingContext;
const webGLVarMap: Map<CanvasContexts, GLVarMap> = new Map();

const variableListFor = (ctx: CanvasContexts, ctor: string): any[] => {
    let contextMap = webGLVarMap.get(ctx);
    if (!contextMap) {
        contextMap = new Map();
        webGLVarMap.set(ctx, contextMap);
    }
    if (!contextMap.has(ctor)) {
        contextMap.set(ctor, []);
    }

    return contextMap.get(ctor) as any[];
};

const base64ArrayBuffer = (encodedString: string): ArrayBuffer => {
    const data = base64ToUint8Array(encodedString);
    return data.buffer;
};

const base64ToUint8Array = (encodedString: string): Uint8Array => {
    const binString = atob(encodedString);
    const data = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
        data[i] = binString.charCodeAt(i);
    }
    return data;
};

export const deserializeCanvasArg = (
    imageMap: Replayer['imageMap'],
    ctx: CanvasContexts | null,
    preload?: {
        isUnchanged: boolean;
    },
): ((arg: CanvasArg) => Promise<any>) => {
    return async (arg: CanvasArg): Promise<any> => {
        if (arg && typeof arg === 'object' && 'rr_type' in arg) {
            if (preload) {
                preload.isUnchanged = false;
            }
            if (arg.rr_type === 'ImageBitmap' && 'args' in arg) {
                const args = await deserializeCanvasArg(
                    imageMap,
                    ctx,
                    preload,
                )(arg.args);
                return await createImageBitmap.apply(null, args);
            }
            if ('index' in arg) {
                if (preload || ctx === null) {
                    return arg;
                }
                const { rr_type: name, index } = arg;
                return variableListFor(ctx, name)[index];
            }
            if ('args' in arg) {
                return arg;
            }
            if ('base64' in arg) {
                return base64ArrayBuffer(arg.base64);
            }
            if ('src' in arg) {
                return arg;
            }
            if ('data' in arg && arg.rr_type === 'Blob') {
                const blobContents = await Promise.all(
                    arg.data.map(deserializeCanvasArg(imageMap, ctx, preload)),
                );
                const blob = new Blob(blobContents, {
                    type: arg.type,
                });
                return blob;
            }
        } else if (Array.isArray(arg)) {
            const result = await Promise.all(
                arg.map(deserializeCanvasArg(imageMap, ctx, preload)),
            );
            return result;
        }
        return arg;
    };
};
