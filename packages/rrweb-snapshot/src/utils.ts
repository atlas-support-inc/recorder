import {
  attributes,
  INode,
  MaskImageFn,
  MaskInputFn,
  MaskInputOptions,
} from './types';

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
  maskAll,
}: {
  maskInputOptions: MaskInputOptions;
  tagName: string;
  type: string | number | boolean | null;
  value: string | null;
  maskInputFn?: MaskInputFn;
  node: Node;
  maskTextClass: string | RegExp;
  maskTextSelector: string | null;
  maskAll?: boolean;
}): string {
  let text = value || '';

  if (
    maskInputOptions[tagName.toLowerCase() as keyof MaskInputOptions] ||
    maskInputOptions[type as keyof MaskInputOptions] ||
    needMaskingText(node, maskTextClass, maskTextSelector, maskAll)
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
  maskAll?: boolean,
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

      if (maskAll) {
        // stop recursive calls if "maskAll"
        return false;
      }
    }

    return needMaskingText(
      node.parentNode,
      maskTextClass,
      maskTextSelector,
      maskAll,
    );
  }

  return needMaskingText(
    node.parentNode,
    maskTextClass,
    maskTextSelector,
    maskAll,
  );
}

export function maskImage({
  n,
  attributes,
  maskImageFn,
}: {
  n: HTMLImageElement;
  attributes: attributes;
  maskImageFn?: MaskImageFn;
}) {
  const alt =
    typeof attributes.alt === 'string' && attributes.alt.length > 0
      ? '*'.repeat(attributes.alt.length)
      : '';

  if (maskImageFn) {
    const attrs = maskImageFn(n, attributes);
    return 'alt' in attrs ? attrs : { ...attrs, alt };
  }

  return {
    srcset: '',
    src: '',
    alt,
  };
}
