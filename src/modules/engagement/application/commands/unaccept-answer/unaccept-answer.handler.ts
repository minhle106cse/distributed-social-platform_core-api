import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { KNOWLEDGE_ITEM_REPOSITORY } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { NotAQuestionError, AcceptAnswerForbiddenError } from '@/common/errors/engagement.error'
import { UnacceptAnswerCommand } from './unaccept-answer.command'

@Injectable()
@CommandHandler(UnacceptAnswerCommand)
export class UnacceptAnswerHandler implements ICommandHandler<UnacceptAnswerCommand, void> {
  constructor(
    @Inject(KNOWLEDGE_ITEM_REPOSITORY) private readonly itemRepo: IKnowledgeItemRepository,
  ) {}

  async execute(command: UnacceptAnswerCommand): Promise<void> {
    const question = await this.itemRepo.findById(command.questionId)
    if (!question) throw new KnowledgeItemNotFoundError()
    if (question.type !== 'QUESTION') throw new NotAQuestionError()
    if (question.createdByUserId !== command.actorUserId) throw new AcceptAnswerForbiddenError()

    question.clearAcceptedAnswer()
    await this.itemRepo.update(question)
  }
}
