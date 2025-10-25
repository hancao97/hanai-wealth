<template>
  <div class="ai-chat-container">
    <!-- 浮动按钮 -->
    <div v-if="!isOpen" class="fab-wrapper">
      <!-- 外层脉冲波纹 -->
      <div class="pulse-ring pulse-ring-1"></div>
      <div class="pulse-ring pulse-ring-2"></div>
      <div class="pulse-ring pulse-ring-3"></div>
      
      <!-- 粒子特效 -->
      <div class="particles">
        <span class="particle" v-for="i in 8" :key="i" :style="getParticleStyle(i)"></span>
      </div>
      
      <!-- 主按钮 -->
      <button 
        @click="toggleChat" 
        class="ai-chat-fab"
      >
        <!-- 内部光芒 -->
        <div class="fab-glow"></div>
        <div class="fab-shine"></div>
        
        <!-- 内容 -->
        <div class="fab-content">
          <span class="fab-icon">🤖</span>
          <span class="fab-text">问问 HANAI</span>
        </div>
      </button>
    </div>

    <!-- 遮罩层 -->
    <transition name="backdrop-fade">
      <div v-if="isOpen" class="chat-backdrop" @click="toggleChat"></div>
    </transition>

    <!-- 聊天抽屉 -->
    <transition name="chat-slide">
      <div v-if="isOpen" class="ai-chat-dialog">
        <!-- 抽屉头部 -->
        <div class="chat-header">
          <div class="header-left">
            <div class="header-icon-wrapper">
              <span class="header-bot-icon">🤖</span>
            </div>
            <div class="header-info">
              <div class="header-title">HANAI</div>
              <div class="header-status">
                <span class="status-dot"></span>
                <span class="status-text">在线</span>
              </div>
            </div>
          </div>
          <button @click="toggleChat" class="close-btn">
            <span class="close-icon">✕</span>
          </button>
        </div>

        <!-- 消息列表 -->
        <div class="chat-messages" ref="messagesContainer">
          <div 
            v-for="(message, index) in messages" 
            :key="index"
            class="message-wrapper"
            :class="message.role"
          >
            <div class="message-bubble">
              <div class="message-content" v-html="formatMessage(message.content)"></div>
              <div class="message-time">{{ message.timestamp }}</div>
            </div>
          </div>

          <!-- 加载动画 -->
          <div v-if="isLoading" class="message-wrapper assistant">
            <div class="message-bubble loading-bubble">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>

          <!-- 欢迎消息 -->
          <div v-if="messages.length === 0 && !isLoading" class="welcome-message">
            <div class="welcome-icon">👋</div>
            <h4>您好！我是 HANAI 投资助手</h4>
            <p>可以帮您分析 <span style="color: #667eea;font-weight: 700;">{{stockData.company}}</span> 的价值潜力</p>
          </div>
        </div>

        <!-- 分析按钮区域 -->
        <div class="analysis-actions">
          <!-- 初始状态：价值分析按钮 -->
          <transition name="btn-fade">
          <button 
              v-if="!analysisCompleted"
            @click="startValueAnalysis" 
            class="analysis-btn"
            :disabled="isLoading"
          >
            <span class="btn-icon">💎</span>
            <span class="btn-content">
              <span class="btn-text">价值分析</span>
              <span class="btn-subtitle">深度解读投资价值</span>
            </span>
            <span class="btn-arrow">→</span>
            </button>
          </transition>

          <!-- 分析完成后：两个按钮 -->
          <transition name="dual-fade">
            <div v-if="analysisCompleted" class="dual-actions">
              <button 
                @click="outputPrompt" 
                class="action-btn prompt-btn"
                :disabled="isLoading"
              >
                <span class="btn-icon">📋</span>
                <span class="btn-text">输出 Prompt</span>
              </button>
              <button 
                @click="hanaiAnalysis" 
                class="action-btn hanai-btn"
                :disabled="isLoading"
              >
                <span class="btn-icon">🤖</span>
                <span class="btn-text">HANAI 分析</span>
          </button>
            </div>
          </transition>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  stockData: {
    type: Object,
    default: null
  },
  valuationChartRef: {
    type: Object,
    default: null
  },
  allStocksData: {
    type: Array,
    default: () => []
  },
  currentDate: {
    type: String,
    default: ''
  }
})

const isOpen = ref(false)
const inputMessage = ref('')
const messages = ref([])
const isLoading = ref(false)
const messagesContainer = ref(null)
const inputTextarea = ref(null)
const showPulse = ref(true)
const analysisCompleted = ref(false) // 价值分析是否完成

// 性能优化：限制消息数量，避免DOM过多
const MAX_MESSAGES = 50


// 切换聊天窗口
const toggleChat = () => {
  isOpen.value = !isOpen.value
  showPulse.value = false
  
  if (isOpen.value) {
    // 禁用页面滚动 - 使用多重方式确保生效
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.top = `-${window.scrollY}px`
    nextTick(() => {
      inputTextarea.value?.focus()
    })
  } else {
    // 恢复页面滚动
    const scrollY = document.body.style.top
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.width = ''
    document.body.style.top = ''
    window.scrollTo(0, parseInt(scrollY || '0') * -1)
  }
}

// ========== 数据处理辅助函数 ==========

// 提取未来价值预估数据
const extractFutureEstimates = () => {
  if (!props.valuationChartRef || !props.currentDate) return []
  
  // 从 ref 中获取数据
  // medpsData 和 priceData 是 ref，需要用 .value 访问
  let medpsData = []
  let priceData = []
  
  if (props.valuationChartRef?.medpsData) {
    medpsData = props.valuationChartRef.medpsData
  }
  
  if (props.valuationChartRef?.priceData) {
    priceData = props.valuationChartRef.priceData
  }
  
  
  if (!medpsData.length || !priceData.length) return []
  
  // 获取当前日期（价格数据的最后一个日期）
  const currentDateTimestamp = priceData.length > 0 
    ? new Date(priceData[priceData.length - 1][0]).getTime()
    : new Date(props.currentDate).getTime()
  
  // 筛选出未来的预估数据
  const futureEstimates = medpsData
    .filter(item => new Date(item[0]).getTime() > currentDateTimestamp)
    .map(item => {
      const date = new Date(item[0])
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      return {
        date: dateStr,
        value: item[1].toFixed(2)
      }
    })
  
  return futureEstimates
}

// 计算单个指标的行业位置
const calculateMetricRanking = (fieldName, currentValue, higherIsBetter = true) => {
  if (!props.allStocksData || !props.stockData || currentValue == null || isNaN(currentValue)) {
    return null
  }
  
  const industryName = props.stockData.industry
  if (!industryName) return null
  
  // 筛选同行业的有效数据
  const industryStocks = props.allStocksData.filter(stock => {
    const value = stock[fieldName]
    return stock.industry === industryName && 
           value != null && 
           !isNaN(value) && 
           value > 0
  })
  
  if (industryStocks.length === 0) return null
  
  // 计算行业平均值
  const industryAvg = industryStocks.reduce((sum, stock) => sum + parseFloat(stock[fieldName]), 0) / industryStocks.length
  
  // 计算排名
  const sortedStocks = [...industryStocks].sort((a, b) => {
    return higherIsBetter 
      ? parseFloat(b[fieldName]) - parseFloat(a[fieldName])
      : parseFloat(a[fieldName]) - parseFloat(b[fieldName])
  })
  
  const rank = sortedStocks.findIndex(stock => stock.stockid === props.stockData.stockid) + 1
  const total = sortedStocks.length
  const percentage = (rank / total * 100).toFixed(1)
  
  return {
    rank,
    total,
    percentage,
    industryAvg: industryAvg.toFixed(2),
    isGood: parseFloat(percentage) <= 25,
    isBad: parseFloat(percentage) >= 75
  }
}

