/**
 * GraphQL Commands
 * Query, schema introspection, and type discovery
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import * as output from '../output.js';

export function registerGraphQLCommands(program: Command, getClient: () => ApparatusClient): void {
  const graphql = program
    .command('graphql')
    .description('GraphQL operations - queries, schema, introspection');

  // Execute query
  graphql
    .command('query <query>')
    .description('Execute a GraphQL query')
    .option('-v, --variables <json>', 'Query variables as JSON')
    .option('-o, --operation <name>', 'Operation name')
    .action(async (query, options) => {
      const client = getClient();
      const spin = output.spinner('Executing GraphQL query...');
      spin.start();

      let variables: Record<string, unknown> | undefined;
      if (options.variables) {
        try {
          variables = JSON.parse(options.variables);
        } catch {
          spin.stop();
          output.error('Invalid JSON for --variables');
          process.exit(1);
        }
      }

      try {
        const result = await client.graphql.execute(query, variables, options.operation);
        spin.stop();

        if (result.errors && result.errors.length > 0) {
          output.error('GraphQL Errors:');
          for (const err of result.errors) {
            console.log(`  - ${err.message}`);
            if (err.locations) {
              console.log(`    at ${err.locations.map(l => `line ${l.line}, col ${l.column}`).join(', ')}`);
            }
          }
        }

        if (result.data) {
          output.header('Result');
          output.printJson(result.data);
        }
      } catch (err) {
        spin.stop();
        output.error(`GraphQL query failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Get schema
  graphql
    .command('schema')
    .description('Get GraphQL schema via introspection')
    .option('--types-only', 'Show only type names')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Fetching GraphQL schema...');
      spin.start();

      try {
        const schema = await client.graphql.getSchema() as { __schema: { types: Array<{ name: string; kind: string }> } };
        spin.stop();

        if (options.typesOnly) {
          output.header('GraphQL Types');
          const types = schema.__schema.types
            .filter((t: { name: string }) => !t.name.startsWith('__'))
            .map((t: { name: string; kind: string }) => [t.name, t.kind]);
          output.printTable(['Type', 'Kind'], types);
        } else {
          output.header('GraphQL Schema');
          output.printJson(schema);
        }
      } catch (err) {
        spin.stop();
        output.error(`Schema fetch failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Get query types
  graphql
    .command('types')
    .description('List available query types')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching query types...');
      spin.start();

      try {
        const types = await client.graphql.getQueryTypes();
        spin.stop();

        output.header(`Query Types (${types.length})`);
        for (const type of types) {
          console.log(`  - ${type}`);
        }
      } catch (err) {
        spin.stop();
        output.error(`Type fetch failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Echo via GraphQL
  graphql
    .command('echo [path]')
    .description('Echo request through GraphQL endpoint')
    .action(async (path = '/') => {
      const client = getClient();
      const spin = output.spinner('Echoing via GraphQL...');
      spin.start();

      try {
        const result = await client.graphql.echo(path);
        spin.stop();
        output.header('GraphQL Echo');
        output.printJson(result);
      } catch (err) {
        spin.stop();
        output.error(`GraphQL echo failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Interactive query builder shortcut
  graphql
    .command('introspect')
    .description('Run full introspection query')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Running introspection...');
      spin.start();

      try {
        const schema = await client.graphql.getSchema();
        spin.stop();
        output.printJson(schema);
      } catch (err) {
        spin.stop();
        output.error(`Introspection failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
