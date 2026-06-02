import { Prisma } from '@prisma/client';

/**
 * Infra-layer predicate that classifies Prisma errors as transient (retryable).
 * Injected into RetryMiddleware so the middleware itself stays ORM-agnostic.
 *
 * Transient Prisma error codes:
 *   P2028 - Transaction API error (connection issue)
 *   P2034 - Write conflict or deadlock (retry recommended by Prisma docs)
 */
export function isPrismaTransientError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P2034', 'P2028'].includes(error.code);
  }
  return false;
}
