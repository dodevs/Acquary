import { Result } from 'neverthrow';
import { existsSync, mkdirSync, readFileSync } from 'fs';

export function safeExistsSync(filePath: string) {
  const safeExistsSync = Result.fromThrowable(existsSync, e => new Error(`Error checking if file exists ${filePath}: ${e}`));
  return safeExistsSync(filePath);
}

export function safeMkdirSync(dirPath: string) {
  const safeMkdirSync = Result.fromThrowable(mkdirSync, e => new Error(`Error creating directory ${dirPath}: ${e}`));
  return safeMkdirSync(dirPath);
}

export function safeReadFileSync(filePath: string) {
  return Result.fromThrowable(
    readFileSync,
    e => new Error(`Error reading file ${filePath}: ${e}`)
  )(filePath, "utf8");
}
