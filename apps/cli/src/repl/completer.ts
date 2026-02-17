/**
 * REPL Tab Completion
 * Provides intelligent autocomplete for commands
 */

// Command structure for completion
const COMMANDS: Record<string, string[]> = {
  // Root level commands
  '': ['core', 'chaos', 'security', 'defense', 'network', 'storage', 'traffic', 'identity', 'health', 'echo', 'config', 'help', 'exit', 'quit'],

  // Core commands
  'core': ['health', 'echo', 'metrics', 'history'],
  'core health': ['--pro'],
  'core echo': ['--method', '--delay', '--status', '--header'],
  'core metrics': ['--raw'],
  'core history': ['--limit', '--clear'],

  // Chaos commands
  'chaos': ['cpu', 'memory', 'crash', 'eicar', 'test'],
  'chaos cpu': ['--duration', '--intensity'],
  'chaos memory': ['--size', '--duration', '--clear'],
  'chaos crash': ['--force'],

  // Security commands
  'security': ['redteam', 'sentinel', 'proxy'],
  'security redteam': ['--tests', '--timeout', '--full'],
  'security sentinel': ['list', 'add', 'delete', 'enable', 'disable'],
  'security proxy': ['--method', '--header', '--data'],

  // Defense commands
  'defense': ['tarpit', 'deception'],
  'defense tarpit': ['list', 'release', 'count'],
  'defense deception': ['history', 'clear', 'shells'],
  'defense deception history': ['--limit', '--type'],

  // Network commands
  'network': ['dns', 'ping', 'sysinfo', 'ratelimit', 'reachable'],
  'network ping': ['--port'],
  'network reachable': ['--port'],

  // Storage commands
  'storage': ['kv', 'script'],
  'storage kv': ['get', 'set', 'delete', 'list', 'has'],
  'storage kv set': ['--ttl'],
  'storage script': ['--timeout', '--args'],

  // Traffic commands
  'traffic': ['status', 'start', 'stop', 'toggle'],
  'traffic start': ['--rps', '--duration', '--endpoints'],
  'traffic toggle': ['--rps'],

  // Identity commands
  'identity': ['jwks', 'oidc', 'token', 'decode', 'validate'],
  'identity token': ['--subject', '--audience', '--expires', '--claims'],
};

// HTTP methods for completion
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// Common options
const COMMON_FLAGS = ['--help', '-h'];

/**
 * Get completions for a partial input
 */
export function getCompletions(line: string): [string[], string] {
  const trimmed = line.trimStart();
  const parts = trimmed.split(/\s+/);
  const lastPart = parts[parts.length - 1] || '';

  // Check if we're completing an option value
  if (parts.length >= 2) {
    const prevPart = parts[parts.length - 2];
    if (prevPart === '--method' || prevPart === '-m') {
      const matches = HTTP_METHODS.filter(m => m.toLowerCase().startsWith(lastPart.toLowerCase()));
      return [matches, lastPart];
    }
    if (prevPart === '--type') {
      const types = ['honeypot_hit', 'shell_command', 'sqli_probe'];
      const matches = types.filter(t => t.startsWith(lastPart));
      return [matches, lastPart];
    }
  }

  // Build the command path for lookup
  const commandPath = parts.slice(0, -1).join(' ').toLowerCase();

  // Get possible completions
  let completions: string[] = COMMANDS[commandPath] || [];

  // Add common flags if we have a command
  if (commandPath && !lastPart.startsWith('-')) {
    // Check if subcommands exist
    const subCommandKey = commandPath + ' ' + lastPart;
    if (COMMANDS[subCommandKey]) {
      completions = [...completions, ...COMMANDS[subCommandKey]];
    }
  }

  // Filter by what's been typed
  if (lastPart) {
    completions = completions.filter(c =>
      c.toLowerCase().startsWith(lastPart.toLowerCase())
    );
  }

  // Add common flags
  if (lastPart.startsWith('-')) {
    const flags = [...COMMON_FLAGS];
    // Add command-specific flags
    const cmdFlags = COMMANDS[commandPath];
    if (cmdFlags) {
      flags.push(...cmdFlags.filter(f => f.startsWith('-')));
    }
    completions = flags.filter(f => f.startsWith(lastPart));
  }

  return [completions, lastPart];
}

/**
 * Create completer function for readline
 */
export function createCompleter(): (line: string) => [string[], string] {
  return getCompletions;
}

/**
 * Get help text for a command
 */
export function getCommandHelp(command: string): string | null {
  const subcommands = COMMANDS[command];
  if (!subcommands) return null;

  return `Available: ${subcommands.filter(s => !s.startsWith('-')).join(', ')}`;
}
