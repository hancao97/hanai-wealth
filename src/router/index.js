import { createRouter, createWebHistory } from 'vue-router'
import StockList from '@/components/StockList.vue'
import StockDetail from '@/components/StockDetail.vue'

const routes = [
  {
    path: '/',
    name: 'StockList',
    component: StockList
  },
  {
    path: '/detail',
    name: 'StockDetail',
    component: StockDetail
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