// 格式化股票完整信息
const formatStockInfo = () => {
  if (!props.stockData) return ''
  
  const stock = props.stockData
  const date = props.currentDate
  
  let info = '<div class="analysis-section">'
  info += '<div class="analysis-title">📊 股票详细信息</div>'
  
  // 基础信息
  info += '<div class="analysis-subsection">'
  info += '<div class="analysis-subtitle">🏢 基础信息</div>'
  info += '<div class="analysis-data-grid">'
  info += `<div class="analysis-item"><span class="label">公司名称：</span><span class="value highlight">${stock.company || 'N/A'}</span></div>`
  info += `<div class="analysis-item"><span class="label">交易代码：</span><span class="value">${stock.exchange_ || ''}:${stock.symbol || 'N/A'}</span></div>`
  info += `<div class="analysis-item"><span class="label">所属板块：</span><span class="value">${stock.board || detectStockBoard(stock.symbol)}</span></div>`
  info += `<div class="analysis-item"><span class="label">所属行业：</span><span class="value">${stock.industry || 'N/A'}</span></div>`
  info += `<div class="analysis-item"><span class="label">所属板组：</span><span class="value">${stock.group || 'N/A'}</span></div>`
  info += `<div class="analysis-item"><span class="label">总市值：</span><span class="value highlight">${formatMarketCap(stock.mktcap_norm_currency)}</span></div>`
  info += '</div></div>'
  
  // 估值信息 - 只显示两个区间卡片
  const pettm = stock.pettm && !isNaN(stock.pettm) && stock.pettm > 0 ? parseFloat(stock.pettm) : null
  const peLow = stock.pettmlow && !isNaN(stock.pettmlow) && stock.pettmlow > 0 ? parseFloat(stock.pettmlow) : null
  const peHigh = stock.pettmhigh && !isNaN(stock.pettmhigh) && stock.pettmhigh > 0 ? parseFloat(stock.pettmhigh) : null
  
  // 处理带 ¥ 符号的价格字符串
  const parsePriceValue = (value) => {
    if (!value) return null
    const numStr = String(value).replace(/[¥,]/g, '').trim()
    const num = parseFloat(numStr)
    return !isNaN(num) ? num : null
  }
  
  const priceLow = parsePriceValue(stock.price10ylow)
  const priceHigh = parsePriceValue(stock.price10yhigh)
  const currentPrice = parsePriceValue(stock.price)
  
  // 至少有一个区间数据时显示
  const hasPeRange = pettm && peLow && peHigh && peHigh > peLow
  const hasPriceRange = currentPrice && priceLow && priceHigh && priceHigh > priceLow
  console.log('hasPriceRange:', stock, currentPrice, priceLow, priceHigh, priceHigh > priceLow)
  
  if (hasPeRange || hasPriceRange) {
    info += '<div class="analysis-subsection">'
    info += '<div class="analysis-subtitle">💹 估值区间</div>'
    info += '<div class="valuation-ranges">'
    
    // 10年PE区间卡片（使用历史日期的数据）
    if (hasPeRange) {
      const pePosition = ((pettm - peLow) / (peHigh - peLow) * 100).toFixed(1)
      info += `<div class="range-card">`
      info += `<div class="range-card-title">10年PE区间（${date}）</div>`
      info += `<div class="range-card-current">${date} <span class="range-value">${pettm.toFixed(2)}</span></div>`
      info += `<div class="range-bar-container">`
      info += `<div class="range-bar">`
      info += `<div class="range-bar-fill" style="width: ${pePosition}%"></div>`
      info += `<div class="range-marker" style="left: ${pePosition}%"></div>`
      info += `</div>`
      info += `</div>`
      info += `<div class="range-labels">`
      info += `<span class="range-label-low">最低: ${peLow.toFixed(2)}</span>`
      info += `<span class="range-label-pos">${pePosition}%</span>`
      info += `<span class="range-label-high">最高: ${peHigh.toFixed(2)}</span>`
      info += `</div>`
      info += `</div>`
    }
    
    // 10年股价区间卡片（使用历史日期的数据）
    if (hasPriceRange) {
      const pricePosition = ((currentPrice - priceLow) / (priceHigh - priceLow) * 100).toFixed(1)
      info += `<div class="range-card">`
      info += `<div class="range-card-title">10年股价区间（${date}）</div>`
      info += `<div class="range-card-current">${date} <span class="range-value">¥${currentPrice.toFixed(2)}</span></div>`
      info += `<div class="range-bar-container">`
      info += `<div class="range-bar">`
      info += `<div class="range-bar-fill" style="width: ${pricePosition}%"></div>`
      info += `<div class="range-marker" style="left: ${pricePosition}%"></div>`
      info += `</div>`
      info += `</div>`
      info += `<div class="range-labels">`
      info += `<span class="range-label-low">最低: ¥${priceLow.toFixed(2)}</span>`
      info += `<span class="range-label-pos">${pricePosition}%</span>`
      info += `<span class="range-label-high">最高: ¥${priceHigh.toFixed(2)}</span>`
      info += `</div>`
      info += `</div>`
    }
    
    info += '</div></div>'
  }
  
  // 五维评级（只在有评分数据时显示）
  const hasRatings = stock.rank_gf_value || stock.rank_growth || stock.rank_momentum || 
                     stock.rank_profitability || stock.rank_balancesheet || stock.gf_score
  
  if (hasRatings) {
    info += '<div class="analysis-subsection">'
    info += '<div class="analysis-subtitle">⭐ 五维评级</div>'
    info += '<div class="analysis-data-grid">'
    
    if (stock.rank_gf_value) {
      info += `<div class="analysis-item"><span class="label">价值评级：</span><span class="value rating">${getRankValue(stock.rank_gf_value)}/10</span></div>`
    }
    if (stock.rank_growth) {
      info += `<div class="analysis-item"><span class="label">成长能力：</span><span class="value rating">${getRankValue(stock.rank_growth)}/10</span></div>`
    }
    if (stock.rank_momentum) {
      info += `<div class="analysis-item"><span class="label">价值动量：</span><span class="value rating">${getRankValue(stock.rank_momentum)}/10</span></div>`
    }
    if (stock.rank_profitability) {
      info += `<div class="analysis-item"><span class="label">盈利能力：</span><span class="value rating">${getRankValue(stock.rank_profitability)}/10</span></div>`
    }
    if (stock.rank_balancesheet) {
      info += `<div class="analysis-item"><span class="label">财务实力：</span><span class="value rating">${getRankValue(stock.rank_balancesheet)}/10</span></div>`
    }
    
    const gfScore = stock.gf_score && stock.gf_score > 0 ? Math.round(stock.gf_score) : 0
    if (gfScore > 0) {
      info += `<div class="analysis-item full-width"><span class="label">综合评分：</span><span class="value highlight master-score">${gfScore}/100</span></div>`
    }
    
    info += '</div></div>'
  }
  
  // 成长指标（只在有数据时显示）
  const hasFCF = stock.total_free_cash_flow !== null && stock.total_free_cash_flow !== undefined && 
                 !isNaN(stock.total_free_cash_flow) && stock.total_free_cash_flow > 0
  const hasNetIncomeGrowth = stock.total_netincome_growth_10y !== null && 
                              stock.total_netincome_growth_10y !== undefined && 
                              !isNaN(stock.total_netincome_growth_10y)
  const hasPriceChange10y = stock.pchange_10y !== null && 
                            stock.pchange_10y !== undefined && 
                            !isNaN(stock.pchange_10y)
  
  if (hasFCF || hasNetIncomeGrowth || hasPriceChange10y) {
    info += '<div class="analysis-subsection">'
    info += '<div class="analysis-subtitle">🚀 成长指标（历史数据 ' + date + '）</div>'
    info += '<div class="growth-metrics-grid">'
    
    if (hasFCF) {
      const fcfValue = formatFCF(stock.total_free_cash_flow)
      info += `<div class="growth-metric-card">`
      info += `<div class="growth-metric-icon">💰</div>`
      info += `<div class="growth-metric-content">`
      info += `<div class="growth-metric-label">自由现金流</div>`
      info += `<div class="growth-metric-value">${fcfValue}</div>`
      info += `</div>`
      info += `</div>`
    }
    
    if (hasNetIncomeGrowth) {
      const growthValue = stock.total_netincome_growth_10y.toFixed(2) + '%'
      const growthClass = stock.total_netincome_growth_10y >= 0 ? 'positive' : 'negative'
      info += `<div class="growth-metric-card">`
      info += `<div class="growth-metric-icon">📈</div>`
      info += `<div class="growth-metric-content">`
      info += `<div class="growth-metric-label">10年净利润增长</div>`
      info += `<div class="growth-metric-value ${growthClass}">${growthValue}</div>`
      info += `</div>`
      info += `</div>`
    }
    
    if (hasPriceChange10y) {
      const returnValue = stock.pchange_10y.toFixed(2) + '%'
      const returnClass = stock.pchange_10y >= 0 ? 'positive' : 'negative'
      info += `<div class="growth-metric-card">`
      info += `<div class="growth-metric-icon">🎯</div>`
      info += `<div class="growth-metric-content">`
      info += `<div class="growth-metric-label">10年年化回报</div>`
      info += `<div class="growth-metric-value ${returnClass}">${returnValue}</div>`
      info += `</div>`
      info += `</div>`
    }
    
    info += '</div></div>'
  }
  
  // 关键指标及行业位置（只显示有数据的指标）
  const metricsToShow = []
  
  if (stock.yield != null && !isNaN(stock.yield) && stock.yield > 0) {
    metricsToShow.push({ name: '股息率', value: stock.yield, unit: '%', field: 'yield', higherIsBetter: true })
  }
  if (stock.grossmargin != null && !isNaN(stock.grossmargin) && stock.grossmargin > 0) {
    metricsToShow.push({ name: '毛利率', value: stock.grossmargin, unit: '%', field: 'grossmargin', higherIsBetter: true })
  }
  if (stock.net_margain != null && !isNaN(stock.net_margain) && stock.net_margain > 0) {
    metricsToShow.push({ name: '净利率', value: stock.net_margain, unit: '%', field: 'net_margain', higherIsBetter: true })
  }
  if (stock.roe != null && !isNaN(stock.roe) && stock.roe > 0) {
    metricsToShow.push({ name: 'ROE', value: stock.roe, unit: '%', field: 'roe', higherIsBetter: true })
  }
  if (stock.pettm != null && !isNaN(stock.pettm) && stock.pettm > 0) {
    metricsToShow.push({ name: '市盈率(TTM)', value: stock.pettm, unit: '', field: 'pettm', higherIsBetter: false })
  }
  if (stock.pb != null && !isNaN(stock.pb) && stock.pb > 0) {
    metricsToShow.push({ name: '市净率(PB)', value: stock.pb, unit: '', field: 'pb', higherIsBetter: false })
  }
  
  // 只在有指标数据时显示
  if (metricsToShow.length > 0) {
    info += '<div class="analysis-subsection">'
    info += '<div class="analysis-subtitle">📈 关键指标及行业位置</div>'
    info += '<div class="analysis-metrics-list">'
    
    metricsToShow.forEach(metric => {
      const ranking = calculateMetricRanking(metric.field, metric.value, metric.higherIsBetter)
      info += formatMetricWithRanking(metric.name, metric.value, metric.unit, ranking)
    })
    
    info += '</div></div>'
  }
  info += '</div>'
  
  return info
}

// 格式化指标及排名
const formatMetricWithRanking = (name, value, unit, ranking) => {
  let html = '<div class="analysis-metric-item">'
  html += `<div class="metric-name">${name}</div>`
  html += `<div class="metric-value">${parseFloat(value).toFixed(2)}${unit}</div>`
  
  if (ranking) {
    const rankClass = ranking.isGood ? 'ranking-good' : (ranking.isBad ? 'ranking-bad' : 'ranking-normal')
    html += `<div class="metric-ranking ${rankClass}">`
    html += `<span class="rank-text">行业排名 ${ranking.rank}/${ranking.total}</span>`
    html += `<span class="rank-percent">(前${ranking.percentage}%)</span>`
    html += `</div>`
    html += `<div class="metric-avg">行业平均: ${ranking.industryAvg}${unit}</div>`
  } else {
    html += '<div class="metric-ranking">暂无行业数据</div>'
  }
  
  html += '</div>'
  return html
}

// 辅助函数
const detectStockBoard = (symbol) => {
  if (!symbol || typeof symbol !== 'string') return '主板'
  const code = symbol.trim()
  if (/^(000|001|002|003|600|601|603|605)/.test(code)) return '主板'
  if (/^(300|301)/.test(code)) return '创业板'
  if (/^688/.test(code)) return '科创板'
  if (/^(43|83|87|92)/.test(code)) return '北证'
  return '主板'
}

const formatMarketCap = (value) => {
  if (!value || isNaN(value)) return 'N/A'
  if (value >= 1e12) return (value / 1e12).toFixed(2) + '万亿'
  if (value >= 1e8) return (value / 1e8).toFixed(2) + '亿'
  if (value >= 1e4) return (value / 1e4).toFixed(2) + '万'
  return value.toFixed(2)
}

const getRankValue = (rankValue) => {
  const rankValueNum = parseFloat(rankValue)
  if (isNaN(rankValueNum)) return 0
  return rankValueNum.toFixed(1)
}

// 格式化自由现金流
const formatFCF = (value) => {
  if (value === null || value === undefined || isNaN(value) || value === 0) return 'N/A'
  
  // 使用绝对值进行计算，最后再添加符号
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  
  // 转换为亿元
  const yi = absValue / 100000000
  if (yi >= 10000) {
    return `${sign}${(yi / 10000).toFixed(2)}万亿`
  } else if (yi >= 1) {
    return `${sign}${yi.toFixed(2)}亿`
  } else {
    return `${sign}${(absValue / 10000).toFixed(2)}万`
  }
}

