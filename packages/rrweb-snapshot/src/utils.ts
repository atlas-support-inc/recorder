import { INode, MaskInputFn, MaskInputOptions, TMaskElementsOptions } from './types';

export function isElement(n: Node | INode): n is Element {
  return n.nodeType === n.ELEMENT_NODE;
}

export function isShadowRoot(n: Node): n is ShadowRoot {
  const host: Element | null = (n as ShadowRoot)?.host;
  return Boolean(host && host.shadowRoot && host.shadowRoot === n);
}

function isInput(n: Node | INode, tagName: string) {
  if (!n) {
    return false;
  }

  return tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select';
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
  maskElementsOptions,
}: {
  maskInputOptions: MaskInputOptions;
  tagName: string;
  type: string | number | boolean | null;
  value: string | null;
  maskInputFn?: MaskInputFn;
  node: Node;
  maskTextClass: string | RegExp;
  maskTextSelector: string | null;
  maskElementsOptions: TMaskElementsOptions;
}): string {
  const tagNameLowerCase = tagName?.toLowerCase();
  let text = value || '';
  if (maskElementsOptions.maskAllInputs && !isMaskedByGlobalRule(node, tagNameLowerCase, maskElementsOptions)) {
    return text;
  }

  if (
    maskInputOptions[tagNameLowerCase as keyof MaskInputOptions] ||
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

export function isMaskedByGlobalRule(
  node: Node | null,
  tagName: string,
  maskElementsOptions: TMaskElementsOptions,
) {
  if (!node) {
    return false;
  }

  const {
    maskAllTextNodes,
    maskAllInputs,
    maskAllImages,
    unmaskSelector,
  } = maskElementsOptions;

  const isMaskingDisabledBySelector = unmaskSelector ? (node as HTMLElement).matches(unmaskSelector) : false;

  return (
    (maskAllTextNodes && !isInput(node, tagName) && tagName !== 'img') ||
      (isInput(node, tagName) && maskAllInputs) ||
      (tagName === 'img' && maskAllImages)) &&
    !isMaskingDisabledBySelector;
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

  return needMaskingText(node.parentNode, maskTextClass, maskTextSelector);
}
