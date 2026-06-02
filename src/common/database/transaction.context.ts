import { AsyncLocalStorage } from 'async_hooks';

const transactionContext = new AsyncLocalStorage<unknown>();

export function getTx<T = unknown>(): T | undefined {
  return transactionContext.getStore() as T | undefined;
}

export function runInTransaction<R>(tx: unknown, callback: () => Promise<R>): Promise<R> {
  return transactionContext.run(tx, callback);
}
