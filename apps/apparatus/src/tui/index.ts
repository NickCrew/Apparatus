#!/usr/bin/env node
/**
 * Apparatus TUI Entry Point
 * Security-focused terminal dashboard for Apparatus
 */

import { createDashboard } from './dashboard.js';

interface CliArgs {
  target: string;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let target = process.env.APPARATUS_TARGET ?? 'http://localhost:8080';
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if ((arg === '--target' || arg === '-t') && args[i + 1]) {
      target = args[i + 1]!;
      i++;
    } else if (arg?.startsWith('--target=')) {
      target = arg.split('=')[1]!;
    } else if (arg?.startsWith('-t=')) {
      target = arg.split('=')[1]!;
    }
  }

  // Ensure target has protocol
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    target = `http://${target}`;
  }

  // Remove trailing slash
  target = target.replace(/\/$/, '');

  return { target, help };
}

function printHelp(): void {
  console.log(`
Apparatus TUI - Apparatus Terminal Dashboard

Usage:
  pnpm run tui [options]
  node --loader ts-node/esm src/tui/index.ts [options]

Options:
  -t, --target <url>   Target Apparatus server URL (default: http://localhost:8080)
  -h, --help           Show this help message

Environment Variables:
  APPARATUS_TARGET       Default target URL

Examples:
  pnpm run tui
  pnpm run tui -- --target http://localhost:8080
  pnpm run tui -- -t https://echo.example.com:8443

Keyboard Shortcuts:
  q, Ctrl+C    Quit
  ?, h         Help
  f            Filter requests
  c            Clear filters
  x            Release selected tarpit IP
  X            Release all tarpit IPs
  R            Reconnect SSE
  r            Refresh all data
  ↑/↓, j/k     Navigate
  Enter        Show details
`);
}

function checkTty(): boolean {
  if (!process.stdout.isTTY) {
    console.log('Apparatus TUI requires an interactive terminal.');
    console.log('');
    console.log('For non-interactive monitoring, use:');
    console.log('  curl -N http://localhost:8080/sse');
    console.log('');
    return false;
  }
  return true;
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!checkTty()) {
    process.exit(1);
  }

  console.log(`Connecting to ${args.target}...`);

  try {
    const dashboard = createDashboard({
      target: args.target,
      refreshInterval: 5000,
      maxRequests: 100,
    });

    // Handle process signals
    process.on('SIGINT', () => {
      dashboard.sseClient.disconnect();
      dashboard.poller.stopAll();
      dashboard.screen.destroy();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      dashboard.sseClient.disconnect();
      dashboard.poller.stopAll();
      dashboard.screen.destroy();
      process.exit(0);
    });

  } catch (err) {
    console.error('Failed to start dashboard:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
