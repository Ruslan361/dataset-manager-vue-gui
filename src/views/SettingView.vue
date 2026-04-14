<script setup lang="ts">
import Header from '@/components/Header.vue'
import KMeansSettings from '@/components/settings/KMeansSettings.vue'
import OtherSettings from '@/components/settings/OtherSettings.vue'
import ThemeSettings from '@/components/settings/ThemeSettings.vue'
</script>

<template>
  <div class="settings-view">
    <Header />
    <main class="settings-main">

      <section class="settings-section">
        <h2 class="section-title">Алгоритм K-Means</h2>
        <KMeansSettings />
      </section>

      <section class="settings-section">
        <h2 class="section-title">Тема оформления</h2>
        <ThemeSettings />
      </section>

      <section class="settings-section settings-section--narrow">
        <h2 class="section-title">Прочее</h2>
        <OtherSettings />
      </section>

    </main>
  </div>
</template>

<style scoped>
.settings-view {
  min-height: 100vh;
  background: var(--bg-color-secondary);
}

.settings-main {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.settings-section {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.settings-section--narrow {
  max-width: 480px;
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 var(--spacing-lg);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-color);
}
</style>
