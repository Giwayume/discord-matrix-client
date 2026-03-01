import { ref } from 'vue'

const isMobileView = ref<boolean>(window.innerWidth <= 800)
const isTouchEventsDetected = ref<boolean>(false)

const applicationContainer = ref<HTMLDivElement>()
const isAnimatingSidebarToggle = ref<boolean>(false)
const sidebarOpenRightPadding = 0
const sidebarOpenOffset = ref<number>(window.innerWidth - sidebarOpenRightPadding)

function toggleApplicationSidebar(visible?: boolean) {
    isAnimatingSidebarToggle.value = true

    if (applicationContainer.value) {
        applicationContainer.value.scrollLeft = 0
        applicationContainer.value.scrollTop = 0
    }

    if (visible == null) {
        if (sidebarOpenOffset.value > 0) {
            sidebarOpenOffset.value = 0
        } else {
            sidebarOpenOffset.value = window.innerWidth - sidebarOpenRightPadding
        }
    } else if (visible) {
        sidebarOpenOffset.value = window.innerWidth - sidebarOpenRightPadding
    } else {
        sidebarOpenOffset.value = 0
    }
    setTimeout(() => {
        isAnimatingSidebarToggle.value = false
    }, 300)
}

export function useApplication() {
    return {
        isMobileView,
        isTouchEventsDetected,
        isAnimatingSidebarToggle,
        sidebarOpenRightPadding,
        sidebarOpenOffset,
        toggleApplicationSidebar,
    }
}