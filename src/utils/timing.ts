import { type ComposerTranslation } from 'vue-i18n'

export interface ThrottleOptions {
    leading?: boolean,
    trailing?: boolean
}

/**
 * Throttles a callback with the specified wait time and callback options
 * https://stackoverflow.com/questions/27078285/simple-throttle-in-js
 * @license CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0/
 */
export function throttle<T = (...args: any) => void>(func: T, wait: number, options?: ThrottleOptions): T {
    var context: any, args: any, result: any
    var timeout: number | null = null
    var previous = 0
    if (!options) options = {}
    var later = function() {
        previous = (options as ThrottleOptions).leading === false ? 0 : Date.now()
        timeout = null
        result = (func as unknown as Function).apply(context, args)
        if (!timeout) context = args = null
    };
    return function() {
        var now = Date.now()
        if (!previous && (options as ThrottleOptions).leading === false) previous = now
        var remaining = wait - (now - previous)
        // @ts-ignore
        context = this
        args = arguments
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
            clearTimeout(timeout)
                timeout = null
            }
            previous = now
            result = (func as unknown as Function).apply(context, args)
            if (!timeout) context = args = null
        } else if (!timeout && (options as ThrottleOptions).trailing !== false) {
            timeout = window.setTimeout(later, remaining)
        }
        return result
    } as unknown as T
}

export function timeAgo(ts: number | null | undefined, t: ComposerTranslation) {
    if (ts == null) return t('timeSince.unknown')

    const now = Date.now()
    const diff = now - ts

    const seconds = Math.round(diff / 1000)
    if (seconds < 60) return t('timeSince.secondsAgo', seconds)

    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return t('timeSince.minutesAgo', minutes)

    const hours = Math.round(minutes / 60)
    if (hours < 24) t('timeSince.hoursAgo', hours)

    const days = Math.round(hours / 24)
    if (days < 7) return t('timeSince.daysAgo', days)

    const weeks = Math.round(days / 7)
    if (weeks < 4) return t('timeSince.weeksAgo', weeks)

    const months = Math.round(days / 30)
    if (months < 12) return t('timeSince.monthsAgo', months)

    const years = Math.round(days / 365)
    return t('timeSince.yearsAgo', years)
}
