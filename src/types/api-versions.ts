import * as z from 'zod'
import { camelizeSchema } from '@/utils/zod'

export const ApiVersionsConfigSchema = camelizeSchema(z.object({
    versions: z.array(z.string()),
    unstable_features: z.record(z.string(), z.boolean()).optional(),
}))

export type ApiVersionsConfig = z.infer<typeof ApiVersionsConfigSchema>