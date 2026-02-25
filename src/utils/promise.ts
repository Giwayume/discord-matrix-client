type SettledValue<P> =
    P extends Promise<infer V>
        ? V | undefined
        : never

export function allSettledValues<
    T extends readonly Promise<any>[]
>(
    promises: readonly [...T]
): Promise<{ [K in keyof T]: SettledValue<T[K]> }> {
    return Promise.allSettled(promises).then(results =>
        results.map(r =>
            r.status === 'fulfilled' ? r.value : undefined
        ) as any
    )
}