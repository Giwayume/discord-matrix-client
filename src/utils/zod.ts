import camelcaseKeys from 'camelcase-keys'

import type { CamelCase } from 'type-fest'
import { z } from 'zod'

type CamelCaseOptions = {
  preserveConsecutiveUppercase?: boolean;
};

type CamelCasedPropertiesDeep<
    Value,
    Options extends CamelCaseOptions = { preserveConsecutiveUppercase: true },
    // eslint-disable-next-line @typescript-eslint/ban-types
> = Value extends Function | Date | RegExp
    ? Value
    : Value extends readonly unknown[]
        ? Value extends readonly [infer First, ...infer Rest]
        ? [CamelCasedPropertiesDeep<First, Options>, ...CamelCasedPropertiesDeep<Rest, Options>]
        : Value extends readonly []
            ? []
            : CamelCasedPropertiesDeep<Value[number], Options>[]
        : Value extends Set<infer U>
        ? Set<CamelCasedPropertiesDeep<U, Options>>
        : Value extends object
            ? {
                [K in keyof Value as K extends `${string}.${string}`
                    ? K
                    : CamelCase<K & string, Options>]: CamelCasedPropertiesDeep<Value[K], Options>;
            }
            : Value;

/**
 * Converts all object keys in a schema to camelCase, after the schema is validated as-is.
 */
export const camelizeSchema = <T extends z.ZodTypeAny>(
    zod: T,
): z.ZodType<CamelCasedPropertiesDeep<T["_output"]>> => 
    zod.transform((val) => {
        return camelizeApiResponse(val) as CamelCasedPropertiesDeep<T["_output"]>
    })

/**
 * This is used to change the type of nested objects in an API response only.
 * `camelizeSchema` could be used, but it's redundant, since the transform only needs to run on the top-level schema.
 */
export const camelizeSchemaWithoutTransform = <T extends z.ZodTypeAny>(
    zod: T,
): z.ZodType<CamelCasedPropertiesDeep<T["_output"]>> => zod as never

/** Only convert to camel case if it appears to be a snake_case variable. */
export function camelizeApiResponse(response: any) {
    return camelcaseKeys(response as any, { deep: true, exclude: [/^(?![a-z0-9_]*_[a-z0-9_]*$).+$/] })
}
