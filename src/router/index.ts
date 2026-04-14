import { createRouter, createWebHistory } from 'vue-router'
import MainMenu from '@/views/MainMenu.vue'
import ImageView from '@/views/ImageView.vue'
import AnalysisView from '@/views/AnalysisView.vue'
import SettingView from '@/views/SettingView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'main_menu',
      component: MainMenu,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingView,
    },
    {
      path: '/dataset/:id',
      name: 'dataset',
      component: ImageView,
    },
    {
      path: '/analysis/:datasetId',
      name: 'analysis',
      component: AnalysisView,
      beforeEnter: (to, from, next) => {
        if (to.query.imageIds) {
          next()
        } else {
          next(`/dataset/${to.params.datasetId}`)
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