import * as z from 'zod'

/** @see https://spec.matrix.org/v1.17/client-server-api/#mpush_rules_pushrule */
export const PushNotificationPushConditionSchema = z.object({
    is: z.string().optional(),
    key: z.string().optional(),
    kind: z.string(),
    pattern: z.string().optional(),
    value: z.union([z.string(), z.number(), z.boolean()]).nullable().optional(),
})

/** @see https://spec.matrix.org/v1.17/client-server-api/#mpush_rules_pushrule */
export const PushNotificationPushRuleSchema = z.object({
    actions: z.array(z.union([
        z.string(),
        z.object([])
    ])),
    conditions: z.array(PushNotificationPushConditionSchema).optional(),
    default: z.boolean(),
    enabled: z.boolean(),
    pattern: z.string().optional(),
    ruleId: z.string(),
})
