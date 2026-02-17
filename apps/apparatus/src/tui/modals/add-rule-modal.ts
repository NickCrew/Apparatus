/**
 * Add Rule Modal for Active Shield (Sentinel)
 * Form for creating new virtual patching rules
 */

import blessed from 'blessed';
import type { ModalManager } from '../core/modal.js';
import { colors } from '../theme.js';

export function showAddRuleModal(
  screen: blessed.Widgets.Screen,
  modal: ModalManager,
  onSubmit: (pattern: string, action: 'block' | 'log') => void
): void {
  modal.close();

  const container = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '70%',
    height: 16,
    label: ' Add Active Shield Rule ',
    border: { type: 'line' },
    style: {
      border: { fg: colors.accent },
      fg: 'white',
      bg: 'black',
    },
    tags: true,
  });

  // Pattern label
  blessed.text({
    parent: container,
    top: 0,
    left: 2,
    content: 'Pattern (regex):',
    style: { fg: 'white' },
  });

  // Pattern input
  const patternInput = blessed.textbox({
    parent: container,
    top: 1,
    left: 2,
    width: '100%-6',
    height: 1,
    style: {
      fg: 'white',
      bg: 'black',
      focus: { bg: colors.primary },
    },
    inputOnFocus: true,
    value: '',
  });

  // Help text
  blessed.text({
    parent: container,
    top: 2,
    left: 2,
    width: '100%-4',
    content: '{gray-fg}Examples: /admin, \\.env, wp-admin, eval\\(, DROP\\s+TABLE{/gray-fg}',
    tags: true,
    style: { fg: 'gray' },
  });

  // Action label
  blessed.text({
    parent: container,
    top: 4,
    left: 2,
    content: 'Action:',
    style: { fg: 'white' },
  });

  // Action radio buttons
  let selectedAction: 'block' | 'log' = 'block';

  const blockRadio = blessed.radiobutton({
    parent: container,
    top: 5,
    left: 2,
    width: 15,
    height: 1,
    content: '● Block',
    style: {
      fg: 'white',
      focus: { bg: colors.primary },
    },
    checked: true,
  });

  const logRadio = blessed.radiobutton({
    parent: container,
    top: 5,
    left: 18,
    width: 15,
    height: 1,
    content: '○ Log Only',
    style: {
      fg: 'white',
      focus: { bg: colors.primary },
    },
  });

  blockRadio.on('check', () => {
    selectedAction = 'block';
    blockRadio.setContent('● Block');
    logRadio.setContent('○ Log Only');
    screen.render();
  });

  logRadio.on('check', () => {
    selectedAction = 'log';
    blockRadio.setContent('○ Block');
    logRadio.setContent('● Log Only');
    screen.render();
  });

  // Description
  blessed.text({
    parent: container,
    top: 7,
    left: 2,
    width: '100%-4',
    content: '{gray-fg}Block: Request will be rejected (403)\nLog: Request allowed but logged{/gray-fg}',
    tags: true,
    style: { fg: 'gray' },
  });

  // Buttons
  const submitBtn = blessed.button({
    parent: container,
    top: 10,
    left: 2,
    width: 12,
    height: 1,
    content: ' Submit ',
    style: {
      fg: 'white',
      bg: colors.success,
      focus: { bg: 'green' },
    },
  });

  const cancelBtn = blessed.button({
    parent: container,
    top: 10,
    left: 16,
    width: 12,
    height: 1,
    content: ' Cancel ',
    style: {
      fg: 'white',
      bg: 'gray',
      focus: { bg: 'red' },
    },
  });

  const cleanup = () => {
    screen.remove(container);
    screen.render();
  };

  const handleSubmit = () => {
    const pattern = patternInput.getValue().trim();

    if (!pattern) {
      // Show error
      blessed.box({
        parent: screen,
        top: 'center',
        left: 'center',
        width: 40,
        height: 5,
        border: { type: 'line' },
        style: {
          border: { fg: colors.error },
          fg: 'white',
          bg: 'black',
        },
        content: '\n  {red-fg}✗{/red-fg} Pattern cannot be empty!',
        tags: true,
      });

      setTimeout(() => {
        screen.children.forEach((child) => {
          if (child !== container) screen.remove(child);
        });
        patternInput.focus();
        screen.render();
      }, 1500);

      return;
    }

    cleanup();
    onSubmit(pattern, selectedAction);
  };

  submitBtn.on('press', handleSubmit);
  cancelBtn.on('press', cleanup);

  container.key(['escape'], cleanup);
  patternInput.key(['enter'], () => {
    submitBtn.focus();
  });
  container.key(['tab'], () => {
    // Tab navigation between inputs
    submitBtn.focus();
  });

  patternInput.focus();
  screen.render();
}
