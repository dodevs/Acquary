import { errAsync, ResultAsync } from 'neverthrow';
import { config, ConnectionPool } from 'mssql';
import { Get } from './manager';

export type Pool = {
  connect: (config: Partial<config>) => ResultAsync<ConnectionPool, Error>
}

export function CreatePool(baseConfig: config): Pool {
  return {
    connect: (config: Partial<config>) => {
      const connection = Get(config.database as string, { ...baseConfig, ...config });
      if (connection.isErr()) {
        return errAsync(connection.error);
      }
      return ResultAsync.fromPromise(
        connection.value,
        (error) =>
          new Error(`Error connecting to database ${config.database}: ${error}`)
      );
    }
  }
}
