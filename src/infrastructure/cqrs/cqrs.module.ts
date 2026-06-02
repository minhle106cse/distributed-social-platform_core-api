import { Global, Module, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { CommandBusService } from '../../common/cqrs/command-bus.service';
import { QueryBusService } from '../../common/cqrs/query-bus.service';
import { EventBusService } from '../../common/cqrs/event-bus.service';
import { LoggingMiddleware } from '../../common/cqrs/middlewares/logging.middleware';
import { RetryMiddleware } from '../../common/cqrs/middlewares/retry.middleware';
import { TransactionMiddleware } from '../../common/cqrs/middlewares/transaction.middleware';
import { COMMAND_HANDLER_METADATA, QUERY_HANDLER_METADATA, EVENT_HANDLER_METADATA } from '../../common/cqrs/constants';
import { TRANSACTION_MANAGER, type ITransactionManager } from '../../common/database/transaction-manager.interface';
import { isPrismaTransientError } from '../database/prisma/prisma-transient-error';

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    {
      provide: CommandBusService,
      useValue: new CommandBusService(),
    },
    {
      provide: QueryBusService,
      useValue: new QueryBusService(),
    },
    {
      provide: EventBusService,
      useValue: new EventBusService(),
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
      useFactory: (transactionManager: ITransactionManager, logger: PinoLogger) => new TransactionMiddleware(transactionManager, logger),
      inject: [TRANSACTION_MANAGER, PinoLogger],
    },
    {
      provide: 'ILogger',
      useExisting: PinoLogger,
    },
  ],
  exports: [CommandBusService, QueryBusService, EventBusService],
})
export class CqrsModule implements OnApplicationBootstrap {
  constructor(
    private readonly commandBus: CommandBusService,
    private readonly queryBus: QueryBusService,
    private readonly eventBus: EventBusService,
    private readonly loggingMiddleware: LoggingMiddleware,
    private readonly retryMiddleware: RetryMiddleware,
    private readonly transactionMiddleware: TransactionMiddleware,
    private readonly discoveryService: DiscoveryService,
  ) { }

  onApplicationBootstrap() {
    // 1. Setup middlewares for CommandBus
    this.commandBus.use(this.loggingMiddleware, this.retryMiddleware, this.transactionMiddleware);

    // 2. Auto-discover handlers
    const providers = this.discoveryService.getProviders();

    providers
      .filter((wrapper) => wrapper.instance && !wrapper.isNotMetatype)
      .forEach((wrapper) => {
        const { instance, metatype } = wrapper;

        if (metatype) {
          // Register Command Handlers
          const command = Reflect.getMetadata(COMMAND_HANDLER_METADATA, metatype);
          if (command) {
            this.commandBus.register(command.name, instance as any);
          }

          // Register Query Handlers
          const query = Reflect.getMetadata(QUERY_HANDLER_METADATA, metatype);
          if (query) {
            this.queryBus.register(query.name, instance as any);
          }

          // Register Event Handlers
          const event = Reflect.getMetadata(EVENT_HANDLER_METADATA, metatype);
          if (event) {
            this.eventBus.register(event.name, instance as any);
          }
        }
      });
  }
}
