/**
 * REPL Execution Context
 * Handles command parsing and execution in REPL mode
 */

import { ApparatusClient } from '@apparatus/client';
import * as output from '../output.js';

export interface ReplContext {
  client: ApparatusClient;
  baseUrl: string;
  verbose: boolean;
}

// Command aliases for quick access
const ALIASES: Record<string, string> = {
  // Quick shortcuts
  'h': 'core health',
  'hp': 'core health --pro',
  'e': 'core echo',
  'm': 'core metrics',
  'hist': 'core history',

  // Chaos shortcuts
  'cpu': 'chaos cpu',
  'mem': 'chaos memory',

  // Defense shortcuts
  'trap': 'defense tarpit list',
  'deception': 'defense deception history',

  // Network shortcuts
  'dns': 'network dns',
  'ping': 'network ping',
  'sys': 'network sysinfo',

  // Traffic shortcuts
  'ghost': 'traffic status',
  'ghosts': 'traffic status',

  // Storage shortcuts
  'kv': 'storage kv list',
  'get': 'storage kv get',
  'set': 'storage kv set',

  // Other shortcuts
  'token': 'identity token',
  'jwt': 'identity decode',
  'rules': 'security sentinel list',
  '?': 'help',
};

// Dot notation mappings
const DOT_MAPPINGS: Record<string, string> = {
  'core.health': 'core health',
  'core.echo': 'core echo',
  'core.metrics': 'core metrics',
  'core.history': 'core history',

  'chaos.cpu': 'chaos cpu',
  'chaos.memory': 'chaos memory',
  'chaos.crash': 'chaos crash',
  'chaos.eicar': 'chaos eicar',

  'security.redteam': 'security redteam',
  'security.sentinel': 'security sentinel list',
  'security.proxy': 'security proxy',

  'defense.tarpit': 'defense tarpit list',
  'defense.deception': 'defense deception history',

  'network.dns': 'network dns',
  'network.ping': 'network ping',
  'network.sysinfo': 'network sysinfo',

  'storage.kv': 'storage kv list',
  'storage.script': 'storage script',

  'traffic.status': 'traffic status',
  'traffic.start': 'traffic start',
  'traffic.stop': 'traffic stop',

  'identity.jwks': 'identity jwks',
  'identity.token': 'identity token',
  'identity.oidc': 'identity oidc',
};

/**
 * Expand aliases and dot notation
 */
export function expandCommand(input: string): string {
  const trimmed = input.trim();

  // Check for exact alias match
  if (ALIASES[trimmed]) {
    return ALIASES[trimmed];
  }

  // Check for dot notation (e.g., chaos.cpu 5000)
  const parts = trimmed.split(/\s+/);
  const firstPart = parts[0];

  if (firstPart.includes('.')) {
    const expanded = DOT_MAPPINGS[firstPart];
    if (expanded) {
      return [expanded, ...parts.slice(1)].join(' ');
    }
  }

  return trimmed;
}

/**
 * Parse command into parts
 */
export function parseCommand(input: string): { command: string; args: string[] } {
  const expanded = expandCommand(input);
  const parts = expanded.split(/\s+/).filter(Boolean);
  const command = parts[0] || '';
  const args = parts.slice(1);
  return { command, args };
}

/**
 * Built-in REPL commands
 */
export const BUILTIN_COMMANDS: Record<string, (ctx: ReplContext, args: string[]) => Promise<boolean>> = {
  'help': async () => {
    output.header('Apparatus REPL Commands');

    output.subheader('\nCategories:');
    const categories = [
      ['core', 'Health, echo, metrics, history'],
      ['chaos', 'CPU spike, memory spike, crash, EICAR'],
      ['security', 'Red team, Sentinel rules, proxy'],
      ['defense', 'Tarpit, deception honeypots'],
      ['network', 'DNS, ping, sysinfo'],
      ['storage', 'Key-value store, scripts'],
      ['traffic', 'Ghost traffic generator'],
      ['identity', 'JWKS, OIDC, tokens'],
    ];
    output.printTable(['Category', 'Description'], categories);

    output.subheader('\nShortcuts:');
    console.log('  h, hp     → health, health --pro');
    console.log('  e /path   → echo');
    console.log('  cpu 5000  → chaos cpu --duration 5000');
    console.log('  dns host  → network dns');
    console.log('  trap      → defense tarpit list');

    output.subheader('\nDot Notation:');
    console.log('  chaos.cpu 5000    → chaos cpu --duration 5000');
    console.log('  network.dns host  → network dns host');

    output.subheader('\nBuilt-in:');
    console.log('  url <new-url>  → Change base URL');
    console.log('  clear, cls     → Clear screen');
    console.log('  exit, quit     → Exit REPL');

    return true;
  },

  'url': async (ctx, args) => {
    if (args.length === 0) {
      output.labelValue('Base URL', ctx.baseUrl);
    } else {
      const newUrl = args[0];
      ctx.baseUrl = newUrl;
      ctx.client = new ApparatusClient({ baseUrl: newUrl });
      output.success(`Base URL changed to: ${newUrl}`);
    }
    return true;
  },

  'clear': async () => {
    console.clear();
    return true;
  },

  'cls': async () => {
    console.clear();
    return true;
  },

  'exit': async () => {
    return false; // Signal to exit
  },

  'quit': async () => {
    return false; // Signal to exit
  },
};

/**
 * Check if a command is built-in
 */
export function isBuiltinCommand(command: string): boolean {
  return command in BUILTIN_COMMANDS;
}
