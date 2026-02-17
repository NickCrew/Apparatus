/**
 * Victim Commands
 * Intentionally vulnerable endpoints for security testing
 *
 * WARNING: These endpoints are intentionally vulnerable for educational
 * and testing purposes. Use only in controlled environments!
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import chalk from 'chalk';
import * as output from '../output.js';

export function registerVictimCommands(program: Command, getClient: () => ApparatusClient): void {
  const victim = program
    .command('victim')
    .description('Vulnerable endpoints - SQLi, RCE, XSS testing (educational use only)');

  // SQL Injection
  victim
    .command('sqli')
    .description('Test SQL injection vulnerable login')
    .option('-u, --username <user>', 'Username (can contain SQLi payload)')
    .option('-p, --password <pass>', 'Password')
    .option('--bypass', 'Use classic SQLi bypass payload')
    .option('--payload <payload>', 'Custom SQLi payload')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Testing SQLi endpoint...');
      spin.start();

      try {
        let result;
        if (options.bypass) {
          result = await client.victim.sqliBypass();
        } else if (options.payload) {
          result = await client.victim.testSqli(options.payload);
        } else {
          const username = options.username || 'admin';
          const password = options.password || 'password';
          result = await client.victim.sqli(username, password);
        }

        spin.stop();
        output.header('SQLi Test Result');

        const vulnerableIcon = result.vulnerable ? chalk.red('VULNERABLE') : chalk.green('SECURE');
        output.labelValue('Status', vulnerableIcon);
        output.labelValue('Query', result.query || 'N/A');

        if (result.message) {
          output.labelValue('Message', result.message);
        }

        if (result.vulnerable) {
          output.warning('\nThis endpoint is vulnerable to SQL injection!');
        }
      } catch (err) {
        spin.stop();
        output.error(`SQLi test failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Remote Code Execution
  victim
    .command('rce')
    .description('Test RCE vulnerable calculator')
    .option('-e, --expression <expr>', 'Math expression (can contain command injection)')
    .option('--exec <cmd>', 'Execute system command (injection payload)')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Testing RCE endpoint...');
      spin.start();

      try {
        let result;
        if (options.exec) {
          result = await client.victim.execCommand(options.exec);
        } else {
          const expression = options.expression || '1+1';
          result = await client.victim.rce(expression);
        }

        spin.stop();
        output.header('RCE Test Result');

        const vulnerableIcon = result.vulnerable ? chalk.red('VULNERABLE') : chalk.green('SECURE');
        output.labelValue('Status', vulnerableIcon);
        output.labelValue('Expression', result.expression || 'N/A');
        output.labelValue('Result', result.result);

        if (result.output) {
          output.subheader('\nCommand Output:');
          console.log(result.output);
        }

        if (result.vulnerable) {
          output.warning('\nThis endpoint is vulnerable to command injection!');
        }
      } catch (err) {
        spin.stop();
        output.error(`RCE test failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Cross-Site Scripting
  victim
    .command('xss')
    .description('Test XSS vulnerable guestbook')
    .option('-m, --message <msg>', 'Guestbook message (can contain XSS payload)')
    .option('--alert', 'Use classic XSS alert payload')
    .option('--payload <payload>', 'Custom XSS payload')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Testing XSS endpoint...');
      spin.start();

      try {
        let result;
        if (options.alert) {
          result = await client.victim.xssAlert();
        } else if (options.payload) {
          result = await client.victim.testXss(options.payload);
        } else {
          const message = options.message || 'Hello from CLI!';
          result = await client.victim.xss(message);
        }

        spin.stop();
        output.header('XSS Test Result');

        const vulnerableIcon = result.vulnerable ? chalk.red('VULNERABLE') : chalk.green('SECURE');
        output.labelValue('Status', vulnerableIcon);
        output.labelValue('Input', result.input || 'N/A');
        output.labelValue('Rendered', result.rendered || 'N/A');

        if (result.vulnerable) {
          output.warning('\nThis endpoint is vulnerable to XSS!');
        }
      } catch (err) {
        spin.stop();
        output.error(`XSS test failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Run all tests
  victim
    .command('test')
    .alias('all')
    .description('Run all vulnerability tests')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Running all vulnerability tests...');
      spin.start();

      try {
        const results = await client.victim.runAllTests();
        spin.stop();

        output.header('Vulnerability Test Results');
        console.log();

        // SQLi
        const sqliStatus = results.sqli.vulnerable ? chalk.red('VULNERABLE') : chalk.green('SECURE');
        console.log(`${chalk.magenta('SQLi:')}     ${sqliStatus}`);

        // RCE
        const rceStatus = results.rce.vulnerable ? chalk.red('VULNERABLE') : chalk.green('SECURE');
        console.log(`${chalk.magenta('RCE:')}      ${rceStatus}`);

        // XSS
        const xssStatus = results.xss.vulnerable ? chalk.red('VULNERABLE') : chalk.green('SECURE');
        console.log(`${chalk.magenta('XSS:')}      ${xssStatus}`);

        // Summary
        const vulnCount = [results.sqli, results.rce, results.xss].filter(r => r.vulnerable).length;
        console.log();
        if (vulnCount === 3) {
          output.warning(`All ${vulnCount} endpoints are vulnerable (as expected for testing)`);
        } else if (vulnCount > 0) {
          output.warning(`${vulnCount}/3 endpoints are vulnerable`);
        } else {
          output.success('All endpoints are secure');
        }
      } catch (err) {
        spin.stop();
        output.error(`Vulnerability tests failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Check vulnerabilities (quick check)
  victim
    .command('check')
    .description('Quick vulnerability check (returns boolean results)')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Checking vulnerabilities...');
      spin.start();

      try {
        const results = await client.victim.checkVulnerabilities();
        spin.stop();

        output.printKeyValue({
          'SQLi Vulnerable': results.sqli ? 'Yes' : 'No',
          'RCE Vulnerable': results.rce ? 'Yes' : 'No',
          'XSS Vulnerable': results.xss ? 'Yes' : 'No',
        });
      } catch (err) {
        spin.stop();
        output.error(`Check failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
