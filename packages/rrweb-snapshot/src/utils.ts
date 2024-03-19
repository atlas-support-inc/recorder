import { INode, MaskInputFn, MaskInputOptions, TMaskElementsOptions } from './types';

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
  maskElementsOptions,
}: {
  maskInputOptions: MaskInputOptions;
  tagName: string;
  type: string | number | boolean | null;
  value: string | null;
  maskInputFn?: MaskInputFn;
  node: Node;
  maskTextClass: string | RegExp;
  maskElementsOptions: TMaskElementsOptions;
}): string {
  const tagNameLowerCase = tagName?.toLowerCase();
  let text = value || '';
  const { maskAllByDefault, maskSelector } = maskElementsOptions;
  if (maskAllByDefault && !isMaskedByGlobalRule(node, maskElementsOptions)) {
    return text;
  }

  if (
    maskInputOptions[tagNameLowerCase as keyof MaskInputOptions] ||
    maskInputOptions[type as keyof MaskInputOptions] ||
    needMaskingText(node, maskTextClass, maskSelector ?? null)
  ) {
    if (maskInputFn) {
      text = maskInputFn(text);
    } else {
      text = '*'.repeat(text.length);
    }
  }
  return text;
}

export function isMaskedByGlobalRule(
  node: Node | null,
  maskElementsOptions: TMaskElementsOptions,
) {
  if (!node) {
    return false;
  }

  const {
    maskAllByDefault,
    maskSelector,
    exceptionSelector,
  } = maskElementsOptions;

  if (maskAllByDefault) {
    const isException = exceptionSelector ? (node as HTMLElement).matches(exceptionSelector) : false;
    return !isException;
  }

  return maskSelector ? (node as HTMLElement).matches(maskSelector) : false;
}

export function needMaskingText(
  node: Node | null,
  maskTextClass: string | RegExp,
  maskSelector: string | null,
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
    if (maskSelector) {
      if ((node as HTMLElement).matches(maskSelector)) {
        return true;
      }
    }
    return needMaskingText(node.parentNode, maskTextClass, maskSelector);
  }

  return needMaskingText(node.parentNode, maskTextClass, maskSelector);
}
