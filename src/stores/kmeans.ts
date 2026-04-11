import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { KMeansParameters } from '@/api/kmeans'

const useKMeansStore = defineStore('kmeans', () => {
    const parameters = ref<KMeansParameters>({
        nclusters: 3,
        criteria: 'kmeans++',
        max_iterations: 300,
        attempts: 10,
        epsilon: 0.001,
        flags: 'random',
        colors: [
              [0, 0, 0], [255, 247, 89],  [255, 0, 0] ]
        })
    const setParameters = (newParams: KMeansParameters) => {
        parameters.value = newParams
    }
    const getParameters = computed(() => parameters.value)
    const setColors = (colors: Array<[number, number, number]>) => {
        parameters.value.colors = colors
    }
    const getColors = computed(() => parameters.value.colors)
    return { parameters, setParameters, getParameters, setColors, getColors }
}, {
    persist: {
        key: 'kmeans-store',
        storage: localStorage
    }
})

export { useKMeansStore }
export default useKMeansStore