/**
 * Identity Commands
 * JWKS, OIDC, tokens, JWT debugging
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import chalk from 'chalk';
import * as output from '../output.js';

export function registerIdentityCommands(program: Command, getClient: () => ApparatusClient): void {
  const identity = program
    .command('identity')
    .description('Identity - JWKS, OIDC, tokens, JWT');

  identity
    .command('jwks')
    .description('Get JSON Web Key Set')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching JWKS...');
      spin.start();

      try {
        const result = await client.identity.jwks();
        spin.stop();

        output.header(`JWKS (${result.keys.length} keys)`);
        for (const key of result.keys) {
          output.subheader(`\nKey: ${key.kid || 'unnamed'}`);
          output.printKeyValue({
            Type: key.kty,
            Use: key.use || 'unspecified',
            Algorithm: key.alg || 'unspecified',
          });
        }
      } catch (err) {
        spin.stop();
        output.error(`JWKS fetch failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  identity
    .command('oidc')
    .description('Get OpenID Connect configuration')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching OIDC config...');
      spin.start();

      try {
        const result = await client.identity.oidc();
        spin.stop();

        output.header('OpenID Connect Configuration');
        output.printKeyValue({
          Issuer: result.issuer,
          'Authorization Endpoint': result.authorization_endpoint,
          'Token Endpoint': result.token_endpoint,
          'JWKS URI': result.jwks_uri,
        });

        output.subheader('\nSupported:');
        output.printKeyValue({
          'Response Types': result.response_types_supported.join(', '),
          'Subject Types': result.subject_types_supported.join(', '),
          'ID Token Signing': result.id_token_signing_alg_values_supported.join(', '),
        });
      } catch (err) {
        spin.stop();
        output.error(`OIDC fetch failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  identity
    .command('token')
    .description('Mint a new token')
    .option('-s, --subject <sub>', 'Token subject')
    .option('-a, --audience <aud>', 'Token audience')
    .option('-e, --expires <time>', 'Expiration time (e.g., "1h", "30m")')
    .option('-c, --claims <json>', 'Additional claims as JSON')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Minting token...');
      spin.start();

      try {
        const result = await client.identity.mintToken({
          subject: options.subject,
          audience: options.audience,
          expiresIn: options.expires,
          claims: options.claims ? JSON.parse(options.claims) : undefined,
        });
        spin.stop();

        output.header('Token Minted');
        output.printKeyValue({
          'Token Type': result.token_type,
          'Expires In': `${result.expires_in}s`,
          Scope: result.scope || 'none',
        });

        output.subheader('\nAccess Token:');
        console.log(chalk.cyan(result.access_token));
      } catch (err) {
        spin.stop();
        output.error(`Token minting failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  identity
    .command('decode <token>')
    .alias('jwt')
    .description('Decode and validate a JWT token')
    .action(async (token) => {
      const client = getClient();
      const spin = output.spinner('Decoding token...');
      spin.start();

      try {
        const result = await client.identity.decodeJwt(token);
        spin.stop();

        output.header('JWT Decoded');
        output.printKeyValue({
          Valid: result.valid ? chalk.green('yes') : chalk.red('no'),
        });

        if (result.error) {
          output.error(`Validation error: ${result.error}`);
        }

        output.subheader('\nHeader:');
        output.printJson(result.header);

        output.subheader('\nPayload:');
        output.printJson(result.payload);
      } catch (err) {
        spin.stop();
        output.error(`Token decode failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  identity
    .command('validate <token>')
    .description('Validate a JWT token (returns exit code)')
    .action(async (token) => {
      const client = getClient();
      try {
        const valid = await client.identity.validateJwt(token);
        if (valid) {
          output.success('Token is valid');
        } else {
          output.error('Token is invalid');
          process.exit(1);
        }
      } catch (err) {
        output.error(`Validation failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
