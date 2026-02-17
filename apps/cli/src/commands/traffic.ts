/**
 * Traffic Commands
 * Ghost traffic generator
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import chalk from 'chalk';
import * as output from '../output.js';

export function registerTrafficCommands(program: Command, getClient: () => ApparatusClient): void {
  const traffic = program
    .command('traffic')
    .description('Ghost traffic generator');

  traffic
    .command('status')
    .description('Get ghost traffic status')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Getting status...');
      spin.start();

      try {
        const status = await client.traffic.status();
        spin.stop();

        output.header('Ghost Traffic Status');
        output.printKeyValue({
          Running: status.running ? chalk.green('yes') : chalk.gray('no'),
        });

        if (status.config) {
          output.subheader('\nConfiguration:');
          output.printKeyValue({
            RPS: status.config.rps,
            Duration: status.config.duration ? `${status.config.duration}ms` : 'unlimited',
            Endpoints: status.config.endpoints?.join(', ') || 'default',
          });
        }

        if (status.stats) {
          output.subheader('\nStatistics:');
          output.printKeyValue({
            'Requests Sent': status.stats.requestsSent,
            Errors: status.stats.errors,
            'Started At': new Date(status.stats.startedAt).toLocaleString(),
          });
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to get status: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  traffic
    .command('start')
    .description('Start ghost traffic')
    .option('-r, --rps <n>', 'Requests per second', '10')
    .option('-d, --duration <ms>', 'Duration in milliseconds')
    .option('-e, --endpoints <paths>', 'Comma-separated endpoint paths')
    .action(async (options) => {
      const client = getClient();
      const rps = parseInt(options.rps);
      const spin = output.spinner(`Starting ghost traffic at ${rps} RPS...`);
      spin.start();

      try {
        const status = await client.traffic.start({
          rps,
          duration: options.duration ? parseInt(options.duration) : undefined,
          endpoints: options.endpoints?.split(','),
        });
        spin.stop();

        if (status.running) {
          output.success(`Ghost traffic started at ${rps} RPS`);
        } else {
          output.warning('Traffic did not start');
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to start traffic: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  traffic
    .command('stop')
    .description('Stop ghost traffic')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Stopping ghost traffic...');
      spin.start();

      try {
        const status = await client.traffic.stop();
        spin.stop();

        if (!status.running) {
          output.success('Ghost traffic stopped');
          if (status.stats) {
            output.info(`Total requests: ${status.stats.requestsSent}, Errors: ${status.stats.errors}`);
          }
        } else {
          output.warning('Traffic did not stop');
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to stop traffic: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  traffic
    .command('toggle')
    .description('Toggle ghost traffic on/off')
    .option('-r, --rps <n>', 'RPS for start', '10')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Toggling traffic...');
      spin.start();

      try {
        const currentStatus = await client.traffic.status();
        let status;

        if (currentStatus.running) {
          status = await client.traffic.stop();
          spin.stop();
          output.success('Ghost traffic stopped');
        } else {
          status = await client.traffic.start({ rps: parseInt(options.rps) });
          spin.stop();
          output.success(`Ghost traffic started at ${options.rps} RPS`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Toggle failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
