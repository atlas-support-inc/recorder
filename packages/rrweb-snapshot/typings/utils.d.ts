import { INode, MaskInputFn, MaskInputOptions, TMaskElementsOptions } from './types';
export declare function isElement(n: Node | INode): n is Element;
export declare function isShadowRoot(n: Node): n is ShadowRoot;
export declare function maskInputValue({ maskInputOptions, tagName, type, value, maskInputFn, node, maskTextClass, maskElementsOptions, }: {
    maskInputOptions: MaskInputOptions;
    tagName: string;
    type: string | number | boolean | null;
    value: string | null;
    maskInputFn?: MaskInputFn;
    node: Node;
    maskTextClass: string | RegExp;
    maskElementsOptions: TMaskElementsOptions;
}): string;
export declare function isMaskedByGlobalRule(node: Node | null, maskElementsOptions: TMaskElementsOptions): boolean;
export declare function needMaskingText(node: Node | null, maskTextClass: string | RegExp, maskSelector: string | null): boolean;
