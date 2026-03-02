<template>
    <section class="application__user-status-settings" :aria-label="t('layout.userStatusSettings')">
        <Button variant="text" severity="secondary" class="application__user-status-settings__name-tag">
            <OverlayStatus level="low" :status="onlineStatus" class="w-8 h-8">
                <AuthenticatedImage :mxcUri="authenticatedUserAvatarUrl" type="thumbnail" :width="48" :height="48" method="scale">
                    <template v-slot="{ src }">
                        <Avatar :image="src" shape="circle" size="large" :aria-label="t('layout.userAvatarImage')" />
                    </template>
                    <template #error>
                        <Avatar icon="pi pi-user" shape="circle" size="large" :aria-label="t('layout.userAvatarImage')" />
                    </template>
                </AuthenticatedImage>
            </OverlayStatus>
            <div class="flex flex-col text-nowrap">
                <div class="text-(--text-strong) leading-4 relative">{{ username }}</div>
                <div class="text-(--text-subtle) text-xs  relative top-px">{{ t(`presence.status.${onlineStatus}`) }}</div>
            </div>
        </Button>
        <div class="application__user-status-settings__actions">
            <Button
                v-tooltip.top="{ value: isTouchEventsDetected ? undefined : t('layout.unmute') }"
                icon="pi pi-microphone"
                variant="text"
                severity="secondary"
                :aria-label="t('layout.unmute')"
            />
            <Button
                v-tooltip.top="{ value: isTouchEventsDetected ? undefined : t('layout.deafen') }"
                icon="pi pi-headphones"
                variant="text"
                severity="secondary"
                :aria-label="t('layout.deafen')"
            />
            <Button
                v-tooltip.top="{ value: isTouchEventsDetected ? undefined : t('layout.userSettings') }"
                icon="pi pi-cog"
                variant="text"
                severity="secondary"
                :aria-label="t('layout.userSettings')"
                @click="emit('showUserSettings')"
            />
            <Button
                v-if="isFullscreenEnabled"
                v-tooltip.top="{ value: isTouchEventsDetected ? undefined : t('layout.enterFullscreen') }"
                icon="pi pi-expand"
                variant="text"
                severity="secondary"
                :aria-label="t('layout.enterFullscreen')"
                @click="toggleFullscreen()"
            />
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useApplication } from '@/composables/application'
import { useProfileStore } from '@/stores/profile'
import { useSessionStore } from '@/stores/session'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'
import OverlayStatus from '@/views/Common/OverlayStatus.vue'

import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import SplitButton from 'primevue/splitbutton'
import vTooltip from 'primevue/tooltip'

const { t } = useI18n()
const { isMobileView, isTouchEventsDetected } = useApplication()
const { authenticatedUserAvatarUrl, authenticatedUserDisplayName } = storeToRefs(useProfileStore())
const { userId } = storeToRefs(useSessionStore())

const emit = defineEmits<{
    (e: 'showUserSettings'): void
}>()

const isFullscreenEnabled = computed(() => {
    return isMobileView.value && document.fullscreenEnabled && import.meta.env.DEV
})

const username = computed(() => {
    return authenticatedUserDisplayName.value || userId.value
})
const onlineStatus = computed<'online'>(() => {
    // TODO - can user configure this?
    return 'online'
})

function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen()
    } else {
        document.body.requestFullscreen()
    }
}

</script>

<style lang="scss" scoped>
.application__user-status-settings {
    display: flex;
    position: absolute;
    align-items: center;
    justify-content: space-between;
    height: 3.5rem;
    bottom: 0.5rem;
    left: 0.5rem;
    right: 0.25rem;
    padding: 0.4375rem 0.5rem 0.4375rem 0.4375rem;
    background: var(--background-base-low);
    border: 1px solid var(--border-muted);
    border-radius: var(--radius-sm);
    z-index: 10;

    @media screen and (max-width: 800px) {
        right: 0.5rem;
    }
}

.application__user-status-settings__actions {
    display: flex;
    gap: 0.25rem;

    :deep(.p-button) {
        --p-button-padding-x: 0;
        --p-button-padding-y: 0;
        width: 2rem;
        height: 2rem;
    }
}

.application__user-status-settings__name-tag {
    --p-button-padding-x: 0.25rem;
    --p-button-padding-y: 0.3125rem;
    gap: 0.5rem;
    flex-grow: 1;
    justify-content: flex-start !important;
    text-align: left !important;
}
</style>