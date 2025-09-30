<template>
  <div class="metric-content">
    <!-- 主要数据区域 -->
    <div class="metric-main-data">
      <!-- 当前股票 -->
      <div class="metric-item metric-current">
        <div class="metric-header">
          <div class="metric-label">当前股票</div>
          <div class="metric-badge metric-badge-current">📌</div>
        </div>
        <div class="metric-value" :class="hasCurrentValue ? '' : 'metric-no-data'">
          {{ hasCurrentValue ? formatValue(currentValue) : 'N/A' }}
        </div>
      </div>

      <!-- 市场平均 -->
      <div class="metric-item">
        <div class="metric-header">
          <div class="metric-label">市场平均</div>
          <div class="metric-badge">🌐</div>
        </div>
        <div class="metric-value metric-avg">{{ formatValue(marketAvg) }}</div>
        <div v-if="hasCurrentValue && hasMarketAvg" class="metric-diff" :class="getMarketDiffClass">
          <span class="metric-diff-arrow">{{ getMarketDiffArrow }}</span>
          <span class="metric-diff-value">{{ formatDiff(marketDiff) }}</span>
        </div>
      </div>

      <!-- 行业平均 -->
      <div class="metric-item">
        <div class="metric-header">
          <div class="metric-label">{{ industryName || '行业' }}平均</div>
          <div class="metric-badge">🏭</div>
        </div>
        <div class="metric-value metric-avg">{{ formatValue(industryAvg) }}</div>
        <div v-if="hasCurrentValue && hasIndustryAvg" class="metric-diff" :class="getIndustryDiffClass">
          <span class="metric-diff-arrow">{{ getIndustryDiffArrow }}</span>
          <span class="metric-diff-value">{{ formatDiff(industryDiff) }}</span>
        </div>
      </div>
    </div>

    <!-- 行业详情 -->
    <div v-if="hasIndustryData" class="metric-industry-details">
      <!-- 排名 -->
      <div v-if="ranking" class="metric-ranking-box">
        <div class="metric-ranking-header">
          <span class="metric-ranking-icon">🎯</span>
          <span class="metric-ranking-label">行业排名</span>
        </div>
        <div class="metric-ranking-value">
          <span class="metric-rank-number">{{ ranking.rank }}</span>
          <span class="metric-rank-total">/ {{ ranking.total }}</span>
        </div>
        <div class="metric-ranking-percent">
          <span class="metric-percent-badge" :class="getRankingClass">
            {{ higherIsBetter ? '前' : '后' }} {{ ((ranking.rank / ranking.total) * 100).toFixed(0) }}%
          </span>
        </div>
      </div>

      <!-- 最优 -->
      <div v-if="extremeTop" class="metric-extreme-box metric-top">
        <div class="metric-extreme-label">
          <span class="metric-extreme-icon">{{ higherIsBetter ? '🏆' : '⭐' }}</span>
          <span>{{ higherIsBetter ? '行业最高' : '行业最低' }}</span>
        </div>
        <div class="metric-extreme-value">{{ formatValue(extremeTop[fieldName]) }}</div>
        <div 
          class="metric-extreme-stock" 
          @click="handleStockClick(extremeTop.stockid)"
          :class="{ 'metric-current-stock': extremeTop.stockid === currentStockId }"
        >
          {{ extremeTop.company || extremeTop.symbol }}
        </div>
      </div>

      <!-- 最差 -->
      <div v-if="extremeBottom" class="metric-extreme-box metric-bottom">
        <div class="metric-extreme-label">
          <span class="metric-extreme-icon">{{ higherIsBetter ? '📉' : '📈' }}</span>
          <span>{{ higherIsBetter ? '行业最低' : '行业最高' }}</span>
        </div>
        <div class="metric-extreme-value">{{ formatValue(extremeBottom[fieldName]) }}</div>
        <div 
          class="metric-extreme-stock" 
          @click="handleStockClick(extremeBottom.stockid)"
          :class="{ 'metric-current-stock': extremeBottom.stockid === currentStockId }"
        >
          {{ extremeBottom.company || extremeBottom.symbol }}
        </div>
      </div>
    </div>

    <!-- 无数据提示 -->
    <div v-else-if="industryName" class="metric-no-industry-data">
      <div class="metric-no-data-icon">ℹ️</div>
      <div class="metric-no-data-text">该行业暂无可用的{{ metricName }}数据</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentValue: {
    type: Number,
    default: null
  },
  allStocksData: {
    type: Array,
    default: () => []
  },
  industryName: {
    type: String,
    default: ''
  },
  currentStockId: {
    type: String,
    default: ''
  },
  currentDate: {
    type: String,
    default: ''
  },
  fieldName: {
    type: String,
    required: true
  },
  unit: {
    type: String,
    default: '%'
  },
  metricName: {
    type: String,
    default: '指标'
  },
  higherIsBetter: {
    type: Boolean,
    default: true  // 毛利率、股息率、净利率越高越好；市盈率、市净率越低越好
  }
})

