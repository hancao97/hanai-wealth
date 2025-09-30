<template>
  <div class="gross-profit-margin-card">
    <h3 class="gpm-card-title">
      <span class="gpm-card-icon">📊</span>
      <span>毛利率分析</span>
    </h3>
    
    <div class="gpm-content">
      <!-- 主要数据区域 - 横向布局 -->
      <div class="gpm-main-data">
        <!-- 当前股票毛利率 -->
        <div class="gpm-item gpm-current">
          <div class="gpm-label">当前股票</div>
          <div class="gpm-value" :class="hasCurrentMargin ? getCurrentMarginClass : 'gpm-no-data'">
            {{ hasCurrentMargin ? formatMargin(currentGrossMargin) : 'N/A' }}
          </div>
          <div v-if="hasCurrentMargin" class="gpm-badge" :class="getCurrentMarginClass">
            {{ getCurrentMarginLevel }}
          </div>
        </div>

        <!-- 市场平均 -->
        <div class="gpm-item">
          <div class="gpm-label">市场平均</div>
          <div class="gpm-value gpm-avg">{{ formatMargin(marketAvgMargin) }}</div>
          <div v-if="hasCurrentMargin && hasMarketAvg" class="gpm-diff" :class="getMarketDiffClass">
            <span class="gpm-diff-arrow">{{ getMarketDiffArrow }}</span>
            <span class="gpm-diff-value">{{ formatDiff(getMarketDiff) }}</span>
          </div>
        </div>

        <!-- 行业平均 -->
        <div class="gpm-item">
          <div class="gpm-label">{{ industryName || '行业' }}平均</div>
          <div class="gpm-value gpm-avg">{{ formatMargin(industryAvgMargin) }}</div>
          <div v-if="hasCurrentMargin && hasIndustryAvg" class="gpm-diff" :class="getIndustryDiffClass">
            <span class="gpm-diff-arrow">{{ getIndustryDiffArrow }}</span>
            <span class="gpm-diff-value">{{ formatDiff(getIndustryDiff) }}</span>
          </div>
        </div>
      </div>

      <!-- 行业排名和极值信息 -->
      <div v-if="hasIndustryData" class="gpm-industry-details">
        <!-- 当前股票排名 -->
        <div v-if="industryRanking" class="gpm-ranking-box">
          <div class="gpm-ranking-label">行业排名</div>
          <div class="gpm-ranking-value">
            <span class="gpm-rank-number">{{ industryRanking.rank }}</span>
            <span class="gpm-rank-total">/ {{ industryRanking.total }}</span>
          </div>
          <div class="gpm-ranking-percent">
            前 {{ ((industryRanking.rank / industryRanking.total) * 100).toFixed(0) }}%
          </div>
        </div>

        <!-- 行业最高 -->
        <div v-if="industryTopStock" class="gpm-extreme-box gpm-top">
          <div class="gpm-extreme-label">
            <span class="gpm-extreme-icon">🏆</span>
            <span>行业最高</span>
          </div>
          <div class="gpm-extreme-value">{{ formatMargin(industryTopStock.grossmargin) }}</div>
          <div 
            class="gpm-extreme-stock" 
            @click="handleStockClick(industryTopStock.stockid)"
            :class="{ 'gpm-current-stock': industryTopStock.stockid === currentStockId }"
          >
            {{ industryTopStock.company || industryTopStock.symbol }}
          </div>
        </div>

        <!-- 行业最低 -->
        <div v-if="industryBottomStock" class="gpm-extreme-box gpm-bottom">
          <div class="gpm-extreme-label">
            <span class="gpm-extreme-icon">📉</span>
            <span>行业最低</span>
          </div>
          <div class="gpm-extreme-value">{{ formatMargin(industryBottomStock.grossmargin) }}</div>
          <div 
            class="gpm-extreme-stock" 
            @click="handleStockClick(industryBottomStock.stockid)"
            :class="{ 'gpm-current-stock': industryBottomStock.stockid === currentStockId }"
          >
            {{ industryBottomStock.company || industryBottomStock.symbol }}
          </div>
        </div>
      </div>

      <!-- 无行业数据提示 -->
      <div v-else-if="industryName" class="gpm-no-industry-data">
        <div class="gpm-no-data-icon">ℹ️</div>
        <div class="gpm-no-data-text">该行业暂无可用的毛利率数据</div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 当前股票的毛利率
  currentGrossMargin: {
    type: Number,
    default: null
  },
  // 全部股票数据（用于计算市场平均）
  allStocksData: {
    type: Array,
    default: () => []
  },
  // 当前股票的行业
  industryName: {
    type: String,
    default: ''
  },
  // 当前股票ID
  currentStockId: {
    type: String,
    default: ''
  },
  // 数据日期
  currentDate: {
    type: String,
    default: ''
  }
})

