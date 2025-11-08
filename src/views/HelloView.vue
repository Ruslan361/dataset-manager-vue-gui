<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import Hello from '@/components/Hello.vue'
import Register from '@/components/Register.vue'
import { useUserStore, UserStatus } from '@/stores/user'
import { onMounted, ref } from 'vue'
const userStore = useUserStore()

onMounted(() => {console.log(userStore.getUser()?.name)})
</script>

<template>
    <div v-if="!userStore.getUser()">
        <Hello></Hello>
    </div>
    <div v-else>
        <Register></Register>
    </div>
</template>

<style scoped>

</style>
