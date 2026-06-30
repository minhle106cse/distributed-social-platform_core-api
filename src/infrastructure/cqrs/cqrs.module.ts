import { Global, Module, OnApplicationBootstrap } from '@nestjs/common'
import { DiscoveryModule, DiscoveryService } from '@nestjs/core'
import { PinoLogger } from 'nestjs-pino'
import {
  CommandBus,
  QueryBus,
  EventBus,
  LoggingMiddleware,
  RetryMiddleware,
  TransactionMiddleware,
  COMMAND_HANDLER_METADATA,
  QUERY_HANDLER_METADATA,
  EVENT_HANDLER_METADATA,
  type ICommandHandler,
  type IQueryHandler,
  type IEventHandler,
  TRANSACTION_MANAGER,
  type ITransactionManager,
} from '@distributed-social-platform/shared-kernel'
import { isPrismaTransientError } from '../database/prisma/prisma-transient-error'

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    {
      provide: CommandBus,
      useValue: new CommandBus(),
    },
    {
      provide: QueryBus,
      useFactory: (logger: PinoLogger) => new QueryBus(logger),
      inject: [PinoLogger],
    },
    {
      provide: EventBus,
      useFactory: (logger: PinoLogger) => new EventBus(logger),
      inject: [PinoLogger],
    },
    {
      provide: LoggingMiddleware,
      useFactory: (logger: PinoLogger) => new LoggingMiddleware(logger),
      inject: [PinoLogger],
    },
    {
      provide: RetryMiddleware,
      useFactory: (logger: PinoLogger) => new RetryMiddleware(logger, isPrismaTransientError),
      inject: [PinoLogger],
    },
    {
      provide: TransactionMiddleware,
      useFactory: (transactionManager: ITransactionManager, logger: PinoLogger) =>
        new TransactionMiddleware(transactionManager, logger),
      inject: [TRANSACTION_MANAGER, PinoLogger],
    },
  ],
  exports: [CommandBus, QueryBus, EventBus],
})
export class CqrsModule implements OnApplicationBootstrap {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
    private readonly loggingMiddleware: LoggingMiddleware,
    private readonly retryMiddleware: RetryMiddleware,
    private readonly transactionMiddleware: TransactionMiddleware,
    private readonly discoveryService: DiscoveryService,
  ) {}

  onApplicationBootstrap() {
    // 1. Setup middlewares for CommandBus
    this.commandBus.use(this.loggingMiddleware, this.retryMiddleware, this.transactionMiddleware)

    // 2. Auto-discover handlers
    const providers = this.discoveryService.getProviders()

    providers
      .filter((wrapper) => wrapper.instance && !wrapper.isNotMetatype)
      .forEach((wrapper) => {
        const instance = wrapper.instance as object
        const metatype = wrapper.metatype as (new (...args: unknown[]) => unknown) | undefined

        if (metatype) {
          // Register Command Handlers
          const command = Reflect.getMetadata(COMMAND_HANDLER_METADATA, metatype) as
            | { name: string }
            | undefined
          if (command) {
            this.commandBus.register(command.name, instance as ICommandHandler)
          }

          // Register Query Handlers
          const query = Reflect.getMetadata(QUERY_HANDLER_METADATA, metatype) as
            | { name: string }
            | undefined
          if (query) {
            this.queryBus.register(query.name, instance as IQueryHandler)
          }

          // Register Event Handlers
          const event = Reflect.getMetadata(EVENT_HANDLER_METADATA, metatype) as
            | { name: string }
            | undefined
          if (event) {
            this.eventBus.register(event.name, instance as IEventHandler)
          }
        }
      })
  }
}
