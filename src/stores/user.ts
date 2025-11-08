import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export enum UserStatus {
    DEV = 'dev',
    EXPERT = 'expert'
}

export interface User {
    name: string
    status: UserStatus
}

export const useUserStore = defineStore('user', () => {
    const user = ref<User | null>(null)
  
    const setUser = (userData: User) => {
        user.value = userData
    }

    const getUser = () => {
        return user?.value
    }

    const clearUser = () => {
        user.value = null
    }
  
    return { user, setUser, getUser, clearUser }
}, {
    persist: {
        key: 'user-store',
        storage: localStorage
    }
})
