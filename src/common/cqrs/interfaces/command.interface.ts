export interface CommandOptions {
  transactional?: boolean;
  retryable?: boolean;
}

export interface ICommand {
  readonly name: string;
  readonly options?: CommandOptions;
}
