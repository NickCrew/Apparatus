/**
 * Network Commands
 * DNS, ping, sysinfo, rate limit
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@atlascrew/apparatus-client';
import chalk from 'chalk';
import * as output from '../output.js';

export function registerNetworkCommands(program: Command, getClient: () => ApparatusClient): void {
  const network = program
    .command('network')
    .description('Network tools - DNS, ping, sysinfo');

  // DNS
  network
    .command('dns <hostname>')
    .description('DNS lookup')
    .action(async (hostname) => {
      const client = getClient();
      const spin = output.spinner(`Resolving ${hostname}...`);
      spin.start();

      try {
        const result = await client.network.dns(hostname);
        spin.stop();
        output.header(`DNS: ${result.hostname}`);
        output.subheader('Addresses:');
        for (const addr of result.addresses) {
          console.log(`  ${chalk.green('→')} ${addr}`);
        }
      } catch (err) {
        spin.stop();
        output.error(`DNS lookup failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Ping
  network
    .command('ping <host>')
    .description('TCP ping a host')
    .option('-p, --port <port>', 'Port number', '80')
    .action(async (host, options) => {
      const client = getClient();
      const port = parseInt(options.port);
      const spin = output.spinner(`Pinging ${host}:${port}...`);
      spin.start();

      try {
        const result = await client.network.ping(host, port);
        spin.stop();

        const statusColor = result.status === 'open' ? 'green' : 'red';
        output.header(`Ping: ${result.host}:${result.port}`);
        output.printKeyValue({
          Status: chalk[statusColor](result.status),
          Latency: output.formatLatency(result.latencyMs),
        });

        if (result.error) {
          output.error(result.error);
        }
      } catch (err) {
        spin.stop();
        output.error(`Ping failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Sysinfo
  network
    .command('sysinfo')
    .description('Get server system information')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching system info...');
      spin.start();

      try {
        const result = await client.network.sysinfo();
        spin.stop();

        output.header('System Information');
        output.printKeyValue({
          Hostname: result.hostname,
          Platform: result.platform,
          Architecture: result.arch,
          CPUs: result.cpus,
          Uptime: `${Math.floor(result.uptime / 3600)}h ${Math.floor((result.uptime % 3600) / 60)}m`,
          'Load Average': result.loadAverage.map(l => l.toFixed(2)).join(', '),
        });

        output.subheader('\nMemory:');
        output.printKeyValue({
          Total: output.formatBytes(result.memory.total),
          Used: output.formatBytes(result.memory.used),
          Free: output.formatBytes(result.memory.free),
          'Usage': `${((result.memory.used / result.memory.total) * 100).toFixed(1)}%`,
        });

        if (Object.keys(result.networkInterfaces).length > 0) {
          output.subheader('\nNetwork Interfaces:');
          for (const [name, ifaces] of Object.entries(result.networkInterfaces)) {
            console.log(`  ${chalk.cyan(name)}:`);
            for (const iface of ifaces) {
              if (!iface.internal) {
                console.log(`    ${iface.family}: ${iface.address}`);
              }
            }
          }
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to fetch sysinfo: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Rate limit
  network
    .command('ratelimit')
    .alias('rl')
    .description('Check rate limit status')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Checking rate limit...');
      spin.start();

      try {
        const result = await client.network.rateLimit();
        spin.stop();

        output.header('Rate Limit Status');
        const statusColor = result.status === 'allowed' ? 'green' : 'red';
        output.printKeyValue({
          Status: chalk[statusColor](result.status),
          Remaining: `${result.remaining}/${result.limit}`,
          'Resets At': new Date(result.resetAt).toLocaleTimeString(),
        });
      } catch (err) {
        spin.stop();
        output.error(`Rate limit check failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Reachable helper
  network
    .command('reachable <host>')
    .description('Check if host is reachable')
    .option('-p, --port <port>', 'Port number', '80')
    .action(async (host, options) => {
      const client = getClient();
      const port = parseInt(options.port);
      const spin = output.spinner(`Checking ${host}:${port}...`);
      spin.start();

      try {
        const reachable = await client.network.isReachable(host, port);
        spin.stop();

        if (reachable) {
          output.success(`${host}:${port} is reachable`);
        } else {
          output.error(`${host}:${port} is not reachable`);
          process.exit(1);
        }
      } catch (err) {
        spin.stop();
        output.error(`Check failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
