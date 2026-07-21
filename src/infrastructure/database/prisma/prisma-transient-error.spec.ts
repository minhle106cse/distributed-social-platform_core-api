import { Prisma } from '@prisma/client'
import { isPrismaTransientError } from './prisma-transient-error'

function makeKnownRequestError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('mock', { code, clientVersion: 'test' })
}

describe('isPrismaTransientError', () => {
  it('trả về true cho P2034 (deadlock/write-conflict) — an toàn để retry', () => {
    expect(isPrismaTransientError(makeKnownRequestError('P2034'))).toBe(true)
  })

  it('trả về false cho P2028 (connection/pool issue) — KHÔNG retry, xem resilience_patterns.md §3', () => {
    expect(isPrismaTransientError(makeKnownRequestError('P2028'))).toBe(false)
  })

  it('trả về false cho lỗi Prisma known khác (vd P2002 unique constraint)', () => {
    expect(isPrismaTransientError(makeKnownRequestError('P2002'))).toBe(false)
  })

  it('trả về false cho lỗi không phải PrismaClientKnownRequestError', () => {
    expect(isPrismaTransientError(new Error('boom'))).toBe(false)
  })
})
