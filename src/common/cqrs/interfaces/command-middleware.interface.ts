import { ICommand } from './command.interface';

export type NextFn<R = any> = () => Promise<R>;

export interface ICommandMiddleware {
  execute<T extends ICommand, R = any>(command: T, next: NextFn<R>): Promise<R>;
}
