import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const useOtherStore = defineStore('other', () => {
    const isBackwardCompatibility = ref(false)
    const setBackwardCompatibility = (value: boolean) => {
        isBackwardCompatibility.value = value
    }
    const getBackwardCompatibility = computed(() => isBackwardCompatibility.value)
    const imagesInOnePage = ref(20)
    const setImagesInOnePage = (value: number) => {
        imagesInOnePage.value = value
    }
    const getImagesInOnePage = computed(() => imagesInOnePage.value)
    return { isBackwardCompatibility, setBackwardCompatibility, getBackwardCompatibility, imagesInOnePage, setImagesInOnePage, getImagesInOnePage }
}, {
    persist: {
        key: 'other-store',
        storage: localStorage
    }
})

export { useOtherStore }
export default useOtherStore