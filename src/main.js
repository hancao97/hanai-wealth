import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'

// 导入页面组件
import StockList from './components/StockList.vue'
import StockDetail from './components/StockDetail.vue'

// 导入内存监控工具（仅开发环境）
import { createGlobalMonitor, quickMemoryCheck } from './utils/memoryMonitor'

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

// 开发环境下启用内存监控
if (import.meta.env.DEV) {
  console.log('%c🔍 开发模式：内存监控已启用', 'color: #10b981; font-weight: bold; font-size: 14px')
  
  // 创建监控实例
  const monitor = createGlobalMonitor({
    maxSamples: 50,
    warningThreshold: 20,
    logInterval: 30000 // 30秒记录一次
  })
  
  // 启动自动监控
  monitor.startAutoMonitoring()
  
  // 初始检查
  setTimeout(() => {
    quickMemoryCheck()
  }, 2000)
  
  // 路由切换时记录内存
  router.afterEach(() => {
    setTimeout(() => {
      quickMemoryCheck()
    }, 1000)
  })
}
