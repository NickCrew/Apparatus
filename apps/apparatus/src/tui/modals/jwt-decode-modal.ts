/**
 * JWT Decode Modal
 *
 * Form modal for inputting a JWT token to decode and display.
 */

import type { ModalManager, FormField } from '../core/modal.js';

/**
 * Show JWT decode modal with token input
 */
export function showJwtDecodeModal(
  modal: ModalManager,
  onDecode: (token: string) => void
): void {
  const fields: FormField[] = [
    {
      name: 'token',
      label: 'JWT Token',
      type: 'text',
      default: '',
      required: true,
    },
  ];

  modal.showForm(
    'Decode JWT Token',
    fields,
    (values) => {
      if (values.token && values.token.trim()) {
        onDecode(values.token.trim());
      }
    }
  );
}

/**
 * Show decoded JWT results in a modal
 */
export function showJwtDecodedResults(
  modal: ModalManager,
  decoded: {
    token: string;
    header: Record<string, unknown>;
    payload: Record<string, unknown>;
    signature: string;
  }
): void {
  const lines: string[] = [];

  lines.push('{bold}{cyan-fg}Decoded JWT Token{/cyan-fg}{/bold}');
  lines.push('');

  lines.push('{bold}Header:{/bold}');
  lines.push(JSON.stringify(decoded.header, null, 2));
  lines.push('');

  lines.push('{bold}Payload:{/bold}');
  lines.push(JSON.stringify(decoded.payload, null, 2));
  lines.push('');

  lines.push('{bold}Signature:{/bold}');
  lines.push(decoded.signature);
  lines.push('');

  lines.push('{bold}Original Token:{/bold}');
  lines.push(decoded.token.substring(0, 100) + '...');

  modal.showHelp(lines.join('\n'), 'Decoded JWT');
}
