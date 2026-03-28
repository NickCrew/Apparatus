/**
 * Data Commands
 * Generate test data, sink data, and DLP scanning
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@atlascrew/apparatus-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as output from '../output.js';

export function registerDataCommands(program: Command, getClient: () => ApparatusClient): void {
  const data = program
    .command('data')
    .description('Generate test data, sink data, and DLP scanning');

  // Generate command
  data
    .command('generate')
    .description('Generate random test data')
    .option('-t, --type <type>', 'Data type: json|csv|xml|binary', 'json')
    .option('-c, --count <number>', 'Number of records (for json/csv)', '10')
    .option('-s, --size <bytes>', 'Size in bytes (for binary)', '1024')
    .option('--schema <json>', 'Custom JSON schema')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner(`Generating ${options.type} data...`);
      spin.start();

      try {
        const type = options.type as 'json' | 'csv' | 'xml' | 'binary';
        const count = parseInt(options.count);
        const size = parseInt(options.size);
        let schema: Record<string, unknown> | undefined;

        if (options.schema) {
          try {
            schema = JSON.parse(options.schema);
          } catch {
            spin.stop();
            output.error('Invalid JSON schema');
            process.exit(1);
          }
        }

        const result = await client.data.generate({
          type,
          count,
          size,
          schema,
        });

        spin.stop();
        output.header('Generated Data');

        if (type === 'json') {
          output.printJson(result);
        } else if (type === 'binary') {
          const buffer = result as ArrayBuffer;
          output.labelValue('Size', `${buffer.byteLength} bytes`);
          output.labelValue('Hex', Array.from(new Uint8Array(buffer)).slice(0, 32).map(b => b.toString(16).padStart(2, '0')).join(' '));
        } else {
          // CSV or XML
          const text = result as string;
          output.labelValue('Length', `${text.length} characters`);
          output.subheader('\nData:');
          console.log(text);
        }
      } catch (err) {
        spin.stop();
        output.error(`Generate failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Sink command
  data
    .command('sink')
    .description('Send data to the sink endpoint')
    .option('-f, --file <path>', 'Read data from file')
    .option('-d, --data <json>', 'JSON data to send')
    .option('--text <text>', 'Plain text data to send')
    .action(async (options) => {
      const client = getClient();
      let dataToSink: unknown;

      // Determine data source
      if (options.file) {
        try {
          const filePath = path.resolve(options.file);
          const content = await fs.readFile(filePath, 'utf-8');

          // Try to parse as JSON
          try {
            dataToSink = JSON.parse(content);
          } catch {
            // Treat as plain text
            dataToSink = content;
          }
        } catch (err) {
          output.error(`Failed to read file: ${(err as Error).message}`);
          process.exit(1);
        }
      } else if (options.data) {
        try {
          dataToSink = JSON.parse(options.data);
        } catch {
          output.error('Invalid JSON data');
          process.exit(1);
        }
      } else if (options.text) {
        dataToSink = options.text;
      } else {
        output.error('Specify --file, --data, or --text');
        process.exit(1);
      }

      const spin = output.spinner('Sending to sink...');
      spin.start();

      try {
        const result = await client.data.sink(dataToSink);
        spin.stop();

        output.header('Sink Response');
        output.printKeyValue({
          Received: `${result.received} bytes`,
          'Content Type': result.contentType,
          Timestamp: result.timestamp,
        });

        output.success('Data sent to sink');
      } catch (err) {
        spin.stop();
        output.error(`Sink failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // DLP command
  data
    .command('dlp')
    .description('Scan data for sensitive information')
    .option('-c, --content <text>', 'Text to scan')
    .option('-f, --file <path>', 'Scan file contents')
    .option('-r, --rules <types>', 'Rule types to scan for (comma-separated)')
    .action(async (options) => {
      const client = getClient();
      let contentToScan: string;

      // Determine content source
      if (options.content) {
        contentToScan = options.content;
      } else if (options.file) {
        try {
          const filePath = path.resolve(options.file);
          contentToScan = await fs.readFile(filePath, 'utf-8');
        } catch (err) {
          output.error(`Failed to read file: ${(err as Error).message}`);
          process.exit(1);
        }
      } else {
        output.error('Specify --content or --file');
        process.exit(1);
      }

      const spin = output.spinner('Scanning for sensitive data...');
      spin.start();

      try {
        const rules = options.rules ? options.rules.split(',').map((r: string) => r.trim()) : undefined;
        const result = await client.data.dlpScan({
          content: contentToScan,
          rules,
        });

        spin.stop();
        output.header('DLP Scan Results');

        output.printKeyValue({
          'Total Matches': result.summary.total,
          'Scanned Content Length': contentToScan.length,
        });

        if (result.summary.total > 0) {
          output.subheader('\nMatches by Type:');
          for (const [type, count] of Object.entries(result.summary.byType)) {
            console.log(`  ${type}: ${count}`);
          }

          output.subheader('\nDetailed Matches:');
          const rows = result.matches.slice(0, 20).map(m => [
            m.type,
            m.value.length > 30 ? m.value.substring(0, 27) + '...' : m.value,
            m.offset !== undefined ? m.offset.toString() : '-',
          ]);
          output.printTable(['Type', 'Value', 'Offset'], rows);

          if (result.matches.length > 20) {
            output.info(`... and ${result.matches.length - 20} more matches`);
          }
        } else {
          output.success('No sensitive data detected');
        }
      } catch (err) {
        spin.stop();
        output.error(`DLP scan failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
