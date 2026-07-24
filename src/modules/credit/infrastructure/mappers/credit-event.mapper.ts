import { Prisma } from '@/generated'
import type {
  CreditEventType,
  CreditEventPayload,
  CreditLedgerEvent,
} from '../../domain/entities/credit-account.aggregate'

interface PrismaCreditEventRow {
  aggregateId: string
  orgId: string
  userId: string
  eventType: string
  version: number
  payload: Prisma.JsonValue
}

// Row <-> event mapper (not row <-> entity — CreditAccount is folded from many
// events, there's no 1-row-to-1-entity shape here). Exists to give the payload
// JSON cast ONE home instead of 3 independent `as unknown as X` call sites
// (write path, read-side rehydrate, wallet projection).
export class CreditEventMapper {
  static toDomain(row: PrismaCreditEventRow): CreditLedgerEvent {
    return {
      aggregateId: row.aggregateId,
      orgId: row.orgId,
      userId: row.userId,
      // No Prisma enum backs eventType (plain String column, deliberately open-ended
      // for event sourcing) — this cast is the only option, unlike the mapper-enum
      // fixes elsewhere where a real Prisma enum existed and should have been used.
      eventType: row.eventType as CreditEventType,
      version: row.version,
      payload: CreditEventMapper.decodePayload(row.payload),
    }
  }

  static toPersistence(event: CreditLedgerEvent) {
    return {
      aggregateId: event.aggregateId,
      orgId: event.orgId,
      userId: event.userId,
      eventType: event.eventType,
      version: event.version,
      payload: event.payload as unknown as Prisma.InputJsonValue,
    }
  }

  // Shared with read-side projections (wallet query) that only need the payload
  // shape, not a full CreditLedgerEvent.
  static decodePayload(payload: Prisma.JsonValue): CreditEventPayload {
    return payload as unknown as CreditEventPayload
  }
}
