<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useUserStore, UserStatus } from '@/stores/user'
import { APP_CONFIG } from '@/config/constants'
import Button from '@/components/Button.vue'

const userStore = useUserStore()

const getStatusText = (status: UserStatus) => {
  return status === UserStatus.DEV ? 'Разработчик' : 'Эксперт'
}
</script>

<template>
  <header class="header">
    <div class="header__container">
      <!-- Логотип и название -->
      <div class="header__brand">
        <img v-if="APP_CONFIG.logo" :src="APP_CONFIG.logo" :alt="APP_CONFIG.name" class="header__logo">
        <h1 class="header__title">{{ APP_CONFIG.name }}</h1>
      </div>

      <!-- Навигация -->
      <nav class="header__nav">
        <RouterLink to="/" class="header__nav-link" active-class="header__nav-link--active">
            Мои датасеты
        </RouterLink>
        <RouterLink to="/settings" class="header__nav-link" active-class="header__nav-link--active">
          Настройки
        </RouterLink>
      </nav>

      <!-- Профиль пользователя -->
      <div class="header__profile">
        <RouterLink to="/profile" class="profile-card">
          <div class="profile-card__info">
            <span class="profile-card__name">{{ userStore.user?.name }}</span>
            <span class="profile-card__status">{{ getStatusText(userStore.user?.status!) }}</span>
          </div>
          <div class="profile-card__avatar">
            {{ userStore.user?.name?.charAt(0).toUpperCase() }}
          </div>
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  background-color: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header__container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md) var(--spacing-lg);
  gap: var(--spacing-lg);
}

.header__brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.header__logo {
  height: 32px;
  width: 32px;
}

.header__title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--primary-color);
  margin: 0;
}

.header__nav {
  display: flex;
  gap: var(--spacing-lg);
  flex: 1;
  justify-content: center;
}

.header__nav-link {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  text-decoration: none;
  color: var(--text-color-secondary);
  font-weight: 500;
  transition: var(--transition-base);
}

.header__nav-link:hover {
  background-color: var(--bg-color-accent);
  color: var(--text-color);
}

.header__nav-link--active {
  background-color: var(--primary-color);
  color: var(--text-color-button);
}

.profile-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius);
  text-decoration: none;
  color: var(--text-color);
  transition: var(--transition-base);
  border: 1px solid var(--border-color);
}

.profile-card:hover {
  background-color: var(--bg-color-accent);
  border-color: var(--border-color-hover);
}

.profile-card__info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.profile-card__name {
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.profile-card__status {
  font-size: var(--font-size-xs);
  color: var(--text-color-secondary);
}

.profile-card__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: var(--text-color-button);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--font-size-sm);
}
</style>