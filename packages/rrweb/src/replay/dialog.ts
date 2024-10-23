import { attributeMutation } from '../types';

/**
 * Checks if the dialog is a top level dialog and applies the dialog to the top level
 * @param node - potential dialog element to apply top level `showModal()` to, or other node (which will be ignored)
 * @param attributeMutation - the attribute mutation used to change the dialog (optional)
 * @param retryCount - max tries to show dialog
 * @returns void
 */
export function applyDialogToTopLevel(
  node: HTMLDialogElement | Node,
  attributeMutation?: attributeMutation,
  retryCount: number = 0
): void {
  if (node.nodeName !== 'DIALOG') {
    return;
  }
  const dialog = node as HTMLDialogElement;
  const oldIsOpen = dialog.open;
  const oldIsModalState = oldIsOpen && dialog.matches('dialog:modal');
  const rrOpenMode = dialog.getAttribute('rr_open_mode');

  const newIsOpen =
    typeof attributeMutation?.attributes.open === 'string' ||
    typeof dialog.getAttribute('open') === 'string';
  const newIsModalState = rrOpenMode === 'modal';
  const newIsNonModalState = rrOpenMode === 'non-modal';

  const modalStateChanged =
    (oldIsModalState && newIsNonModalState) ||
    (!oldIsModalState && newIsModalState);

  if (oldIsOpen && !modalStateChanged) {
    return;
  }

  // handle the case when dialog is not attached to the dom
  if (!dialog.isConnected) {
    console.warn('dialog is not attached to the dom', dialog);

    if (retryCount < 10) {
      setTimeout(() => applyDialogToTopLevel(node, attributeMutation, retryCount + 1), 200);
    } else {
      console.error('Failed to attach dialog to the DOM after multiple attempts', dialog);
    }
    return;
  }

  if (oldIsOpen) {
    dialog.close();
  }
  if (!newIsOpen) {
    return;
  }

  if (newIsModalState) {
    dialog.showModal();
  } else {
    dialog.show();
  }
}

/**
 * Check if the dialog is a top level dialog and removes the dialog from the top level if necessary
 * @param node - potential dialog element to remove from top level, or other node (which will be ignored)
 * @param attributeMutation - the attribute mutation used to change the dialog
 * @returns void
 */
export function removeDialogFromTopLevel(
  node: HTMLDialogElement | Node,
  attributeMutation: attributeMutation,
): void {
  if (node.nodeName !== 'DIALOG') {
    return;
  }
  const dialog = node as HTMLDialogElement;

  // complain if dialog is not attached to the dom
  if (!dialog.isConnected) {
    console.warn('dialog is not attached to the dom', dialog);
    return;
  }

  if (attributeMutation.attributes.open === null) {
    dialog.removeAttribute('open');
    dialog.removeAttribute('rr_open_mode');
  }
}
