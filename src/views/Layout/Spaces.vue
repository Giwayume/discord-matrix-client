<template>
    <div class="application__spaces">
        <ScrollPanel>
            <div class="application__spaces__scroll-content">
                <button
                    v-tooltip.right="{ value: isTouchEventsDetected ? undefined : t('layout.directMessages') }"
                    class="application__space application__space--dm"
                    :class="{
                        'application__space--active': !currentTopLevelSpaceId,
                    }"
                    :aria-label="t('layout.directMessages')"
                    @click="viewDirectMessages"
                >
                    <div class="application__space__icon">
                        <span class="pi pi-comments" aria-hidden="true" />
                    </div>
                </button>
                <hr>
                <template v-for="space of joinedSpaces">
                    <button
                        v-tooltip.right="{ value: isTouchEventsDetected ? undefined : space.name }"
                        class="application__space"
                        :class="{
                            'application__space--active': currentTopLevelSpaceId === space.roomId,
                        }"
                        :aria-label="space.name"
                        @click="viewSpace(space)"
                    >
                        <div class="application__space__icon">
                            <AuthenticatedImage
                                v-if="space.avatarUrl"
                                :mxcUri="space.avatarUrl"
                                type="thumbnail"
                                :width="48"
                                :height="48"
                                method="scale"
                            >
                                <template v-slot="{ src }">
                                    <img :src="src" :alt="t('layout.spaceAvatarAlt')">
                                </template>
                                <template #error>
                                    {{ createAcronym(space.name) }}
                                </template>
                            </AuthenticatedImage>
                            <template v-else>{{ createAcronym(space.name) }}</template>
                        </div>
                    </button>
                </template>
                <button
                    v-tooltip.right="{ value: isTouchEventsDetected ? undefined : t('layout.addSpace') }"
                    class="application__space application__space--action"
                    :aria-label="t('layout.addSpace')"
                >
                    <div class="application__space__icon">
                        <span class="pi pi-plus-circle" aria-hidden="true" />
                    </div>
                </button>
                <button
                    v-tooltip.right="{ value: isTouchEventsDetected ? undefined : t('layout.discover') }"
                    class="application__space application__space--action"
                    :aria-label="t('layout.discover')"
                >
                    <div class="application__space__icon">
                        <span class="pi pi-compass" aria-hidden="true" />
                    </div>
                </button>
            </div>
        </ScrollPanel>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useApplication } from '@/composables/application'
import { useSpaceStore } from '@/stores/space'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'

import ScrollPanel from 'primevue/scrollpanel'
import vTooltip from 'primevue/tooltip'

import type { SpaceSummary } from '@/types'

const { t } = useI18n()
const router = useRouter()
const { isTouchEventsDetected } = useApplication()
const { currentTopLevelSpaceId, joinedSpaces } = storeToRefs(useSpaceStore())

function createAcronym(spaceName: string) {
    const wordSplit = spaceName.toUpperCase().split(' ')
    return wordSplit.length >= 2
        ? wordSplit.slice(0, 2).map((word) => word[0]).join('')
        : wordSplit[0]?.slice(0, 2)
}

function viewDirectMessages() {
    router.push({ name: 'home' })
}

function viewSpace(space: SpaceSummary) {
    router.push({ name: 'room', params: { roomId: space.roomId } })
}
</script>

<style lang="scss" scoped>
.application__spaces {
    flex-shrink: 0;
    width: 4.5rem;
    margin: -0.25rem 0 0 0;
    padding: 0 0 4rem 0;

    hr {
        color: var(--app-frame-border);
        width: 2rem;
        margin: 0.25rem;
    }
}

.application__spaces__scroll-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.application__space {
    display: block;
    position: relative;
    width: 3rem;
    height: 3rem;
    cursor: pointer;

    &:before {
        content: '';
        display: block;
        position: absolute;
        left: -0.75rem;
        top: 50%;
        background-color: var(--text-strong);
        border-radius: 0 0.25rem 0.25rem 0;
        margin-inline-start: -0.25rem;
        width: 0;
        height: 0;
        transform: translate(0, -50%);
        transition: height 0.2s, width 0.2s;
    }

    &:hover {
        &:not(.application__space--action):before {
            height: 1.25rem;
            width: 0.5rem;
        }

        .application__space__icon {
            background: var(--control-primary-background-default);
        }
    }

    &.application__space--active {
        &:before {
            height: 2.5rem !important;
            width: 0.5rem;
        }

        .application__space__icon {
            background: var(--control-primary-background-default);
        }
    }
}

.application__space__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background-mod-subtle);
    color: var(--text-default);
    mask: var(--application-space-icon-mask);
    mask-size: 3rem;
    mask-repeat: no-repeat;
    width: 3rem;
    height: 3rem;
    font-size: 1.125rem;
    font-weight: 500;
    line-height: 1.2em;
    transition: background-color 0.2s;
    white-space: nowrap;
}

.application__space--dm {
    .application__space__icon {
        color: var(--text-strong);
    }
}
</style>