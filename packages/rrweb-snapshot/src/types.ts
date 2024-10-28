export enum NodeType {
  Document,
  DocumentType,
  Element,
  Text,
  CDATA,
  Comment,
}

export type documentNode = {
  type: NodeType.Document;
  childNodes: serializedNodeWithId[];
  compatMode?: string;
};

export type documentTypeNode = {
  type: NodeType.DocumentType;
  name: string;
  publicId: string;
  systemId: string;
};

export type attributes = {
  [key: string]: string | number | boolean;
};
export type elementNode = {
  type: NodeType.Element;
  tagName: string;
  attributes: attributes;
  childNodes: serializedNodeWithId[];
  isSVG?: true;
  needBlock?: boolean;
};

export type textNode = {
  type: NodeType.Text;
  textContent: string;
  isStyle?: true;
};

export type cdataNode = {
  type: NodeType.CDATA;
  textContent: '';
};

export type commentNode = {
  type: NodeType.Comment;
  textContent: string;
};

export type serializedNode = (
  | documentNode
  | documentTypeNode
  | elementNode
  | textNode
  | cdataNode
  | commentNode
) & {
  rootId?: number;
  isShadowHost?: boolean;
  isShadow?: boolean;
};

export type serializedNodeWithId = serializedNode & { id: number };

export type tagMap = {
  [key: string]: string;
};

export type DialogAttributes = {
  open: string;
  /**
   * Represents the dialog's open mode.
   * `modal` means the dialog is opened with `showModal()`.
   * `non-modal` means the dialog is opened with `show()` or
   * by adding an `open` attribute.
   */
  rr_open_mode: 'modal' | 'non-modal';
  /**
   * Currently unimplemented, but in future can be used to:
   * Represents the order of which of the dialog was opened.
   * This is useful for replaying the dialog `.showModal()` in the correct order.
   */
  // rr_open_mode_index?: number;
};

export interface INode extends Node {
  __sn_atlas: serializedNodeWithId;
}

export type idNodeMap = {
  [key: number]: INode;
};

export type MaskInputOptions = Partial<{
  color: boolean;
  date: boolean;
  'datetime-local': boolean;
  email: boolean;
  month: boolean;
  number: boolean;
  range: boolean;
  search: boolean;
  tel: boolean;
  text: boolean;
  time: boolean;
  url: boolean;
  week: boolean;
  // unify textarea and select element with text input
  textarea: boolean;
  select: boolean;
  password: boolean;
}>;

export type SlimDOMOptions = Partial<{
  script: boolean;
  comment: boolean;
  headFavicon: boolean;
  headWhitespace: boolean;
  headMetaDescKeywords: boolean;
  headMetaSocial: boolean;
  headMetaRobots: boolean;
  headMetaHttpEquiv: boolean;
  headMetaAuthorship: boolean;
  headMetaVerification: boolean;
}>;

export type MaskTextFn = (text: string) => string;
export type MaskInputFn = (text: string) => string;
export type MaskImageFn = (n: HTMLImageElement, attributes: attributes) => attributes;

export type KeepIframeSrcFn = (src: string) => boolean;

export type BuildCache = {
  stylesWithHoverClass: Map<string, string>;
};
