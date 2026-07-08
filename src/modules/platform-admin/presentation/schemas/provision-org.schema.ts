import { z } from 'zod'

export const ProvisionOrgSchema = z.object({
  orgName: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  ownerEmail: z.string().trim().email().max(254),
})
export type ProvisionOrgDto = z.infer<typeof ProvisionOrgSchema>
