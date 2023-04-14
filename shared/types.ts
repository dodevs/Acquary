export type KeyValue<T> = { [key: string]: T };

export interface ClientsConfig {
  type: 'list' | 'query';
  list?: string[];
  query?: string;
  database?: string;
}
