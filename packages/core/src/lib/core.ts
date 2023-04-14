import { Pool } from '@acquary/pool';
import { errAsync, Result, ResultAsync } from 'neverthrow';
import { ConnectionPool, Request, Transaction } from 'mssql';
import { Parser } from 'node-sql-parser/build/transactsql';
import { ErrorTypeEnum, Execution, ExecutionError, ExecutionResult, ExecutionScript } from './types';

function connection(pool: Pool, client: string): ResultAsync<ConnectionPool, Error> {
  return pool.connect({ database: client });
}

function runScript(connection: ConnectionPool, script: ExecutionScript, client: string): ResultAsync<ExecutionResult, Error> {
  const transaction = new Transaction(connection);

  const asyncExecute = async () => {
    await transaction.begin();
    const result = await script(transaction, client);
    await transaction.commit();
    return result;
  }

  return ResultAsync.fromPromise(
    asyncExecute(),
    (error) => new Error(`Error executing script on client ${client}: ${error}`)
  )
    .map((data) => ({ client, data }))
    .mapErr((error) => transaction.rollback().then(() => error));
}



export default function(pool: Pool, maxRetries: number = 1) {

  return {
    execute: (options: Execution): ResultAsync<void, ExecutionError[]> => {
      let executor: ExecutionScript;
      if (options.script) {
        executor = options.script;
      } else if (options.query) {
        const parser = new Parser();
        const allowed = ['(select|insert|declare)'];
        const safeCheck = Result.fromThrowable(parser.whiteListCheck.bind(parser));
        const checked = safeCheck(options.query, allowed);
        if (checked.isErr()) {
          return errAsync([{
            type: ErrorTypeEnum.system,
            error: checked.error as Error
          }]);
        }
        executor = async (transaction) => {
          const request = new Request(transaction);
          const result = await request.query(<string>options.query);
          return result.recordset;
        }
      } else {
        return errAsync([{
          type: ErrorTypeEnum.system,
          error: new Error('No query or script provided')
        }]);
      }

      function executeAndRetry(
        pool: Pool,
        clients: string[],
        script: ExecutionScript,
        callback: (result: ExecutionResult) => void,
        retryCount: number,
      ): ResultAsync<void[], ExecutionError[]> {
        return ResultAsync.combineWithAllErrors(
          clients.map(client => {
            return connection(pool, client)
              .andThen((connection => runScript(connection, script, client)))
              .map((result) => {
                callback(result);
              })
              .mapErr((error) => ({
                type: ErrorTypeEnum.client,
                client,
                error
              } as ExecutionError));
          })
        ).orElse((errors) => {
          if (retryCount <= maxRetries) {
            const clients = errors.map(error => <string>error.client);
            return executeAndRetry(pool, clients, script, callback, retryCount + 1);
          }
          return errAsync<void[], ExecutionError[]>(errors);
        })
        .mapErr((errors) => errors as ExecutionError[])
      }

      return executeAndRetry(pool, options.clients, executor, options.callback || (() => {}), 1)
        .map(() => undefined);

    }
  }
}
