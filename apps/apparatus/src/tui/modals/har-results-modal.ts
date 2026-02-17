/**
 * HAR Results Modal
 *
 * Display modal for showing HAR replay results with details.
 */

import type { ModalManager } from '../core/modal.js';

export interface HarReplayResult {
  url: string;
  status?: number;
  error?: string;
}

/**
 * Show HAR replay results in a modal
 */
export function showHarResultsModal(
  modal: ModalManager,
  results: HarReplayResult[]
): void {
  const lines: string[] = [];

  lines.push('{bold}{cyan-fg}HAR Replay Results{/cyan-fg}{/bold}');
  lines.push('');
  lines.push(`Total requests: {bold}${results.length}{/bold}`);

  const successful = results.filter((r) => r.status && r.status >= 200 && r.status < 400);
  const errors = results.filter((r) => r.error || (r.status && r.status >= 400));

  lines.push(`Successful: {green-fg}${successful.length}{/green-fg}`);
  lines.push(`Errors: {red-fg}${errors.length}{/red-fg}`);
  lines.push('');
  lines.push('{bold}Details:{/bold}');
  lines.push('');

  // Show first 20 results
  const displayResults = results.slice(0, 20);
  for (const result of displayResults) {
    if (result.error) {
      lines.push(`{red-fg}✗{/red-fg} ${result.url}`);
      lines.push(`  {gray-fg}Error: ${result.error}{/gray-fg}`);
    } else if (result.status) {
      const color = result.status >= 200 && result.status < 400 ? 'green-fg' : 'red-fg';
      const icon = result.status >= 200 && result.status < 400 ? '✓' : '✗';
      lines.push(`{${color}}${icon}{/${color}} ${result.url}`);
      lines.push(`  {gray-fg}Status: ${result.status}{/gray-fg}`);
    }
  }

  if (results.length > 20) {
    lines.push('');
    lines.push(`{gray-fg}... and ${results.length - 20} more{/gray-fg}`);
  }

  modal.showHelp(lines.join('\n'), 'HAR Replay Results');
}
