<template>
    <header class="application__main__header">
        <div class="application__main__header-container">
            <slot />
        </div>
    </header>
</template>

<style lang="scss" scoped>
.application__main__header {
    display: flex;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: transparent;
    border-bottom: 1px solid var(--border-subtle);
    border-start-start-radius: var(--radius-md);
    padding: 0;
    margin: 0;
    height: 3.0625rem;
    z-index: 2;
}
.application__main__header-container {
    display: flex;
    flex-grow: 1;
    align-items: center;
    overflow: hidden;
}
</style>