import { pool } from './pool';

describe('pool', () => {
  it('should work', () => {
    expect(pool()).toEqual('pool');
  });
});
