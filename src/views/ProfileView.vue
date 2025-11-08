<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, UserStatus } from '@/stores/user'
import Header from '@/components/Header.vue'
import Card from '@/components/Card.vue'
import Button from '@/components/Button.vue'

const router = useRouter()
const userStore = useUserStore()

const name = ref('')
const status = ref<UserStatus>(UserStatus.DEV)
const isEditing = ref(false)

// Загружаем текущие данные пользователя
onMounted(() => {
  if (userStore.user) {
    name.value = userStore.user.name
    status.value = userStore.user.status
  } else {
    // Если пользователь не авторизован, перенаправляем на регистрацию
    router.push('/register')
  }
})

const saveChanges = () => {
  if (name.value.trim()) {
    userStore.setUser({
      name: name.value.trim(),
      status: status.value
    })
    isEditing.value = false
  }
}

const cancelChanges = () => {
  if (userStore.user) {
    name.value = userStore.user.name
    status.value = userStore.user.status
  }
  isEditing.value = false
}

const startEditing = () => {
  isEditing.value = true
}

const logout = () => {
  userStore.clearUser()
  router.push('/register')
}

const goBack = () => {
  router.push('/')
}

const getStatusText = (userStatus: UserStatus) => {
  return userStatus === UserStatus.DEV ? 'Разработчик' : 'Эксперт'
}
</script>

<template>
  <div class="main-layout">
    <Header />
    
    <main class="main-content">
      <div class="container">
        <div class="profile-header">
          <Button 
            variant="secondary"
            size="medium"
            @click="goBack"
          >
            ← Назад
          </Button>
          <h2 class="page-title">Настройки профиля</h2>
        </div>

        <div class="profile-content">
          <Card>
            <div class="profile-form">
              <div class="current-user-info" v-if="!isEditing">
                <h3>Информация о пользователе</h3>
                
                <div class="user-field">
                  <label>Имя:</label>
                  <span class="user-value">{{ userStore.user?.name }}</span>
                </div>
                
                <div class="user-field">
                  <label>Статус:</label>
                  <span class="user-value">{{ getStatusText(userStore.user?.status!) }}</span>
                </div>

                <div class="user-field">
                  <label>Дата регистрации:</label>
                  <span class="user-value">{{ new Date().toLocaleDateString('ru-RU') }}</span>
                </div>
                
                <div class="profile-actions">
                  <Button 
                    variant="primary"
                    size="medium"
                    @click="startEditing"
                  >
                    Редактировать
                  </Button>
                  
                  <Button 
                    variant="error"
                    size="medium"
                    @click="logout"
                  >
                    Выйти из системы
                  </Button>
                </div>
              </div>

              <form @submit.prevent="saveChanges" v-if="isEditing">
                <h3>Редактирование профиля</h3>
                
                <div class="form-group">
                  <label for="name">Имя:</label>
                  <input 
                    id="name"
                    v-model="name" 
                    type="text" 
                    placeholder="Введите ваше имя"
                    required
                    class="form-input"
                  >
                </div>
                
                <div class="form-group">
                  <label for="status">Статус:</label>
                  <select 
                    id="status"
                    v-model="status"
                    class="form-select"
                  >
                    <option :value="UserStatus.DEV">Разработчик</option>
                    <option :value="UserStatus.EXPERT">Эксперт</option>
                  </select>
                </div>
                
                <div class="form-actions">
                  <Button 
                    type="submit" 
                    variant="success"
                    size="medium"
                  >
                    Сохранить изменения
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="secondary"
                    size="medium"
                    @click="cancelChanges"
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.main-layout {
  min-height: 100vh;
  background-color: var(--bg-color-secondary);
}

.main-content {
  padding: var(--spacing-xl) 0;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-color);
  margin: 0;
  flex: 1;
}

.profile-content {
  display: flex;
  justify-content: center;
}

.profile-form {
  width: 100%;
  max-width: 400px;
}

.profile-form h3 {
  margin: 0 0 var(--spacing-lg) 0;
  color: var(--text-color);
  font-size: var(--font-size-lg);
}

.user-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--border-color);
}

.user-field:last-child {
  border-bottom: none;
}

.user-field label {
  font-weight: 500;
  color: var(--text-color-secondary);
}

.user-value {
  font-weight: 600;
  color: var(--text-color);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 500;
  color: var(--text-color);
}

.form-input,
.form-select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  transition: var(--transition-base);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.profile-actions,
.form-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.profile-actions {
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.form-actions {
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .profile-actions,
  .form-actions {
    flex-direction: column;
  }
  
  .container {
    padding: 0 var(--spacing-md);
  }
}
</style>