// 添加消息并限制数量
const addMessage = (message) => {
  messages.value.push(message)
  
  // 性能优化：限制消息数量，保留最新的消息
  if (messages.value.length > MAX_MESSAGES) {
    messages.value = messages.value.slice(-MAX_MESSAGES)
  }
}


// 价值分析
const startValueAnalysis = async () => {
  if (isLoading.value) return
  
  const userMessage = {
    role: 'user',
    content: '价值分析',
    timestamp: getCurrentTime()
  }
  
  addMessage(userMessage)
  
  // 滚动到底部
  nextTick(() => {
    scrollToBottom()
  })
  
  // 生成分析内容
  await displayValueAnalysis()
}

// 打字机效果显示文本 - 优化版本，保持清晰的打字机效果
const typeWriter = async (messageIndex, fullContent, speed = 30) => {
  // 开始打字时隐藏滚动条
  if (messagesContainer.value) {
    messagesContainer.value.classList.add('typing')
  }
  
  let currentText = ''
  let lastUpdateTime = 0
  let lastScrollTime = 0
  const scrollInterval = 300 // 滚动间隔增加到300ms
  let charCount = 0 // 计数可见字符
  
  for (let i = 0; i < fullContent.length; i++) {
    currentText += fullContent[i]
    
    // 跳过 HTML 标签内部，但仍然显示效果
    if (fullContent[i] === '<') {
      while (i < fullContent.length && fullContent[i] !== '>') {
        i++
        currentText += fullContent[i]
      }
      messages.value[messageIndex].content = currentText
      // 标签后添加小延迟，让用户能看到结构出现
      await new Promise(resolve => setTimeout(resolve, 5))
    } else {
      // 可见字符才计数
      charCount++
      
      // 使用 requestAnimationFrame 优化性能
      const now = Date.now()
      if (now - lastUpdateTime >= speed) {
        messages.value[messageIndex].content = currentText
        lastUpdateTime = now
        await new Promise(resolve => requestAnimationFrame(resolve))
      }
    }
    
    // 减少滚动频率，使用时间间隔
    const now = Date.now()
    if (now - lastScrollTime >= scrollInterval) {
      scrollToBottom()
      lastScrollTime = now
    }
  }
  
  // 确保最后的内容被显示并滚动到底部
  messages.value[messageIndex].content = currentText
  scrollToBottom(true) // 立即滚动
}

// 显示价值分析内容（分段流式+打字机效果）
const displayValueAnalysis = async () => {
  if (!props.stockData) {
    addMessage({
      role: 'assistant',
      content: '抱歉，当前没有股票数据可供分析。',
      timestamp: getCurrentTime()
    })
    return
  }
  
  isLoading.value = true
  
  // 开始分析时隐藏滚动条
  if (messagesContainer.value) {
    messagesContainer.value.classList.add('typing')
  }
  
  // 优化：快速检查图表数据，最多等待1秒
  let waitCount = 0
  const maxWait = 4  // 4 次 × 250ms = 1秒
  
  while (waitCount < maxWait) {
    if (!props.valuationChartRef) {
      await new Promise(resolve => setTimeout(resolve, 250))
      waitCount++
      continue
    }
    
    const currentPrice = props.valuationChartRef.currentPrice
    const hasData = currentPrice && currentPrice !== '--'
    
    if (hasData) {
      console.log('✅ 图表数据已加载，等待了', waitCount * 250, 'ms')
      break
    }
    
    await new Promise(resolve => setTimeout(resolve, 250))
    waitCount++
  }
  
  if (waitCount >= maxWait) {
    console.log('ℹ️ 图表数据未完全加载，使用基础数据继续')
  }
  
  try {
    const companyName = props.stockData.company || '该公司'
    
    // 开场白：可爱的欢迎语（减少延迟）
    await new Promise(resolve => setTimeout(resolve, 100))
    const welcomeMsg = `<div class="ai-welcome-message">✨ 嗨！请稍等片刻，让 HANAI 对【${companyName}】进行一番深入了解～ 🔍💫</div>`
    const welcomeIndex = messages.value.length
    addMessage({
      role: 'assistant',
      content: '',
      timestamp: getCurrentTime()
    })
    await nextTick()
    await typeWriter(welcomeIndex, welcomeMsg, 30)
    
    // 第一段：当前股价信息（打字机效果，减少延迟）
    await new Promise(resolve => setTimeout(resolve, 400))
    const priceIntro = `<div class="ai-transition-text">📊 首先，让我们看看股价数据～</div>`
    const priceInfo = priceIntro + generatePriceInfo()
    const priceIndex = messages.value.length
    addMessage({
      role: 'assistant',
      content: '',
      timestamp: getCurrentTime()
    })
    await nextTick()
    await typeWriter(priceIndex, priceInfo, 25)
    
    // 第二段：股票详细信息（打字机效果，减少延迟）
    await new Promise(resolve => setTimeout(resolve, 300))
    const stockIntro = `<div class="ai-transition-text">🎯 接下来，深入了解一下公司的详细信息吧～</div>`
    const stockInfo = stockIntro + formatStockInfo()
    const stockIndex = messages.value.length
    addMessage({
      role: 'assistant',
      content: '',
      timestamp: getCurrentTime()
    })
    await nextTick()
    await typeWriter(stockIndex, stockInfo, 20)
    
    // 第三段：价值大师网数据（打字机效果，减少延迟）
    await new Promise(resolve => setTimeout(resolve, 300))
    const valueIntro = `<div class="ai-transition-text">💎 最后，来看看专业的估值评估数据～</div>`
    const valueInfo = valueIntro + generateValueInfo()
    const valueIndex = messages.value.length
    addMessage({
      role: 'assistant',
      content: '',
      timestamp: getCurrentTime()
    })
    await nextTick()
    await typeWriter(valueIndex, valueInfo, 25)
    
    // 结束语：可爱的总结（减少延迟）
    await new Promise(resolve => setTimeout(resolve, 400))
    const endingMsg = `<div class="ai-ending-message">🎉 喔，我现在对【${companyName}】有了一个初步的了解，接下来我将开始正式的工作啦！💪✨</div>`
    const endingIndex = messages.value.length
    addMessage({
      role: 'assistant',
      content: '',
      timestamp: getCurrentTime()
    })
    await nextTick()
    await typeWriter(endingIndex, endingMsg, 30)
    
  } catch (error) {
    console.error('生成分析内容失败:', error)
    addMessage({
      role: 'assistant',
      content: '生成分析内容时出现错误，请稍后再试。',
      timestamp: getCurrentTime()
    })
  } finally {
    isLoading.value = false
    
    // 输出完成后显示滚动条
    if (messagesContainer.value) {
      messagesContainer.value.classList.remove('typing')
    }
    
    // 标记分析完成，显示两个按钮
    analysisCompleted.value = true
  }
}

// 提取纯文本内容（去除 HTML 标签）
const extractPlainText = (html) => {
  // 创建临时 div 元素
  const temp = document.createElement('div')
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ''
}

// 复制到剪贴板
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('复制失败:', err)
    // 降级方案：使用旧的 API
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      return successful
    } catch (err2) {
      console.error('降级复制也失败:', err2)
      return false
    }
  }
}

// 输出 Prompt
const outputPrompt = () => {
  if (isLoading.value) return
  
  const promptMessage = {
    role: 'user',
    content: '输出 Prompt',
    timestamp: getCurrentTime()
  }
  
  addMessage(promptMessage)
  
  // 生成 Prompt 内容
  const promptContent = generatePromptContent()
  
  // 添加带有复制按钮的 Prompt 消息
  addMessage({
    role: 'assistant',
    content: promptContent,
    timestamp: getCurrentTime(),
    hasPromptContent: true  // 标记这是 Prompt 消息
  })
  
  nextTick(() => {
    // 为 Prompt 消息添加复制按钮
    // 使用延迟确保 DOM 已完全渲染
    setTimeout(() => {
      addCopyButtonToPrompt()
      // 按钮添加完成后再滚动到底部
      nextTick(() => {
        scrollToBottom(true)
      })
    }, 100)
  })
}

// 为 Prompt 消息添加复制按钮
const addCopyButtonToPrompt = () => {
  if (!messagesContainer.value) return
  
  // 找到所有没有添加按钮的 prompt-content
  const promptContents = messagesContainer.value.querySelectorAll('.prompt-content')
  
  promptContents.forEach(promptContent => {
    // 如果已经有按钮了，跳过
    if (promptContent.querySelector('.prompt-actions')) return
    
    // 创建按钮容器
    const actionsDiv = document.createElement('div')
    actionsDiv.className = 'prompt-actions'
    
    // 获取 Prompt 文本（用于自动复制和跳转）
    const getPromptText = () => {
      const promptText = promptContent.querySelector('.prompt-text')
      return promptText ? (promptText.textContent || promptText.innerText || '') : ''
    }
    
    // 创建复制按钮
    const copyBtn = document.createElement('button')
    copyBtn.className = 'prompt-copy-btn'
    copyBtn.innerHTML = `
      <span class="copy-btn-icon">📋</span>
      <span class="copy-btn-text">复制到剪贴板</span>
    `
    
    // 复制按钮点击事件
    copyBtn.addEventListener('click', async () => {
      const plainText = getPromptText()
      const success = await copyToClipboard(plainText)
      
      const btnText = copyBtn.querySelector('.copy-btn-text')
      const btnIcon = copyBtn.querySelector('.copy-btn-icon')
      
      if (success) {
        const originalText = btnText.textContent
        const originalIcon = btnIcon.textContent
        
        btnText.textContent = '已复制！'
        btnIcon.textContent = '✅'
        copyBtn.classList.add('copied')
        
        setTimeout(() => {
          btnText.textContent = originalText
          btnIcon.textContent = originalIcon
          copyBtn.classList.remove('copied')
        }, 2000)
      } else {
        btnText.textContent = '复制失败'
        btnIcon.textContent = '❌'
        
        setTimeout(() => {
          btnText.textContent = '复制到剪贴板'
          btnIcon.textContent = '📋'
        }, 2000)
      }
    })
    
    // 创建快捷跳转按钮组
    const quickLinksDiv = document.createElement('div')
    quickLinksDiv.className = 'prompt-quick-links'
    
    // ChatGPT 按钮
    const chatgptBtn = document.createElement('a')
    chatgptBtn.href = 'https://chat.openai.com/'
    chatgptBtn.target = '_blank'
    chatgptBtn.className = 'quick-link-btn chatgpt-btn'
    chatgptBtn.innerHTML = `
      <span class="quick-link-icon">🤖</span>
      <span class="quick-link-text">ChatGPT(推荐)</span>
    `
    chatgptBtn.addEventListener('click', async (e) => {
      // 点击前自动复制
      await copyToClipboard(getPromptText())
    })
    
    // DeepSeek 按钮
    const deepseekBtn = document.createElement('a')
    deepseekBtn.href = 'https://chat.deepseek.com/'
    deepseekBtn.target = '_blank'
    deepseekBtn.className = 'quick-link-btn deepseek-btn'
    deepseekBtn.innerHTML = `
      <span class="quick-link-icon">🔍</span>
      <span class="quick-link-text">DeepSeek</span>
    `
    deepseekBtn.addEventListener('click', async (e) => {
      // 点击前自动复制
      await copyToClipboard(getPromptText())
    })
    
    // Kimi 按钮
    const kimiBtn = document.createElement('a')
    kimiBtn.href = 'https://kimi.moonshot.cn/'
    kimiBtn.target = '_blank'
    kimiBtn.className = 'quick-link-btn kimi-btn'
    kimiBtn.innerHTML = `
      <span class="quick-link-icon">🌙</span>
      <span class="quick-link-text">Kimi</span>
    `
    kimiBtn.addEventListener('click', async (e) => {
      // 点击前自动复制
      await copyToClipboard(getPromptText())
    })
    
    quickLinksDiv.appendChild(chatgptBtn)
    quickLinksDiv.appendChild(deepseekBtn)
    quickLinksDiv.appendChild(kimiBtn)
    
    actionsDiv.appendChild(copyBtn)
    actionsDiv.appendChild(quickLinksDiv)
    promptContent.appendChild(actionsDiv)
  })
}

