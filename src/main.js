import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'

// 导入页面组件
import StockList from './components/StockList.vue'
import StockDetail from './components/StockDetail.vue'

// 创建路由
const routes = [
  {
    path: '/',
    name: 'StockList',
    component: StockList,
  },
  {
    path: '/detail',
    name: 'StockDetail',
    component: StockDetail,
    props: (route) => ({
      stockid: route.query.stockid,
      date: route.query.date,
    }),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 创建Pinia状态管理
const pinia = createPinia()

// 创建并挂载应用
const app = createApp(App)

app.use(router)
app.use(pinia)

app.mount('#app')
