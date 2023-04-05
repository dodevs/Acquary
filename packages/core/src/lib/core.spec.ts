import { describe, expect, it, vitest } from 'vitest';
import Acquary from './core';
import { CreatePool } from '@acquary/pool';
import { ExecutionScript } from './types';

function mockQuery() {
  return vitest.fn().mockResolvedValue({
    recordset: [0],
    recordsets: [0, 0],
  })
}

function mockRequest() {
  return vitest.fn().mockImplementation(() => ({
    query: mockQuery()
  }));
}
function mockTransaction() {
  return vitest.fn().mockImplementation(() => ({
    begin: vitest.fn(),
    commit: vitest.fn(),
    rollback: vitest.fn()
  }));
}
function mockConnect() {
  return vitest.fn().mockResolvedValue({
    transaction: mockTransaction()
  });
}
function mockConnectionPool() {
  return vitest.fn().mockImplementation(() => ({
    request: mockRequest(),
    connect: mockConnect(),
    close: vitest.fn(),
    on: vitest.fn()
  }));
}

vitest.mock('mssql', () => ({
  ConnectionPool: mockConnectionPool(),
  Request: mockRequest(),
  Transaction: mockTransaction()
}));

const CLIENTS = ['client1', 'client2'];

const script: ExecutionScript = async (request, client) => {
  return [{client}]
}

describe('Acquary', () => {
  it('should execute a script on multiple clients', async () => {
    const pool = CreatePool({ server: 'test' });
    const acquary = Acquary(pool);
    await acquary.execute({
      clients: CLIENTS, script, callback: (result) => {
        const { client, data } = result;
        expect(data).toEqual([{ client }]);
      }
    })
  });

  it('should execute a query on multiple clients', async () => {
    const pool = CreatePool({ server: 'test' });
    const acquary = Acquary(pool);
    await acquary.execute({
      clients: CLIENTS, query: 'select 1', callback: (result) => {
        const { client, data } = result;
        expect(data).toEqual([{ client }]);
      }
    })
  });
});
