/**
 * TCP Ping Form Modal
 * Form for TCP connectivity testing
 */

import type { ModalManager, FormField } from '../core/modal.js';

export function showPingFormModal(
  modal: ModalManager,
  onSubmit: (target: string) => void
): void {
  const fields: FormField[] = [
    {
      name: 'target',
      label: 'Target (host:port)',
      type: 'text',
      default: 'localhost:8080',
      required: true,
    },
  ];

  modal.showForm(
    'TCP Ping',
    fields,
    (values) => {
      onSubmit(values.target);
    }
  );
}
