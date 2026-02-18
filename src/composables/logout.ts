import mitt from 'mitt'

const emitter = mitt()

export function useLogout() {

    async function logout() {
        emitter.emit('logout')
        emitter.all.clear()

        // TODO - probably should show a message when the session expired.
        const router = (await import('@/router')).default
        router.replace({ name: 'login' })
    }

    return {
        logout,
    }
}

export function onLogout(callback: () => void) {
    emitter.on('logout', callback)
}