// 检查当前值是否有效
const hasCurrentValue = computed(() => {
  return props.currentValue !== null && 
         props.currentValue !== undefined && 
         !isNaN(props.currentValue) &&
         props.currentValue > 0
})

// 计算市场平均
const marketAvg = computed(() => {
  if (!props.allStocksData || props.allStocksData.length === 0) return null

  let total = 0
  let count = 0

  props.allStocksData.forEach(stock => {
    const value = stock[props.fieldName]
    if (value !== null && value !== undefined && !isNaN(value) && value > 0) {
      total += value
      count++
    }
  })

  return count > 0 ? total / count : null
})

const hasMarketAvg = computed(() => {
  return marketAvg.value !== null && marketAvg.value !== undefined && !isNaN(marketAvg.value)
})

// 计算行业平均
const industryAvg = computed(() => {
  if (!props.allStocksData || props.allStocksData.length === 0 || !props.industryName) return null

  const industryStocks = props.allStocksData.filter(
    stock => stock.industry === props.industryName
  )

  if (industryStocks.length === 0) return null

  let total = 0
  let count = 0

  industryStocks.forEach(stock => {
    const value = stock[props.fieldName]
    if (value !== null && value !== undefined && !isNaN(value) && value > 0) {
      total += value
      count++
    }
  })

  return count > 0 ? total / count : null
})

const hasIndustryAvg = computed(() => {
  return industryAvg.value !== null && industryAvg.value !== undefined && !isNaN(industryAvg.value)
})

// 差值计算
const marketDiff = computed(() => {
  if (!hasCurrentValue.value || !hasMarketAvg.value) return 0
  return props.currentValue - marketAvg.value
})

const industryDiff = computed(() => {
  if (!hasCurrentValue.value || !hasIndustryAvg.value) return 0
  return props.currentValue - industryAvg.value
})

// 箭头
const getMarketDiffArrow = computed(() => {
  const diff = marketDiff.value
  if (diff > 0) return '↑'
  if (diff < 0) return '↓'
  return '='
})

const getIndustryDiffArrow = computed(() => {
  const diff = industryDiff.value
  if (diff > 0) return '↑'
  if (diff < 0) return '↓'
  return '='
})

// 差值样式
const getMarketDiffClass = computed(() => {
  const diff = marketDiff.value
  const threshold = props.unit === '%' ? 5 : (props.unit === '' ? 2 : 5)
  
  if (props.higherIsBetter) {
    if (diff > threshold) return 'metric-positive'
    if (diff < -threshold) return 'metric-negative'
  } else {
    if (diff < -threshold) return 'metric-positive'
    if (diff > threshold) return 'metric-negative'
  }
  return 'metric-neutral'
})

const getIndustryDiffClass = computed(() => {
  const diff = industryDiff.value
  const threshold = props.unit === '%' ? 5 : (props.unit === '' ? 2 : 5)
  
  if (props.higherIsBetter) {
    if (diff > threshold) return 'metric-positive'
    if (diff < -threshold) return 'metric-negative'
  } else {
    if (diff < -threshold) return 'metric-positive'
    if (diff > threshold) return 'metric-negative'
  }
  return 'metric-neutral'
})

// 行业数据
const industryStocksWithValue = computed(() => {
  if (!props.allStocksData || props.allStocksData.length === 0 || !props.industryName) return []

  const industryStocks = props.allStocksData.filter(
    stock => stock.industry === props.industryName &&
             stock[props.fieldName] !== null &&
             stock[props.fieldName] !== undefined &&
             !isNaN(stock[props.fieldName]) &&
             stock[props.fieldName] > 0
  )

  // 排序：higherIsBetter=true 降序，false 升序
  return industryStocks.sort((a, b) => {
    if (props.higherIsBetter) {
      return b[props.fieldName] - a[props.fieldName]
    } else {
      return a[props.fieldName] - b[props.fieldName]
    }
  })
})

const hasIndustryData = computed(() => {
  return industryStocksWithValue.value.length > 0
})

const extremeTop = computed(() => {
  if (!hasIndustryData.value) return null
  return industryStocksWithValue.value[0]
})

const extremeBottom = computed(() => {
  if (!hasIndustryData.value) return null
  return industryStocksWithValue.value[industryStocksWithValue.value.length - 1]
})

