<template>
    <Dialog
        :visible="visible"
        modal
        :draggable="false"
        @update:visible="onUpdateVisible"
    >
        <template #container="{ closeCallback }">
            <div class="p-dialog-header !py-0 !flex !items-center !h-12 !border-b border-(--border-muted)">
                <div class="p-dialog-title !text-base !font-normal">
                    {{ t('roomSettings.title.' + props.type) }}
                </div>
                <div class="p-dialog-header-actions">
                    <Button
                        class="p-dialog-close-button"
                        size="small"
                        icon="pi pi-times"
                        severity="secondary"
                        variant="text"
                        rounded
                        :aria-label="t('dialog.close')"
                        @click="closeCallback"
                    />
                </div>
            </div>
            <div class="flex flex-row w-full h-full">
                <aside class="p-dialog-sidebar flex flex-col">
                    <div class="pl-1 pr-4"></div>
                </aside>
            </div>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'

import Dialog from 'primevue/dialog'

const { t } = useI18n()

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    type: {
        type: String as PropType<'group' | 'room' | 'space'>,
        default: 'room',
    },
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
}>()

function onUpdateVisible(visible: boolean) {
    emit('update:visible', visible)
}

</script>