// 检查当前股票是否有毛利率数据（毛利率为0也视为无效数据）
const hasCurrentMargin = computed(() => {
  return props.currentGrossMargin !== null && 
         props.currentGrossMargin !== undefined && 
         !isNaN(props.currentGrossMargin) &&
         props.currentGrossMargin > 0
})

// 计算市场平均毛利率（全部股票）
const marketAvgMargin = computed(() => {
  if (!props.allStocksData || props.allStocksData.length === 0) {
    return null
  }

  let total = 0
  let count = 0

  props.allStocksData.forEach(stock => {
    const margin = stock.grossmargin
    if (margin !== null && margin !== undefined && !isNaN(margin) && margin > 0) {
      total += margin
      count++
    }
  })

  return count > 0 ? total / count : null
})

// 检查是否有市场平均数据
const hasMarketAvg = computed(() => {
  return marketAvgMargin.value !== null && 
         marketAvgMargin.value !== undefined && 
         !isNaN(marketAvgMargin.value)
})

// 计算同行业平均毛利率
const industryAvgMargin = computed(() => {
  if (!props.allStocksData || props.allStocksData.length === 0 || !props.industryName) {
    return null
  }

  const industryStocks = props.allStocksData.filter(
    stock => stock.industry === props.industryName
  )

  if (industryStocks.length === 0) {
    return null
  }

  let total = 0
  let count = 0

  industryStocks.forEach(stock => {
    const margin = stock.grossmargin
    if (margin !== null && margin !== undefined && !isNaN(margin) && margin > 0) {
      total += margin
      count++
    }
  })

  return count > 0 ? total / count : null
})

// 检查是否有行业平均数据
const hasIndustryAvg = computed(() => {
  return industryAvgMargin.value !== null && 
         industryAvgMargin.value !== undefined && 
         !isNaN(industryAvgMargin.value)
})

// 与市场平均的差值
const getMarketDiff = computed(() => {
  if (!hasCurrentMargin.value || !hasMarketAvg.value) {
    return 0
  }
  return props.currentGrossMargin - marketAvgMargin.value
})

// 与行业平均的差值
const getIndustryDiff = computed(() => {
  if (!hasCurrentMargin.value || !hasIndustryAvg.value) {
    return 0
  }
  return props.currentGrossMargin - industryAvgMargin.value
})

// 市场对比箭头
const getMarketDiffArrow = computed(() => {
  const diff = getMarketDiff.value
  if (diff > 0) return '↑'
  if (diff < 0) return '↓'
  return '='
})

// 行业对比箭头
const getIndustryDiffArrow = computed(() => {
  const diff = getIndustryDiff.value
  if (diff > 0) return '↑'
  if (diff < 0) return '↓'
  return '='
})

// 市场差值样式类
const getMarketDiffClass = computed(() => {
  const diff = getMarketDiff.value
  if (diff > 5) return 'gpm-positive'
  if (diff < -5) return 'gpm-negative'
  return 'gpm-neutral'
})

// 行业差值样式类
const getIndustryDiffClass = computed(() => {
  const diff = getIndustryDiff.value
  if (diff > 5) return 'gpm-positive'
  if (diff < -5) return 'gpm-negative'
  return 'gpm-neutral'
})

// 当前毛利率样式类
const getCurrentMarginClass = computed(() => {
  if (!hasCurrentMargin.value) return ''
  
  const margin = props.currentGrossMargin
  if (margin >= 50) return 'gpm-excellent'
  if (margin >= 30) return 'gpm-good'
  if (margin >= 15) return 'gpm-fair'
  return 'gpm-poor'
})

// 当前毛利率等级
const getCurrentMarginLevel = computed(() => {
  if (!hasCurrentMargin.value) return ''
  
  const margin = props.currentGrossMargin
  if (margin >= 50) return '优秀'
  if (margin >= 30) return '良好'
  if (margin >= 15) return '一般'
  return '偏低'
})

// 获取同行业所有有效毛利率的股票（排序）
const industryStocksWithMargin = computed(() => {
  if (!props.allStocksData || props.allStocksData.length === 0 || !props.industryName) {
    return []
  }

  const industryStocks = props.allStocksData.filter(
    stock => stock.industry === props.industryName &&
             stock.grossmargin !== null &&
             stock.grossmargin !== undefined &&
             !isNaN(stock.grossmargin) &&
             stock.grossmargin > 0
  )

  // 按毛利率降序排列
  return industryStocks.sort((a, b) => b.grossmargin - a.grossmargin)
})

// 检查行业是否有有效数据
const hasIndustryData = computed(() => {
  return industryStocksWithMargin.value.length > 0
})

// 同行业最高毛利率股票
const industryTopStock = computed(() => {
  if (!hasIndustryData.value) return null
  return industryStocksWithMargin.value[0]
})

// 同行业最低毛利率股票
const industryBottomStock = computed(() => {
  if (!hasIndustryData.value) return null
  return industryStocksWithMargin.value[industryStocksWithMargin.value.length - 1]
})

