/**
 * Red Team Scan Results Modal
 * Displays detailed scan results with pass/fail status
 */

import type { ModalManager } from '../core/modal.js';
import type { RedTeamResult } from '../types.js';

export function showRedTeamResultsModal(
  modal: ModalManager,
  result: RedTeamResult
): void {
  const lines: string[] = [];

  lines.push(`{bold}Red Team Scan Results{/bold}`);
  lines.push('');
  lines.push(`Target: ${result.target}`);
  lines.push(`Path:   ${result.path}`);
  lines.push('');
  lines.push(`{bold}Summary:{/bold}`);
  lines.push(`  Total:   ${result.summary?.total ?? result.total}`);
  lines.push(`  Passed:  {green-fg}${result.summary?.passed ?? result.passed}{/green-fg}`);
  lines.push(`  Blocked: {red-fg}${result.summary?.blocked ?? result.blocked}{/red-fg}`);
  lines.push(`  Failed:  {yellow-fg}${result.summary?.failed ?? 0}{/yellow-fg}`);
  lines.push('');
  lines.push(`{bold}Detailed Results:{/bold}`);
  lines.push('');

  // Group by category
  const byCategory: Record<string, typeof result.results> = {};
  for (const r of result.results) {
    if (!byCategory[r.category]) {
      byCategory[r.category] = [];
    }
    byCategory[r.category].push(r);
  }

  for (const [category, tests] of Object.entries(byCategory)) {
    lines.push(`{cyan-fg}${category.toUpperCase()}:{/cyan-fg}`);
    for (const test of tests) {
      const statusColor = test.blocked ? 'red-fg' : 'green-fg';
      const statusText = test.blocked ? 'BLOCKED' : 'PASSED';
      lines.push(`  {${statusColor}}${statusText}{/${statusColor}} - ${test.payload.substring(0, 50)}${test.payload.length > 50 ? '...' : ''}`);
      lines.push(`         Status: ${test.status}`);
      if (test.response) {
        lines.push(`         Response: ${test.response.substring(0, 100)}`);
      }
    }
    lines.push('');
  }

  modal.showHelp(lines.join('\n'), 'Red Team Scan Results');
}
