import * as z from 'zod'
import { camelizeSchema } from '@/utils/zod'

export const ClientConfigSchema = camelizeSchema(z.object({
    'm.homeserver': z.object({
        base_url: z.url(),
        server_name: z.string().optional(),
    }),
    'm.identity_server': z.object({
        base_url: z.url(),
    }).optional(),
}))

export type ClientConfig = z.infer<typeof ClientConfigSchema>

export const SupportConfigSchema = camelizeSchema(z.object({
    contacts: z.array(
        z.object({
            email_address: z.email().optional(),
            matrix_id: z.string().optional(),
            role: z.string(),
        })
    ).optional(),
    support_page: z.url().optional(),
}))

export type SupportConfig = z.infer<typeof SupportConfigSchema>
