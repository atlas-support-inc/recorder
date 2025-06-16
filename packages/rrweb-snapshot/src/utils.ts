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
        if (!maskTextClass) {
          return false;
        }

        // When maskAll is true, maskTextSelector contains selectors which are excluded
        const closestNodeToMaskOrExclude = (node as HTMLElement)?.closest(
          `.${maskTextClass}, ${maskTextSelector} > *`,
        );

        return !!closestNodeToMaskOrExclude?.classList.contains(
          maskTextClass as string,
        );
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

const ORIGINAL_ATTRIBUTE_NAME = '__rrweb_original__';
type PatchedGetImageData = {
  [ORIGINAL_ATTRIBUTE_NAME]: CanvasImageData['getImageData'];
} & CanvasImageData['getImageData'];

export function is2DCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return true;
  }
  const chunkSize = 50;

  try {
    // get chunks of the canvas and check if it is blank
    for (let x = 0; x < canvas.width; x += chunkSize) {
      for (let y = 0; y < canvas.height; y += chunkSize) {
        const getImageData = ctx.getImageData as PatchedGetImageData;
        const originalGetImageData =
          ORIGINAL_ATTRIBUTE_NAME in getImageData
            ? getImageData[ORIGINAL_ATTRIBUTE_NAME]
            : getImageData;
        // by getting the canvas in chunks we avoid an expensive
        // `getImageData` call that retrieves everything
        // even if we can already tell from the first chunk(s) that
        // the canvas isn't blank
        const pixelBuffer = new Uint32Array(
          originalGetImageData.call(
            ctx,
            x,
            y,
            Math.min(chunkSize, canvas.width - x),
            Math.min(chunkSize, canvas.height - y),
          ).data.buffer,
        );
        if (pixelBuffer.some((pixel) => pixel !== 0)) {
          return false;
        }
      }
    }
  } catch (e) {
    console.warn(e);
    // https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image#security_and_tainted_canvases
    // getImageData may be blocked by CORS policy
    // we'll assume that the canvas is not blank
    return false;
  }

  return true;
}
