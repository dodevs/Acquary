import { Transaction } from 'mssql';

export enum ErrorTypeEnum {
  client,
  system
}

export type ExecutionResult = {
  client: string;
  data: unknown[];
}

export type ExecutionError = {
  type: ErrorTypeEnum;
  client?: string;
  error: Error;
}

export type ExecutionScript<T =
  unknown[]> = (transaction: Transaction, client: string) => Promise<T>;

export type Execution = {
  clients: string[];
  query?: string;
  script?: ExecutionScript;
  callback?: (result: ExecutionResult) => void;
}
