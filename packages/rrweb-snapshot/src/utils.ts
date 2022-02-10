import { INode, MaskInputFn, MaskInputOptions } from './types';

export function isElement(n: Node | INode): n is Element {
  return n.nodeType === n.ELEMENT_NODE;
}

export function isShadowRoot(n: Node): n is ShadowRoot {
  const host: Element | null = (n as ShadowRoot)?.host;
  return Boolean(host && host.shadowRoot && host.shadowRoot === n);
}

export function maskInputValue({
  maskInputOptions,
  tagName,
  type,
  value,
  maskInputFn,
  node,
  maskTextClass,
  maskTextSelector,
}: {
  maskInputOptions: MaskInputOptions;
  tagName: string;
  type: string | number | boolean | null;
  value: string | null;
  maskInputFn?: MaskInputFn;
  node: Node;
  maskTextClass: string | RegExp;
  maskTextSelector: string | null;
}): string {
  let text = value || '';
  if (
    maskInputOptions[tagName.toLowerCase() as keyof MaskInputOptions] ||
    maskInputOptions[type as keyof MaskInputOptions] ||
    needMaskingText(node, maskTextClass, maskTextSelector)
  ) {
    if (maskInputFn) {
      text = maskInputFn(text);
    } else {
      text = '*'.repeat(text.length);
    }
  }
  return text;
}

export function needMaskingText(
  node: Node | null,
  maskTextClass: string | RegExp,
  maskTextSelector: string | null,
): boolean {
  if (!node) {
    return false;
  }
  if (node.nodeType === node.ELEMENT_NODE) {
    if (typeof maskTextClass === 'string') {
      if ((node as HTMLElement).classList.contains(maskTextClass)) {
        return true;
      }
    } else {
      (node as HTMLElement).classList.forEach((className) => {
        if (maskTextClass.test(className)) {
          return true;
        }
      });
    }
    if (maskTextSelector) {
      if ((node as HTMLElement).matches(maskTextSelector)) {
        return true;
      }
    }
    return needMaskingText(node.parentNode, maskTextClass, maskTextSelector);
  }
  if (node.nodeType === node.TEXT_NODE) {
    // check parent node since text node do not have class name
    return needMaskingText(node.parentNode, maskTextClass, maskTextSelector);
  }
  return needMaskingText(node.parentNode, maskTextClass, maskTextSelector);
}
