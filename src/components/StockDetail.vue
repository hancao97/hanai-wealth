<template>
  <div class="container">
    <!-- 数据日期显示 -->
    <div class="data-date">{{ dataDateText }}</div>
    
    <!-- 炫酷页面头部 -->
    <div class="hero-header">
      <button @click="goBackToList" class="back-btn">← 返回列表</button>
      <div class="hero-content">
        <div class="hero-title-section">
          <h1 class="hero-title">HANAI · WEALTH</h1>
          <p class="hero-subtitle">智能股票价值分析 · 专业投资决策支持</p>
        </div>
      </div>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      正在加载股票详情数据...
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="error">
      {{ error }}
    </div>

    <!-- 股票详情内容 -->
    <div v-if="stockData && !loading" class="stock-detail">
      <!-- 股票基础信息卡片 -->
      <div class="stock-info-card">
        <div class="stock-header">
          <div class="stock-title-group">
            <div class="stock-name-row">
              <h2 class="stock-name">{{ stockData.company || 'N/A' }}</h2>
              <span class="stock-symbol">{{ stockData.exchange_ }}:{{ stockData.symbol || 'N/A' }}</span>
            </div>
            <div class="stock-tags">
              <span class="tag board-tag" :class="getBoardClass(board)">{{ board }}</span>
              <span class="tag industry-tag">{{ stockData.industry || 'N/A' }}</span>
              <span class="tag sector-tag">{{ stockData.sector || 'N/A' }}</span>
              <span class="tag group-tag">{{ stockData.group || 'N/A' }}</span>
            </div>
          </div>
          <div class="stock-price-info">
            <div class="price-main">
              <span class="current-price">{{ formatPrice(stockData.price) }}</span>
              <span class="price-change" :class="priceChangeClass">
                {{ priceChangeText }}
              </span>
            </div>
            <div class="market-cap-info">
              总市值 <span>{{ formatMarketCap(stockData.mktcap_norm_currency) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 图表网格容器 -->
        <div class="charts-grid">
          <!-- PE估值图表 -->
          <div class="pe-chart-container-solo">
            <h4 class="pe-chart-title">市盈率历史区间</h4>
            <div class="pe-chart-wrapper">
              <div v-if="isCurrentLoss" class="loss-indicator">
                <div class="loss-icon">📉</div>
                <div class="loss-content">
                  <div class="loss-text">亏损企业</div>
                  <div class="loss-desc">当前处于亏损状态，无法计算市盈率</div>
                </div>
              </div>
              <div v-else>
                <div class="pe-range-bar">
                  <div class="pe-range-track"></div>
                  <div 
                    class="pe-current-marker" 
                    :style="{ left: pePosition + '%', background: peColor, display: pePosition >= 0 ? 'block' : 'none' }"
                  >
                    <span class="pe-current-value">{{ formatPE(stockData.pettm) }}</span>
                  </div>
                </div>
                <div class="pe-labels">
                  <span class="pe-label pe-low">
                    <span class="pe-label-title">10年最低</span>
                    <span class="pe-label-value">{{ formatPE(stockData.pettmlow) }}</span>
                  </span>
                  <span class="pe-label pe-current">
                    <span class="pe-label-title">当前TTM</span>
                    <span class="pe-label-value">{{ formatPE(stockData.pettm) }}</span>
                  </span>
                  <span class="pe-label pe-high">
                    <span class="pe-label-title">10年最高</span>
                    <span class="pe-label-value">{{ formatPE(stockData.pettmhigh) }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 股价区间图表 -->
          <div class="price-range-container">
            <h4 class="price-range-title">股价历史区间</h4>
            <div class="price-range-wrapper">
              <div class="price-range-bar">
                <div class="price-range-track"></div>
                <div 
                  class="price-current-marker" 
                  :style="{ left: pricePosition + '%', background: priceColor, display: pricePosition >= 0 ? 'block' : 'none' }"
                >
                  <span class="price-current-value">{{ formatPrice(stockData.price) }}</span>
                </div>
              </div>
              <div class="price-labels">
                <span class="price-label price-low">
                  <span class="price-label-title">10年最低</span>
                  <span class="price-label-value">{{ formatPrice(stockData.price10ylow) }}</span>
                </span>
                <span class="price-label price-current">
                  <span class="price-label-title">当前价格</span>
                  <span class="price-label-value">{{ formatPrice(stockData.price) }}</span>
                </span>
                <span class="price-label price-high">
                  <span class="price-label-title">10年最高</span>
                  <span class="price-label-value">{{ formatPrice(stockData.price10yhigh) }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据卡片网格 -->
      <div class="data-grid">
        <!-- 估值信息 -->
        <div class="data-card">
          <h3 class="data-card-title">
            <span class="data-card-icon">📊</span>
            <span>估值分析</span>
          </h3>
          <table class="data-table">
            <tbody>
              <tr>
                <td>GF估值评级</td>
                <td>
                  <span class="valuation-badge" :class="`valuation-${stockData.gf_valuation || 0}`">
                    {{ getValuationDescription(stockData.gf_valuation) }}
                  </span>
                </td>
              </tr>
              <tr>
                <td>GF合理估值</td>
                <td>{{ stockData.gf_value ? `¥${stockData.gf_value.toFixed(2)}` : 'N/A' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 财务指标 -->
        <div class="data-card">
          <h3 class="data-card-title">
            <span class="data-card-icon">💰</span>
            <span>财务表现</span>
          </h3>
          <table class="data-table">
            <tbody>
              <tr>
                <td>自由现金流</td>
                <td>{{ formatCashFlow(stockData.total_free_cash_flow) }}</td>
              </tr>
              <tr>
                <td>10年净利润增长</td>
                <td>{{ stockData.total_netincome_growth_10y ? `${stockData.total_netincome_growth_10y.toFixed(2)}%` : 'N/A' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 价格区间 -->
        <div class="data-card">
          <h3 class="data-card-title">
            <span class="data-card-icon">📈</span>
            <span>价格区间</span>
          </h3>
          <table class="data-table">
            <tbody>
              <tr>
                <td>10年年化回报</td>
                <td>{{ stockData.pchange_10y ? `${stockData.pchange_10y.toFixed(2)}%` : 'N/A' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 财务指标分析组件 -->
      <FinancialMetrics 
        :stock-data="stockData"
        :all-stocks-data="allStocksData"
        :current-date="props.date || route.query.date"
      />
      
      <!-- 五维评级体系 -->
      <div class="ratings-section">
        <h3 class="ratings-title">
          <span class="data-card-icon">⭐</span>
          <span>五维评级体系</span>
        </h3>
        <div class="ratings-container">
          <div class="radar-chart-wrapper">
            <div ref="radarChartRef" style="width: 100%; height: 400px;"></div>
          </div>
          <div class="ratings-details">
            <div class="ratings-grid">
              <div 
                v-for="(item, index) in ratingData" 
                :key="item.name"
                class="rating-item"
                :class="{ active: activeRatingIndex === index }"
                @click="highlightRatingItem(index)"
              >
                <div class="rating-tooltip">{{ getRatingTooltip(item.name, item.value) }}</div>
                <div class="rating-label">{{ item.name }}</div>
                <div class="star-rating">
                  <div 
                    v-for="star in 10" 
                    :key="star"
                    class="star" 
                    :class="{ filled: star <= item.value }"
                  ></div>
                </div>
                <div class="rating-score">{{ item.value }}/10</div>
              </div>
            </div>
            <div class="ratings-summary">
              <div class="summary-item">
                <span class="summary-label">大师评分</span>
                <span class="summary-value">{{ masterScore }}/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
        
      <!-- 公司信息 -->
      <div class="company-section">
        <h3 class="company-title">
          <span class="data-card-icon">🏢</span>
          <span>公司信息</span>
        </h3>
        
        <div class="company-card">
          <h4>
            <span class="data-card-icon">💼</span>
            <span>主营业务</span>
          </h4>
          <div class="description-card">
            {{ stockData.business_descrpt?.main_business || 'N/A' }}
          </div>
        </div>
          
        <div class="company-card">
          <h4>
            <span class="data-card-icon">📖</span>
            <span>公司简介</span>
          </h4>
          <div class="description-card">
            {{ stockData.business_descrpt?.descrpt || 'N/A' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import * as echarts from 'echarts'
import FinancialMetrics from './FinancialMetrics.vue'

const route = useRoute()
const router = useRouter()
const props = defineProps({
  stockid: String,
  date: String
})

// 响应式数据
const stockData = ref(null)
const allStocksData = ref([])
const loading = ref(true)
const error = ref(null)
const radarChartRef = ref(null)
const activeRatingIndex = ref(-1)
let radarChart = null

// 计算属性
const dataDateText = computed(() => {
  if (props.date) {
    const date = new Date(props.date)
    const options = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit'
    }
    return `数据日期: ${date.toLocaleDateString('zh-CN', options)}`
  }
  return ''
})

const board = computed(() => {
  if (!stockData.value) return '主板'
  return stockData.value.board || detectStockBoard(stockData.value.symbol)
})

const priceChangeText = computed(() => {
  if (!stockData.value) return '-'
  
  const pctChange = stockData.value.p_pct_change
  const priceChange = stockData.value.p_change
  
  if (pctChange !== undefined && priceChange !== undefined) {
    const priceChangeText = priceChange >= 0 ? `+${priceChange.toFixed(2)}` : `${priceChange.toFixed(2)}`
    const pctChangeText = pctChange >= 0 ? `+${pctChange.toFixed(2)}%` : `${pctChange.toFixed(2)}%`
    return `${priceChangeText} (${pctChangeText})`
  }
  return '-'
})

const priceChangeClass = computed(() => {
  if (!stockData.value) return 'price-change'
  
  const pctChange = stockData.value.p_pct_change
  let className = 'price-change'
  
  if (pctChange > 0) {
    className += ' up'
  } else if (pctChange < 0) {
    className += ' down'
  } else {
    className += ' flat'
  }
  
  return className
})

// PE图表相关计算
const isCurrentLoss = computed(() => {
  if (!stockData.value) return false
  const currentPE = parseFloat(stockData.value.pettm)
  return !stockData.value.pettm || stockData.value.pettm === 'N/A' || isNaN(currentPE) || currentPE <= 0
})

const pePosition = computed(() => {
  if (!stockData.value || isCurrentLoss.value) return -1
  
  const current = parseFloat(stockData.value.pettm)
  const high = parseFloat(stockData.value.pettmhigh)
  let low = parseFloat(stockData.value.pettmlow)
  
  if (!low || low === 'N/A' || isNaN(low) || low <= 0) {
    low = 0
  }
  
  if (current > 0 && high > 0 && high > low) {
    let position = ((current - low) / (high - low)) * 100
    return Math.max(5, Math.min(95, position))
  }
  
  return -1
})

const peColor = computed(() => {
  const position = pePosition.value
  if (position <= 33) return '#10b981' // 绿色 - 低估
  if (position <= 66) return '#f59e0b' // 橙色 - 合理
  return '#ef4444' // 红色 - 高估
})

// 股价区间相关计算
const pricePosition = computed(() => {
  if (!stockData.value) return -1
  
  const cleanPrice = (price) => {
    if (!price || price === 'N/A') return null
    if (typeof price === 'string') {
      return parseFloat(price.replace(/[¥$,]/g, ''))
    }
    return price
  }
  
  const current = cleanPrice(stockData.value.price)
  const high = cleanPrice(stockData.value.price10yhigh)
  const low = cleanPrice(stockData.value.price10ylow)
  
  if (current && high && low && !isNaN(current) && !isNaN(high) && !isNaN(low) && high > low) {
    let position = ((current - low) / (high - low)) * 100
    return Math.max(5, Math.min(95, position))
  }
  
  return -1
})

const priceColor = computed(() => {
  const position = pricePosition.value
  if (position <= 33) return '#ef4444' // 红色 - 接近历史低点
  if (position <= 66) return '#f59e0b' // 橙色 - 中等价位
  return '#10b981' // 绿色 - 接近历史高点
})

// 评级数据
const ratingData = computed(() => {
  if (!stockData.value) return []
  
  return [
    { name: '价值评级', value: getRankValue(stockData.value.rank_gf_value) },
    { name: '成长能力', value: getRankValue(stockData.value.rank_growth) },
    { name: '价值动量', value: getRankValue(stockData.value.rank_momentum) },
    { name: '盈利能力', value: getRankValue(stockData.value.rank_profitability) },
    { name: '财务实力', value: getRankValue(stockData.value.rank_balancesheet) }
  ]
})

const masterScore = computed(() => {
  if (!stockData.value) return 0
  
  const gfScore = stockData.value.gf_score
  if (!gfScore || gfScore <= 0) return 0
  
  return Math.max(0, Math.min(100, Math.round(gfScore)))
})

// 方法
const goBackToList = () => {
  // 直接使用路由器返回上一页，这样会保持列表页的状态
  router.push('/')
}

const loadStockData = async () => {
  try {
    loading.value = true
    error.value = null
    
    const stockid = props.stockid || route.query.stockid
    const date = props.date || route.query.date
    
    if (!stockid || !date) {
      throw new Error('缺少必要参数：stockid或date')
    }

    const response = await axios.get(`/assets/${date}.json`)
    const allData = response.data
    
    // 保存全部股票数据用于计算平均值
    allStocksData.value = allData
    
    const foundStock = allData.find(item => item.stockid === stockid)
    
    if (!foundStock) {
      throw new Error(`未找到stockid为 ${stockid} 的股票数据`)
    }

    stockData.value = foundStock
    
    // 更新页面标题
    document.title = `${foundStock.company || foundStock.symbol || 'N/A'} - 股票详情 - HANAI · WEALTH`
    
    // 延迟渲染雷达图
    await nextTick()
    setTimeout(() => {
      initRadarChart()
    }, 300)
    
  } catch (err) {
    error.value = `加载股票数据失败: ${err.message}`
    console.error('加载股票数据失败:', err)
  } finally {
    loading.value = false
  }
}

const initRadarChart = () => {
  if (!radarChartRef.value || !stockData.value) return
  
  radarChart = echarts.init(radarChartRef.value)
  
  const indicators = [
    { name: '价值评级', max: 10 },
    { name: '成长能力', max: 10 },
    { name: '价值动量', max: 10 },
    { name: '盈利能力', max: 10 },
    { name: '财务实力', max: 10 }
  ]
  
  const values = ratingData.value.map(item => item.value)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      show: true,
      trigger: 'item',
      confine: true,
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      borderRadius: 8,
      padding: [12, 16],
      textStyle: { 
        color: '#334155',
        fontSize: 14
      },
      formatter: function(params) {
        const indicators = ['价值评级', '成长能力', '价值动量', '盈利能力', '财务实力']
        
        if (params && params.value && Array.isArray(params.value)) {
          let content = '<div style="padding: 8px; max-width: 300px;">'
          content += '<div style="font-weight: bold; margin-bottom: 8px; color: #3b82f6;">大师评分详情</div>'
          
          params.value.forEach((value, index) => {
            const dimensionName = indicators[index] || `维度${index + 1}`
            let level = ''
            let color = ''
            
            if (value >= 8) {
              level = '优秀'
              color = '#10b981'
            } else if (value >= 6) {
              level = '良好'
              color = '#3b82f6'
            } else if (value >= 4) {
              level = '一般'
              color = '#f59e0b'
            } else {
              level = '较差'
              color = '#ef4444'
            }
            
            content += `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px;">${dimensionName}</span>
                <span style="color: ${color}; font-weight: bold;">${value}/10 (${level})</span>
              </div>
            `
          })
          
          content += '</div>'
          return content
        }
        
        return '暂无数据'
      }
    },
    radar: {
      center: ['50%', '55%'],
      radius: '60%',
      startAngle: 90,
      splitNumber: 5,
      shape: 'polygon',
      indicator: indicators,
      name: {
        textStyle: {
          color: '#334155',
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: [
            'rgba(59, 130, 246, 0.02)',
            'rgba(59, 130, 246, 0.04)',
            'rgba(59, 130, 246, 0.06)',
            'rgba(59, 130, 246, 0.08)',
            'rgba(59, 130, 246, 0.1)'
          ]
        }
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(59, 130, 246, 0.2)',
          width: 1
        }
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: 'rgba(59, 130, 246, 0.3)',
          width: 1
        }
      }
    },
    series: [{
      name: '大师评分',
      type: 'radar',
      symbol: 'circle',
      symbolSize: 8,
      itemStyle: {
        color: '#3b82f6',
        borderColor: '#ffffff',
        borderWidth: 2
      },
      lineStyle: {
        color: '#3b82f6',
        width: 3
      },
      areaStyle: {
        color: 'rgba(59, 130, 246, 0.15)'
      },
      emphasis: {
        itemStyle: {
          color: '#1d4ed8',
          borderColor: '#ffffff',
          borderWidth: 3,
          shadowBlur: 10,
          shadowColor: 'rgba(59, 130, 246, 0.5)'
        },
        lineStyle: {
          color: '#1d4ed8',
          width: 4
        },
        areaStyle: {
          color: 'rgba(59, 130, 246, 0.25)'
        }
      },
      data: [{
        value: values,
        name: '评分'
      }]
    }],
    animation: true,
    animationDuration: 1500,
    animationEasing: 'cubicOut'
  }

  radarChart.setOption(option, true)
  
  // 添加交互
  radarChart.on('mouseover', (params) => {
    if (params.componentType === 'radar') {
      const dimensionIndex = params.dataIndex || 0
      highlightRatingItem(dimensionIndex)
    }
  })
  
  radarChart.on('mouseout', () => {
    activeRatingIndex.value = -1
  })
}

const highlightRatingItem = (index) => {
  activeRatingIndex.value = index
}

const getRatingTooltip = (name, value) => {
  let level = ''
  let description = ''
  
  if (value >= 8) {
    level = '优秀'
    description = '表现卓越，超越市场平均水平'
  } else if (value >= 6) {
    level = '良好'
    description = '表现良好，高于市场平均水平'
  } else if (value >= 4) {
    level = '一般'
    description = '表现一般，接近市场平均水平'
  } else if (value >= 2) {
    level = '较差'
    description = '表现较差，低于市场平均水平'
  } else {
    level = '很差'
    description = '表现很差，远低于市场平均水平'
  }
  
  const tooltipTexts = {
    '价值评级': '基于估值模型的综合评价',
    '成长能力': '公司营收和利润增长潜力',
    '价值动量': '股价相对价值的变化趋势',
    '盈利能力': '公司盈利质量和稳定性',
    '财务实力': '资产负债结构和偿债能力'
  }
  
  const explanation = tooltipTexts[name] || '综合评估指标'
  
  return `${name}: ${level} (${value}/10)\n${explanation}\n${description}`
}

// 工具函数
const detectStockBoard = (symbol) => {
  if (!symbol || typeof symbol !== 'string') return '主板'
  
  const code = symbol.trim()
  
  if (/^(000|001|002|003|600|601|603|605)/.test(code)) return '主板'
  if (/^(300|301)/.test(code)) return '创业板'
  if (/^688/.test(code)) return '科创板'
  if (/^(43|83|87|92)/.test(code)) return '北证'
  
  return '主板'
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

const formatPrice = (price) => {
  if (!price) return 'N/A'
  if (typeof price === 'string') {
    if (price.includes('¥') || price.includes('$')) return price
    const numPrice = parseFloat(price)
    if (isNaN(numPrice)) return price
    return `¥${numPrice.toFixed(2)}`
  }
  return `¥${price.toFixed(2)}`
}

const formatPE = (pe) => {
  if (!pe) return 'N/A'
  const numPE = typeof pe === 'string' ? parseFloat(pe) : pe
  if (isNaN(numPE)) return pe
  return numPE.toFixed(1)
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

const formatCashFlow = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  
  const absValue = Math.abs(value)
  let unit = ''
  let num = value
  
  if (absValue >= 1e12) {
    num = value / 1e12
    unit = '万亿'
  } else if (absValue >= 1e8) {
    num = value / 1e8
    unit = '亿'
  } else if (absValue >= 1e4) {
    num = value / 1e4
    unit = '万'
  }
  
  return num.toFixed(2) + unit
}

const getValuationDescription = (valuation) => {
  const descriptions = {
    0: '数据不足',
    1: '数据长久未更新',
    2: '价值陷阱嫌疑',
    3: '严重低估',
    4: '低估',
    5: '合理范围',
    6: '高估',
    7: '严重高估'
  }
  return descriptions[valuation] || '未知'
}

const getRankValue = (rankValue) => {
  const rankValueNum = parseFloat(rankValue)
  if (isNaN(rankValueNum)) return 0
  return rankValueNum
}

// 响应式处理
const handleResize = () => {
  if (radarChart && !radarChart.isDisposed()) {
    radarChart.resize()
  }
}

// 生命周期
onMounted(async () => {
  await loadStockData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (radarChart && !radarChart.isDisposed()) {
    radarChart.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
@import '@/styles/detail.css';
</style>
