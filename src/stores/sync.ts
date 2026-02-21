import { defineStore } from 'pinia'

export const useSyncStore = defineStore('sync', () => {

    function getNextBatch(): string | undefined {
        return localStorage.getItem('mx_sync_next_batch') || undefined
    }

    function setNextBatch(nextBatch: string | undefined) {
        if (nextBatch) {
            localStorage.setItem('mx_sync_next_batch', nextBatch)
        } else {
            localStorage.removeItem('mx_sync_next_batch')
        }
    }

    return { getNextBatch, setNextBatch }
})
