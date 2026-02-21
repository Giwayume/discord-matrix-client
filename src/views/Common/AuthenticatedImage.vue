<template>
    <slot v-if="!hasErrorSlot || !loadError" :src="src" :error="loadError"></slot>
    <slot v-if="loadError" name="error"></slot>
</template>

<script setup lang="ts">
import { computed, ref, useSlots, watch, type PropType } from 'vue'
import { useMediaCache, type GetMxcObjectUrlOptions } from '@/composables/media-cache'
const { getMxcObjectUrl } = useMediaCache()

const props = defineProps({
    mxcUri: {
        type: String,
        default: '',
    },
    type: {
        type: String as PropType<'thumbnail' | 'download'>,
        default: 'download',
    },
    width: {
        type: Number,
        default: undefined,
    },
    height: {
        type: Number,
        default: undefined,
    },
    method: {
        type: String as PropType<'crop' | 'scale'>,
        default: undefined,
    },
    animated: {
        type: Boolean,
        default: undefined,
    },
})

const slots = useSlots()

const hasErrorSlot = computed(() => !!slots.error?.().length)

let imageFetchAbortController: AbortController | undefined

const loading = ref<boolean>(false)
const loadError = ref<Error | null>(null)
const src = ref<string | undefined>('/assets/images/image-loading.png')

watch(() => props.mxcUri, (mxcUri) => {
    loading.value = true
    loadError.value = null
    imageFetchAbortController?.abort()
    imageFetchAbortController = new AbortController()

    if (!mxcUri) {
        loading.value = false
        loadError.value = new Error('Missing URI')
        return
    }

    const options: GetMxcObjectUrlOptions = {}
    if (props.type === 'thumbnail') {
        options.type = 'thumbnail'
        if (props.width != null) options.width = props.width
        if (props.height != null) options.height = props.height
        if (props.method != null) options.method = props.method
        if (props.animated != null) options.animated = props.animated
    }
    getMxcObjectUrl(mxcUri, options, imageFetchAbortController).then((url) => {
        src.value = url
    }).catch((error) => {
        src.value = '/assets/images/image-load-error.svg'
        loadError.value = error
    }).finally(() => {
        loading.value = false
    })
}, { immediate: true })

</script>