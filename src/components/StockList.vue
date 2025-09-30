<template>
  <div class="container">
    <!-- 页面头部 -->
    <div class="header">
      <div class="header-content">
        <div class="title-section">
          <h1>HANAI · WEALTH</h1>
          <p>智能股票价值分析 · 专业投资决策支持</p>
        </div>
        <div class="date-selector">
          <label for="dateSelect">数据日期</label>
          <select 
            id="dateSelect" 
            class="date-select-input"
            v-model="currentDate"
            @change="handleDateChange"
          >
            <option v-for="date in availableDates" :key="date" :value="date">
              {{ date }}
            </option>
          </select>
          <div class="date-status" :class="dateStatusClass">
            {{ dateStatusText }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 仪表板 -->
    <Transition name="dashboard-appear" appear>
      <div class="dashboard">
        <div class="dashboard-row">
          <!-- 价值评估分布 -->
          <div class="dashboard-card chart-card" :class="{ 'loading': !allData.length }">
            <h3>
              <span class="chart-icon">📈</span>
              价值评估分布
              <div class="chart-decoration"></div>
            </h3>
            <div class="chart-container">
              <div v-show="!loading && allData.length" ref="valuationChartRef" style="width: 100%; height: 300px;"></div>
              <div v-show="loading || !allData.length" class="chart-loading">
                <div class="chart-skeleton">
                  <div class="skeleton-circle"></div>
                  <div class="skeleton-bars">
                    <div class="skeleton-bar" v-for="n in 5" :key="n" :style="{ height: Math.random() * 60 + 20 + '%', animationDelay: n * 0.1 + 's' }"></div>
                  </div>
                </div>
                <p class="loading-text">正在生成图表...</p>
              </div>
            </div>
          </div>

          <!-- 涨跌幅分布 -->
          <div class="dashboard-card chart-card" :class="{ 'loading': !allData.length }">
            <h3>
              <span class="chart-icon">📊</span>
              涨跌幅分布
              <div class="chart-decoration"></div>
            </h3>
            <div class="chart-container">
              <div v-show="!loading && allData.length" ref="changeChartRef" style="width: 100%; height: 300px;"></div>
              <div v-show="loading || !allData.length" class="chart-loading">
                <div class="chart-skeleton">
                  <div class="skeleton-circle"></div>
                  <div class="skeleton-bars">
                    <div class="skeleton-bar" v-for="n in 5" :key="n" :style="{ height: Math.random() * 60 + 20 + '%', animationDelay: n * 0.1 + 's' }"></div>
                  </div>
                </div>
                <p class="loading-text">正在生成图表...</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 股息率统计 -->
        <div class="dividend-stats-container">
        <h3 class="dividend-stats-title">股息率分布统计</h3>
        <div class="dividend-stats-grid">
          <AnimatedCounter
            v-for="(item, key) in dividendStatsItems" 
            :key="key"
            :value="item.count"
            :label="item.label"
            :description="item.desc"
            :variant="getDividendVariant(key)"
            :icon="getDividendIcon(key)"
            :trend="getDividendTrend(key)"
            :clickable="true"
            :class="[`dividend-${key}`, { 'counter-active': filters.dividend === key }]"
            @click="handleDividendFilter(key)"
            :duration="600 + Math.random() * 400"
            easing="easeOutBounce"
          />
        </div>
      </div>
      
        <!-- 市场概览统计 -->
      <div class="market-overview-container">
        <h3 class="market-overview-title">
          <span class="title-icon">📊</span>
          市场概览
          <span class="title-decoration"></span>
        </h3>
        <div class="market-overview-grid">
          <div class="market-stat-card price-card">
            <div class="market-stat-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7h20l-10-5z"/>
                <path d="M2 17h20l-10 5-10-5z"/>
                <path d="M7 12h10"/>
              </svg>
            </div>
            <div class="market-stat-content">
              <div class="market-stat-value-wrapper">
                <AnimatedNumber
                  :value="marketOverview.avgPrice"
                  :decimals="2"
                  prefix="¥"
                  separator=","
                  :duration="800"
                  easing="easeOutCubic"
                  class="market-stat-value enhanced"
                />
                <div class="value-particles" v-if="priceUpdating">
                  <div class="particle" v-for="n in 8" :key="n"></div>
                </div>
              </div>
              <div class="market-stat-label">平均股价</div>
              <Transition name="stat-content" mode="out-in">
                <div class="market-stat-trend enhanced" :key="marketOverview.priceLevel.text">
                  <span class="trend-icon pulsing">{{ marketOverview.priceLevel.icon }}</span>
                  <span class="trend-text">{{ marketOverview.priceLevel.text }}</span>
                  <div class="trend-glow"></div>
                </div>
              </Transition>
            </div>
          </div>
          
          <div class="market-stat-card pe-card">
            <div class="market-stat-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div class="market-stat-content">
              <div class="market-stat-value-wrapper">
                <AnimatedNumber
                  :value="marketOverview.avgPE"
                  :decimals="2"
                  separator=","
                  :duration="900"
                  easing="easeOutCubic"
                  class="market-stat-value enhanced"
                />
                <div class="value-particles" v-if="peUpdating">
                  <div class="particle" v-for="n in 8" :key="n"></div>
                </div>
              </div>
              <div class="market-stat-label">平均市盈率（排除1000以上异常值和亏损企业）</div>
              <Transition name="stat-content" mode="out-in">
                <div class="market-stat-trend enhanced" :key="marketOverview.peLevel.text">
                  <span class="trend-icon pulsing">{{ marketOverview.peLevel.icon }}</span>
                  <span class="trend-text">{{ marketOverview.peLevel.text }}</span>
                  <div class="trend-glow"></div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
        </div>
      </div>
    </Transition>
    
    <!-- 筛选器 -->
    <div class="filters">
      <div class="filter-row">
        <div class="filter-group">
          <label for="companyFilter">公司名称</label>
          <input 
            type="text" 
            id="companyFilter" 
            class="filter-input" 
            placeholder="输入公司名称进行筛选..."
            v-model="filters.company"
            @input="handleFilterChange('company', $event.target.value)"
          >
        </div>
        
        <div class="filter-group">
          <label for="valuationFilter">价值评估</label>
          <select 
            id="valuationFilter" 
            class="filter-input"
            v-model="filters.valuation"
            @change="handleFilterChange('valuation', $event.target.value)"
          >
            <option value="">所有估值</option>
            <option value="0">数据不足</option>
            <option value="1">数据长久未更新，谨慎使用</option>
            <option value="2">价值陷阱嫌疑</option>
            <option value="3">严重低估</option>
            <option value="4">低估</option>
            <option value="5">合理范围</option>
            <option value="6">高估</option>
            <option value="7">严重高估</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="industryFilter">行业</label>
          <select 
            id="industryFilter" 
            class="filter-input"
            v-model="filters.industry"
            @change="handleFilterChange('industry', $event.target.value)"
          >
            <option value="">所有行业</option>
            <option v-for="industry in industries" :key="industry" :value="industry">
              {{ industry }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="boardFilter">板块</label>
          <select 
            id="boardFilter" 
            class="filter-input"
            v-model="filters.board"
            @change="handleFilterChange('board', $event.target.value)"
          >
            <option value="">所有板块</option>
            <option value="主板">主板</option>
            <option value="创业板">创业板</option>
            <option value="科创板">科创板</option>
            <option value="北证">北证</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="dividendFilter">股息率</label>
          <select 
            id="dividendFilter" 
            class="filter-input"
            v-model="filters.dividend"
            @change="handleFilterChange('dividend', $event.target.value)"
          >
            <option value="">所有股息率</option>
            <option value="low">低股息 (< 1%)</option>
            <option value="medium">中等股息 (1-3%)</option>
            <option value="high">高股息 (3-5%)</option>
            <option value="super-high">超高股息 (5-8%)</option>
            <option value="abnormal">异常高股息 (> 8%)</option>
            <option value="no-data">无股息数据</option>
          </select>
        </div>
      </div>
    </div>
    
    <!-- 状态栏 -->
    <div class="status-bar" :class="{ 'loading': loading }">
      <div class="results-count">
        <Transition name="count" mode="out-in">
          <span v-if="loading" key="loading" class="loading-text">
            <div class="loading-spinner"></div>
            加载中...
          </span>
          <span v-else-if="filteredData.length === 0" key="empty">
            显示 0 / {{ allData.length.toLocaleString() }} 条记录
          </span>
          <span v-else key="results" class="results-text">
            显示 
            <AnimatedNumber :value="startIndex" :duration="300" class="result-number" />
            -
            <AnimatedNumber :value="endIndex" :duration="300" class="result-number" />
            / 
            <AnimatedNumber :value="filteredData.length" :duration="400" separator="," class="result-number" />
            条记录 (总计 
            <AnimatedNumber :value="allData.length" :duration="500" separator="," class="result-number total" />
            条)
          </span>
        </Transition>
      </div>
      <Transition name="loading-indicator">
        <div v-if="loading" class="loading-indicator">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <span class="loading-text-secondary">正在加载数据...</span>
        </div>
      </Transition>
    </div>
    
    <!-- 错误信息 -->
    <div v-if="error" class="error-message">{{ error }}</div>
    
    <!-- 数据表格 -->
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>公司</th>
            <th>行业</th>
            <th>板块</th>
            <th>价格</th>
            <th>涨跌幅</th>
            <th>市盈率</th>
            <th>股息率</th>
            <th>合理估值</th>
            <th>价值评分</th>
            <th>价值评估</th>
            <th>市值</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="item in currentPageData" 
            :key="item.stockid"
            class="table-row clickable"
            @click="viewStockDetail(item)"
          >
            <td>
              <div class="company-info">
                <div class="company-name" :title="item.company || 'N/A'">
                  {{ truncateText(item.company || 'N/A', 20) }}
                </div>
                <div class="company-symbol">{{ item.symbol || 'N/A' }}</div>
              </div>
            </td>
            <td :title="item.industry || 'N/A'">
              {{ truncateText(item.industry || 'N/A', 16) }}
            </td>
            <td>
              <span class="board-tag" :class="getBoardClass(item.board || detectStockBoard(item.symbol))">
                {{ item.board || detectStockBoard(item.symbol) }}
              </span>
            </td>
            <td class="price">
              <div class="price-info">
                <span class="price-value">{{ formatPrice(item.price) }}</span>
              </div>
            </td>
            <td :style="{ color: getPriceChangeColor(item.p_pct_change), fontWeight: '600' }">
              {{ formatPercentage(item.p_pct_change) }}
            </td>
            <td class="pe-ratio">
              <div class="pe-info">
                <span class="pe-value">{{ formatPE(item.pettm) }}</span>
              </div>
            </td>
            <td class="dividend-yield">{{ formatDividendYield(item.yield) }}</td>
            <td class="gf-value-cell" v-html="formatGFValue(item.gf_value, item.price)"></td>
            <td>
              <span class="gf-score" :style="{ fontWeight: '600', color: getScoreColor(item.gf_score) }">
                {{ item.gf_score || 'N/A' }}
              </span>
            </td>
            <td :style="{ fontWeight: '700', fontSize: '13px', color: getValuationColor(item.gf_valuation) }">
              {{ getValuationDescription(item.gf_valuation) }}
            </td>
            <td>{{ formatMarketCap(item.mktcap_norm_currency) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页控件 -->
    <div class="pagination" v-if="totalPages > 1">
      <button 
        class="pagination-btn" 
        :class="{ disabled: currentPage === 1 }"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        上一页
      </button>
      
      <!-- 页码按钮 -->
      <template v-for="page in visiblePages" :key="page">
        <span v-if="page === '...'" class="pagination-info">...</span>
        <button 
          v-else
          class="pagination-btn" 
          :class="{ active: page === currentPage }"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
      </template>
      
      <button 
        class="pagination-btn" 
        :class="{ disabled: currentPage === totalPages }"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        下一页
      </button>
      
      <span class="pagination-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
    </div>

    <!-- 无结果显示 -->
    <div v-if="!loading && filteredData.length === 0 && allData.length > 0" class="no-results">
      <p>没有找到符合条件的数据</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useStockDataStore } from '@/stores/stockData'
import * as echarts from 'echarts'
import AnimatedNumber from './AnimatedNumber.vue'
import AnimatedCounter from './AnimatedCounter.vue'

const router = useRouter()
const stockStore = useStockDataStore()

// 响应式引用
const valuationChartRef = ref(null)
const changeChartRef = ref(null)
let valuationChart = null
let changeChart = null

// 动画状态
const isUpdating = ref(false)
const priceUpdating = ref(false)
const peUpdating = ref(false)
const animatedStats = ref({
  avgPrice: 0,
  avgPE: 0,
  dividendStats: {}
})

// 从store中获取状态和方法 - 使用storeToRefs保持响应性
const {
  allData,
  filteredData,
  availableDates,
  currentDate,
  currentPage,
  totalPages,
  currentPageData,
  loading,
  error,
  filters,
  industries,
  dividendStats,
  marketOverview
} = storeToRefs(stockStore)

const {
  loadDatesConfig,
  loadDataForDate,
  updateFilter,
  goToPage,
  detectStockBoard,
} = stockStore

// 计算属性
const startIndex = computed(() => (currentPage.value - 1) * stockStore.pageSize + 1)
const endIndex = computed(() => Math.min(currentPage.value * stockStore.pageSize, filteredData.value.length))

const dateStatusText = computed(() => {
  if (loading.value) return '加载中...'
  if (error.value) return '加载失败'
  if (currentDate.value && allData.value.length > 0) {
    return `${currentDate.value} 数据已加载 (${allData.value.length.toLocaleString()}条)`
  }
  return '选择日期以查看数据'
})

const dateStatusClass = computed(() => {
  if (loading.value) return 'loading'
  if (error.value) return 'error'
  if (currentDate.value && allData.value.length > 0) return 'success'
  return ''
})

// 股息率统计项
const dividendStatsItems = computed(() => ({
  low: {
    count: dividendStats.value.low,
    label: '低股息 (< 1%)',
    desc: '分红微弱，典型成长股'
  },
  medium: {
    count: dividendStats.value.medium,
    label: '中等股息 (1-3%)',
    desc: '接近市场平均水平'
  },
  high: {
    count: dividendStats.value.high,
    label: '高股息 (3-5%)',
    desc: '高于大盘，稳定现金流'
  },
  'super-high': {
    count: dividendStats.value.superHigh,
    label: '超高股息 (5-8%)',
    desc: '银行煤炭等传统行业'
  },
  abnormal: {
    count: dividendStats.value.abnormal,
    label: '异常高股息 (> 8%)',
    desc: '需谨慎，可能不可持续'
  },
  'no-data': {
    count: dividendStats.value.noData,
    label: '无股息数据',
    desc: '缺少分红信息'
  }
}))

// 分页可见页码
const visiblePages = computed(() => {
  const pages = []
  const maxVisiblePages = 7
  const startPage = Math.max(1, currentPage.value - Math.floor(maxVisiblePages / 2))
  const endPage = Math.min(totalPages.value, startPage + maxVisiblePages - 1)
  
  if (startPage > 1) {
    pages.push(1)
    if (startPage > 2) pages.push('...')
  }
  
  for (let page = startPage; page <= endPage; page++) {
    pages.push(page)
  }
  
  if (endPage < totalPages.value) {
    if (endPage < totalPages.value - 1) pages.push('...')
    pages.push(totalPages.value)
  }
  
  return pages
})

// 事件处理
const handleDateChange = async () => {
  if (currentDate.value) {
    await loadDataForDate(currentDate.value)
    updateCharts()
    // 保存日期变化到本地存储
    stockStore.saveFiltersToStorage()
  }
}

const handleFilterChange = (key, value) => {
  updateFilter(key, value)
}

const handleDividendFilter = (dividend) => {
  if (filters.value.dividend === dividend) {
    updateFilter('dividend', '')
  } else {
    updateFilter('dividend', dividend)
  }
}

const viewStockDetail = (item) => {
  router.push({
    name: 'StockDetail',
    query: {
      stockid: item.stockid,
      date: currentDate.value
    }
  })
}

// 数字动画函数
const animateNumber = (from, to, duration = 600) => {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const startValue = from
    const endValue = to
    const difference = endValue - startValue
    
    const updateValue = () => {
      const currentTime = Date.now()
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // 使用 easeOutQuart 缓动函数
      const easedProgress = 1 - Math.pow(1 - progress, 4)
      const currentValue = startValue + (difference * easedProgress)
      
      if (progress < 1) {
        requestAnimationFrame(updateValue)
      } else {
        resolve(endValue)
      }
      
      return currentValue
    }
    
    updateValue()
  })
}

// 获取股息率卡片变体
const getDividendVariant = (key) => {
  const variants = {
    'low': 'default',
    'medium': 'info',
    'high': 'success',
    'super-high': 'warning',
    'abnormal': 'error',
    'no-data': 'default'
  }
  return variants[key] || 'default'
}

// 获取股息率卡片图标
const getDividendIcon = (key) => {
  const icons = {
    'low': 'chart',
    'medium': 'trending',
    'high': 'dollar',
    'super-high': 'percent',
    'abnormal': 'users',
    'no-data': 'chart'
  }
  return icons[key] || 'chart'
}

// 获取股息率趋势
const getDividendTrend = (key) => {
  const trends = {
    'low': { type: 'neutral', icon: '📊', text: '成长型股票' },
    'medium': { type: 'up', icon: '📈', text: '稳健收益' },
    'high': { type: 'up', icon: '💰', text: '价值投资' },
    'super-high': { type: 'up', icon: '🔥', text: '高分红' },
    'abnormal': { type: 'down', icon: '⚠️', text: '需谨慎' },
    'no-data': { type: 'neutral', icon: '❓', text: '数据缺失' }
  }
  return trends[key] || null
}

// 触发数字更新动画
const triggerStatsAnimation = async () => {
  isUpdating.value = true
  
  // 动画平均价格
  if (marketOverview.value.avgPrice !== animatedStats.value.avgPrice) {
    priceUpdating.value = true
    await new Promise(resolve => setTimeout(resolve, 800))
    animatedStats.value.avgPrice = marketOverview.value.avgPrice
    priceUpdating.value = false
  }
  
  // 动画平均PE
  if (marketOverview.value.avgPE !== animatedStats.value.avgPE) {
    peUpdating.value = true
    await new Promise(resolve => setTimeout(resolve, 900))
    animatedStats.value.avgPE = marketOverview.value.avgPE
    peUpdating.value = false
  }
  
  isUpdating.value = false
}

// 工具函数
const truncateText = (text, length) => {
  if (!text) return 'N/A'
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

const formatPrice = (price) => {
  if (!price) return 'N/A'
  if (typeof price === 'string') {
    if (price.includes('¥') || price.includes('$')) {
      return price
    }
    const numPrice = parseFloat(price)
    if (isNaN(numPrice)) return price
    return `¥${numPrice.toFixed(2)}`
  }
  return `¥${price.toFixed(2)}`
}

const formatPercentage = (value) => {
  if (value === undefined || value === null) return 'N/A'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return 'N/A'
  return numValue.toFixed(2) + '%'
}

const formatPE = (pe) => {
  if (!pe) return 'N/A'
  const numPE = typeof pe === 'string' ? parseFloat(pe) : pe
  if (!isNaN(numPE) && numPE > 1000) return '>1000'
  if (isNaN(numPE)) return pe
  return numPE.toFixed(1)
}

const formatDividendYield = (yieldValue) => {
  if (!yieldValue) return 'N/A'
  const numYield = typeof yieldValue === 'string' ? parseFloat(yieldValue) : yieldValue
  if (isNaN(numYield) || numYield < 0) return 'N/A'
  return `${numYield.toFixed(2)}%`
}

const formatGFValue = (gfValue, currentPrice) => {
  if (!gfValue || gfValue === 0 || isNaN(parseFloat(gfValue))) {
    return '<span class="gf-value no-data">无数据</span>'
  }
  
  const gfVal = parseFloat(gfValue)
  const currPrice = parseFloat(currentPrice?.toString().replace('¥', '')) || 0
  
  let className = 'no-data'
  let displayText = `¥${gfVal.toFixed(2)}`
  
  if (currPrice > 0) {
    if (gfVal > currPrice) {
      className = 'undervalued'
      const upside = ((gfVal - currPrice) / currPrice * 100).toFixed(1)
      displayText = `¥${gfVal.toFixed(2)} (+${upside}%)`
    } else if (gfVal < currPrice) {
      className = 'overvalued'
      const downside = ((currPrice - gfVal) / currPrice * 100).toFixed(1)
      displayText = `¥${gfVal.toFixed(2)} (-${downside}%)`
    } else {
      className = 'undervalued'
      displayText = `¥${gfVal.toFixed(2)} (合理)`
    }
  }
  
  return `<span class="gf-value ${className}">${displayText}</span>`
}

const formatMarketCap = (value) => {
  if (!value) return 'N/A'
  
  if (value >= 1e12) {
    return (value / 1e12).toFixed(2) + '万亿'
  } else if (value >= 1e8) {
    return (value / 1e8).toFixed(2) + '亿'
  } else if (value >= 1e4) {
    return (value / 1e4).toFixed(2) + '万'
  }
  return value.toFixed(2)
}

const getPriceChangeColor = (change) => {
  if (change > 0) return '#ef4444'
  if (change < 0) return '#10b981'
  return '#78716c'
}

const getScoreColor = (score) => {
  if (!score) return '#94a3b8'
  const numScore = typeof score === 'string' ? parseFloat(score) : score
  if (isNaN(numScore)) return '#94a3b8'
  
  if (numScore >= 80) return '#10b981'
  if (numScore >= 60) return '#f59e0b'
  if (numScore >= 40) return '#ef4444'
  return '#6b7280'
}

const getValuationColor = (valuation) => {
  const colors = {
    0: '#6b7280',
    1: '#dc2626',
    2: '#dc2626',
    3: '#059669',
    4: '#10b981',
    5: '#3b82f6',
    6: '#f59e0b',
    7: '#dc2626'
  }
  return colors[valuation] || '#94a3b8'
}

const getValuationDescription = (valuation) => {
  const descriptions = {
    0: '数据不足',
    1: '数据长久未更新，谨慎使用',
    2: '价值陷阱嫌疑',
    3: '严重低估',
    4: '低估',
    5: '合理范围',
    6: '高估',
    7: '严重高估'
  }
  return descriptions[valuation] || '未知'
}

const getBoardClass = (board) => {
  const classMap = {
    '主板': 'board-main',
    '创业板': 'board-growth',
    '科创板': 'board-star',
    '北证': 'board-north'
  }
  return classMap[board] || 'board-main'
}

// 图表相关方法
const initCharts = async () => {
  await nextTick()
  
  if (valuationChartRef.value && !valuationChart) {
    valuationChart = echarts.init(valuationChartRef.value)
  }
  
  if (changeChartRef.value && !changeChart) {
    changeChart = echarts.init(changeChartRef.value)
  }
  
  updateCharts()
}

const updateCharts = () => {
  if (!Array.isArray(allData.value) || allData.value.length === 0) return
  
  updateValuationChart()
  updateChangeChart()
}

const updateValuationChart = () => {
  if (!valuationChart) return
  
  const valuationCounts = getValuationCounts()
  
  const option = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
    animationDelay: (idx) => idx * 100,
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      borderRadius: 8,
      textStyle: { color: '#334155', fontSize: 13 },
      extraCssText: 'backdrop-filter: blur(10px); box-shadow: 0 8px 24px rgba(0,0,0,0.12);'
    },
    series: [{
      name: '价值评估分布',
      type: 'pie',
      roseType: 'radius',
      radius: ['45%', '75%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      padAngle: 2,
      itemStyle: {
        borderRadius: 8,
        borderColor: 'rgba(255,255,255,0.8)',
        borderWidth: 2,
        shadowBlur: 5,
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffsetY: 2
      },
      label: {
        show: true,
        position: 'outside',
        formatter: function(params) {
          return `{name|${params.name}}\n{value|${params.value}个}`
        },
        rich: {
          name: {
            fontSize: 12,
            fontWeight: '600',
            color: '#334155',
            lineHeight: 18
          },
          value: {
            fontSize: 10,
            fontWeight: '500',
            color: '#64748b',
            lineHeight: 14
          }
        },
        distanceToLabelLine: 5
      },
      emphasis: {
        label: {
          fontSize: '13',
          fontWeight: 'bold'
        },
        itemStyle: {
          shadowBlur: 12,
          shadowOffsetY: 3,
          shadowColor: 'rgba(0, 0, 0, 0.15)',
          borderWidth: 3,
          borderColor: 'rgba(255,255,255,0.9)'
        },
        scale: true,
        scaleSize: 5
      },
      labelLine: {
        show: true,
        length: 12,
        length2: 8,
        smooth: true,
        lineStyle: {
          color: '#94a3b8',
          width: 2,
          type: 'solid',
          cap: 'round',
          opacity: 0.9
        }
      },
      data: valuationCounts.map((item, index) => ({
        value: item.count,
        name: item.label,
        itemStyle: { 
          color: item.color,
          borderColor: 'rgba(255,255,255,0.8)',
          borderWidth: 2
        },
        animationDelay: index * 150
      }))
    }]
  }
  
  valuationChart.setOption(option)
}

const updateChangeChart = () => {
  if (!changeChart) return
  
  const changeCounts = getChangeCounts()
  
  const option = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 1200,
    animationEasing: 'elasticOut',
    animationDelay: (idx) => idx * 120,
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      borderRadius: 8,
      textStyle: { color: '#334155', fontSize: 13 },
      extraCssText: 'backdrop-filter: blur(10px); box-shadow: 0 8px 24px rgba(0,0,0,0.12);'
    },
    series: [{
      name: '涨跌幅分布',
      type: 'pie',
      roseType: 'radius',
      radius: ['45%', '75%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      padAngle: 2,
      itemStyle: {
        borderRadius: 8,
        borderColor: 'rgba(255,255,255,0.8)',
        borderWidth: 2,
        shadowBlur: 5,
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffsetY: 2
      },
      label: {
        show: true,
        position: 'outside',
        formatter: function(params) {
          return `{name|${params.name}}\n{value|${params.value}个}`
        },
        rich: {
          name: {
            fontSize: 12,
            fontWeight: '600',
            color: '#334155',
            lineHeight: 18
          },
          value: {
            fontSize: 10,
            fontWeight: '500',
            color: '#64748b',
            lineHeight: 14
          }
        },
        distanceToLabelLine: 5
      },
      emphasis: {
        label: {
          fontSize: '13',
          fontWeight: 'bold'
        },
        itemStyle: {
          shadowBlur: 12,
          shadowOffsetY: 3,
          shadowColor: 'rgba(0, 0, 0, 0.15)',
          borderWidth: 3,
          borderColor: 'rgba(255,255,255,0.9)'
        },
        scale: true,
        scaleSize: 5
      },
      labelLine: {
        show: true,
        length: 12,
        length2: 8,
        smooth: true,
        lineStyle: {
          color: '#94a3b8',
          width: 2,
          type: 'solid',
          cap: 'round',
          opacity: 0.9
        }
      },
      data: changeCounts.map((item, index) => ({
        value: item.count,
        name: item.label,
        itemStyle: { 
          color: item.color,
          borderColor: 'rgba(255,255,255,0.8)',
          borderWidth: 2
        },
        animationDelay: index * 180
      }))
    }]
  }
  
  changeChart.setOption(option)
}

