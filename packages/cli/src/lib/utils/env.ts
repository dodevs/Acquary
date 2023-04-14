import { homedir } from 'os';
import { mkdirSync, rmdirSync, unlinkSync } from 'fs';
import * as path from 'path';
import { err, errAsync, ok, Result, ResultAsync } from 'neverthrow';
import { CreatePool } from '@acquary/pool';
import { loadJson, saveJson } from './json';
import { GetToken } from './azure';
import { AcquaryConfig, AcquaryEnv } from '../model';
import { safeExistsSync, safeMkdirSync } from './safe-wrappers';

const configPath = path.join(homedir(), '.acquary');
const configFilePath = path.join(configPath, 'config.json');

const setTokenIfNecessary = (config: AcquaryEnv, env: string) => new Promise<AcquaryEnv>((resolve, reject) => {
  if (config.server.authentication?.type === 'azure-active-directory-access-token') {
    GetToken(config?.auth, env).then(token => {
      if (!token) {
        reject(new Error('Unable to get access token.'));
      }
      config.server.authentication!.options.token = token;
      resolve(config);
    });
  } else {
    resolve(config);
  }
});

export function configureIfNotExists(): Result<void, Error> {
  return safeExistsSync(configPath)
    .andThen(exists => {
      if (exists) {
        return ok(undefined);
      }
      return safeMkdirSync(configPath)
        .andThen(() => saveJson(configFilePath, { envs: [] }));
    });
}

export function checkIfEnvExists(env: string): Result<boolean, Error> {

  const exists = safeExistsSync(configFilePath);
  if (exists.isErr()) {
    return exists;
  }
  if(exists.isOk() && !exists.value) {
    return ok(false);
  }

  const envsResult = loadJson<AcquaryConfig>(configFilePath).map(config => config.envs);
  if(envsResult.isErr()) {
    return err(new Error(`Unable to load config file: ${envsResult.error.message}`));
  }

  const envs = envsResult.value;
  if(!envs.includes(env)) {
    return ok(false);
  }

  return ok(true);
}

export function getEnvDir(env: string) {
  return path.join(configPath, env);
}
export function getEnv(env: string) {
  return loadJson<AcquaryEnv>(path.join(getEnvDir(env), 'config.json'));
}

export function getEnvAndSetToken(env: string) {
  return loadJson<AcquaryEnv>(path.join(getEnvDir(env), 'config.json'))
    .asyncAndThen(config => ResultAsync.fromPromise(
        setTokenIfNecessary(config, env),
        error => error as Error
      )
    );
}

export function getEnvs(): Result<string[], Error> {
  return loadJson<AcquaryConfig>(configFilePath).map(config => config.envs);
}

export function addEnv(env: string): Result<void, Error> {
  const checks = configureIfNotExists()
    .andThen(() => checkIfEnvExists(env));
  if(checks.isErr()) {
    return err(checks.error);
  }
  if(checks.value) {
    return err(new Error('Environment already exists.'));
  }
  const envsResult = getEnvs();
  if(envsResult.isErr()) {
    return err(envsResult.error);
  }
  const envs = envsResult.value;
  envs.push(env);
  const saveResult = saveJson(configFilePath, {envs});
  if(saveResult.isErr()) {
    return err(saveResult.error);
  }
  try {
    mkdirSync(path.join(configPath, env));
  } catch (e) {
    return err(new Error(`Unable to create env directory: ${e}`));
  }

  const defaultEnv = {
    server: {
      server: 'your server url',
      options: {
        encrypt: true,
        trustedConnection: true,
        trustServerCertificate: false
      },
      authentication: {
        type: 'azure-active-directory-access-token',
        options: {
          token: 'will be filled by acquary'
        }
      },
      requestTimeout: 300000,
    },
    auth: {
      clientId: "a94f9c62-97fe-4d19-b06d-472bed8d2bcf",
      clientSecret: "0f9fd424-9f0e-42ab-b080-b9fddbbae217",
      authority: `https://login.microsoftonline.com/your-tenant-id`,
    }
  } as AcquaryEnv

  return saveJson(path.join(getEnvDir(env), 'config.json'), defaultEnv);
}

export function removeEnv(env: string): Result<undefined, Error>{
  const checkResult = checkIfEnvExists(env);
  if(checkResult.isErr()) {
    return err(checkResult.error);
  }
  if (!checkResult.value) {
    return err(new Error('Environment not exists.'));
  }

  const envs = getEnvs();
  if(envs.isErr()) {
    return err(envs.error);
  }
  const index = envs.value.indexOf(env);
  envs.value.splice(index, 1);
  const saveResult = saveJson(configFilePath, {envs: envs.value});
  if(saveResult.isErr()) {
    return err(saveResult.error);
  }
  try {
    rmdirSync(getEnvDir(env), {});
    return ok(undefined);
  } catch (e) {
    return err(new Error(`Unable to remove env directory: ${e}`));
  }
}

export function testEnv(env: string): ResultAsync<void, Error> {
  const check = checkIfEnvExists(env);
  if(check.isErr()) {
    return errAsync(check.error);
  }

  if(!check.value) {
    return errAsync(new Error('Environment not exists.'));
  }

  return getEnvAndSetToken(env).andThen(config => {
    const pool = CreatePool(config.server);
    return pool.connect({database: 'master'}).map(conn => {
      return conn.close();
    });
  })
}

export function loggoutEnv(env: string): Result<undefined, Error> {
  const envConfig = getEnv(env);
  if (envConfig.isErr()) {
    return err(envConfig.error);
  }
  if (envConfig.value.server.authentication?.type === 'azure-active-directory-access-token') {
    envConfig.value.server.authentication.options.token = '';
    const saveResult = saveJson(path.join(getEnvDir(env), 'config.json'), envConfig);
    if(saveResult.isErr()) {
      return err(saveResult.error);
    }
    try {
      unlinkSync(path.join(getEnvDir(env), 'cache.json'));
      return ok(undefined);
    } catch (e) {
      return err(new Error(`Unable to remove cache file: ${e}`));
    }
  } else {
    return err(new Error('This environment not use azure authentication'));
  }
}
