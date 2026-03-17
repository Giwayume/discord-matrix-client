import { getCurrentInstance, onUnmounted } from 'vue'
import { useRouter, type Router } from 'vue-router'
import mitt from 'mitt'

const emitter = mitt()

export function useLogout() {

    let router: Router | undefined
    if (getCurrentInstance()) {
        router = useRouter()
    }

    async function logout() {
        emitter.emit('logout')

        // TODO - probably should show a message when the session expired.
        if (router) {
            router.push({ name: 'login' })
        } else {
            window.location.href = '/login'
        }
    }

    return {
        logout,
    }
}

export function onLogout(callback: () => void, options?: { permanent?: boolean }) {
    if (getCurrentInstance() && !options?.permanent) {
        onUnmounted(() => {
            emitter.off('logout', callback)
        })
    }
    emitter.on('logout', callback)
}
