<template>
    <div class="application__sidebar-list__header">
        <div class="application__sidebar-list__header-container">
            <slot />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.application__sidebar-list__header {
    display: flex;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: var(--background-base-lowest);
    border-bottom: 1px solid var(--border-subtle);
    border-start-start-radius: var(--radius-md);
    padding: 0 0.5rem;
    margin: 0 -0.25rem 0 0;
    height: 3rem;
    z-index: 2;
}
.application__sidebar-list__header-container {
    display: flex;
    flex-grow: 1;
    align-items: center;
    overflow: hidden;
}
</style>