const ranking = computed(() => {
  if (!hasCurrentValue.value || !hasIndustryData.value || !props.currentStockId) return null

  const rank = industryStocksWithValue.value.findIndex(
    stock => stock.stockid === props.currentStockId
  )

  if (rank === -1) return null

  return {
    rank: rank + 1,
    total: industryStocksWithValue.value.length
  }
})

// 排名等级样式
const getRankingClass = computed(() => {
  if (!ranking.value) return ''
  const percent = (ranking.value.rank / ranking.value.total) * 100
  if (percent <= 20) return 'rank-excellent'
  if (percent <= 50) return 'rank-good'
  return 'rank-normal'
})

// 格式化
const formatValue = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  return `${value.toFixed(2)}${props.unit}`
}

const formatDiff = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  return `${Math.abs(value).toFixed(2)}${props.unit}`
}

// 跳转
const handleStockClick = (stockid) => {
  // 如果是当前股票，不跳转
  if (stockid === props.currentStockId) return
  if (!stockid || !props.currentDate) return
  
  const url = `/#/detail?stockid=${stockid}&date=${props.currentDate}`
  window.open(url, '_blank')
}
</script>

<style scoped>
.metric-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 主要数据区域 */
.metric-main-data {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.metric-item {
  position: relative;
  background: white;
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.3s ease;
}

.metric-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #cbd5e1;
}

.metric-current {
  border: 2px solid #3b82f6;
  background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.12);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-badge {
  font-size: 14px;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.metric-badge-current {
  opacity: 1;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.metric-value {
  font-size: 28px;
  font-weight: 800;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.1;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.metric-value.metric-avg {
  font-size: 22px;
  font-weight: 700;
  color: #475569;
}

.metric-value.metric-no-data {
  color: #94a3b8;
  font-size: 22px;
  font-weight: 600;
}

.metric-diff {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 8px;
  align-self: flex-start;
}

.metric-diff.metric-positive {
  color: #059669;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.metric-diff.metric-negative {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.metric-diff.metric-neutral {
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}

.metric-diff-arrow {
  font-size: 16px;
  font-weight: 700;
}

.metric-diff-value {
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
}

/* 行业详情 */
.metric-industry-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
}

.metric-ranking-box {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1.5px solid #93c5fd;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.1);
}

.metric-ranking-box:hover {
  border-color: #60a5fa;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  transform: translateY(-2px);
}

.metric-ranking-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.metric-ranking-icon {
  font-size: 14px;
}

.metric-ranking-label {
  font-size: 10px;
  color: #0369a1;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-ranking-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.metric-rank-number {
  font-size: 26px;
  font-weight: 800;
  color: #0369a1;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.5px;
}

.metric-rank-total {
  font-size: 16px;
  color: #0284c7;
  font-weight: 600;
}

.metric-ranking-percent {
  margin-top: 4px;
}

.metric-percent-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.metric-percent-badge.rank-excellent {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #15803d;
  border: 1px solid #86efac;
  box-shadow: 0 2px 4px rgba(34, 197, 94, 0.15);
}

.metric-percent-badge.rank-good {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  border: 1px solid #93c5fd;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
}

.metric-percent-badge.rank-normal {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 1px solid #fcd34d;
  box-shadow: 0 2px 4px rgba(251, 191, 36, 0.15);
}

.metric-extreme-box {
  position: relative;
  background: white;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.metric-extreme-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.metric-extreme-box.metric-top {
  border-left: 3px solid #10b981;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
}

.metric-extreme-box.metric-bottom {
  border-left: 3px solid #f59e0b;
  background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
}

.metric-extreme-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.metric-extreme-icon {
  font-size: 12px;
}

.metric-extreme-value {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.3px;
}

.metric-extreme-stock {
  font-size: 12px;
  color: #3b82f6;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 10px;
  margin-top: 6px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.15);
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  transition: all 0.3s ease;
}

.metric-extreme-stock:hover {
  color: #2563eb;
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
}

.metric-extreme-stock.metric-current-stock {
  color: #10b981;
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.2);
  font-weight: 700;
  cursor: default;
}

.metric-extreme-stock.metric-current-stock:hover {
  color: #10b981;
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.2);
  transform: none;
  box-shadow: none;
}

/* 无数据提示 */
.metric-no-industry-data {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 8px;
}

.metric-no-data-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.metric-no-data-text {
  font-size: 12px;
  color: #78350f;
  font-weight: 500;
}

/* 响应式 */
@media (max-width: 992px) {
  .metric-main-data,
  .metric-industry-details {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .metric-value {
    font-size: 20px;
  }

  .metric-value.metric-avg {
    font-size: 18px;
  }

  .metric-rank-number {
    font-size: 20px;
  }

  .metric-extreme-value {
    font-size: 16px;
  }
}
</style>
