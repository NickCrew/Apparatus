/**
 * Apparatus REPL
 * Interactive mode with tab completion and history
 */

import * as readline from 'readline';
import chalk from 'chalk';
import { ApparatusClient } from '@atlascrew/apparatus-sdk';
import { loadConfig, loadHistory, appendHistory, getHistoryPath } from './config.js';
import { createCompleter } from './repl/completer.js';
import { expandCommand, BUILTIN_COMMANDS, isBuiltinCommand, type ReplContext } from './repl/context.js';
import * as output from './output.js';
import { createProgram } from './cli.js';

/**
 * Start the REPL
 */
export async function startRepl(options: { url?: string; verbose?: boolean } = {}): Promise<void> {
  const config = loadConfig();
  const baseUrl = options.url || config.baseUrl;

  // Create client
  const client = new ApparatusClient({
    baseUrl,
    timeout: config.timeout,
    debug: options.verbose,
  });

  // Create context
  const ctx: ReplContext = {
    client,
    baseUrl,
    verbose: options.verbose || false,
  };

  // Print welcome
  console.log();
  console.log(chalk.cyan.bold('🗡️  Apparatus REPL'));
  console.log(chalk.gray(`Connected to: ${baseUrl}`));
  console.log(chalk.gray('Type "help" for commands, "exit" to quit'));
  console.log();

  // Check server health
  try {
    const healthy = await client.isHealthy();
    if (healthy) {
      console.log(chalk.green('✓ Server is healthy'));
    } else {
      console.log(chalk.yellow('⚠ Server responded but may be degraded'));
    }
  } catch (err) {
    console.log(chalk.red('✗ Could not connect to server'));
  }
  console.log();

  // Load history
  const history = loadHistory();

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('apparatus> '),
    completer: createCompleter(),
    history,
    historySize: 1000,
  });

  // Save history on each command
  rl.on('line', async (line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      rl.prompt();
      return;
    }

    // Save to history
    appendHistory(trimmed);

    try {
      // Check for built-in commands first
      const expanded = expandCommand(trimmed);
      const parts = expanded.split(/\s+/);
      const command = parts[0].toLowerCase();

      if (isBuiltinCommand(command)) {
        const handler = BUILTIN_COMMANDS[command];
        const shouldContinue = await handler(ctx, parts.slice(1));
        if (!shouldContinue) {
          console.log(chalk.gray('Goodbye!'));
          rl.close();
          process.exit(0);
        }
      } else {
        // Execute as CLI command
        await executeCommand(expanded, ctx);
      }
    } catch (err) {
      output.error(`Error: ${(err as Error).message}`);
    }

    console.log();
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.gray('\nGoodbye!'));
    process.exit(0);
  });

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    console.log(chalk.gray('\nUse "exit" to quit'));
    rl.prompt();
  });

  rl.prompt();
}

/**
 * Execute a CLI command in REPL context
 */
async function executeCommand(input: string, ctx: ReplContext): Promise<void> {
  // Parse the command
  const args = parseArgs(input);

  // Create a fresh program for each command
  const program = createProgram();

  // Override the exit behavior
  program.exitOverride();

  // Suppress help output when command not found
  program.configureOutput({
    writeErr: () => {}, // Suppress error output
  });

  try {
    // Parse and execute
    await program.parseAsync(['node', 'apparatus', ...args], { from: 'user' });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    // Ignore commander exit errors (help, version)
    if (error.code === 'commander.helpDisplayed' ||
        error.code === 'commander.version') {
      return;
    }

    // Handle unknown command
    if (error.code === 'commander.unknownCommand') {
      output.error(`Unknown command: ${args[0]}`);
      output.info('Type "help" for available commands');
      return;
    }

    // Re-throw other errors
    throw err;
  }
}

/**
 * Parse arguments from input string (handles quotes)
 */
function parseArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current);
  }

  return args;
}
