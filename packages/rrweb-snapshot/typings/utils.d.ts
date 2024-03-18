import { INode, MaskInputFn, MaskInputOptions, TMaskElementsOptions } from './types';
export declare function isElement(n: Node | INode): n is Element;
export declare function isShadowRoot(n: Node): n is ShadowRoot;
export declare function maskInputValue({ maskInputOptions, tagName, type, value, maskInputFn, node, maskTextClass, maskTextSelector, maskElementsOptions, }: {
    maskInputOptions: MaskInputOptions;
    tagName: string;
    type: string | number | boolean | null;
    value: string | null;
    maskInputFn?: MaskInputFn;
    node: Node;
    maskTextClass: string | RegExp;
    maskTextSelector: string | null;
    maskElementsOptions: TMaskElementsOptions;
}): string;
export declare function isMaskedByGlobalRule(node: Node | null, tagName: string, maskElementsOptions: TMaskElementsOptions): boolean | undefined;
export declare function needMaskingText(node: Node | null, maskTextClass: string | RegExp, maskTextSelector: string | null): boolean;
