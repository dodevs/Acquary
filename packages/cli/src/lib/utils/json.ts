import * as fs from 'fs';
import { Result } from 'neverthrow';
import { safeReadFileSync } from './safe-wrappers';

export type KeyValue<T> = {[key: string]: T};

export function loadJson<T = KeyValue<unknown>>(filePath: string): Result<T, Error> {
  const safeParseJson = Result.fromThrowable(
    JSON.parse,
    e => new Error(`Error parsing JSON from file ${filePath}: ${e}`)
  );
  return safeReadFileSync(filePath)
    .andThen(json => safeParseJson(json as string))
    .map(json => Object.assign({}, json));
}

export function loadJsonAsync<T = KeyValue<unknown>>(filePath: string): Promise<T> {
  return fs.promises.readFile(filePath, "utf8").then(json => Object.assign({}, JSON.parse(json)));
}

export function saveJson<T = KeyValue<unknown>>(filePath: string, data: T): Result<void, Error> {
  const safeWriteFileSync = Result.fromThrowable(
    fs.writeFileSync,
    e => new Error(`Error writing file ${filePath}: ${e}`)
  );
  return safeWriteFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function saveJsonAsync<T = KeyValue<unknown>>(filePath: string, data: T): Promise<void> {
  return fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}
