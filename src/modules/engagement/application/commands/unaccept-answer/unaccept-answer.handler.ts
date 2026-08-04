import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { NotAQuestionError, AcceptAnswerForbiddenError } from '@/common/errors/engagement.error'
import { UnacceptAnswerCommand } from './unaccept-answer.command'

@Injectable()
@CommandHandler(UnacceptAnswerCommand)
export class UnacceptAnswerHandler implements ITransactionalCommandHandler<
  UnacceptAnswerCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: UnacceptAnswerCommand, tx: CoreApiRepos): Promise<void> {
    const question = await tx.items.findById(command.questionId)
    if (!question) throw new KnowledgeItemNotFoundError()
    if (question.type !== 'QUESTION') throw new NotAQuestionError()
    if (question.createdByUserId !== command.actorUserId) throw new AcceptAnswerForbiddenError()

    question.clearAcceptedAnswer()
    await tx.items.update(question)
  }
}
