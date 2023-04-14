import { NodeAuthOptions } from '@azure/msal-node';
import { SQL } from "@acquary/pool";

export interface ClientsConfig {
  type: 'list' | 'query';
  list?: string[];
  query?: string;
  database?: string;
}

export interface AcquaryConfig {
  envs: string[];
}

export interface AcquaryEnv {
  server: SQL.config,
  auth: NodeAuthOptions,
  clients: ClientsConfig
}

export interface CliOptions {
  env: string;
  clients?: string;
  script?: string
  query?: string;
  file?: string;
  output?: "json" | "xls" | "stdout";
  empty?: boolean;
  unique?: boolean;
  maxConcurrent?: number;
  maxRetries?: number;
}

export type AcquaryRcOptions = {
  [key: string]: Omit<CliOptions, "clients"> & {
    clients: ClientsConfig;
  }
}