// HANAI 分析
const hanaiAnalysis = () => {
  if (isLoading.value) return
  
  const hanaiMessage = {
    role: 'user',
    content: 'HANAI 分析',
    timestamp: getCurrentTime()
  }
  
  addMessage(hanaiMessage)
  
  addMessage({
    role: 'assistant',
    content: '🤖 HANAI 正在为您进行深度分析，请稍候...\n\n💡 此功能需要连接 AI 服务，请在此处添加您的分析逻辑。',
    timestamp: getCurrentTime()
  })
  
  nextTick(() => {
    scrollToBottom(true)
  })
}

// 生成完整的 Prompt 内容（按照模板格式）
const generatePromptContent = () => {
  if (!props.stockData) return '暂无数据'
  
  const stock = props.stockData
  const date = props.currentDate
  const companyName = stock.company || 'N/A'
  
  // 处理带 ¥ 符号的价格
  const parsePriceValue = (value) => {
    if (!value || value === '--') return null
    const numStr = String(value).replace(/[¥,]/g, '').trim()
    const num = parseFloat(numStr)
    return !isNaN(num) ? num : null
  }
  
  let prompt = `<div class="prompt-content">`
  prompt += `<div class="prompt-title">📋 ${companyName} 价值分析数据</div>`
  prompt += `<div class="prompt-text">`
  
  // ========== 开场白 ==========
  prompt += `您是一位资深的投资者，请您对【${companyName}】进行深入的价值分析。以下是该公司的详细数据，请基于这些信息给出您的专业判断和投资建议，对价值大师网提供的估值信息进行评价并给出确定的目标价位。\n\n`
  prompt += `---\n\n`
  
  // ========== 公司基础信息 ==========
  prompt += `## 公司基础信息\n\n`
  prompt += `- **公司名称**：${companyName}（${stock.exchange_ || ''}:${stock.symbol || 'N/A'}）\n`
  prompt += `- **所属板块**：${stock.board || '主板'}\n`
  prompt += `- **所属行业**：${stock.industry || 'N/A'}\n`
  prompt += `- **总市值**：${formatMarketCap(stock.mktcap_norm_currency)}\n\n`
  prompt += `---\n\n`
  
  // ========== 估值指标 ==========
  prompt += `## 估值指标\n\n`
  
  // 股价部分
  prompt += `### 股价信息\n\n`
  const currentPrice = parsePriceValue(stock.price)
  if (currentPrice) {
    prompt += `- **历史股价**（${date}）：¥${currentPrice.toFixed(2)}\n`
  }
  
  // 最新股价
  if (props.valuationChartRef?.currentPrice) {
    const todayPrice = parsePriceValue(props.valuationChartRef.currentPrice)
    if (todayPrice) {
      const today = new Date().toISOString().split('T')[0]
      prompt += `- **最新股价**（${today}）：¥${todayPrice.toFixed(2)}\n`
    }
  }
  
  // 10年股价区间
  const priceLow = parsePriceValue(stock.price10ylow)
  const priceHigh = parsePriceValue(stock.price10yhigh)
  if (currentPrice && priceLow && priceHigh && priceHigh > priceLow) {
    const position = ((currentPrice - priceLow) / (priceHigh - priceLow) * 100).toFixed(1)
    prompt += `- **10年股价区间**：¥${priceLow.toFixed(2)} ~ ¥${priceHigh.toFixed(2)}\n`
    prompt += `- **股价位置**：${position}%（在10年区间中的位置）\n`
  }
  prompt += `\n`
  
  // 市盈率部分
  prompt += `### 市盈率信息\n\n`
  const pettm = stock.pettm && !isNaN(stock.pettm) && stock.pettm > 0 ? parseFloat(stock.pettm) : null
  const peLow = stock.pettmlow && !isNaN(stock.pettmlow) && stock.pettmlow > 0 ? parseFloat(stock.pettmlow) : null
  const peHigh = stock.pettmhigh && !isNaN(stock.pettmhigh) && stock.pettmhigh > 0 ? parseFloat(stock.pettmhigh) : null
  
  if (pettm) {
    prompt += `- **当日市盈率**：${pettm.toFixed(2)}\n`
    if (peLow && peHigh && peHigh > peLow) {
      const pePosition = ((pettm - peLow) / (peHigh - peLow) * 100).toFixed(1)
      prompt += `- **10年PE区间**：${peLow.toFixed(2)} ~ ${peHigh.toFixed(2)}\n`
      prompt += `- **当前PE位置**：${pePosition}%（在10年区间中的位置）\n`
    }
  }
  prompt += `\n---\n\n`
  
  // ========== 关键指标及行业位置 ==========
  prompt += `## 关键指标及行业位置\n\n`
  prompt += `*以下数据截至 ${date}*\n\n`
  
  // 股息率
  if (stock.yield && !isNaN(stock.yield) && stock.yield > 0) {
    prompt += `### 📊 股息率\n\n`
    prompt += `- **股息率**：${parseFloat(stock.yield).toFixed(2)}%\n`
    
    const yieldRanking = calculateMetricRanking('yield', stock.yield, true)
    if (yieldRanking) {
      prompt += `- **行业排名**：${yieldRanking.rank}/${yieldRanking.total}（前 ${yieldRanking.percentage}%）\n`
      prompt += `- **行业平均**：${yieldRanking.industryAvg}%\n`
    }
    prompt += `\n`
  }
  
  // 净利率
  if (stock.net_margain && !isNaN(stock.net_margain) && stock.net_margain > 0) {
    prompt += `### 📊 净利率\n\n`
    prompt += `- **净利率**：${parseFloat(stock.net_margain).toFixed(2)}%\n`
    
    const netMarginRanking = calculateMetricRanking('net_margain', stock.net_margain, true)
    if (netMarginRanking) {
      prompt += `- **行业排名**：${netMarginRanking.rank}/${netMarginRanking.total}（前 ${netMarginRanking.percentage}%）\n`
      prompt += `- **行业平均**：${netMarginRanking.industryAvg}%\n`
    }
    prompt += `\n`
  }
  
  // ROE（净资产收益率）
  if (stock.roe && !isNaN(stock.roe) && stock.roe > 0) {
    prompt += `### 📊 ROE（净资产收益率）\n\n`
    prompt += `- **ROE**：${parseFloat(stock.roe).toFixed(2)}%\n`
    
    const roeRanking = calculateMetricRanking('roe', stock.roe, true)
    if (roeRanking) {
      prompt += `- **行业排名**：${roeRanking.rank}/${roeRanking.total}（前 ${roeRanking.percentage}%）\n`
      prompt += `- **行业平均**：${roeRanking.industryAvg}%\n`
    }
    prompt += `\n`
  }
  
  // 毛利率
  if (stock.grossmargin && !isNaN(stock.grossmargin) && stock.grossmargin > 0) {
    prompt += `### 📊 毛利率\n\n`
    prompt += `- **毛利率**：${parseFloat(stock.grossmargin).toFixed(2)}%\n`
    
    const grossMarginRanking = calculateMetricRanking('grossmargin', stock.grossmargin, true)
    if (grossMarginRanking) {
      prompt += `- **行业排名**：${grossMarginRanking.rank}/${grossMarginRanking.total}（前 ${grossMarginRanking.percentage}%）\n`
      prompt += `- **行业平均**：${grossMarginRanking.industryAvg}%\n`
    }
    prompt += `\n`
  }
  
  // 市盈率行业对比
  if (pettm) {
    prompt += `### 📊 市盈率（行业对比）\n\n`
    prompt += `- **市盈率**：${pettm.toFixed(2)}\n`
    
    const peRanking = calculateMetricRanking('pettm', pettm, false)
    if (peRanking) {
      prompt += `- **行业排名**：${peRanking.rank}/${peRanking.total}（前 ${peRanking.percentage}%）\n`
      prompt += `- **行业平均**：${peRanking.industryAvg}\n`
    }
    prompt += `\n`
  }
  
  // 市净率行业对比
  if (stock.pb && !isNaN(stock.pb) && stock.pb > 0) {
    prompt += `### 📊 市净率（行业对比）\n\n`
    prompt += `- **市净率**：${parseFloat(stock.pb).toFixed(2)}\n`
    
    const pbRanking = calculateMetricRanking('pb', stock.pb, false)
    if (pbRanking) {
      prompt += `- **行业排名**：${pbRanking.rank}/${pbRanking.total}（前 ${pbRanking.percentage}%）\n`
      prompt += `- **行业平均**：${pbRanking.industryAvg}\n`
    }
    prompt += `\n`
  }
  
  // ========== 成长性指标 ==========
  prompt += `---\n\n`
  prompt += `## 成长性指标\n\n`
  
  if (stock.total_free_cash_flow && !isNaN(stock.total_free_cash_flow) && stock.total_free_cash_flow > 0) {
    prompt += `- **自由现金流**：${formatFCF(stock.total_free_cash_flow)}\n`
  }
  if (stock.total_netincome_growth_10y !== null && !isNaN(stock.total_netincome_growth_10y)) {
    prompt += `- **10年净利润增长**：${parseFloat(stock.total_netincome_growth_10y).toFixed(2)}%\n`
  }
  if (stock.pchange_10y !== null && !isNaN(stock.pchange_10y)) {
    prompt += `- **10年年化回报**：${parseFloat(stock.pchange_10y).toFixed(2)}%\n`
  }
  prompt += `\n---\n\n`
  
  // ========== 价值大师网五维评级 ==========
  const hasRatings = stock.rank_gf_value || stock.rank_growth || stock.rank_momentum || 
                     stock.rank_profitability || stock.rank_balancesheet || stock.gf_score
  
  if (hasRatings) {
    prompt += `## 价值大师网五维评级\n\n`
    
    if (stock.rank_gf_value) {
      prompt += `- **价值评级**：${getRankValue(stock.rank_gf_value)}/10\n`
    }
    if (stock.rank_growth) {
      prompt += `- **成长能力**：${getRankValue(stock.rank_growth)}/10\n`
    }
    if (stock.rank_momentum) {
      prompt += `- **价值动量**：${getRankValue(stock.rank_momentum)}/10\n`
    }
    if (stock.rank_profitability) {
      prompt += `- **盈利能力**：${getRankValue(stock.rank_profitability)}/10\n`
    }
    if (stock.rank_balancesheet) {
      prompt += `- **财务实力**：${getRankValue(stock.rank_balancesheet)}/10\n`
    }
    prompt += `\n`
    
    const gfScore = stock.gf_score && stock.gf_score > 0 ? Math.round(stock.gf_score) : 0
    if (gfScore > 0) {
      prompt += `### 💯 综合评分\n\n`
      prompt += `**${gfScore}/100**\n\n`
    }
    prompt += `---\n\n`
  }
  
  // 当前合理估值
  if (props.valuationChartRef?.currentValue) {
    const todayValue = parsePriceValue(props.valuationChartRef.currentValue)
    const todayPrice = parsePriceValue(props.valuationChartRef.currentPrice)
    
    if (todayValue) {
      // ========== 价值大师网估值分析 ==========
      prompt += `## 价值大师网估值分析\n\n`
      const today = new Date().toISOString().split('T')[0]
      prompt += `### 当前估值情况\n\n`
      prompt += `- **合理估值**（${today}）：¥${todayValue.toFixed(2)}\n`
      
      // 如果有股价，计算偏离度
      if (todayPrice) {
        const deviation = ((todayPrice - todayValue) / todayValue * 100)
        const statusText = props.valuationChartRef?.statusText || '--'
        prompt += `- **当前股价**：¥${todayPrice.toFixed(2)}\n`
        prompt += `- **估值状态**：${statusText}\n`
        prompt += `- **偏离度**：${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%\n`
      }
      prompt += `\n`
    }
  }
  
  // 历史偏离信息
  const maxDeviation = props.valuationChartRef?.maxDeviation
  const minDeviation = props.valuationChartRef?.minDeviation
  
  if (maxDeviation && minDeviation && maxDeviation.percentage !== '--') {
    prompt += `### 历史偏离统计\n\n`
    prompt += `- **最大高估**：${maxDeviation.percentage}\n`
    prompt += `  - 日期：${maxDeviation.date}\n`
    prompt += `  - 股价：¥${maxDeviation.price}\n`
    prompt += `  - 估值：¥${maxDeviation.value}\n`
    prompt += `\n`
    prompt += `- **最大低估**：${minDeviation.percentage}\n`
    prompt += `  - 日期：${minDeviation.date}\n`
    prompt += `  - 股价：¥${minDeviation.price}\n`
    prompt += `  - 估值：¥${minDeviation.value}\n`
    prompt += `\n`
  }
  
  // 未来价值预估
  const futureEstimates = extractFutureEstimates()
  if (futureEstimates.length > 0) {
    prompt += `### 未来价值预估\n\n`
    futureEstimates.forEach(estimate => {
      prompt += `- **${estimate.date}** 预估价值：¥${estimate.value}\n`
    })
    prompt += `\n`
  }
  
  prompt += `</div></div>`
  
  return prompt
}

