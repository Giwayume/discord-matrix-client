<template>
    <div class="application__title-bar">
        <AuthenticatedImage
            v-if="titleAvatar"
            :key="titleAvatar"
            :mxcUri="titleAvatar"
            type="thumbnail"
            :width="48"
            :height="48"
            method="scale"
        >
            <template v-slot="{ src }">
                <Avatar :image="src" shape="circle" :aria-label="t('layout.userAvatarImage')" class="mr-2" />
            </template>
            <template #error>
                <span v-if="titleIcon" :class="titleIcon" class="mr-2" aria-hidden="true" />
            </template>
        </AuthenticatedImage>
        <span v-else-if="titleIcon" :class="titleIcon" class="mr-2" aria-hidden="true" />
        <span class="text-sm font-medium text-nowrap overflow-hidden text-ellipsis">{{ props.title }}</span>
        <nav class="application__title-bar__trailing">
            <Button
                v-tooltip.bottom="{ value: isTouchEventsDetected ? undefined : t('layout.titleBarInbox') }"
                icon="pi pi-envelope"
                variant="text"
                severity="secondary"
                :aria-label="t('layout.titleBarInbox')"
            />
            <Button
                v-tooltip.bottom="{ value: isTouchEventsDetected ? undefined : t('layout.titleBarHelp') }"
                icon="pi pi-question-circle"
                variant="text"
                severity="secondary"
                :aria-label="t('layout.titleBarHelp')"
            />
        </nav>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useApplication } from '@/composables/application'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'

import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import vTooltip from 'primevue/tooltip'

const { t } = useI18n()
const { isTouchEventsDetected } = useApplication()

const props = defineProps({
    title: {
        type: String,
        default: '',
    },
    titleIcon: {
        type: String,
        default: '',
    },
    titleAvatar: {
        type: String,
        default: '',
    },
})

</script>

<style lang="scss" scoped>
.application__title-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 0 6.25rem;
    height: 2rem;
    color: var(--text-default);
}
.application__title-bar__trailing {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.875rem;
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0.75rem;

    .p-button {
        --p-icon-size: 1.25rem;
        --p-button-padding-x: 0;
        --p-button-padding-y: 0;
        --p-button-text-secondary-hover-background: transparent;
    }
}
</style>