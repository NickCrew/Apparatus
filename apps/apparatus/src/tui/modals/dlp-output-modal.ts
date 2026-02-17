/**
 * DLP Output Modal
 * Displays generated DLP test data in detail
 */

import blessed from 'blessed';
import type { ModalManager } from '../core/modal.js';
import type { DlpData } from '../types.js';
import { colors } from '../theme.js';

export function showDlpOutputModal(
  screen: blessed.Widgets.Screen,
  modal: ModalManager,
  data: DlpData
): void {
  modal.close();

  const container = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '80%',
    height: '70%',
    label: ` DLP Test Data: ${data.type.toUpperCase()} `,
    border: { type: 'line' },
    style: {
      border: { fg: colors.accent },
      fg: 'white',
      bg: 'black',
    },
    tags: true,
    keys: true,
    vi: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: '█',
      track: { bg: 'gray' },
      style: { bg: colors.primary },
    },
  });

  const lines: string[] = [];

  lines.push('{bold}Type:{/bold}');
  lines.push(`  {cyan-fg}${data.type.toUpperCase()}{/cyan-fg}`);
  lines.push('');

  lines.push('{bold}Description:{/bold}');
  lines.push(`  ${data.description}`);
  lines.push('');

  lines.push('{bold}Generated Value:{/bold}');
  lines.push('');

  // Format the value based on type
  if (data.type === 'email') {
    // Split comma-separated emails
    const emails = data.value.split(',').map((e: string) => e.trim());
    emails.forEach((email: string, index: number) => {
      lines.push(`  {green-fg}${index + 1}. ${email}{/green-fg}`);
    });
  } else if (data.type === 'sql') {
    // Show SQL error with syntax highlighting
    lines.push(`  {red-fg}${data.value}{/red-fg}`);
  } else {
    // CC, SSN - show with formatting
    lines.push(`  {green-fg}${data.value}{/green-fg}`);
  }

  lines.push('');
  lines.push('');
  lines.push('{bold}Usage Examples:{/bold}');
  lines.push('');

  if (data.type === 'cc') {
    lines.push('  {yellow-fg}Test DLP blocking:{/yellow-fg}');
    lines.push(`  curl -X POST http://target/api/payment -d '{"card":"${data.value}"}'`);
    lines.push('');
    lines.push('  {yellow-fg}Test WAF response:{/yellow-fg}');
    lines.push(`  curl http://target/checkout?cc=${data.value}`);
  } else if (data.type === 'ssn') {
    lines.push('  {yellow-fg}Test DLP blocking:{/yellow-fg}');
    lines.push(`  curl -X POST http://target/api/user -d '{"ssn":"${data.value}"}'`);
    lines.push('');
    lines.push('  {yellow-fg}Test form submission:{/yellow-fg}');
    lines.push(`  curl -X POST http://target/profile -F 'ssn=${data.value}'`);
  } else if (data.type === 'email') {
    lines.push('  {yellow-fg}Test bulk email scraping:{/yellow-fg}');
    lines.push(`  curl http://target/scrape -d 'emails=${data.value}'`);
  } else if (data.type === 'sql') {
    lines.push('  {yellow-fg}This simulates a SQL error response{/yellow-fg}');
    lines.push('  Used to test if WAF masks database errors');
  }

  lines.push('');
  lines.push('');
  lines.push('{bold}Copy to Clipboard:{/bold}');
  lines.push('');
  lines.push('  {gray-fg}In production, use:{/gray-fg}');
  lines.push(`  {gray-fg}echo "${data.value}" | pbcopy    # macOS{/gray-fg}`);
  lines.push(`  {gray-fg}echo "${data.value}" | xclip      # Linux{/gray-fg}`);
  lines.push('');
  lines.push('');
  lines.push('{gray-fg}Press Esc or q to close{/gray-fg}');

  container.setContent(lines.join('\n'));

  container.key(['escape', 'q', 'enter'], () => {
    screen.remove(container);
    screen.render();
  });

  container.focus();
  screen.render();
}
