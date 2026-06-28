import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { KNOWLEDGE_ITEM_REPOSITORY } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
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
export class AcceptAnswerHandler implements ICommandHandler<AcceptAnswerCommand, void> {
  constructor(
    @Inject(KNOWLEDGE_ITEM_REPOSITORY) private readonly itemRepo: IKnowledgeItemRepository,
  ) {}

  async execute(command: AcceptAnswerCommand): Promise<void> {
    const question = await this.itemRepo.findById(command.questionId)
    if (!question) throw new KnowledgeItemNotFoundError()
    if (question.type !== 'QUESTION') throw new NotAQuestionError()
    if (question.createdByUserId !== command.actorUserId) throw new AcceptAnswerForbiddenError()

    const answer = await this.itemRepo.findById(command.answerId)
    if (!answer) throw new KnowledgeItemNotFoundError()
    if (answer.type !== 'ANSWER') throw new NotAnAnswerError()
    if (answer.parentId !== question.id) throw new AnswerNotForQuestionError()

    question.acceptAnswer(answer.id)
    await this.itemRepo.update(question)
  }
}