// 生成股价信息（第一段）
const generatePriceInfo = () => {
  const stock = props.stockData
  const companyName = stock.company || 'N/A'
  const date = props.currentDate
  
  // 处理带 ¥ 符号的价格
  const parsePriceValue = (value) => {
    if (!value || value === '--') return null
    const numStr = String(value).replace(/[¥,]/g, '').trim()
    const num = parseFloat(numStr)
    return !isNaN(num) ? num : null
  }
  
  // 从 ValuationChart ref 获取当日最新股价
  let todayPrice = null
  let isFromChart = false
  if (props.valuationChartRef?.currentPrice) {
    const priceVal = props.valuationChartRef.currentPrice
    if (priceVal !== '--') {
      todayPrice = parsePriceValue(priceVal)
      isFromChart = true
    }
  }
  
  // 获取历史日期的股价
  const historicalPrice = parsePriceValue(stock.price)
  
  let info = '<div class="analysis-section">'
  info += '<div class="analysis-title">💰 股价信息</div>'
  
  // 显示当日最新股价（如果有）
  if (isFromChart && todayPrice !== null) {
    const today = new Date().toISOString().split('T')[0]
    info += `<div class="analysis-highlight-box">`
    info += `<div class="highlight-text">【${companyName}】最新股价（${today}）：<span class="price-highlight">¥${todayPrice.toFixed(2)}</span></div>`
    info += `</div>`
  }

  
  // 股价区间信息（使用历史日期数据）
  let showPriceRange = false
  let priceRangeInfo = ''
  
  if (historicalPrice !== null) {
    const low = parsePriceValue(stock.price10ylow)
    const high = parsePriceValue(stock.price10yhigh)
    
    priceRangeInfo += `<div class="analysis-detail">`
    priceRangeInfo += `截止 <span class="date-highlight">${date}</span>`
    
    if (low !== null && high !== null && high > low) {
      const position = ((historicalPrice - low) / (high - low) * 100).toFixed(1)
      priceRangeInfo += `，该日股价（¥${historicalPrice}）位于10年区间的 <span class="percent-highlight">${position}%</span> 位置`
      priceRangeInfo += `<br/>（10年历史区间：¥${low.toFixed(2)} - ¥${high.toFixed(2)}）`
    }
    
    priceRangeInfo += `</div>`
    showPriceRange = true
  }
  
  if (showPriceRange) {
    info += priceRangeInfo
  }
  
  info += '</div>'
  return info
}

// 生成价值信息（第三段）
const generateValueInfo = () => {
  const stock = props.stockData
  const companyName = stock.company || 'N/A'
  
  // 处理带 ¥ 符号的价格
  const parsePriceValue = (value) => {
    if (!value || value === '--') return null
    const numStr = String(value).replace(/[¥,]/g, '').trim()
    const num = parseFloat(numStr)
    return !isNaN(num) ? num : null
  }
  
  // 从 ValuationChart ref 获取数据
  let todayValue = null
  let todayPrice = null
  let statusText = '--'
  let maxDeviation = null
  let minDeviation = null
  
  if (props.valuationChartRef?.currentValue) {
    todayValue = parsePriceValue(props.valuationChartRef.currentValue)
  }
  
  if (props.valuationChartRef?.currentPrice) {
    todayPrice = parsePriceValue(props.valuationChartRef.currentPrice)
  }
  
  if (props.valuationChartRef?.statusText) {
    statusText = props.valuationChartRef.statusText
  }
  
  if (props.valuationChartRef?.maxDeviation) {
    maxDeviation = props.valuationChartRef.maxDeviation
  }
  
  if (props.valuationChartRef?.minDeviation) {
    minDeviation = props.valuationChartRef.minDeviation
  }
  
  let info = '<div class="analysis-section">'
  info += '<div class="analysis-title">💎 估值评估数据</div>'
  
  // 显示当日最新估值与股价对比
  if (todayValue !== null && todayPrice !== null) {
    const today = new Date().toISOString().split('T')[0]
    
    // 计算偏离度
    const deviation = ((todayPrice - todayValue) / todayValue * 100)
    const deviationText = deviation > 0 
      ? `+${deviation.toFixed(1)}%` 
      : `${deviation.toFixed(1)}%`
    
    // 判断状态颜色
    let statusClass = 'status-fair'
    const ratio = todayPrice / todayValue
    if (ratio >= 1.3) statusClass = 'status-overvalued-severe'
    else if (ratio >= 1.1) statusClass = 'status-overvalued'
    else if (ratio >= 0.9) statusClass = 'status-fair'
    else if (ratio >= 0.7) statusClass = 'status-undervalued'
    else statusClass = 'status-undervalued-severe'
    
    info += `<div class="analysis-highlight-box">`
    info += `<div class="highlight-text">【${companyName}】当日价值评估（${today}）</div>`
    info += `<div class="valuation-comparison">`
    info += `  <div class="comparison-row">`
    info += `    <div class="comparison-item">`
    info += `      <span class="comparison-label">当前股价</span>`
    info += `      <span class="comparison-value price-value">¥${todayPrice.toFixed(2)}</span>`
    info += `    </div>`
    info += `    <div class="comparison-divider">vs</div>`
    info += `    <div class="comparison-item">`
    info += `      <span class="comparison-label">估值价值</span>`
    info += `      <span class="comparison-value value-value">¥${todayValue.toFixed(2)}</span>`
    info += `    </div>`
    info += `  </div>`
    info += `  <div class="comparison-status ${statusClass}">`
    info += `    <span class="status-badge">${statusText}</span>`
    info += `    <span class="deviation-text">偏离 ${deviationText}</span>`
    info += `  </div>`
    info += `</div>`
    info += `</div>`
  } else if (todayValue !== null) {
    const today = new Date().toISOString().split('T')[0]
    info += `<div class="analysis-highlight-box">`
    info += `<div class="highlight-text">【${companyName}】当日最新估值（${today}）：<span class="value-highlight">¥${todayValue.toFixed(2)}</span></div>`
    info += `</div>`
  } else {
    info += `<div class="analysis-highlight-box">`
    info += `<div class="highlight-text">【${companyName}】当前暂无估值数据</div>`
    info += `</div>`
  }
  
  // 历史价值偏离统计
  if (maxDeviation && minDeviation && maxDeviation.percentage !== '--' && minDeviation.percentage !== '--') {
    info += '<div class="analysis-subsection">'
    info += '<div class="analysis-subtitle">📊 历史价值偏离统计</div>'
    info += '<div class="deviation-stats-grid">'
    
    // 最大高估
    info += `<div class="deviation-card deviation-max">`
    info += `  <div class="deviation-header">`
    info += `    <span class="deviation-icon">🔥</span>`
    info += `    <span class="deviation-title">最大高估</span>`
    info += `  </div>`
    info += `  <div class="deviation-percentage">${maxDeviation.percentage}</div>`
    info += `  <div class="deviation-date">📅 ${maxDeviation.date}</div>`
    info += `  <div class="deviation-details">`
    info += `    <div class="detail-row">`
    info += `      <span class="detail-label">当日股价</span>`
    info += `      <span class="detail-value">¥${maxDeviation.price}</span>`
    info += `    </div>`
    info += `    <div class="detail-row">`
    info += `      <span class="detail-label">当日价值</span>`
    info += `      <span class="detail-value">¥${maxDeviation.value}</span>`
    info += `    </div>`
    info += `  </div>`
    info += `</div>`
    
    // 最大低估
    info += `<div class="deviation-card deviation-min">`
    info += `  <div class="deviation-header">`
    info += `    <span class="deviation-icon">💎</span>`
    info += `    <span class="deviation-title">最大低估</span>`
    info += `  </div>`
    info += `  <div class="deviation-percentage">${minDeviation.percentage}</div>`
    info += `  <div class="deviation-date">📅 ${minDeviation.date}</div>`
    info += `  <div class="deviation-details">`
    info += `    <div class="detail-row">`
    info += `      <span class="detail-label">当日股价</span>`
    info += `      <span class="detail-value">¥${minDeviation.price}</span>`
    info += `    </div>`
    info += `    <div class="detail-row">`
    info += `      <span class="detail-label">当日价值</span>`
    info += `      <span class="detail-value">¥${minDeviation.value}</span>`
    info += `    </div>`
    info += `  </div>`
    info += `</div>`
    
    info += '</div></div>'
  }
  
  // 未来价值预估
  const futureEstimates = extractFutureEstimates()
  
  if (futureEstimates.length > 0) {
    info += '<div class="analysis-subsection">'
    info += '<div class="analysis-subtitle">📈 未来价值预估 <span class="estimate-note">⚠️ 预估数据，仅作参考</span></div>'
    info += '<div class="future-estimates-list">'
    
    futureEstimates.forEach(estimate => {
      info += `<div class="future-estimate-item">`
      info += `<span class="estimate-date">• ${estimate.date}</span>`
      info += `<span class="estimate-text"> 的预估价值为 </span>`
      info += `<span class="estimate-value">¥${estimate.value}</span>`
      info += `</div>`
    })
    
    info += '</div></div>'
  } else {
    info += '<div class="analysis-detail">暂无未来价值预估数据</div>'
  }
  
  info += '</div>'
  return info
}

