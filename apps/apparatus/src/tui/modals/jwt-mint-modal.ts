/**
 * JWT Mint Modal
 *
 * Form modal for inputting custom JWT claims before minting a token.
 */

import type { ModalManager, FormField } from '../core/modal.js';

export interface JwtClaims {
  sub?: string;
  name?: string;
  email?: string;
  role?: string;
  custom?: string;
}

/**
 * Show JWT mint modal with claim inputs
 */
export function showJwtMintModal(
  modal: ModalManager,
  onMint: (claims: JwtClaims) => void
): void {
  const fields: FormField[] = [
    {
      name: 'sub',
      label: 'Subject (sub)',
      type: 'text',
      default: 'user-12345',
      required: false,
    },
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      default: 'Test User',
      required: false,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      default: 'test@example.com',
      required: false,
    },
    {
      name: 'role',
      label: 'Role',
      type: 'text',
      default: 'admin',
      required: false,
    },
    {
      name: 'custom',
      label: 'Custom Claims (JSON)',
      type: 'text',
      default: '{}',
      required: false,
    },
  ];

  modal.showForm(
    'Mint JWT Token',
    fields,
    (values) => {
      const claims: JwtClaims = {};

      if (values.sub) claims.sub = values.sub;
      if (values.name) claims.name = values.name;
      if (values.email) claims.email = values.email;
      if (values.role) claims.role = values.role;

      // Parse custom JSON claims
      if (values.custom && values.custom !== '{}') {
        try {
          const customClaims = JSON.parse(values.custom);
          Object.assign(claims, customClaims);
        } catch (e) {
          // Ignore invalid JSON
        }
      }

      onMint(claims);
    }
  );
}
