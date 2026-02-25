<template>
    <div class="application__main__body">
        <div class="application__main__body-container">
            <div v-if="disableScrollbar" class="application__main__body__content">
                <slot />
            </div>
            <template v-else>
                <ScrollPanel>
                    <slot />
                </ScrollPanel>
            </template>
            <div class="application__main__body__footer">
                <slot name="footer" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import ScrollPanel from 'primevue/scrollpanel'

defineProps({
    disableScrollbar: {
        type: Boolean,
        default: false,
    }
})

</script>

<style lang="scss" scoped>
.application__main__body {
    position: absolute;
    top: 3rem;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    margin: 0;
    color: var(--text-default);
}
.application__main__body-container {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    align-items: flex-start;
    overflow: hidden;
    width: 100%;

    > .p-scrollpanel {
        width: 100%;
        flex-grow: 1;
        max-width: 100%;
    }
}
.application__main__body__content {
    width: 100%;
    flex-grow: 1;
    max-width: 100%;
    overflow: hidden;
}
.application__main__body__footer {
    flex-grow: 0;
    flex-shrink: 1;
    width: 100%;
}
</style>