import { z } from 'zod'

export const FollowSchema = z.object({
  targetType: z.enum(['DOCUMENT', 'SPACE']),
  targetId: z.string().uuid(),
})

export type FollowDto = z.infer<typeof FollowSchema>
