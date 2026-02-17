/**
 * Ghost Traffic Configuration Modal
 * Form for configuring ghost traffic parameters
 */

import type { ModalManager, FormField } from '../core/modal.js';

export function showGhostConfigModal(
  modal: ModalManager,
  type: 'target' | 'delay',
  currentValue: string | number,
  onSubmit: (value: string | number) => void
): void {
  if (type === 'target') {
    const fields: FormField[] = [
      {
        name: 'target',
        label: 'Target URL',
        type: 'text',
        default: String(currentValue || 'http://localhost:8080'),
        required: true,
      },
    ];

    modal.showForm(
      'Set Ghost Traffic Target',
      fields,
      (values) => {
        onSubmit(values.target);
      }
    );
  } else {
    const fields: FormField[] = [
      {
        name: 'delay',
        label: 'Delay (milliseconds)',
        type: 'text',
        default: String(currentValue || '1000'),
        required: true,
      },
    ];

    modal.showForm(
      'Set Ghost Traffic Delay',
      fields,
      (values) => {
        onSubmit(parseInt(values.delay, 10));
      }
    );
  }
}
