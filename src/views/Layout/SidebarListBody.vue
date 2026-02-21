<template>
    <div class="application__sidebar-list__body">
        <div class="application__sidebar-list__body-container">
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
.application__sidebar-list__body {
    position: absolute;
    top: 3rem;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    background: var(--background-base-lowest);
    margin: 0 -0.25rem 0 0;
}
.application__sidebar-list__body-container {
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