// 格式化消息（支持换行和加粗）
const formatMessage = (content) => {
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

// 获取当前时间
const getCurrentTime = () => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

// 滚动到底部 - 使用节流优化性能
let scrollTimer = null
const scrollToBottom = (immediate = false) => {
  if (!messagesContainer.value) return
  
  if (immediate) {
    // 立即滚动
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  } else {
    // 节流滚动，避免频繁触发
    if (scrollTimer) return
    
    scrollTimer = setTimeout(() => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
      scrollTimer = null
    }, 100)
  }
}

// 监听输入框高度变化
watch(inputMessage, () => {
  nextTick(() => {
    if (inputTextarea.value) {
      inputTextarea.value.style.height = 'auto'
      inputTextarea.value.style.height = inputTextarea.value.scrollHeight + 'px'
    }
  })
})

// 生成粒子样式
const getParticleStyle = (index) => {
  const angle = (360 / 8) * index
  const delay = index * 0.15
  return {
    '--angle': `${angle}deg`,
    '--delay': `${delay}s`
  }
}

// 滚动监听 - 使用节流优化性能
let scrollEndTimer = null
let isScrolling = false
const handleScroll = () => {
  if (!messagesContainer.value) return
  
  // 使用节流，避免频繁执行
  if (!isScrolling) {
    isScrolling = true
    messagesContainer.value.classList.add('scrolling')
  }
  
  // 清除之前的定时器
  if (scrollEndTimer) {
    clearTimeout(scrollEndTimer)
  }
  
  // 滚动结束后移除类
  scrollEndTimer = setTimeout(() => {
    if (messagesContainer.value) {
      messagesContainer.value.classList.remove('scrolling')
      isScrolling = false
    }
  }, 150)
}

onMounted(() => {
  // 3秒后隐藏脉冲动画
  setTimeout(() => {
    showPulse.value = false
  }, 3000)
  
  // 添加滚动监听
  if (messagesContainer.value) {
    messagesContainer.value.addEventListener('scroll', handleScroll, { passive: true })
  }
})

onUnmounted(() => {
  // 组件卸载时恢复页面滚动
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
  document.body.style.top = ''
  
  // 移除滚动监听
  if (messagesContainer.value) {
    messagesContainer.value.removeEventListener('scroll', handleScroll)
  }
  
  // 清理定时器
  if (scrollTimer) {
    clearTimeout(scrollTimer)
    scrollTimer = null
  }
  if (scrollEndTimer) {
    clearTimeout(scrollEndTimer)
    scrollEndTimer = null
  }
})
</script>

<style scoped>
.ai-chat-container {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 9999;
}

/* 遮罩层 */
.chat-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 9997;
  cursor: pointer;
  overflow: hidden;
  overscroll-behavior: contain;
}

/* 遮罩层动画 */
.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: all 0.3s ease;
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}

.backdrop-fade-enter-to,
.backdrop-fade-leave-from {
  opacity: 1;
}

/* 浮动按钮容器 */
.fab-wrapper {
  position: relative;
  display: inline-block;
}

/* 脉冲波纹动画 - 优化性能 */
.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  animation: pulseRing 3s ease-out infinite;
  pointer-events: none;
  /* 性能优化 */
  will-change: transform, opacity;
}

.pulse-ring-1 {
  animation-delay: 0s;
}

.pulse-ring-2 {
  animation-delay: 1s;
}

.pulse-ring-3 {
  animation-delay: 2s;
}

@keyframes pulseRing {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.4;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.4);
    opacity: 0;
  }
}

/* 粒子容器 */
.particles {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140%;
  height: 140%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 单个粒子 - 优化性能 */
.particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  background: rgba(102, 126, 234, 0.5);
  border-radius: 50%;
  transform-origin: 0 0;
  animation: particleFloat 4s ease-in-out infinite;
  animation-delay: var(--delay);
  /* 性能优化 */
  will-change: transform, opacity;
}

@keyframes particleFloat {
  0%, 100% {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(60px) scale(0);
    opacity: 0;
  }
  50% {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(70px) scale(1);
    opacity: 0.6;
  }
}

/* 浮动按钮主体 - 优化性能 */
.ai-chat-fab {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  border-radius: 50px;
  padding: 12px 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  
  /* 简化背景 */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  /* 阴影效果 */
  box-shadow: 
    0 8px 24px rgba(102, 126, 234, 0.35),
    0 4px 12px rgba(118, 75, 162, 0.25);
  
  /* 优化过渡动画 */
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  /* 性能优化 */
  will-change: transform;
}

/* 简化光效以提升性能 */
.fab-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
  pointer-events: none;
  opacity: 0.5;
}

/* 移除光线扫过效果以提升性能 */
.fab-shine {
  display: none;
}

/* 按钮内容 */
.fab-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  z-index: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.fab-icon {
  font-size: 20px;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  transition: transform 0.3s ease;
  /* 移除持续动画以提升性能 */
}

.fab-text {
  font-size: 14px;
  letter-spacing: 0.3px;
  font-weight: 700;
}

/* 悬停效果 - 简化 */
.ai-chat-fab:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 
    0 16px 40px rgba(102, 126, 234, 0.5),
    0 8px 20px rgba(118, 75, 162, 0.35);
}

.ai-chat-fab:hover .fab-icon {
  transform: scale(1.1);
}

.ai-chat-fab:hover .fab-glow {
    opacity: 0.8;
}

/* 按下效果 */
.ai-chat-fab:active {
  transform: translateY(-2px) scale(0.98);
  box-shadow: 
    0 8px 20px rgba(102, 126, 234, 0.4),
    0 4px 10px rgba(118, 75, 162, 0.3);
}

/* 聊天抽屉 */
.ai-chat-dialog {
  position: fixed;
  top: 0;
  right: 0;
  width: 850px;
  max-width: 90vw;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid rgba(148, 163, 184, 0.2);
  z-index: 9998;
  overscroll-behavior: contain;
}

/* 抽屉头部 - 紧凑设计 */
.chat-header {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  color: #1e293b;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  position: relative;
  overflow: hidden;
}

/* 动态渐变底边 - 优化版本 */
.chat-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent 0%,
    #667eea 20%,
    #764ba2 50%,
    #f093fb 80%,
    transparent 100%);
  background-size: 200% 100%;
  animation: headerLineFlow 3s linear infinite;
  /* 性能优化 */
  will-change: background-position;
}

@keyframes headerLineFlow {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 200% 0%;
  }
}

/* 左侧内容 */
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

/* 图标容器 - 简化动画 */
.header-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 4px 12px rgba(102, 126, 234, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  position: relative;
  overflow: hidden;
  /* 移除持续动画 */
}

/* 简化图标光晕 */
.header-icon-wrapper::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
  opacity: 0.6;
  /* 移除动画 */
}

.header-bot-icon {
  font-size: 22px;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

/* 头部信息 */
.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 在线状态 */
.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
  /* 简化动画 */
  animation: statusPulse 2s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.close-btn {
  background: rgba(148, 163, 184, 0.1);
  border: none;
  color: #64748b;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  z-index: 1;
  overflow: hidden;
}

.close-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.close-icon {
  position: relative;
  z-index: 1;
  transition: transform 0.3s ease;
}

.close-btn:hover {
  color: white;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.close-btn:hover::before {
  opacity: 1;
}

.close-btn:hover .close-icon {
  transform: rotate(90deg);
}

.close-btn:active {
  transform: scale(0.95);
}

/* 消息列表 - 极致优化滚动性能 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  /* 简化背景，减少重绘 */
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  /* 性能优化 */
  will-change: scroll-position;
  contain: layout style paint;
  /* 启用硬件加速 */
  transform: translateZ(0);
  -webkit-overflow-scrolling: touch;
  /* 优化滚动性能 */
  scroll-behavior: auto;
}

/* 移除装饰背景以提升滚动性能 */
/* .chat-messages::before 已删除 */

/* 使用浏览器原生滚动条，性能最优 */
/* 移除自定义滚动条样式 */

/* AI 输出时隐藏滚动条 */
.chat-messages.typing {
  overflow-y: hidden;
}

/* 输出完成后显示滚动条 */
.chat-messages:not(.typing) {
  overflow-y: auto;
}

/* 消息气泡 - 优化动画性能 */
.message-wrapper {
  display: flex;
  animation: messageSlideIn 0.3s ease-out;
  position: relative;
  /* 性能优化 - 动画完成后移除 will-change */
  animation-fill-mode: forwards;
}

/* 动画完成后移除 will-change */
@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-wrapper.user {
  justify-content: flex-end;
}

.message-wrapper.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 16px;
  position: relative;
  /* 优化过渡效果 */
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  /* 启用硬件加速 */
  transform: translateZ(0);
  backface-visibility: hidden;
}

