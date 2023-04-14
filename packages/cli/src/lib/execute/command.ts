import { Command, Option } from 'commander';
import { Output } from '../utils/output';
import { execute } from './execute';
import { checkIfEnvExists, getEnvAndSetToken } from '../utils/env';
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
    .option('--c, --clients <clients>', 'Clients file config')
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
    )
    .option('--empty', 'Include empty results')
    .option('--unique', 'All results in one sheet')
    .addOption(
      new Option('--mc, --maxConcurrent <maxConcurrent>', 'Max concurrent clients')
    )
    .addOption(
      new Option('--mr, --maxRetries <maxRetries>', 'Max retries after error')
    )
    .action(async (options: CliOptions) => {
      let {
        env,
        script,
        query,
        file,
        clients,
        output,
        empty,
        unique,
        maxConcurrent,
        maxRetries
      } = options;

      let scriptFunction: ExecutionScript | undefined;
      let clientsConfig: ClientsConfig | undefined;

      const envExists = checkIfEnvExists(env);
      if (envExists.isErr()) {
        console.error(envExists.error);
        process.exit(1);
      }
      if (envExists.isOk() && !envExists.value) {
        console.warn('Environment not found. Please, run "acquary configure --add <env>" to create a new environment.');
        process.exit(1);
      }

      let envConfig!: AcquaryEnv;
      const config = await getEnvAndSetToken(env);
      if (config.isErr()) {
        console.error(config.error);
        process.exit(1);
      } else {
        envConfig = config.value;
      }

      let envRc!: AcquaryRcOptions[string];
      const rc = safeExistsSync('.acquaryrc')
        .andThen(exists => exists
          ? loadJson<AcquaryRcOptions>('.acquaryrc')
          : ok(undefined)
        );
      if (rc.isErr()) {
        console.error(rc.error);
        process.exit(1);
      }
      if (rc.isOk() && rc.value) {
        envRc = rc.value[env];
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
      } else {
        if (envRc?.clients) {
          clientsConfig = envRc.clients;
        }

        if (envConfig && envConfig.clients) {
          clientsConfig = envConfig.clients;
        }
      }

      file = file ?? envRc?.file;
      if (file) {
        const _file = safeReadFileSync(file);
        if (_file.isErr()) {
          console.error(_file.error);
          process.exit(1);
        }
        query = _file.value as string;
      }

      script = script ?? envRc?.script;
      if (script) {
        const currentPath = process.cwd();
        const isBundle = process.env['NX_TARGET'] === 'bundle';
        const importPath = path.join(isBundle ? 'file://' : '', currentPath, script);
        const { default: scriptModule } = await import(importPath);
        scriptFunction = isBundle ? scriptModule.default : scriptModule;
      }

      Output.format = output ?? envRc?.output ?? 'json';
      Output.empty = empty ?? envRc?.empty ?? false;
      Output.unique = unique ?? envRc?.unique ?? true;

      maxConcurrent = maxConcurrent ?? envRc?.maxConcurrent ?? Infinity;
      maxRetries = maxRetries ?? envRc?.maxRetries ?? 0;

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
