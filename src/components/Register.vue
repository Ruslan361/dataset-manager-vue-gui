<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import Card from '@/components/common/Card.vue'
import { useRouter } from 'vue-router' 
import { useUserStore, UserStatus } from '@/stores/user'
import { ref } from 'vue'
const router = useRouter()
const userStore = useUserStore()

const name = ref('')
const status = ref<UserStatus>(UserStatus.DEV)


const saveUser = () => {
  if (name.value.trim()) {
    userStore.setUser({
      name: name.value.trim(),
      status: status.value
    })
  }
}

const route = () => {
  router.push('/')
}

const saveAndRoute = () =>
{
  saveUser()
  route()
}

</script>

<template>
    <Card>
        <h2>Добро пожаловать!</h2>
        <p>Пожалуйста, заполните ваши данные:</p>
        
        <form @submit.prevent="saveAndRoute">
            <div style="margin-bottom: 16px;">
            <label for="name">Имя:</label>
            <input 
                id="name"
                v-model="name" 
                type="text" 
                placeholder="Введите ваше имя"
                required
                style="width: 100%; padding: 8px; margin-top: 4px;"
            >
            </div>
            
            <div style="margin-bottom: 16px;">
            <label for="status">Статус:</label>
            <select 
                id="status"
                v-model="status"
                style="width: 100%; padding: 8px; margin-top: 4px;"
            >
                <option :value="UserStatus.DEV">Разработчик</option>
                <option :value="UserStatus.EXPERT">Эксперт</option>
            </select>
            </div>
            
            <Button 
                type="submit" 
                variant="primary"
                size="medium"
            >
                Сохранить
            </Button>
        </form>
    </Card>
</template>

<style scoped>

</style>