.message-wrapper.user .message-bubble {
  /* 简化背景，移除动画 */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.message-wrapper.user .message-bubble:hover {
  transform: translateX(-2px) translateZ(0);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.message-wrapper.assistant .message-bubble {
  background: white;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #334155;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.message-wrapper.assistant .message-bubble:hover {
  transform: translateX(2px) translateZ(0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: rgba(102, 126, 234, 0.3);
}

/* 滚动时禁用 hover 效果以提升性能 */
.chat-messages.scrolling .message-bubble {
  pointer-events: none;
}

.chat-messages.scrolling .message-bubble:hover {
  transform: none;
  box-shadow: none;
}

.message-content {
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
}

.message-content :deep(strong) {
  font-weight: 700;
}

.message-content :deep(em) {
  font-style: italic;
  opacity: 0.8;
}

.message-time {
  font-size: 11px;
  margin-top: 6px;
  opacity: 0.7;
  text-align: right;
}

/* 加载动画 - 简化 */
.loading-bubble {
  padding: 16px 20px;
  background: rgba(102, 126, 234, 0.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  /* 移除脉冲动画 */
}

.typing-indicator {
  display: flex;
  gap: 6px;
  align-items: center;
}

.typing-indicator span {
  width: 10px;
  height: 10px;
  background: #667eea;
  border-radius: 50%;
  animation: typingBounce 1.2s infinite ease-in-out;
  /* 性能优化 */
  will-change: transform, opacity;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typingBounce {
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  40% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* 欢迎消息 */
.welcome-message {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
  animation: welcomeFadeIn 0.8s ease;
}

@keyframes welcomeFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.welcome-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  margin: 0 auto 20px;
  background: white;
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
  animation: welcomeIconFloat 3s ease-in-out infinite;
  display: inline-block;
}

@keyframes welcomeIconFloat {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-8px) rotate(-5deg);
  }
  50% {
    transform: translateY(0) rotate(0deg);
  }
  75% {
    transform: translateY(-8px) rotate(5deg);
  }
}

.welcome-message h4 {
  font-size: 18px;
  font-weight: 700;
  color: #334155;
  margin: 0 0 8px 0;
}

.welcome-message p {
  font-size: 14px;
  margin: 0 0 20px 0;
  line-height: 1.6;
}

.quick-questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
}

.quick-question-btn {
  background: white;
  border: 2px solid rgba(102, 126, 234, 0.3);
  color: #667eea;
  padding: 10px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

.quick-question-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: left 0.4s ease;
  z-index: -1;
}

.quick-question-btn:hover {
  color: white;
  transform: translateX(4px) scale(1.02);
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.quick-question-btn:hover::before {
  left: 0;
}

/* 分析按钮区域 */
.analysis-actions {
  padding: 16px 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

/* 主分析按钮 */
.analysis-btn {
  width: 100%;
  min-height: 60px;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: 200% 200%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 6px 18px rgba(102, 126, 234, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

/* 按钮背景动画 */
.analysis-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%);
  transition: left 0.6s ease;
}

.analysis-btn:hover:not(:disabled)::before {
  left: 100%;
}

.analysis-btn:hover:not(:disabled) {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 
    0 12px 32px rgba(102, 126, 234, 0.4),
    0 6px 16px rgba(118, 75, 162, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  animation: btnGradientFlow 3s ease infinite;
}

@keyframes btnGradientFlow {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.analysis-btn:active:not(:disabled) {
  transform: translateY(-2px) scale(0.99);
}

.analysis-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 20px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.btn-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.btn-text {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.btn-subtitle {
  font-size: 11px;
  opacity: 0.85;
  font-weight: 400;
}

.btn-arrow {
  font-size: 18px;
  font-weight: 700;
  transition: transform 0.3s ease;
}

.analysis-btn:hover:not(:disabled) .btn-arrow {
  transform: translateX(4px);
}

/* 按钮容器统一高度 */
.analysis-actions {
  min-height: 68px;
  display: flex;
  align-items: center;
}

/* 按钮切换动画 - 简洁优雅 */
.btn-fade-enter-active {
  transition: all 0.3s ease-out;
}

.btn-fade-leave-active {
  transition: all 0.25s ease-in;
}

.btn-fade-enter-from,
.btn-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.btn-fade-enter-to,
.btn-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

/* 双按钮淡入动画 - 简洁优雅 */
.dual-fade-enter-active {
  transition: all 0.35s ease-out;
  transition-delay: 0.15s;
}

.dual-fade-leave-active {
  transition: all 0.25s ease-in;
}

.dual-fade-enter-from,
.dual-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.dual-fade-enter-to,
.dual-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

/* 双按钮布局 */
.dual-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}

/* 操作按钮（输出 Prompt 和 HANAI 分析）*/
.action-btn {
  flex: 1;
  min-height: 60px;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 输出 Prompt 按钮 */
.prompt-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.prompt-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%);
  transition: left 0.5s ease;
}

.prompt-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4);
}

.prompt-btn:hover:not(:disabled)::before {
  left: 100%;
}

/* HANAI 分析按钮 */
.hanai-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.hanai-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%);
  transition: left 0.5s ease;
}

.hanai-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
}

.hanai-btn:hover:not(:disabled)::before {
  left: 100%;
}

.action-btn:active:not(:disabled) {
  transform: translateY(-1px);
}

