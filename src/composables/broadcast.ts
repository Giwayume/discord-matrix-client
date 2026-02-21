import { getCurrentInstance, onMounted, onUnmounted, ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '@/composables/logger'

import { broadcastMessageSchemaByType, type BroadcastMessage } from '@/types'

const log = createLogger(import.meta.url)

const broadcastChannel = new BroadcastChannel('discortix')
const tabId = uuidv4()

const isLeader = ref<boolean>(false)
let leaderTimestampUpdateInterval: number | undefined

function claimLeadership() {
    const now = Date.now()
    const lockLeaderId = localStorage.getItem('mx_broadcast_lock_leader_id')
    let lockLeaderTs = parseInt(localStorage.getItem('mx_broadcast_lock_leader_ts') ?? '0')
    if (isNaN(lockLeaderTs)) lockLeaderTs = 0

    // If no lock or lock is stale (>10 s), try to become leader
    if (!lockLeaderId || now - lockLeaderTs > 10000) {
        localStorage.setItem('mx_broadcast_lock_leader_id', tabId)
        localStorage.setItem('mx_broadcast_lock_leader_ts', now + '')
        // Verify we actually got it (another tab could race)
        const checkLeaderId = localStorage.getItem('mx_broadcast_lock_leader_id')
        if (checkLeaderId === tabId) {
            becomeLeader()
        }
    }
}

function becomeLeader() {
    isLeader.value = true
    clearInterval(leaderTimestampUpdateInterval)
    leaderTimestampUpdateInterval = setInterval(() => {
        localStorage.setItem('mx_broadcast_lock_leader_ts', Date.now() + '')
    }, 2000)
}

function broadcastMessage(message: BroadcastMessage) {
    if (!isLeader.value) return
    broadcastChannel.postMessage(message)
}

const onMessageListeners: Array<(message: BroadcastMessage) => void> = []

broadcastChannel.onmessage = (e) => {
    if (!e.data.type) return
    const schema = broadcastMessageSchemaByType[e.data.type as keyof typeof broadcastMessageSchemaByType]
    if (!schema) return
    const schemaValidateResult = schema.safeParse(e)
    if (!schemaValidateResult.success) return

    for (const listener of onMessageListeners) {
        try {
            listener(e.data)
        } catch (error) {
            log.error(error)
        }
    }
}

window.addEventListener('storage', (event) => {
    if (event.key === 'mx_broadcast_lock_leader_id' && event.newValue) {
        const newLeaderId = event.newValue
        if (newLeaderId !== tabId) {
            isLeader.value = false
            clearInterval(leaderTimestampUpdateInterval)
        }
    }
})

claimLeadership()
setInterval(claimLeadership, 3000)

export function useBroadcast() {

    const onFollowerMessageListeners: Array<(message: BroadcastMessage) => void> = []

    if (getCurrentInstance()) {
        const onMessageCallback = function(message: BroadcastMessage) {
            for (const callback of onFollowerMessageListeners) {
                try {
                    callback(message)
                } catch (error) {
                    log.error(error)
                }
            }
        }

        onMounted(() => {
            onMessageListeners.push(onMessageCallback)
        })

        onUnmounted(() => {
            const messageListenerIndex = onMessageListeners.indexOf(onMessageCallback)
            if (messageListenerIndex > -1) {
                onMessageListeners.splice(messageListenerIndex, 1)
            }
        })
    }

    function onFollowerMessage(callback: (message: BroadcastMessage) => void) {
        onFollowerMessageListeners.push(callback)
    }

    return {
        isLeader,
        onFollowerMessage,
        broadcastMessage,
    }
}
