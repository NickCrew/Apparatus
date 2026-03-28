/**
 * Core Commands
 * Health, echo, metrics, history
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@atlascrew/apparatus-lib';
import * as output from '../output.js';

export function registerCoreCommands(program: Command, getClient: () => ApparatusClient): void {
  const core = program
    .command('core')
    .description('Health, echo, metrics, and history');

  // Health
  core
    .command('health')
    .description('Check server health')
    .option('--pro', 'Detailed health check')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Checking health...');
      spin.start();

      try {
        if (options.pro) {
          const result = await client.core.healthPro();
          spin.stop();
          output.header('Health Status (Pro)');
          output.labelValue('Status', output.formatHealth(result.status));
          output.labelValue('Timestamp', result.timestamp);

          if (result.checks && Object.keys(result.checks).length > 0) {
            output.subheader('\nChecks:');
            for (const [name, check] of Object.entries(result.checks)) {
              const status = check.status === 'ok' ? '✓' : '✗';
              const color = check.status === 'ok' ? 'green' : 'red';
              console.log(`  ${status} ${name}: ${check.message || check.status}`);
            }
          }
        } else {
          const result = await client.core.health();
          spin.stop();
          output.success(`Server is ${result.status}`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Health check failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Echo
  core
    .command('echo [path]')
    .description('Echo request details')
    .option('-m, --method <method>', 'HTTP method', 'GET')
    .option('-d, --delay <ms>', 'Inject delay (ms)')
    .option('-s, --status <code>', 'Inject status code')
    .option('-H, --header <header>', 'Add header (key:value)', (val, prev: string[]) => [...prev, val], [])
    .action(async (path = '/', options) => {
      const client = getClient();
      const spin = output.spinner('Sending request...');
      spin.start();

      try {
        const headers: Record<string, string> = {};
        for (const h of options.header) {
          const [key, ...rest] = h.split(':');
          headers[key.trim()] = rest.join(':').trim();
        }

        const result = await client.core.echo(path, {
          method: options.method,
          delay: options.delay ? parseInt(options.delay) : undefined,
          status: options.status ? parseInt(options.status) : undefined,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        });

        spin.stop();
        output.header('Echo Response');
        output.printKeyValue({
          Method: result.method,
          Path: result.path,
          'HTTP Version': result.httpVersion,
          Timestamp: result.timestamp,
          'Latency': output.formatLatency(result.latencyMs),
        });

        if (Object.keys(result.query).length > 0) {
          output.subheader('\nQuery Parameters:');
          output.printKeyValue(result.query as Record<string, unknown>);
        }

        output.subheader('\nHeaders:');
        for (const [key, value] of Object.entries(result.headers)) {
          console.log(`  ${key}: ${value}`);
        }

        if (result.body) {
          output.subheader('\nBody:');
          output.printJson(result.body);
        }
      } catch (err) {
        spin.stop();
        output.error(`Echo failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Metrics
  core
    .command('metrics')
    .description('Get Prometheus metrics')
    .option('--raw', 'Show raw Prometheus format')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Fetching metrics...');
      spin.start();

      try {
        const result = await client.core.metrics({ parse: !options.raw });
        spin.stop();

        if (options.raw || !result.parsed) {
          console.log(result.raw);
        } else {
          output.header('Metrics');
          const entries = Object.entries(result.parsed).slice(0, 20);
          output.printTable(['Metric', 'Value'], entries);
          if (Object.keys(result.parsed).length > 20) {
            output.info(`... and ${Object.keys(result.parsed).length - 20} more`);
          }
        }
      } catch (err) {
        spin.stop();
        output.error(`Metrics fetch failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // History
  core
    .command('history')
    .description('Get request history')
    .option('-n, --limit <n>', 'Limit results', '10')
    .option('--clear', 'Clear history')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner(options.clear ? 'Clearing history...' : 'Fetching history...');
      spin.start();

      try {
        if (options.clear) {
          const result = await client.core.clearHistory();
          spin.stop();
          output.success(`Cleared ${result.count} entries`);
        } else {
          const result = await client.core.history();
          spin.stop();

          output.header(`Request History (${result.count} total)`);
          const entries = result.entries.slice(0, parseInt(options.limit));

          if (entries.length === 0) {
            output.info('No history entries');
          } else {
            const rows = entries.map(e => [
              e.method,
              e.path,
              output.formatLatency(e.latencyMs),
              e.timestamp,
            ]);
            output.printTable(['Method', 'Path', 'Latency', 'Timestamp'], rows);
          }
        }
      } catch (err) {
        spin.stop();
        output.error(`History operation failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Threat Intel (Risk Server) Status
  core
    .command('threat-intel')
    .description('Get Threat Intel (Risk Server) connection status')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Checking Threat Intel connection...');
      spin.start();

      try {
        const result = await client.core.threatIntelStatus();
        spin.stop();

        output.header('Threat Intel Status');
        output.printKeyValue({
          Connected: result.connected ? '✓ Connected' : '✗ Disconnected',
          URL: result.url,
          'Sensor ID': result.sensorId,
          'Last Sync': result.lastSync || 'Never',
          'Entities Count': result.entitiesCount ?? 0,
        });
      } catch (err) {
        spin.stop();
        output.error(`Threat Intel status check failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
