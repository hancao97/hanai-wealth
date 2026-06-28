import { createRouter, createWebHistory } from 'vue-router'
import StockList from '@/components/StockList.vue'
import StockDetail from '@/components/StockDetail.vue'
import BullMarketReviewPage from '@/components/BullMarketReviewPage.vue'

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
  },
  {
    path: '/bull-market-review',
    name: 'BullMarketReview',
    component: BullMarketReviewPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
