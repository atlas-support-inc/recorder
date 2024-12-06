import { attributes, INode, MaskImageFn, MaskInputFn, MaskInputOptions } from './types';
export declare function isElement(n: Node | INode): n is Element;
export declare function isShadowRoot(n: Node): n is ShadowRoot;
export declare function maskInputValue({ maskInputOptions, tagName, type, value, maskInputFn, node, maskTextClass, maskTextSelector, maskAll, }: {
    maskInputOptions: MaskInputOptions;
    tagName: string;
    type: string | number | boolean | null;
    value: string | null;
    maskInputFn?: MaskInputFn;
    node: Node;
    maskTextClass: string | RegExp;
    maskTextSelector: string | null;
    maskAll?: boolean;
}): string;
export declare function needMaskingText(node: Node | null, maskTextClass: string | RegExp, maskTextSelector: string | null, maskAll?: boolean): boolean;
export declare function maskImage({ n, attributes, maskImageFn, }: {
    n: HTMLImageElement;
    attributes: attributes;
    maskImageFn?: MaskImageFn;
}): attributes;
export declare function is2DCanvasBlank(canvas: HTMLCanvasElement): boolean;
