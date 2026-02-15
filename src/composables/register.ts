import { ref, onMounted, onUnmounted, type Ref } from 'vue'

import type { ServerDiscovery } from './server-discovery'

export interface RegisterFormData {
    username?: string;
    password?: string;
}

export function useRegister(options: {
    serverDiscovery: Ref<ServerDiscovery>
}) {
    const loading = ref(false)

    const error = ref<Error | null>(null)

    const session = ref<string | undefined>(undefined)

    async function register(formData?: RegisterFormData) {

    }

    return { loading, error, session, register }
}