import { config, ConnectionPool } from 'mssql';
import { err, ok, Result, ResultAsync } from 'neverthrow';

const POOL: Record<string, Promise<ConnectionPool>> = {};

export function Get(name: string, config: config): Result<Promise<ConnectionPool>, Error> {
  if (!POOL[name]) {
    if (!config)
      return err(new Error('No config provided'));

    const pool = new ConnectionPool(config);
    const close = pool.close.bind(pool);

    pool.close = async () => {
      delete POOL[name];
      await close();
    }

    pool.on('error', (error) => {
      return err(new Error(error.message));
    });

    POOL[name] = pool.connect();
  }

  return ok(POOL[name]);
}

export function Close(name: string): ResultAsync<void, Error> {
  return ResultAsync.fromPromise(POOL[name].then(pool => pool.close()), (error: any) => new Error(error.message));
}

export function CloseAll(): ResultAsync<void[], Error[]> {
  const asyncResults = Object.keys(POOL).map(name => Close(name))
  return ResultAsync.combineWithAllErrors(asyncResults);
}
