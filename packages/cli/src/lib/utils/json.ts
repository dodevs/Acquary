import * as fs from 'fs';
import { Result } from 'neverthrow';

export type KeyValue<T> = {[key: string]: T};

export function loadJson<T = KeyValue<unknown>>(filePath: string): Result<T, Error> {
  const safeReadFileSync = Result.fromThrowable(
    fs.readFileSync,
    e => new Error(`Error reading file ${filePath}: ${e}`)
  );
  return safeReadFileSync(filePath, "utf8")
    .map(json => Object.assign({}, JSON.parse(json as string)));
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
