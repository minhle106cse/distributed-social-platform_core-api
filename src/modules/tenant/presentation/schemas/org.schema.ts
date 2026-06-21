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

export const CreateInviteSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'GUEST']).default('MEMBER'),
  ttlHours: z.number().int().min(1).max(168).default(72), // 1h–7d, default 3d
})
export type CreateInviteDto = z.infer<typeof CreateInviteSchema>

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
})
export type AcceptInviteDto = z.infer<typeof AcceptInviteSchema>

// OWNER không nằm trong danh sách — quyền OWNER là implicit-all, không chỉnh được.
export const ManageableOrgRoleSchema = z.enum(['ADMIN', 'MEMBER', 'GUEST'])
export type ManageableOrgRole = z.infer<typeof ManageableOrgRoleSchema>

export const UpdateRolePermissionsSchema = z.object({
  permissions: z.array(z.string().min(1)).max(50),
})
export type UpdateRolePermissionsDto = z.infer<typeof UpdateRolePermissionsSchema>
