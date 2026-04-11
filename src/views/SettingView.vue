<script setup lang="ts">
import KMeansSettings from '@/components/settings/KMeansSettings.vue'
import { ref, onMounted, computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { datasetsAPI, type Dataset } from '@/api/datasets'
import Header from '@/components/Header.vue'
import OtherSettings from '@/components/settings/OtherSettings.vue'

</script>
<template>
  <div class="settings-view">
    <Header />
    <main class="settings-view__main">
      <div class="kmeans-settings-container">
        <h2 class="settings-view__title">Настройки алгоритмов кластеризации</h2>
        <KMeansSettings />
      </div>
      <div class="service-settings-container">
        <h2 class="service-settings-container__title">Прочее</h2>
        <OtherSettings />
      </div>
    </main>
  </div>
</template>
<style scoped></style>

