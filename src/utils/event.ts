import * as z from 'zod'

import { eventContentSchemaByType } from '@/types'

export interface GenericEvent<C = any> {
    content: C;
    sender?: string;
    type: string;
}
export type GenericEventList = Array<GenericEvent>

export function findEvent<T extends keyof typeof eventContentSchemaByType>(
    eventList: GenericEventList | null | undefined, eventType: T
): GenericEvent<z.infer<(typeof eventContentSchemaByType)[T]>> | null {
    const event = eventList?.find((value) => value.type === eventType)
    if (!event) return null
    const eventContentParse = eventContentSchemaByType[eventType].safeParse(event.content)
    if (!eventContentParse.success) return null
    return event
}

type EventsFromKeys<
    K extends readonly (keyof typeof eventContentSchemaByType)[]
> = {
    [I in keyof K]: GenericEvent<
        z.infer<(typeof eventContentSchemaByType)[K[I]]>
    > | null;
}

export function findEvents<
    K extends readonly (keyof typeof eventContentSchemaByType)[]
>(
    eventList: GenericEventList | null | undefined,
    eventTypes: K
): EventsFromKeys<K> {
    const events = new Array(eventTypes.length).fill(null) as GenericEvent[]
    if (!eventList) return events as never
    for (const event of eventList) {
        const eventTypeIndex = eventTypes.indexOf(event.type as keyof typeof eventContentSchemaByType)
        if (eventTypeIndex == -1) continue
        const eventContentParse = eventContentSchemaByType[event.type as keyof typeof eventContentSchemaByType].safeParse(event.content)
        if (eventContentParse.success) {
            events[eventTypeIndex] = event
        }
    }
    return events as never
}
