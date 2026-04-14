import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { KMeansParameters } from '@/api/kmeans'

const useKMeansStore = defineStore('kmeans', () => {
    const parameters = ref<KMeansParameters>({
        nclusters: 3,
        criteria: 'all',
        max_iterations: 100,
        attempts: 5,
        epsilon: 0.5,
        flags: 'pp',
        colors: [
              [0, 0, 0], [255, 247, 89], [255, 0, 0] ]
        })
    // Исправляем невалидные значения из старых версий localStorage
    const validCriteria = ['epsilon', 'max iterations', 'all']
    const validFlags = ['pp', 'random']
    if (!validCriteria.includes(parameters.value.criteria)) {
        parameters.value.criteria = 'all'
    }
    if (!validFlags.includes(parameters.value.flags)) {
        parameters.value.flags = 'pp'
    }

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

//EA84CB939A684C80