.action-btn .btn-icon {
  font-size: 18px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.action-btn .btn-text {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

/* 抽屉滑入滑出动画 */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  transform: translateX(100%);
}

.chat-slide-enter-to,
.chat-slide-leave-from {
  transform: translateX(0);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ai-chat-container {
    bottom: 20px;
    right: 20px;
  }

  .ai-chat-fab {
    padding: 10px 18px;
    font-size: 13px;
  }

  .fab-content .fab-icon {
    font-size: 18px;
  }

  .fab-content .fab-text {
    font-size: 13px;
  }

  .ai-chat-dialog {
    width: 400px;
    max-width: calc(100vw - 40px);
  }

  .chat-header {
    padding: 14px 16px;
  }

  .header-icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .header-bot-icon {
    font-size: 20px;
  }

  .header-title {
    font-size: 15px;
  }

  .status-text {
    font-size: 10px;
  }

  .chat-messages {
    padding: 16px;
  }

  .message-bubble {
    max-width: 85%;
    padding: 10px 14px;
  }

  .message-content {
    font-size: 13px;
  }

  .analysis-actions {
    padding: 14px 16px;
  }

  .analysis-btn {
    padding: 10px 14px;
  }

  .btn-icon {
    font-size: 18px;
  }

  .btn-text {
    font-size: 14px;
  }

  .btn-subtitle {
    font-size: 10px;
  }

  .btn-arrow {
    font-size: 16px;
  }

  .welcome-logo {
    width: 56px;
    height: 56px;
    padding: 6px;
    margin-bottom: 16px;
  }

}

@media (max-width: 480px) {
  .ai-chat-dialog {
    width: 100vw;
    max-width: none;
  }

  .ai-chat-fab {
    padding: 12px 16px;
  }

  .fab-content .fab-text {
    display: none;
  }
  
  .fab-content .fab-icon {
    font-size: 22px;
  }
}

/* ========== 价值分析专属样式 ========== */

/* AI 欢迎语样式 - 移除动画提升性能 */
.message-content :deep(.ai-welcome-message) {
  padding: 16px 20px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  font-size: 15px;
  font-weight: 600;
  color: #667eea;
  text-align: center;
  margin: 8px 0 16px 0;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

/* AI 过渡文字样式 - 简化渐变 */
.message-content :deep(.ai-transition-text) {
  padding: 10px 16px;
  background: rgba(251, 191, 36, 0.1);
  border-left: 4px solid #fbbf24;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
  margin: 16px 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* AI 结束语样式 - 简化动画 */
.message-content :deep(.ai-ending-message) {
  padding: 16px 20px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 12px;
  border: 2px solid rgba(16, 185, 129, 0.3);
  font-size: 15px;
  font-weight: 600;
  color: #059669;
  text-align: center;
  margin: 16px 0 8px 0;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}

/* 分析内容段落容器 - 简化样式提升性能 */
.message-content :deep(.analysis-section) {
  margin: 10px 0;
  padding: 12px;
  background: rgba(102, 126, 234, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.15);
}

/* 段落标题 */
.message-content :deep(.analysis-title) {
  font-size: 16px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.2);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 子段落 */
.message-content :deep(.analysis-subsection) {
  margin: 12px 0;
  padding: 10px;
  background: white;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.5);
}

.message-content :deep(.analysis-subtitle) {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 高亮盒子 - 简化渐变 */
.message-content :deep(.analysis-highlight-box) {
  background: rgba(102, 126, 234, 0.08);
  padding: 12px;
  border-radius: 10px;
  border-left: 4px solid #667eea;
  margin: 10px 0;
}

.message-content :deep(.highlight-text) {
  font-size: 15px;
  line-height: 1.8;
  color: #1e293b;
}

/* 关键数据高亮 */
.message-content :deep(.price-highlight),
.message-content :deep(.value-highlight) {
  font-size: 18px;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  padding: 0 4px;
}

.message-content :deep(.date-highlight) {
  font-weight: 700;
  color: #3b82f6;
}

.message-content :deep(.percent-highlight) {
  font-weight: 700;
  color: #10b981;
}

.message-content :deep(.analysis-detail) {
  margin: 8px 0;
  padding: 10px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}

/* 估值对比样式 */
.message-content :deep(.valuation-comparison) {
  margin-top: 12px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-radius: 10px;
  border: 1px solid rgba(102, 126, 234, 0.15);
}

.message-content :deep(.comparison-row) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 12px;
}

.message-content :deep(.comparison-item) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.message-content :deep(.comparison-label) {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.message-content :deep(.comparison-value) {
  font-size: 20px;
  font-weight: 800;
  padding: 4px 8px;
}

.message-content :deep(.price-value) {
  color: #3b82f6;
}

.message-content :deep(.value-value) {
  color: #8b5cf6;
}

.message-content :deep(.comparison-divider) {
  font-size: 14px;
  color: #94a3b8;
  font-weight: 600;
  padding: 0 8px;
}

.message-content :deep(.comparison-status) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
}

.message-content :deep(.status-badge) {
  font-size: 14px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 6px;
}

.message-content :deep(.deviation-text) {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

/* 状态颜色 */
.message-content :deep(.status-overvalued-severe .status-badge) {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.message-content :deep(.status-overvalued .status-badge) {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
}

.message-content :deep(.status-fair .status-badge) {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.message-content :deep(.status-undervalued .status-badge) {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.message-content :deep(.status-undervalued-severe .status-badge) {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
}

/* 历史偏离统计卡片 */
.message-content :deep(.deviation-stats-grid) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.message-content :deep(.deviation-card) {
  padding: 14px;
  border-radius: 10px;
  border: 2px solid;
  background: rgba(255, 255, 255, 0.6);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.message-content :deep(.deviation-card:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.message-content :deep(.deviation-max) {
  border-color: rgba(239, 68, 68, 0.3);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%);
}

.message-content :deep(.deviation-min) {
  border-color: rgba(139, 92, 246, 0.3);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%);
}

.message-content :deep(.deviation-header) {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.message-content :deep(.deviation-icon) {
  font-size: 18px;
}

.message-content :deep(.deviation-title) {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.message-content :deep(.deviation-percentage) {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 6px;
}

.message-content :deep(.deviation-max .deviation-percentage) {
  color: #ef4444;
}

.message-content :deep(.deviation-min .deviation-percentage) {
  color: #8b5cf6;
}

.message-content :deep(.deviation-date) {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 10px;
}

.message-content :deep(.deviation-details) {
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.message-content :deep(.detail-row) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 6px 0;
}

.message-content :deep(.detail-label) {
  font-size: 12px;
  color: #64748b;
}

.message-content :deep(.detail-value) {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

/* 数据网格 */
.message-content :deep(.analysis-data-grid) {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 10px 0;
}

.message-content :deep(.analysis-item) {
  padding: 8px 10px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 6px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.message-content :deep(.analysis-item:hover) {
  background: white;
  border-color: rgba(102, 126, 234, 0.3);
}

.message-content :deep(.analysis-item.full-width) {
  grid-column: 1 / -1;
}

.message-content :deep(.analysis-item.span-2) {
  grid-column: span 2;
}

.message-content :deep(.analysis-item .label) {
  font-size: 11px;
  color: #64748b;
  display: block;
  margin-bottom: 3px;
}

.message-content :deep(.analysis-item .value) {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.message-content :deep(.analysis-item .value.highlight) {
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.message-content :deep(.analysis-item .value.rating) {
  color: #f59e0b;
  font-weight: 700;
}

.message-content :deep(.analysis-item .value.master-score) {
  font-size: 22px;
  font-weight: 800;
}

/* 指标列表 */
.message-content :deep(.analysis-metrics-list) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin: 10px 0;
}

.message-content :deep(.analysis-metric-item) {
  padding: 12px;
  background: rgba(248, 250, 252, 0.9);
  border-radius: 10px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.message-content :deep(.analysis-metric-item:hover) {
  background: white;
  border-color: rgba(102, 126, 234, 0.4);
}

.message-content :deep(.metric-name) {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

.message-content :deep(.metric-value) {
  font-size: 16px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 5px;
}

.message-content :deep(.metric-ranking) {
  font-size: 11px;
  padding: 5px 8px;
  border-radius: 6px;
  margin-bottom: 3px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.message-content :deep(.metric-ranking.ranking-good) {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #059669;
}

.message-content :deep(.metric-ranking.ranking-bad) {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #dc2626;
}

.message-content :deep(.metric-ranking.ranking-normal) {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: #2563eb;
}

.message-content :deep(.rank-text) {
  font-weight: 600;
}

.message-content :deep(.rank-percent) {
  opacity: 0.8;
  font-size: 11px;
}

.message-content :deep(.metric-avg) {
  font-size: 10px;
  color: #64748b;
  margin-top: 3px;
}

/* 未来预估列表 */
.message-content :deep(.future-estimates-list) {
  margin: 10px 0;
}

.message-content :deep(.future-estimate-item) {
  padding: 10px 12px;
  margin: 6px 0;
  background: rgba(124, 58, 237, 0.05);
  border-left: 3px solid #7c3aed;
  border-radius: 6px;
  font-size: 13px;
  transition: background 0.2s ease;
}

.message-content :deep(.future-estimate-item:hover) {
  background: rgba(124, 58, 237, 0.1);
}

.message-content :deep(.estimate-date) {
  font-weight: 600;
  color: #7c3aed;
}

.message-content :deep(.estimate-text) {
  color: #64748b;
}

.message-content :deep(.estimate-value) {
  font-weight: 700;
  color: #667eea;
  font-size: 14px;
}

.message-content :deep(.estimate-note) {
  font-size: 11px;
  color: #f59e0b;
  font-weight: 500;
  margin-left: 8px;
  padding: 2px 8px;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 4px;
}

/* 区间卡片样式 */
.message-content :deep(.valuation-ranges) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 10px 0;
}

.message-content :deep(.range-card) {
  padding: 14px;
  background: rgba(248, 250, 252, 0.95);
  border-radius: 10px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  transition: border-color 0.2s ease;
}

.message-content :deep(.range-card:hover) {
  border-color: rgba(102, 126, 234, 0.4);
}

.message-content :deep(.range-card-title) {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.message-content :deep(.range-card-current) {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 10px;
}

.message-content :deep(.range-value) {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-left: 6px;
}

.message-content :deep(.range-bar-container) {
  margin: 12px 0;
}

.message-content :deep(.range-bar) {
  position: relative;
  height: 8px;
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(251, 191, 36, 0.15) 50%, rgba(239, 68, 68, 0.15) 100%);
  border-radius: 4px;
  overflow: visible;
}

.message-content :deep(.range-bar-fill) {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%);
  border-radius: 4px;
  transition: width 0.6s ease;
}

.message-content :deep(.range-marker) {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: white;
  border: 2px solid #667eea;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.4);
  z-index: 2;
}

.message-content :deep(.range-labels) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 10px;
  color: #64748b;
}

.message-content :deep(.range-label-low),
.message-content :deep(.range-label-high) {
  font-weight: 500;
}

.message-content :deep(.range-label-pos) {
  font-weight: 700;
  color: #667eea;
  font-size: 11px;
}

/* 成长指标卡片样式 */
.message-content :deep(.growth-metrics-grid) {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 10px 0;
}

.message-content :deep(.growth-metric-card) {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(254, 243, 199, 0.4);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 10px;
  transition: border-color 0.2s ease;
}

.message-content :deep(.growth-metric-card:hover) {
  border-color: rgba(251, 191, 36, 0.5);
}

.message-content :deep(.growth-metric-icon) {
  font-size: 24px;
  flex-shrink: 0;
}

.message-content :deep(.growth-metric-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-content :deep(.growth-metric-label) {
  font-size: 11px;
  color: #78350f;
  font-weight: 500;
}

.message-content :deep(.growth-metric-value) {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.message-content :deep(.growth-metric-value.positive) {
  color: #10b981;
}

.message-content :deep(.growth-metric-value.negative) {
  color: #ef4444;
}

/* Prompt 内容样式 */
.message-content :deep(.prompt-content) {
  margin: 10px 0;
  padding: 16px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(217, 119, 6, 0.08));
  border-radius: 12px;
  border: 2px solid rgba(245, 158, 11, 0.3);
}

.message-content :deep(.prompt-title) {
  font-size: 16px;
  font-weight: 700;
  color: #d97706;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(245, 158, 11, 0.2);
}

.message-content :deep(.prompt-text) {
  font-size: 13px;
  line-height: 1.8;
  color: #78350f;
  white-space: pre-wrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Prompt 底部操作区 */
.message-content :deep(.prompt-actions) {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px solid rgba(245, 158, 11, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* Prompt 复制按钮 */
.message-content :deep(.prompt-copy-btn) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  position: relative;
  overflow: hidden;
}

.message-content :deep(.prompt-copy-btn::before) {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%);
  transition: left 0.5s ease;
}

.message-content :deep(.prompt-copy-btn:hover) {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.message-content :deep(.prompt-copy-btn:hover::before) {
  left: 100%;
}

.message-content :deep(.prompt-copy-btn:active) {
  transform: translateY(0) scale(0.98);
}

.message-content :deep(.prompt-copy-btn.copied) {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.message-content :deep(.copy-btn-icon) {
  font-size: 16px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.message-content :deep(.copy-btn-text) {
  font-size: 14px;
  letter-spacing: 0.3px;
}

/* 快捷链接区域 */
.message-content :deep(.prompt-quick-links) {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

/* 快捷链接按钮 */
.message-content :deep(.quick-link-btn) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 2px solid;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  text-decoration: none;
  position: relative;
  overflow: hidden;
}

.message-content :deep(.quick-link-btn::before) {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  transition: left 0.4s ease;
  z-index: 0;
}

.message-content :deep(.quick-link-btn:hover::before) {
  left: 0;
}

.message-content :deep(.quick-link-icon),
.message-content :deep(.quick-link-text) {
  position: relative;
  z-index: 1;
}

.message-content :deep(.quick-link-icon) {
  font-size: 16px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.message-content :deep(.quick-link-text) {
  font-size: 13px;
  letter-spacing: 0.3px;
}

.message-content :deep(.quick-link-btn:hover) {
  transform: translateY(-2px) scale(1.05);
}

.message-content :deep(.quick-link-btn:active) {
  transform: translateY(0) scale(0.98);
}

/* ChatGPT 按钮样式 */
.message-content :deep(.chatgpt-btn) {
  border-color: #10a37f;
  color: #10a37f;
  background: rgba(16, 163, 127, 0.05);
}

.message-content :deep(.chatgpt-btn::before) {
  background: linear-gradient(135deg, #10a37f 0%, #0d8566 100%);
}

.message-content :deep(.chatgpt-btn:hover) {
  color: white;
  box-shadow: 0 4px 12px rgba(16, 163, 127, 0.3);
}

/* DeepSeek 按钮样式 */
.message-content :deep(.deepseek-btn) {
  border-color: #8b5cf6;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.05);
}

.message-content :deep(.deepseek-btn::before) {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.message-content :deep(.deepseek-btn:hover) {
  color: white;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

/* Kimi 按钮样式 */
.message-content :deep(.kimi-btn) {
  border-color: #3b82f6;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.message-content :deep(.kimi-btn::before) {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.message-content :deep(.kimi-btn:hover) {
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* 响应式 - 移动端适配 */
@media (max-width: 1200px) {
  .message-content :deep(.analysis-data-grid) {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .message-content :deep(.valuation-ranges) {
    grid-template-columns: 1fr;
  }
  
  .message-content :deep(.growth-metrics-grid) {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .message-content :deep(.analysis-data-grid) {
    grid-template-columns: 1fr;
  }
  
  .message-content :deep(.analysis-metrics-list) {
    grid-template-columns: 1fr;
  }
  
  .message-content :deep(.analysis-section) {
    padding: 10px;
  }
  
  .message-content :deep(.analysis-subsection) {
    padding: 8px;
  }
  
  .message-content :deep(.price-highlight),
  .message-content :deep(.value-highlight) {
    font-size: 16px;
  }
  
  .message-content :deep(.metric-value) {
    font-size: 15px;
  }
  
  /* 移动端估值对比样式 */
  .message-content :deep(.valuation-comparison) {
    padding: 12px;
  }
  
  .message-content :deep(.comparison-row) {
    gap: 12px;
  }
  
  .message-content :deep(.comparison-value) {
    font-size: 18px;
  }
  
  /* 移动端历史偏离统计 */
  .message-content :deep(.deviation-stats-grid) {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .message-content :deep(.deviation-card) {
    padding: 12px;
  }
  
  .message-content :deep(.deviation-percentage) {
    font-size: 20px;
  }
}
</style>


