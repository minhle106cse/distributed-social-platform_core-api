import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import {
  NotAQuestionError,
  NotAnAnswerError,
  AnswerNotForQuestionError,
  AcceptAnswerForbiddenError,
} from '@/common/errors/engagement.error'
import { AcceptAnswerCommand } from './accept-answer.command'

@Injectable()
@CommandHandler(AcceptAnswerCommand)
export class AcceptAnswerHandler implements ITransactionalCommandHandler<
  AcceptAnswerCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: AcceptAnswerCommand, tx: CoreApiRepos): Promise<void> {
    const question = await tx.items.findById(command.questionId)
    if (!question) throw new KnowledgeItemNotFoundError()
    if (question.type !== 'QUESTION') throw new NotAQuestionError()
    if (question.createdByUserId !== command.actorUserId) throw new AcceptAnswerForbiddenError()

    const answer = await tx.items.findById(command.answerId)
    if (!answer) throw new KnowledgeItemNotFoundError()
    if (answer.type !== 'ANSWER') throw new NotAnAnswerError()
    if (answer.parentId !== question.id) throw new AnswerNotForQuestionError()

    question.acceptAnswer(answer.id)
    await tx.items.update(question)
  }
}
