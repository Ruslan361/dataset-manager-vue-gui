<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useUserStore, UserStatus } from '@/stores/user'
import { ref } from 'vue'
const userStore = useUserStore()
</script>

<template>
    <Card>
      <h2>Привет, {{ userStore.user?.name }}!</h2>
      <p>Ваш статус: {{ userStore.user?.status === UserStatus.DEV ? 'Разработчик' : 'Эксперт' }}</p>
      
    <Button 
        type="submit" 
        variant="primary"
        size="medium"
        @click="userStore.clearUser"
    >
                Выйти
            </Button>
    </Card>
</template>

<style scoped>

</style>
