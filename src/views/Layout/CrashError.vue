<template>
    <div class="flex items-center justify-center h-dvh">
        <div class="mx-auto max-w-100">
            <div class="text-center mt-6 mb-2">
                <h1 class="text-3xl text-(--text-strong) mb-2">{{ t('errors.crash.title') }}</h1>
                <p class="text-(--text-muted) my-5">{{ t('errors.crash.subtitle') }}</p>
                <template v-if="props.detailsMessage">
                    <h2 class="text-md text-(--text-feedback-critical) font-bold m-0">{{ t('errors.crash.errorDetails') }}</h2>
                    <p class="text-(--text-feedback-critical)">{{ props.detailsMessage }}</p>
                </template>
                <div class="flex items-center justify-center flex-wrap mt-6">
                    <Button @click="emit('reload')">
                        {{ t('errors.crash.reloadButton') }}
                    </Button>
                    <span class="m-4 text-(--text-muted)">
                        {{ t('errors.crash.or') }}
                    </span>
                    <RouterLink :to="{ name: 'login' }" @click.prevent="logout">
                        {{ t('errors.crash.logoutLink') }}
                    </RouterLink>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLogout } from '@/composables/logout'

import Button from 'primevue/button'

const { t } = useI18n()
const { logout } = useLogout()

const props = defineProps({
    detailsMessage: {
        type: String,
        default: undefined,
    },
})

const emit = defineEmits<{
    (e: 'reload'): void
}>()

</script>