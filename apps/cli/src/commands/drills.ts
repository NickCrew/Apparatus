/**
 * Drills Commands
 * Breach protocol drills — list, run, status, mark-detected, cancel, debrief
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import * as output from '../output.js';

export function registerDrillsCommands(program: Command, getClient: () => ApparatusClient): void {
  const drills = program
    .command('drills')
    .description('Breach protocol drills - incident response training');

  // List drills
  drills
    .command('list')
    .alias('ls')
    .description('List available drill definitions')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching drills...');
      spin.start();

      try {
        const result = await client.drills.list();
        spin.stop();

        if (result.length === 0) {
          output.info('No drills available');
          return;
        }

        output.header(`Drills (${result.length})`);
        for (const d of result) {
          output.printKeyValue({
            ID: d.id,
            Name: d.name,
            Difficulty: d.difficulty,
            Tags: d.tags.join(', '),
            'Max Duration': `${d.maxDurationSec}s`,
            Description: d.description,
          });
          console.log();
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to list drills: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Run a drill
  drills
    .command('run <id>')
    .description('Start a breach protocol drill')
    .option('-w, --wait', 'Wait for terminal state and show result')
    .option('-p, --poll <ms>', 'Poll interval when waiting', '3000')
    .action(async (id: string, options) => {
      const client = getClient();
      const spin = output.spinner(`Starting drill ${id}...`);
      spin.start();

      try {
        if (options.wait) {
          const run = await client.drills.runAndWait(id, parseInt(options.poll));
          spin.stop();
          output.header(`Drill: ${run.drillName}`);
          output.printKeyValue({
            Status: run.status,
            'Run ID': run.runId,
            'Started At': run.startedAt,
            ...(run.finishedAt ? { 'Finished At': run.finishedAt } : {}),
            ...(run.detectedAt ? { 'Detected At': run.detectedAt } : {}),
            ...(run.mitigatedAt ? { 'Mitigated At': run.mitigatedAt } : {}),
            ...(run.score ? { Score: `${run.score.total}/1200` } : {}),
            ...(run.failureReason ? { 'Failure Reason': run.failureReason } : {}),
          });
        } else {
          const result = await client.drills.run(id);
          spin.stop();
          output.success(result.message);
          output.printKeyValue({ 'Run ID': result.runId, 'Drill ID': result.drillId });
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to run drill: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Drill status
  drills
    .command('status <id>')
    .description('Get drill run status')
    .option('-r, --run <runId>', 'Specific run ID')
    .action(async (id: string, options) => {
      const client = getClient();
      const spin = output.spinner('Fetching drill status...');
      spin.start();

      try {
        const run = await client.drills.status(id, options.run);
        spin.stop();
        output.header(`Drill Run: ${run.drillName}`);
        output.printKeyValue({
          Status: run.status,
          'Run ID': run.runId,
          'Elapsed': `${run.elapsedSec ?? '?'}s`,
          'Started At': run.startedAt,
          ...(run.detectedAt ? { 'Detected At': run.detectedAt } : {}),
          ...(run.lastSnapshot ? {
            CPU: `${run.lastSnapshot.cpuPercent.toFixed(1)}%`,
            'Error Rate': `${(run.lastSnapshot.errorRate * 100).toFixed(1)}%`,
          } : {}),
        });
      } catch (err) {
        spin.stop();
        output.error(`Failed to get drill status: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Mark detected
  drills
    .command('detect <id>')
    .description('Mark incident as detected by operator')
    .option('-r, --run <runId>', 'Specific run ID')
    .action(async (id: string, options) => {
      const client = getClient();
      const spin = output.spinner('Marking detected...');
      spin.start();

      try {
        const result = await client.drills.markDetected(id, options.run);
        spin.stop();
        output.success(`Incident marked as detected (status: ${result.run.status})`);
      } catch (err) {
        spin.stop();
        output.error(`Failed to mark detected: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Cancel drill
  drills
    .command('cancel <id>')
    .description('Cancel an active drill run')
    .option('-r, --run <runId>', 'Specific run ID')
    .action(async (id: string, options) => {
      const client = getClient();
      const spin = output.spinner('Cancelling drill...');
      spin.start();

      try {
        const result = await client.drills.cancel(id, options.run);
        spin.stop();
        output.success(`Drill cancelled (status: ${result.run.status})`);
      } catch (err) {
        spin.stop();
        output.error(`Failed to cancel drill: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Debrief
  drills
    .command('debrief <id>')
    .description('Get post-drill debrief report')
    .option('-r, --run <runId>', 'Specific run ID')
    .action(async (id: string, options) => {
      const client = getClient();
      const spin = output.spinner('Fetching debrief...');
      spin.start();

      try {
        const result = await client.drills.debrief(id, options.run);
        spin.stop();
        output.header('Drill Debrief');
        output.printKeyValue({
          'Drill ID': result.drillId,
          'Run ID': result.runId,
          Status: result.status,
          'Started At': result.startedAt,
          ...(result.finishedAt ? { 'Finished At': result.finishedAt } : {}),
          ...(result.detectedAt ? { 'Detected At': result.detectedAt } : {}),
          ...(result.mitigatedAt ? { 'Mitigated At': result.mitigatedAt } : {}),
        });

        if (result.score) {
          output.subheader('\nScore');
          output.printKeyValue({
            Total: `${result.score.total}/1200`,
            'Time to Detect': `${result.score.ttdSec}s`,
            'Time to Mitigate': `${result.score.ttmSec}s`,
            'Time to Resolve': `${result.score.ttrSec}s`,
          });

          if (result.score.penalties.length > 0) {
            output.subheader('\nPenalties');
            for (const p of result.score.penalties) {
              console.log(`  -${p.points}  ${p.reason} (${p.code})`);
            }
          }

          if (result.score.bonuses.length > 0) {
            output.subheader('\nBonuses');
            for (const b of result.score.bonuses) {
              console.log(`  +${b.points}  ${b.reason} (${b.code})`);
            }
          }
        }

        if (result.timeline.length > 0) {
          output.subheader(`\nTimeline (${result.timeline.length} events)`);
          const last5 = result.timeline.slice(-5);
          for (const event of last5) {
            console.log(`  [${event.type}] ${event.at} - ${event.message}`);
          }
          if (result.timeline.length > 5) {
            console.log(`  ... and ${result.timeline.length - 5} more events`);
          }
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to get debrief: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
