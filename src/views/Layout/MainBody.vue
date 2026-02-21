<template>
    <div class="application__main__body">
        <div class="application__main__body-container">
            <ScrollPanel>
                <slot />
            </ScrollPanel>
        </div>
    </div>
</template>

<script setup lang="ts">
import ScrollPanel from 'primevue/scrollpanel'
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
    flex-grow: 1;
    align-items: flex-start;
    overflow: hidden;

    > .p-scrollpanel {
        flex-grow: 1;
        max-width: 100%;
    }
}
</style>