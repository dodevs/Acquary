import { Command, Option } from 'commander';
import { readFileSync } from 'fs';
import { Output } from '../utils/output';
import { ClientsConfig, execute } from './execute';
import { checkIfEnvExists } from '../utils/env';
import * as process from 'process';
import * as path from 'path';
import { loadJson } from '../utils/json';
import { ExecutionScript } from '@acquary/core';
import { ClientsConfig } from 'shared/types';
import { AcquaryEnv, AcquaryRcOptions, CliOptions } from '../model';
import { safeExistsSync, safeReadFileSync } from '../utils/safe-wrappers';
import { ok } from 'neverthrow';

export const ExecuteCommand = () => {
  const command = new Command();
  command
    .name('execute')
    .description('Execute a script or query')
    .requiredOption('--e, --env <env>', 'Environment to run')
    .requiredOption('--c, --clients <clients>', 'Clients file config')
    .addOption(
      new Option('--q, --query <query>', 'SQL Query to execute')
        .conflicts(['script', 'file'])
    )
    .addOption(
      new Option('--f <file>, --file <file>', 'SQL file to execute')
        .conflicts(['script', 'query'])
    )
    .addOption(
      new Option('--s, --script <script>', 'Name of script to execute')
        .conflicts(['file', 'query'])
    )
    .addOption(
      new Option('--o, --output <output>', 'Output format of exported data')
        .choices(['json', 'xls', 'stdout'])
        .default('json')
    )
    .option('--empty', 'Include empty results', false)
    .option('--unique', 'All results in one sheet', true)
    .addOption(
      new Option('--mc, --maxConcurrent <maxConcurrent>', 'Max concurrent clients')
        .default(Infinity)
    )
    .addOption(
      new Option('--mr, --maxRetries <maxRetries>', 'Max retries after error')
        .default(0)
    )
    .action(async options => {
      const {
        script, file, clients, env, maxConcurrent, maxRetries
      } = options;
      let query = options.query;
      let scriptFunction: ExecutionScript | undefined;
      let clientsConfig: ClientsConfig | undefined;

      if (!checkIfEnvExists(env)) {
        console.error('Environment not found. Please, run "acquary configure --add <env>" to create a new environment.');
        process.exit(1);
      }

      if (clients) {
        loadJson<ClientsConfig>(clients)
          .match(
            (config) => clientsConfig = config,
            (err) => {
              console.error('Error parsing clients config file. Please, check the file and try again.', err);
              process.exit(1);
            }
          );
      }

      if (file) {
        const _file = safeReadFileSync(file);
        if (_file.isErr()) {
          console.error(_file.error);
          process.exit(1);
        }
        query = _file.value as string;
      }

      if (script) {
        const currentPath = process.cwd();
        const isBundle = process.env['NX_TARGET'] === 'bundle';
        const importPath = path.join(isBundle ? 'file://' : '', currentPath, script);
        const { default: scriptModule } = await import(importPath);
        scriptFunction = isBundle ? scriptModule.default : scriptModule;
      }

      Output.format = options.output;
      Output.empty = options.empty;
      Output.unique = options.unique;

      const result = await execute({
        env, script: scriptFunction, query, clients: clientsConfig, maxConcurrent, maxRetries
      });

      if (result.isErr()) {
        console.error(result.error);
        process.exit(1);
      }

      process.exit(0);
    });

  return command;
}
