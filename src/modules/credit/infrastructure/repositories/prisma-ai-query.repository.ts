import type { Prisma } from '@/generated'
import type {
  AiQueryRecordInput,
  IAiQueryRepository,
} from '../../domain/repositories/ai-query.repository'

export class PrismaAiQueryRepository implements IAiQueryRepository {
  constructor(private readonly client: Prisma.TransactionClient) {}

  async record(input: AiQueryRecordInput): Promise<string> {
    const { reservationId, sources, ...rest } = input
    const data = { ...rest, reservationId, sources: sources as unknown as Prisma.InputJsonValue }

    const row = await this.client.aiQuery.upsert({
      where: { reservationId },
      create: data,
      // A retried compensation re-asserts the same terminal state; there is no
      // ANSWERED → FAILED transition to guard against, because only one of the
      // two commands ever runs for a given reservation.
      update: data,
      select: { id: true },
    })
    return row.id
  }
}
