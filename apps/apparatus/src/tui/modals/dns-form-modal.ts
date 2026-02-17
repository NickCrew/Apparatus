/**
 * DNS Lookup Form Modal
 * Form for DNS record resolution
 */

import type { ModalManager, FormField } from '../core/modal.js';

export function showDnsFormModal(
  modal: ModalManager,
  onSubmit: (target: string, type: string) => void
): void {
  const fields: FormField[] = [
    {
      name: 'target',
      label: 'Domain/Hostname',
      type: 'text',
      default: 'example.com',
      required: true,
    },
    {
      name: 'type',
      label: 'Record Type (A, AAAA, MX, TXT, NS, CNAME, SRV)',
      type: 'text',
      default: 'A',
      required: true,
    },
  ];

  modal.showForm(
    'DNS Lookup',
    fields,
    (values) => {
      onSubmit(values.target, values.type.toUpperCase());
    }
  );
}
