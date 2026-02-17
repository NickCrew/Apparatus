/**
 * Red Team Scan Form Modal
 * Form for initiating WAF bypass scan
 */

import type { ModalManager, FormField } from '../core/modal.js';

export function showScanFormModal(
  modal: ModalManager,
  onSubmit: (target: string, path: string) => void
): void {
  const fields: FormField[] = [
    {
      name: 'target',
      label: 'Target URL',
      type: 'text',
      default: 'http://localhost:8080',
      required: true,
    },
    {
      name: 'path',
      label: 'Path',
      type: 'text',
      default: '/echo',
      required: true,
    },
  ];

  modal.showForm(
    'Red Team Scan',
    fields,
    (values) => {
      onSubmit(values.target, values.path);
    }
  );
}
