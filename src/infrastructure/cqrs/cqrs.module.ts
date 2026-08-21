import { Global, Module, OnApplicationBootstrap } from '@nestjs/common'
import { DiscoveryModule, DiscoveryService } from '@nestjs/core'
import { PinoLogger } from 'nestjs-pino'
import {
  CommandBus,
  QueryBus,
  EventBus,
  COMMAND_HANDLER_METADATA,
  QUERY_HANDLER_METADATA,
  EVENT_HANDLER_METADATA,
  TX_RUNNER,
  SAGA_COMPENSATION_STORE,
  type ICommandHandler,
  type IQueryHandler,
  type IEventHandler,
  type ITxRunner,
  type ISagaCompensationStore,
} from '@distributed-social-platform/shared-kernel'
import { transientError } from '../database/prisma/prisma-transient-error'
import type { CoreApiRepos } from '@/common/database/core-api-repos'

/**
 * The command pipeline (logging → retry → transaction) is no longer assembled
 * here: it lives inside CommandBus as a fixed sequence, so it cannot be wired in
 * the wrong order (ADR-0001 §2.3). This module only builds the buses and
 * auto-discovers handlers.
 */
@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    {
      provide: CommandBus,
      useFactory: (
        logger: PinoLogger,
        txRunner: ITxRunner<CoreApiRepos>,
        compensationStore: ISagaCompensationStore,
      ) => new CommandBus(logger, txRunner, transientError, undefined, compensationStore),
      inject: [PinoLogger, TX_RUNNER, SAGA_COMPENSATION_STORE],
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
  ],
  exports: [CommandBus, QueryBus, EventBus],
})
export class CqrsModule implements OnApplicationBootstrap {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
    private readonly discoveryService: DiscoveryService,
  ) {}

  /**
   * Runs AFTER every module's onModuleInit — discovers and registers every
   * command/query/event handler in the app.
   */
  onApplicationBootstrap() {
    const providers = this.discoveryService.getProviders()

    providers
      .filter((wrapper) => wrapper.instance && !wrapper.isNotMetatype)
      .forEach((wrapper) => {
        const instance = wrapper.instance as object
        const metatype = wrapper.metatype as (new (...args: unknown[]) => unknown) | undefined

        if (metatype) {
          // Register Command Handlers
          const command = Reflect.getMetadata(COMMAND_HANDLER_METADATA, metatype) as
            { name: string } | undefined
          if (command) {
            this.commandBus.register(command.name, instance as ICommandHandler)
          }

          // Register Query Handlers
          const query = Reflect.getMetadata(QUERY_HANDLER_METADATA, metatype) as
            { name: string } | undefined
          if (query) {
            this.queryBus.register(query.name, instance as IQueryHandler)
          }

          // Register Event Handlers
          const event = Reflect.getMetadata(EVENT_HANDLER_METADATA, metatype) as
            { name: string } | undefined
          if (event) {
            this.eventBus.register(event.name, instance as IEventHandler)
          }
        }
      })
  }
}
