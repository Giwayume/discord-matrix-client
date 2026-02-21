<template>
    <Dialog
        :visible="props.visible"
        modal
        :header="t('editGroupIcon.title')"
        :draggable="false"
        :style="{ width: '100%', maxWidth: '30rem' }"
        @update:visible="(visible) => emit('update:visible', visible)"
    >
        <div class="flex justify-center items-center">
            <div
                role="button"
                tabindex="0"
                class="flex flex-col justify-center items-center bg-(--background-mod-normal) hover:bg-(--background-mod-subtle) rounded-md w-53 h-54 text-(--interactive-text-default) hover:text-(--interactive-text-hover) cursor-pointer"
                @click="selectFile"
            >
                <span class="pi pi-image mb-2" :style="{ '--p-icon-size': '1.5rem' }" aria-hidden="true" />
                <span class="text-sm font-semibold">{{ t('editGroupIcon.uploadImage') }}</span>
            </div>
        </div>
    </Dialog>
    <CropAvatarImageDialog v-model:visible="cropImageDialogVisible" :file="cropImageFile" @apply="apply" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { pickFile } from '@/utils/file-access'

const CropAvatarImageDialog = defineAsyncComponent(() => import('@/views/Common/CropAvatarImageDialog.vue'))

import Dialog from 'primevue/dialog'

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    roomId: {
        type: String,
        required: true,
    }
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
}>()

const { t } = useI18n()

const cropImageDialogVisible = ref<boolean>(false)
const cropImageFile = ref<File>()

function selectFile() {
    pickFile({ multiple: false }).then((file) => {
        cropImageFile.value = file
        cropImageDialogVisible.value = true
    }).catch(() => {
        // Ignore cancelation
    })
}

function apply() {
    emit('update:visible', false)
}

</script>