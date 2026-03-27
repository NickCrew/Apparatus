/**
 * Webhooks Commands
 * Create, inspect, and manage webhook receivers
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@atlascrew/apparatus-sdk';
import chalk from 'chalk';
import * as output from '../output.js';

export function registerWebhooksCommands(program: Command, getClient: () => ApparatusClient): void {
  const webhooks = program
    .command('webhooks')
    .alias('hooks')
    .description('Webhook receivers - create, inspect, and manage');

  // Create webhook
  webhooks
    .command('create')
    .description('Create a new webhook endpoint')
    .action(() => {
      const client = getClient();

      // createAndGetUrl is now synchronous (generates client-side UUID)
      const result = client.webhooks.createAndGetUrl();

      output.success('Webhook created!');
      output.printKeyValue({
        ID: result.id,
        URL: chalk.cyan(result.url),
      });
      output.info(`\nInspect with: apparatus webhooks inspect ${result.id}`);
    });

  // Inspect webhook
  webhooks
    .command('inspect <id>')
    .description('View requests received by a webhook')
    .option('-n, --limit <n>', 'Limit results', '20')
    .action(async (id, options) => {
      const client = getClient();
      const spin = output.spinner(`Inspecting webhook ${id}...`);
      spin.start();

      try {
        const result = await client.webhooks.inspect(id);
        spin.stop();

        output.header(`Webhook: ${id}`);
        output.labelValue('Total Requests', result.requests.length);

        if (result.requests.length === 0) {
          output.info('\nNo requests received yet');
          output.info(`Send requests to: ${client.webhooks.getUrl(id)}`);
          return;
        }

        const requests = result.requests.slice(0, parseInt(options.limit));
        output.subheader('\nReceived Requests:');

        for (let i = 0; i < requests.length; i++) {
          const req = requests[i];
          console.log(`\n${chalk.gray(`#${i + 1}`)} ${chalk.green(req.method)} ${req.path}`);
          console.log(`   ${chalk.gray('Time:')} ${req.timestamp || req.receivedAt}`);
          console.log(`   ${chalk.gray('IP:')} ${req.ip || 'unknown'}`);

          if (req.headers && Object.keys(req.headers).length > 0) {
            const contentType = req.headers['content-type'];
            if (contentType) {
              console.log(`   ${chalk.gray('Content-Type:')} ${contentType}`);
            }
          }

          if (req.body) {
            console.log(`   ${chalk.gray('Body:')} ${JSON.stringify(req.body).slice(0, 100)}...`);
          }
        }
      } catch (err) {
        spin.stop();
        output.error(`Webhook inspection failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Get URL
  webhooks
    .command('url <id>')
    .description('Get the URL for a webhook')
    .action(async (id) => {
      const client = getClient();
      const url = client.webhooks.getUrl(id);
      console.log(url);
    });

  // Send test request
  webhooks
    .command('send <id>')
    .description('Send a test request to a webhook')
    .option('-m, --method <method>', 'HTTP method', 'POST')
    .option('-d, --data <json>', 'Request body as JSON')
    .option('-H, --header <header>', 'Add header (key:value)', (val, prev: string[]) => [...prev, val], [])
    .action(async (id, options) => {
      const client = getClient();
      const spin = output.spinner(`Sending ${options.method} to webhook...`);
      spin.start();

      try {
        const headers: Record<string, string> = {};
        for (const h of options.header) {
          const [key, ...rest] = h.split(':');
          headers[key.trim()] = rest.join(':').trim();
        }

        let payload: Record<string, unknown>;
        if (options.data) {
          try {
            payload = JSON.parse(options.data);
          } catch {
            spin.stop();
            output.error('Invalid JSON for --data');
            process.exit(1);
          }
        } else {
          payload = { test: true, timestamp: new Date().toISOString() };
        }

        await client.webhooks.receive(id, payload, {
          method: options.method,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        });

        spin.stop();
        output.success('Request sent successfully');
        output.info(`Inspect with: apparatus webhooks inspect ${id}`);
      } catch (err) {
        spin.stop();
        output.error(`Send failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Delete webhook
  webhooks
    .command('delete <id>')
    .description('Delete a webhook (note: server does not support deletion)')
    .action(async (id) => {
      const client = getClient();

      const result = await client.webhooks.delete(id);
      output.warning(result.message);
      output.info(`Webhook ${id} will expire when server restarts.`);
    });

  // Clear requests
  webhooks
    .command('clear <id>')
    .description('Clear all requests from a webhook (note: server does not support clearing)')
    .action(async (id) => {
      const client = getClient();

      const result = await client.webhooks.clearRequests(id);
      output.warning(result.message);
      output.info(`Requests for webhook ${id} will be cleared when server restarts.`);
    });

  // Wait for request
  webhooks
    .command('wait <id>')
    .description('Wait for a request to arrive at the webhook')
    .option('-t, --timeout <ms>', 'Timeout in milliseconds', '30000')
    .action(async (id, options) => {
      const client = getClient();
      const timeout = parseInt(options.timeout);
      const spin = output.spinner(`Waiting for request (${timeout / 1000}s timeout)...`);
      spin.start();

      try {
        const request = await client.webhooks.waitForRequest(id, timeout);
        spin.stop();

        if (request) {
          output.success('Request received!');
          output.printKeyValue({
            Method: request.method,
            Path: request.path,
            IP: request.ip || 'unknown',
            Time: request.timestamp || request.receivedAt,
          });
          if (request.body) {
            output.subheader('\nBody:');
            output.printJson(request.body);
          }
        } else {
          output.warning('Timeout: No request received');
          process.exit(1);
        }
      } catch (err) {
        spin.stop();
        output.error(`Wait failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Count requests
  webhooks
    .command('count <id>')
    .description('Get request count for a webhook')
    .action(async (id) => {
      const client = getClient();

      try {
        const count = await client.webhooks.getRequestCount(id);
        output.labelValue('Request Count', count);
      } catch (err) {
        output.error(`Count failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
