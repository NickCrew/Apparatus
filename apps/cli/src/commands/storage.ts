/**
 * Storage Commands
 * Key-value store and script execution
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import * as output from '../output.js';

export function registerStorageCommands(program: Command, getClient: () => ApparatusClient): void {
  const storage = program
    .command('storage')
    .description('Key-value store and script execution');

  // KV commands
  const kv = storage
    .command('kv')
    .description('Key-value store operations');

  kv
    .command('get <key>')
    .description('Get a value')
    .action(async (key) => {
      const client = getClient();
      const spin = output.spinner(`Getting ${key}...`);
      spin.start();

      try {
        const entry = await client.storage.kvGet(key);
        spin.stop();

        if (!entry) {
          output.warning(`Key not found: ${key}`);
          process.exit(1);
        }

        output.header(`Key: ${key}`);
        output.printKeyValue({
          Created: entry.createdAt,
          Updated: entry.updatedAt,
          TTL: entry.ttl ? `${entry.ttl}s` : 'none',
        });
        output.subheader('\nValue:');
        output.printJson(entry.value);
      } catch (err) {
        spin.stop();
        output.error(`Get failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  kv
    .command('set <key> <value>')
    .description('Set a value (value can be JSON)')
    .option('--ttl <seconds>', 'Time to live in seconds')
    .action(async (key, value, options) => {
      const client = getClient();
      const spin = output.spinner(`Setting ${key}...`);
      spin.start();

      try {
        // Try to parse as JSON, otherwise use as string
        let parsedValue: unknown;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value;
        }

        const entry = await client.storage.set(
          key,
          parsedValue,
          options.ttl ? parseInt(options.ttl) : undefined
        );
        spin.stop();
        output.success(`Set ${key}`);
        output.printKeyValue({
          Created: entry.createdAt,
          TTL: entry.ttl ? `${entry.ttl}s` : 'none',
        });
      } catch (err) {
        spin.stop();
        output.error(`Set failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  kv
    .command('delete <key>')
    .alias('del')
    .description('Delete a key')
    .action(async (key) => {
      const client = getClient();
      const spin = output.spinner(`Deleting ${key}...`);
      spin.start();

      try {
        const deleted = await client.storage.delete(key);
        spin.stop();

        if (deleted) {
          output.success(`Deleted: ${key}`);
        } else {
          output.warning(`Key not found: ${key}`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Delete failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  kv
    .command('list')
    .alias('ls')
    .description('List all keys')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Listing keys...');
      spin.start();

      try {
        const keys = await client.storage.kvList();
        spin.stop();

        if (keys.length === 0) {
          output.info('No keys stored');
          return;
        }

        output.header(`Keys (${keys.length})`);
        for (const key of keys) {
          console.log(`  ${key}`);
        }
      } catch (err) {
        spin.stop();
        output.error(`List failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  kv
    .command('has <key>')
    .description('Check if key exists')
    .action(async (key) => {
      const client = getClient();
      try {
        const exists = await client.storage.has(key);
        if (exists) {
          output.success(`Key exists: ${key}`);
        } else {
          output.warning(`Key not found: ${key}`);
          process.exit(1);
        }
      } catch (err) {
        output.error(`Check failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Script execution
  storage
    .command('script <code>')
    .alias('exec')
    .description('Execute JavaScript code on server')
    .option('--timeout <ms>', 'Execution timeout', '5000')
    .option('-a, --args <json>', 'Arguments as JSON array')
    .action(async (code, options) => {
      const client = getClient();
      const spin = output.spinner('Executing script...');
      spin.start();

      try {
        const args = options.args ? JSON.parse(options.args) : undefined;
        const result = await client.storage.runScript(code, args, parseInt(options.timeout));
        spin.stop();

        output.header('Script Result');
        output.printKeyValue({
          Duration: `${result.duration}ms`,
        });

        if (result.error) {
          output.error(`Error: ${result.error}`);
        }

        if (result.logs.length > 0) {
          output.subheader('\nLogs:');
          for (const log of result.logs) {
            console.log(`  ${log}`);
          }
        }

        output.subheader('\nResult:');
        output.printJson(result.result);
      } catch (err) {
        spin.stop();
        output.error(`Script execution failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