// 当前股票在行业中的排名
const industryRanking = computed(() => {
  if (!hasCurrentMargin.value || !hasIndustryData.value || !props.currentStockId) {
    return null
  }

  const rank = industryStocksWithMargin.value.findIndex(
    stock => stock.stockid === props.currentStockId
  )

  if (rank === -1) return null
  
  return {
    rank: rank + 1,
    total: industryStocksWithMargin.value.length
  }
})

// 生成股票详情页链接
const getStockDetailUrl = (stockid) => {
  if (!stockid || !props.currentDate) return '#'
  return `/detail?stockid=${stockid}&date=${props.currentDate}`
}

// 处理股票链接点击
const handleStockClick = (stockid) => {
  if (!stockid || !props.currentDate) return
  const url = getStockDetailUrl(stockid)
  window.open(url, '_blank')
}

// 格式化毛利率显示
const formatMargin = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A'
  }
  return `${value.toFixed(2)}%`
}

// 格式化差值显示
const formatDiff = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A'
  }
  const absValue = Math.abs(value)
  return `${absValue.toFixed(2)}%`
}
</script>

<style scoped>
.gross-profit-margin-card {
  position: relative;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(226, 232, 240, 0.8);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.gross-profit-margin-card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.gpm-card-title {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e2e8f0;
  z-index: 1;
}

.gpm-card-icon {
  font-size: 18px;
}

.gpm-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1;
}

/* 主要数据区域 - 横向布局 */
.gpm-main-data {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.gpm-item {
  position: relative;
  background: white;
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.3s ease;
}

.gpm-item:hover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.gpm-current {
  border-left: 3px solid #3b82f6;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
}

.gpm-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.gpm-value {
  font-size: 24px;
  font-weight: 700;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.2;
}

.gpm-value.gpm-avg {
  font-size: 20px;
  color: #475569;
}

.gpm-value.gpm-no-data {
  color: #94a3b8;
  font-size: 20px;
}

.gpm-value.gpm-excellent {
  color: #10b981;
}

.gpm-value.gpm-good {
  color: #3b82f6;
}

.gpm-value.gpm-fair {
  color: #f59e0b;
}

.gpm-value.gpm-poor {
  color: #ef4444;
}

.gpm-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  align-self: flex-start;
}

.gpm-badge.gpm-excellent {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.gpm-badge.gpm-good {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.gpm-badge.gpm-fair {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.gpm-badge.gpm-poor {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.gpm-diff {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  align-self: flex-start;
  margin-top: 2px;
}

.gpm-diff.gpm-positive {
  color: #059669;
  background: rgba(16, 185, 129, 0.08);
}

.gpm-diff.gpm-negative {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.08);
}

.gpm-diff.gpm-neutral {
  color: #64748b;
  background: #f1f5f9;
}

.gpm-diff-arrow {
  font-size: 14px;
  font-weight: 700;
}

.gpm-diff-value {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 11px;
}

/* 行业详情区域 */
.gpm-industry-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
}

/* 排名信息 */
.gpm-ranking-box {
  position: relative;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid #bae6fd;
  transition: all 0.3s ease;
}

.gpm-ranking-box:hover {
  border-color: #7dd3fc;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.gpm-ranking-label {
  font-size: 10px;
  color: #0369a1;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.gpm-ranking-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.gpm-rank-number {
  font-size: 22px;
  font-weight: 700;
  color: #0284c7;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
}

.gpm-rank-total {
  font-size: 14px;
  color: #0891b2;
  font-weight: 500;
}

.gpm-ranking-percent {
  font-size: 11px;
  color: #0369a1;
  font-weight: 500;
}

/* 极值信息 */
.gpm-extreme-box {
  position: relative;
  background: white;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.gpm-extreme-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
}

.gpm-extreme-box.gpm-top {
  border-left: 3px solid #10b981;
}

.gpm-extreme-box.gpm-bottom {
  border-left: 3px solid #f59e0b;
}

.gpm-extreme-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.gpm-extreme-icon {
  font-size: 12px;
}

.gpm-extreme-value {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
}

.gpm-extreme-stock {
  font-size: 11px;
  color: #3b82f6;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.gpm-extreme-stock:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.gpm-extreme-stock.gpm-current-stock {
  color: #94a3b8;
  cursor: default;
}

.gpm-extreme-stock.gpm-current-stock:hover {
  color: #94a3b8;
  text-decoration: none;
}

/* 无数据提示 */
.gpm-no-industry-data {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 8px;
}

.gpm-no-data-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.gpm-no-data-text {
  font-size: 12px;
  color: #78350f;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .gpm-main-data {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .gpm-industry-details {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .gross-profit-margin-card {
    padding: 12px 16px;
  }

  .gpm-card-title {
    font-size: 15px;
    margin-bottom: 12px;
  }

  .gpm-value {
    font-size: 20px;
  }

  .gpm-value.gpm-avg {
    font-size: 18px;
  }

  .gpm-rank-number {
    font-size: 20px;
  }

  .gpm-extreme-value {
    font-size: 16px;
  }
}
</style>