const getValuationCounts = () => {
  const counts = {}
  const labels = {
    0: '数据不足',
    1: '数据长久未更新，谨慎使用',
    2: '价值陷阱嫌疑',
    3: '严重低估',
    4: '低估',
    5: '合理范围',
    6: '高估',
    7: '严重高估'
  }
  const colors = {
    0: '#94a3b8',
    2: '#ef4444',
    3: '#10b981',
    4: '#06d6a0',
    5: '#3b82f6',
    6: '#f59e0b',
    7: '#dc2626'
  }
  
  allData.value.forEach(item => {
    const val = item.gf_valuation
    if (!counts[val]) {
      counts[val] = {
        count: 0,
        label: labels[val] || '未知',
        color: colors[val] || '#94a3b8'
      }
    }
    counts[val].count++
  })
  
  const orderedKeys = [3, 4, 5, 6, 7, 2, 0]
  return orderedKeys
    .filter(key => counts[key])
    .map(key => ({
      label: counts[key].label,
      count: counts[key].count,
      color: counts[key].color,
      percentage: ((counts[key].count / allData.value.length) * 100).toFixed(1)
    }))
}

const getChangeCounts = () => {
  const ranges = [
    { key: 'up5+', label: '上涨5%以上', min: 5, max: Infinity, color: '#e11d48' },
    { key: 'up2-5', label: '上涨2-5%', min: 2, max: 5, color: '#f43f5e' },
    { key: 'up0-2', label: '上涨0-2%', min: 0, max: 2, color: '#fb7185' },
    { key: 'flat', label: '平盘', min: 0, max: 0, color: '#64748b' },
    { key: 'down0-2', label: '下跌0-2%', min: -2, max: 0, color: '#4ade80' },
    { key: 'down2-5', label: '下跌2-5%', min: -5, max: -2, color: '#22c55e' },
    { key: 'down5+', label: '下跌5%以上', min: -Infinity, max: -5, color: '#16a34a' }
  ]
  
  const counts = {}
  ranges.forEach(range => {
    counts[range.key] = { ...range, count: 0 }
  })
  
  allData.value.forEach(item => {
    const change = item.p_pct_change
    if (change === undefined || change === null) return
    
    for (const range of ranges) {
      if (change === 0 && range.key === 'flat') {
        counts[range.key].count++
        break
      } else if (change > range.min && change <= range.max) {
        counts[range.key].count++
        break
      }
    }
  })
  
  const orderedKeys = ['up5+', 'up2-5', 'up0-2', 'flat', 'down0-2', 'down2-5', 'down5+']
  return orderedKeys
    .filter(key => counts[key] && counts[key].count > 0)
    .map(key => ({
      label: counts[key].label,
      count: counts[key].count,
      color: counts[key].color,
      percentage: ((counts[key].count / allData.value.length) * 100).toFixed(1)
    }))
}

// 响应式处理
const handleResize = () => {
  if (valuationChart) {
    valuationChart.resize()
  }
  if (changeChart) {
    changeChart.resize()
  }
}

// 生命周期
onMounted(async () => {
  await loadDatesConfig()
  await initCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (valuationChart) {
    valuationChart.dispose()
  }
  if (changeChart) {
    changeChart.dispose()
  }
  window.removeEventListener('resize', handleResize)
})

// 监听数据变化，更新图表和动画
watch(allData, async () => {
  if (allData.value.length > 0) {
    await nextTick()
    if (!valuationChart && valuationChartRef.value) {
      valuationChart = echarts.init(valuationChartRef.value)
    }
    if (!changeChart && changeChartRef.value) {
      changeChart = echarts.init(changeChartRef.value)
    }
    updateCharts()
  }
  triggerStatsAnimation()
}, { deep: true })

// 监听市场概览数据变化
watch(marketOverview, () => {
  triggerStatsAnimation()
}, { deep: true })
</script>

<style scoped>
@import '@/styles/main.css';
</style>
