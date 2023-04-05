import {Command, Option} from 'commander';
import { addEnv, configureIfNotExists, getEnvs, loggoutEnv, removeEnv, testEnv } from '../utils/env';

export const ConfigureCommand = () => {
  const optionsExcept = (except: string) => ['add', 'remove', 'list', 'test', 'logout'].filter(option => option !== except);

  const command = new Command();
  command
    .name('configure')
    .description('Configure the CLI envs')
    .addOption(
      new Option('--add <env>', 'Create a new env')
        .conflicts(optionsExcept('add'))
    )
    .addOption(
      new Option('--remove <env>', 'Remove an env')
        .conflicts(optionsExcept('remove'))
    )
    .addOption(
      new Option('--list', 'List all envs')
        .conflicts(optionsExcept('list'))
    )
    .addOption(
      new Option('--test <env>', 'Test an env')
        .conflicts(optionsExcept('test'))
    )
    .addOption(
      new Option('--logout <env>', 'Logout an env')
        .conflicts(optionsExcept('logout'))
    )
    .action(async (options) => {
      const {
        add, remove, list, test, logout
      } = options;

      if (add) {
        addEnv(add).match(
          () => console.log(`Env ${add} added`),
          (error) => console.error(error)
        )
      }

      if (list) {
        const envs =  configureIfNotExists().andThen(() => getEnvs());
        if (envs.isErr()) {
          console.error(envs.error);
          return;
        }

        if (envs.value.length === 0) {
          console.log('No envs found');
          return;
        }
        envs.value.forEach(env => {
          console.log(env)
        })
      }

      if (remove) {
        removeEnv(remove).match(
          () => console.log(`Env ${remove} removed`),
          (error) => console.error(error)
        );
      }

      if (test) {
        const result = await testEnv(test);
        result.match(
          () => console.log(`Env ${test} is ok`),
          (error) => console.error(error)
        );
      }

      if (logout) {
        loggoutEnv(logout).match(
          () => console.log(`Env ${logout} logged out`),
          (error) => console.error(error)
        );
      }
    });

  return command;
}
