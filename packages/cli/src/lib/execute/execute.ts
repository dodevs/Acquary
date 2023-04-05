import { Presets, SingleBar } from 'cli-progress';
import { getEnvAndSetToken } from '../utils/env';
import { err, Result, ResultAsync } from 'neverthrow';
import Acquary, { ErrorTypeEnum, ExecutionError, ExecutionScript } from '@acquary/core';
import { CreatePool } from '@acquary/pool';
import { Output } from '../utils/output';

export interface ClientsConfig {
  type: 'list' | 'query';
  list?: string[];
  query?: string;
  database?: string;
}

export interface ExecuteParams {
  env: string;
  script?: ExecutionScript;
  query?: string;
  clients?: ClientsConfig
  maxConcurrent: number;
  maxRetries: number;
}

function *clientsGenerator(databases: string[] , maxConcurrent: number) {
  const databases_result_chunks = Array.from(
    {length: Math.ceil(databases.length / maxConcurrent)},
    (_, i) => databases.slice(i * maxConcurrent, (i + 1) * maxConcurrent)
  );

  for (const databases_result_chunk of databases_result_chunks) {
    yield databases_result_chunk;
  }
}

export async function execute(params: ExecuteParams): Promise<Result<void, ExecutionError[]>> {
  const singleBar = new SingleBar({
    format: `{bar} {percentage}% | {value}/{total}`,
  }, Presets.shades_classic);

  const config = await getEnvAndSetToken(params.env);
  if(config.isErr()) {
    return err([{
      type: ErrorTypeEnum.system,
      error: config.error
    } as ExecutionError])
  }

  const pool = CreatePool(config.value.azure_server);
  let databases: string[] = [];

  if(params.clients?.type === 'list' && params.clients?.list) {
    databases = params.clients.list;
  } else if (params.clients?.type === 'query' && params.clients?.query) {
    const conn = await pool.connect({database: params.clients?.database});
    if (conn.isErr()) {
      return err([{
        type: ErrorTypeEnum.system,
        error: conn.error
      } as ExecutionError]);
    }

    const safeQuery = await ResultAsync.fromPromise(
      conn.value.request().query<{ Database: string }>(params.clients?.query),
      e => [{
        type: ErrorTypeEnum.system,
        error: new Error(`Error getting databases: ${e}`)
      }]
    );

    if (safeQuery.isErr()) {
      return err(safeQuery.error);
    }

    databases = safeQuery.value.recordset.map(r => r.Database);
  } else {
    return err([{
      type: ErrorTypeEnum.system,
      error: new Error('You must provide a list of clients or a query to get clients.')
    } as ExecutionError]);
  }

  singleBar.start(databases.length, 0);

  const generator = clientsGenerator(databases, params.maxConcurrent === Infinity ? databases.length : params.maxConcurrent);
  const acquary = Acquary(pool, params.maxRetries);

  const allClientsResults = await ResultAsync.combineWithAllErrors(
    Array.from(generator).map(clients => {
      return acquary.execute({
        clients, query: params.query, script: params.script, callback: result => {
          singleBar.increment();
          Output.add(result.data, result.client);
        }
      });
    })
  ).map(() => {}).mapErr(errors => errors.flat());

  singleBar.stop();
  Output.save();

  return allClientsResults;
}
