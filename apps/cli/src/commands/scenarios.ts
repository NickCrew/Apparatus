/**
 * Scenarios Commands
 * List, save, run, and monitor multi-step attack scenarios
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import * as output from '../output.js';

export function registerScenariosCommands(program: Command, getClient: () => ApparatusClient): void {
  const scenarios = program
    .command('scenarios')
    .description('Multi-step attack scenario orchestration');

  // List all scenarios
  scenarios
    .command('list')
    .alias('ls')
    .description('List all saved scenarios')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching scenarios...');
      spin.start();

      try {
        const result = await client.scenarios.list();
        spin.stop();

        if (result.length === 0) {
          output.info('No scenarios found');
          return;
        }

        output.header(`Scenarios (${result.length})`);
        for (const s of result) {
          output.printKeyValue({
            ID: s.id,
            Name: s.name,
            Steps: s.steps.length,
            Created: s.createdAt,
            ...(s.description ? { Description: s.description } : {}),
          });
          console.log();
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to list scenarios: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Run a scenario
  scenarios
    .command('run <id>')
    .description('Execute a scenario by ID')
    .option('-w, --wait', 'Wait for completion and show result')
    .option('-p, --poll <ms>', 'Poll interval when waiting', '2000')
    .action(async (id: string, options) => {
      const client = getClient();
      const spin = output.spinner(`Starting scenario ${id}...`);
      spin.start();

      try {
        if (options.wait) {
          const result = await client.scenarios.runAndWait(id, parseInt(options.poll));
          spin.stop();
          output.header(`Scenario ${result.scenarioName}`);
          output.printKeyValue({
            Status: result.status,
            'Execution ID': result.executionId,
            'Started At': result.startedAt,
            ...(result.finishedAt ? { 'Finished At': result.finishedAt } : {}),
            ...(result.error ? { Error: result.error } : {}),
          });
        } else {
          const result = await client.scenarios.run(id);
          spin.stop();
          output.success(result.message);
          output.printKeyValue({ 'Execution ID': result.executionId });
        }
      } catch (err) {
        spin.stop();
        output.error(`Failed to run scenario: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Get scenario run status
  scenarios
    .command('status <id>')
    .description('Get scenario execution status')
    .option('-e, --execution <id>', 'Specific execution ID')
    .action(async (id: string, options) => {
      const client = getClient();
      const spin = output.spinner('Fetching status...');
      spin.start();

      try {
        const result = await client.scenarios.status(id, options.execution);
        spin.stop();
        output.header(`Scenario Run: ${result.scenarioName}`);
        output.printKeyValue({
          Status: result.status,
          'Execution ID': result.executionId,
          'Scenario ID': result.scenarioId,
          'Started At': result.startedAt,
          ...(result.currentStepId ? { 'Current Step': result.currentStepId } : {}),
          ...(result.finishedAt ? { 'Finished At': result.finishedAt } : {}),
          ...(result.error ? { Error: result.error } : {}),
        });
      } catch (err) {
        spin.stop();
        output.error(`Failed to get status: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
