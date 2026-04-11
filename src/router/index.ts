import { createRouter, createWebHistory } from 'vue-router'
import Register from '@/components/Register.vue'
import MainMenu from '@/views/MainMenu.vue'
import ImageView from '@/views/ImageView.vue'
import AnalysisView from '@/views/AnalysisView.vue'
import { useUserStore } from '@/stores/user'
import SettingView from '@/views/SettingView.vue'
devtool: 'source-map'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'main_menu',
      component: MainMenu,
      beforeEnter: (to, from, next) => {
        const userStore = useUserStore()
          next()
      }
    },
        {
      path: '/settings',
      name: 'settings',
      component: SettingView,
      beforeEnter: (to, from, next) => {
        const userStore = useUserStore()
          next()
      }
    },
    {
      path: '/dataset/:id',
      name: 'dataset',
      component: ImageView,
      beforeEnter: (to, from, next) => {
        const userStore = useUserStore()
          next()
      }
    },
    {
      path: '/analysis/:datasetId',
      name: 'analysis',
      component: AnalysisView,
      beforeEnter: (to, from, next) => {
        const userStore = useUserStore()
        if (userStore.user) {
          // Проверяем наличие параметра imageIds в query
          if (to.query.imageIds) {
            next()
          } else {
            // Если нет imageIds, перенаправляем на датасет
            next(`/dataset/${to.params.datasetId}`)
          }
        } else {
          next('/register')
        }
      },
      props: route => ({
        datasetId: parseInt(route.params.datasetId as string),
        imageIds: route.query.imageIds ? 
          (route.query.imageIds as string).split(',').map(id => parseInt(id)) : 
          []
      })
    }
  ],
})

export default router