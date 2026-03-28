/**
 * Autopilot Commands
 * AI-driven red team autopilot — config, start, stop, kill, status, reports
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@atlascrew/apparatus-lib';
import * as output from '../output.js';

export function registerAutopilotCommands(program: Command, getClient: () => ApparatusClient): void {
  const autopilot = program
    .command('autopilot')
    .alias('ap')
    .description('AI-driven red team autopilot');

  // Config
  autopilot
    .command('config')
    .description('Show autopilot configuration and available tools')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching autopilot config...');
      spin.start();

      try {
        const result = await client.autopilot.config();
        spin.stop();
        output.header('Autopilot Configuration');
        output.printKeyValue({
          'Available Tools': result.availableTools.join(', '),
          'Default Tools': result.defaultAllowedTools.join(', '),
          'Forbid Crash': result.safetyDefaults.forbidCrash,
        });
      } catch (err) {
        spin.stop();
        output.error(`Failed to get config: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Start
  autopilot
    .command('start <objective>')
    .description('Start an autopilot red team session')
    .option('-n, --max-iterations <n>', 'Maximum iterations', '12')
    .option('-i, --interval <ms>', 'Interval between iterations', '1500')
    .option('-t, --tools <tools>', 'Comma-separated list of allowed tools')
    .option('--allow-crash', 'Allow chaos.crash tool')
    .action(async (objective: string, options) => {
      const client = getClient();
      const spin = output.spinner('Starting autopilot...');
      spin.start();

      try {
        const result = await client.autopilot.start({
          objective,
          maxIterations: parseInt(options.maxIterations),
          intervalMs: parseInt(options.interval),
          scope: {
            allowedTools: options.tools ? options.tools.split(',').map((t: string) => t.trim()) : undefined,
            forbidCrash: !options.allowCrash,
          },
        });
        spin.stop();
        output.success(`Autopilot started (session: ${result.sessionId})`);
        output.printKeyValue({
          'Session ID': result.sessionId,
          State: result.session.state,
          Objective: result.session.objective ?? objective,
        });
      } catch (err) {
        spin.stop();
        output.error(`Failed to start autopilot: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Stop (graceful)
  autopilot
    .command('stop')
    .description('Gracefully stop the active autopilot session')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Stopping autopilot...');
      spin.start();

      try {
        const result = await client.autopilot.stop();
        spin.stop();
        output.success(`Autopilot stop requested (session: ${result.sessionId})`);
      } catch (err) {
        spin.stop();
        output.error(`Failed to stop autopilot: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Kill (force)
  autopilot
    .command('kill')
    .description('Force-kill autopilot and stop all active experiments')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Killing autopilot...');
      spin.start();

      try {
        const result = await client.autopilot.kill();
        spin.stop();
        output.success('Autopilot killed');
        if (result.killResult) {
          output.printKeyValue(result.killResult as Record<string, unknown>);
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to kill autopilot: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Status
  autopilot
    .command('status')
    .description('Get current autopilot status')
    .option('-s, --session <id>', 'Specific session ID')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Fetching autopilot status...');
      spin.start();

      try {
        const result = await client.autopilot.status(options.session);
        spin.stop();
        output.header('Autopilot Status');
        output.printKeyValue({
          Active: result.active,
          ...(result.session ? {
            'Session ID': result.session.id,
            State: result.session.state,
            Objective: result.session.objective ?? 'N/A',
            Iteration: result.session.iteration ?? 0,
            ...(result.session.startedAt ? { 'Started At': result.session.startedAt } : {}),
            ...(result.session.endedAt ? { 'Ended At': result.session.endedAt } : {}),
          } : {
            Session: 'None',
          }),
        });
      } catch (err) {
        spin.stop();
        output.error(`Failed to get status: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Reports
  autopilot
    .command('reports')
    .description('Get autopilot session reports')
    .option('-s, --session <id>', 'Specific session ID')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Fetching reports...');
      spin.start();

      try {
        const result = await client.autopilot.reports(options.session);
        spin.stop();

        if (result.reports.length === 0) {
          output.info('No reports available');
          return;
        }

        output.header(`Reports (${result.reports.length})`);
        output.printJson(result.reports);
      } catch (err) {
        spin.stop();
        output.error(`Failed to get reports: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
