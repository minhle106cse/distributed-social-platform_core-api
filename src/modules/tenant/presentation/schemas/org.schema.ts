import { z } from 'zod'

export const CreateOrgSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
})
export type CreateOrgDto = z.infer<typeof CreateOrgSchema>

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'GUEST']),
})
export type UpdateMemberRoleDto = z.infer<typeof UpdateMemberRoleSchema>

export const CreateSpaceSchema = z.object({
  name: z.string().min(1).max(80),
  visibility: z.enum(['ORG', 'PRIVATE']).default('ORG'),
})
export type CreateSpaceDto = z.infer<typeof CreateSpaceSchema>
