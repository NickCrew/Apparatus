/**
 * Security Commands
 * Red team, Sentinel rules, proxy
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@atlascrew/apparatus-lib';
import chalk from 'chalk';
import * as output from '../output.js';

export function registerSecurityCommands(program: Command, getClient: () => ApparatusClient): void {
  const security = program
    .command('security')
    .description('Security testing - red team, Sentinel, proxy');

  // Red Team
  security
    .command('redteam <target>')
    .description('Run red team security scan')
    .option('-t, --tests <tests>', 'Comma-separated test names')
    .option('--timeout <ms>', 'Timeout in milliseconds', '60000')
    .option('--full', 'Run full security scan')
    .action(async (target, options) => {
      const client = getClient();
      const spin = output.spinner(`Scanning ${target}...`);
      spin.start();

      try {
        let result;
        if (options.full) {
          result = await client.security.fullScan(target, parseInt(options.timeout));
        } else {
          result = await client.security.redteam({
            target,
            tests: options.tests?.split(','),
            timeout: parseInt(options.timeout),
          });
        }

        spin.stop();
        output.header(`Red Team Results: ${target}`);

        // Summary
        const { summary } = result;
        console.log(
          `\n${chalk.green('✓ Passed:')} ${summary.passed}  ` +
          `${chalk.red('✗ Failed:')} ${summary.failed}  ` +
          `${chalk.yellow('⚠ Warnings:')} ${summary.warnings}  ` +
          `${chalk.gray(`(${result.duration}ms)`)}`
        );

        // Results table
        if (result.results.length > 0) {
          output.subheader('\nTest Results:');
          const rows = result.results.map(r => {
            let status;
            switch (r.status) {
              case 'pass': status = chalk.green('✓ PASS'); break;
              case 'fail': status = chalk.red('✗ FAIL'); break;
              case 'warn': status = chalk.yellow('⚠ WARN'); break;
              default: status = chalk.gray('○ SKIP');
            }
            return [status, r.test, r.message];
          });
          output.printTable(['Status', 'Test', 'Message'], rows);
        }
      } catch (err) {
        spin.stop();
        output.error(`Red team scan failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Sentinel rules
  const sentinel = security
    .command('sentinel')
    .description('Manage Sentinel WAF rules');

  sentinel
    .command('list')
    .description('List all Sentinel rules')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching rules...');
      spin.start();

      try {
        const rules = await client.security.listRules();
        spin.stop();

        if (rules.length === 0) {
          output.info('No rules configured');
          return;
        }

        output.header(`Sentinel Rules (${rules.length})`);
        const rows = rules.map(r => [
          r.id.slice(0, 8),
          r.name,
          r.pattern,
          r.action,
          r.enabled ? chalk.green('✓') : chalk.red('✗'),
          r.priority,
        ]);
        output.printTable(['ID', 'Name', 'Pattern', 'Action', 'Enabled', 'Priority'], rows);
      } catch (err) {
        spin.stop();
        output.error(`Failed to list rules: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  sentinel
    .command('add <name> <pattern>')
    .description('Add a new Sentinel rule')
    .option('-a, --action <action>', 'Action (block/log/allow)', 'block')
    .option('-p, --priority <n>', 'Priority', '10')
    .action(async (name, pattern, options) => {
      const client = getClient();
      const spin = output.spinner('Creating rule...');
      spin.start();

      try {
        const rule = await client.security.addRule({
          name,
          pattern,
          action: options.action,
          priority: parseInt(options.priority),
        });
        spin.stop();
        output.success(`Created rule: ${rule.id}`);
        output.printKeyValue({
          ID: rule.id,
          Name: rule.name,
          Pattern: rule.pattern,
          Action: rule.action,
          Priority: rule.priority,
        });
      } catch (err) {
        spin.stop();
        output.error(`Failed to create rule: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  sentinel
    .command('delete <id>')
    .description('Delete a Sentinel rule')
    .action(async (id) => {
      const client = getClient();
      const spin = output.spinner('Deleting rule...');
      spin.start();

      try {
        await client.security.deleteRule(id);
        spin.stop();
        output.success(`Deleted rule: ${id}`);
      } catch (err) {
        spin.stop();
        output.error(`Failed to delete rule: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  sentinel
    .command('enable <id>')
    .description('Enable a Sentinel rule')
    .action(async (id) => {
      const client = getClient();
      try {
        await client.security.enableRule(id);
        output.success(`Enabled rule: ${id}`);
      } catch (err) {
        output.error(`Failed to enable rule: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  sentinel
    .command('disable <id>')
    .description('Disable a Sentinel rule')
    .action(async (id) => {
      const client = getClient();
      try {
        await client.security.disableRule(id);
        output.success(`Disabled rule: ${id}`);
      } catch (err) {
        output.error(`Failed to disable rule: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Proxy
  security
    .command('proxy <url>')
    .description('Proxy a request through Apparatus')
    .option('-m, --method <method>', 'HTTP method', 'GET')
    .option('-H, --header <header>', 'Add header (key:value)', (val, prev: string[]) => [...prev, val], [])
    .option('-d, --data <data>', 'Request body')
    .action(async (url, options) => {
      const client = getClient();
      const spin = output.spinner(`Proxying ${options.method} ${url}...`);
      spin.start();

      try {
        const headers: Record<string, string> = {};
        for (const h of options.header) {
          const [key, ...rest] = h.split(':');
          headers[key.trim()] = rest.join(':').trim();
        }

        const result = await client.security.proxy({
          url,
          method: options.method,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          body: options.data ? JSON.parse(options.data) : undefined,
        });

        spin.stop();
        output.header('Proxy Response');
        output.printKeyValue({
          Status: output.formatStatus(result.status),
          'Status Text': result.statusText,
          'Latency': output.formatLatency(result.latencyMs),
        });

        if (Object.keys(result.headers).length > 0) {
          output.subheader('\nHeaders:');
          for (const [key, value] of Object.entries(result.headers)) {
            console.log(`  ${key}: ${value}`);
          }
        }

        if (result.body) {
          output.subheader('\nBody:');
          output.printJson(result.body);
        }
      } catch (err) {
        spin.stop();
        output.error(`Proxy request failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
