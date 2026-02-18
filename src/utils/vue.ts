import { watch, type WatchHandle } from 'vue'

export function until(predicate: () => boolean): Promise<void> {
    let stop: WatchHandle | undefined
    return new Promise((resolve) => {
        stop = watch(
            predicate,
            (now) => {
                if (now) {
                    stop?.()
                    resolve()
                }
            },
            { immediate: true }
        )
    })
}
