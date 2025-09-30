<template>
  <div class="comprehensive-metrics">
    <div class="metric-row">
      <!-- 自由现金流 -->
      <div class="metric-item">
        <div class="metric-label">
          <span class="metric-icon">💰</span>
          <span>自由现金流</span>
        </div>
        <div class="metric-content-row">
          <div class="metric-current">
            <div class="metric-value" :class="{ 'metric-no-data': !hasFCF }">
              {{ formatFCF(stockData.total_free_cash_flow) }}
            </div>
            <div v-if="hasFCF && fcfRank" class="metric-rank-info">
              A股排名: <span class="rank-number">{{ fcfRank.rank }}</span> / {{ fcfRank.total }}
            </div>
          </div>
          <div v-if="fcfTopStock" class="metric-top-stock" @click.stop="viewStock(fcfTopStock.stockid, $event)">
            <span class="top-label">👑 {{ truncateText(fcfTopStock.company, 12) }} :</span>
            <span class="top-value">{{ formatFCF(fcfTopStock.value) }}</span>
          </div>
        </div>
      </div>

      <!-- 10年净利润增长 -->
      <div class="metric-item">
        <div class="metric-label">
          <span class="metric-icon">📈</span>
          <span>10年净利润增长</span>
        </div>
        <div class="metric-content-row">
          <div class="metric-current">
            <div class="metric-value" :class="{ 'metric-no-data': !hasNetIncomeGrowth }">
              {{ formatPercent(stockData.total_netincome_growth_10y) }}
            </div>
            <div v-if="hasNetIncomeGrowth && netIncomeGrowthRank" class="metric-rank-info">
              A股排名: <span class="rank-number">{{ netIncomeGrowthRank.rank }}</span> / {{ netIncomeGrowthRank.total }}
            </div>
          </div>
          <div v-if="netIncomeGrowthTopStock" class="metric-top-stock" @click.stop="viewStock(netIncomeGrowthTopStock.stockid, $event)">
            <span class="top-label">👑{{ truncateText(netIncomeGrowthTopStock.company, 12) }} :</span>
            <span class="top-value">{{ formatPercent(netIncomeGrowthTopStock.value) }}</span>
          </div>
        </div>
      </div>

      <!-- 10年年化回报 -->
      <div class="metric-item">
        <div class="metric-label">
          <span class="metric-icon">🎯</span>
          <span>10年年化回报</span>
        </div>
        <div class="metric-content-row">
          <div class="metric-current">
            <div class="metric-value" :class="{ 'metric-no-data': !hasPriceChange10y }">
              {{ formatPercent(stockData.pchange_10y) }}
            </div>
            <div v-if="hasPriceChange10y && priceChange10yRank" class="metric-rank-info">
              A股排名: <span class="rank-number">{{ priceChange10yRank.rank }}</span> / {{ priceChange10yRank.total }}
            </div>
          </div>
          <div v-if="priceChange10yTopStock" class="metric-top-stock" @click.stop="viewStock(priceChange10yTopStock.stockid, $event)">
            <span class="top-label">👑{{ truncateText(priceChange10yTopStock.company, 12) }} :</span>
            <span class="top-value">{{ formatPercent(priceChange10yTopStock.value) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const props = defineProps({
  stockData: {
    type: Object,
    required: true
  },
  allStocksData: {
    type: Array,
    default: () => []
  }
})

// 检查数据有效性
const hasFCF = computed(() => {
  const val = props.stockData.total_free_cash_flow
  return val !== null && val !== undefined && !isNaN(val) && val > 0
})

const hasNetIncomeGrowth = computed(() => {
  const val = props.stockData.total_netincome_growth_10y
  return val !== null && val !== undefined && !isNaN(val)
})

const hasPriceChange10y = computed(() => {
  const val = props.stockData.pchange_10y
  return val !== null && val !== undefined && !isNaN(val)
})

// 计算排名
const fcfRank = computed(() => {
  if (!hasFCF.value || !props.allStocksData.length) return null
  
  const validStocks = props.allStocksData.filter(s => 
    s.total_free_cash_flow !== null && 
    s.total_free_cash_flow !== undefined && 
    !isNaN(s.total_free_cash_flow) &&
    s.total_free_cash_flow > 0
  ).sort((a, b) => b.total_free_cash_flow - a.total_free_cash_flow)
  
  const rank = validStocks.findIndex(s => s.stockid === props.stockData.stockid)
  if (rank === -1) return null
  
  return {
    rank: rank + 1,
    total: validStocks.length
  }
})

const netIncomeGrowthRank = computed(() => {
  if (!hasNetIncomeGrowth.value || !props.allStocksData.length) return null
  
  const validStocks = props.allStocksData.filter(s => 
    s.total_netincome_growth_10y !== null && 
    s.total_netincome_growth_10y !== undefined && 
    !isNaN(s.total_netincome_growth_10y)
  ).sort((a, b) => b.total_netincome_growth_10y - a.total_netincome_growth_10y)
  
  const rank = validStocks.findIndex(s => s.stockid === props.stockData.stockid)
  if (rank === -1) return null
  
  return {
    rank: rank + 1,
    total: validStocks.length
  }
})

const priceChange10yRank = computed(() => {
  if (!hasPriceChange10y.value || !props.allStocksData.length) return null
  
  const validStocks = props.allStocksData.filter(s => 
    s.pchange_10y !== null && 
    s.pchange_10y !== undefined && 
    !isNaN(s.pchange_10y)
  ).sort((a, b) => b.pchange_10y - a.pchange_10y)
  
  const rank = validStocks.findIndex(s => s.stockid === props.stockData.stockid)
  if (rank === -1) return null
  
  return {
    rank: rank + 1,
    total: validStocks.length
  }
})

// 格式化函数
const formatFCF = (value) => {
  if (value === null || value === undefined || isNaN(value) || value === 0) return 'N/A'
  
  // 转换为亿元
  const yi = value / 100000000
  if (yi >= 10000) {
    return `${(yi / 10000).toFixed(2)}万亿`
  } else if (yi >= 1) {
    return `${yi.toFixed(2)}亿`
  } else {
    return `${(value / 10000).toFixed(2)}万`
  }
}

const formatPercent = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  return `${value.toFixed(2)}%`
}

const truncateText = (text, maxLength) => {
  if (!text) return 'N/A'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 计算全A最佳数据
const fcfTopStock = computed(() => {
  if (!props.allStocksData.length) return null
  
  const validStocks = props.allStocksData.filter(s => 
    s.total_free_cash_flow !== null && 
    s.total_free_cash_flow !== undefined && 
    !isNaN(s.total_free_cash_flow) &&
    s.total_free_cash_flow > 0
  )
  
  if (!validStocks.length) return null
  
  const topStock = validStocks.reduce((max, stock) => 
    stock.total_free_cash_flow > max.total_free_cash_flow ? stock : max
  )
  
  return {
    stockid: topStock.stockid,
    company: topStock.company || topStock.symbol,
    value: topStock.total_free_cash_flow
  }
})

const netIncomeGrowthTopStock = computed(() => {
  if (!props.allStocksData.length) return null
  
  const validStocks = props.allStocksData.filter(s => 
    s.total_netincome_growth_10y !== null && 
    s.total_netincome_growth_10y !== undefined && 
    !isNaN(s.total_netincome_growth_10y)
  )
  
  if (!validStocks.length) return null
  
  const topStock = validStocks.reduce((max, stock) => 
    stock.total_netincome_growth_10y > max.total_netincome_growth_10y ? stock : max
  )
  
  return {
    stockid: topStock.stockid,
    company: topStock.company || topStock.symbol,
    value: topStock.total_netincome_growth_10y
  }
})

const priceChange10yTopStock = computed(() => {
  if (!props.allStocksData.length) return null
  
  const validStocks = props.allStocksData.filter(s => 
    s.pchange_10y !== null && 
    s.pchange_10y !== undefined && 
    !isNaN(s.pchange_10y)
  )
  
  if (!validStocks.length) return null
  
  const topStock = validStocks.reduce((max, stock) => 
    stock.pchange_10y > max.pchange_10y ? stock : max
  )
  
  return {
    stockid: topStock.stockid,
    company: topStock.company || topStock.symbol,
    value: topStock.pchange_10y
  }
})

// 跳转到股票详情 - 支持新标签页打开
const viewStock = (stockid, event) => {
  if (!stockid) return
  
  const currentDate = route.query.date
  const url = router.resolve({
    name: 'StockDetail',
    query: {
      stockid: stockid,
      date: currentDate
    }
  }).href
  
  // 如果按住 Ctrl/Cmd 键或者中键点击，在新标签页打开
  if (event && (event.ctrlKey || event.metaKey || event.button === 1)) {
    window.open(url, '_blank')
  } else {
    // 默认在新标签页打开
    window.open(url, '_blank')
  }
}
</script>

<style scoped>
.metric-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 10px;
  border: 1px solid rgba(251, 191, 36, 0.2);
  transition: all 0.3s ease;
}

.metric-item:hover {
  background: rgba(255, 255, 255, 0.6);
  border-color: rgba(251, 191, 36, 0.4);
}

.metric-content-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  position: relative;
}

.metric-current {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 auto;
}

.metric-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #78350f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-icon {
  font-size: 14px;
}

.metric-value {
  font-size: 18px;
  font-weight: 800;
  color: #78350f;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1;
  letter-spacing: -0.5px;
}

.metric-value.metric-no-data {
  color: #a16207;
  font-size: 18px;
  font-weight: 600;
}

.metric-rank-info {
  font-size: 9px;
  color: #92400e;
  font-weight: 600;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 4px;
  display: inline-block;
  align-self: flex-start;
  line-height: 1.2;
}

.rank-number {
  font-weight: 700;
  color: #78350f;
  font-size: 10px;
}

.metric-top-stock {
  top: -12px;
  font-size: 12px;
  color: #92400e;
  font-weight: 600;
  padding: 8px 16px;
  position: absolute;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.15));
  border-radius: 6px;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(251, 191, 36, 0.3);
  position: relative;
  overflow: hidden;
  flex: 0 1 auto;
  min-width: 0;
  align-self: flex-start;
}

.metric-top-stock::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s ease;
}

.metric-top-stock:hover::before {
  left: 100%;
}

.metric-top-stock:hover {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.25));
  border-color: rgba(251, 191, 36, 0.5);
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
}

.metric-top-stock:active {
  transform: scale(0.98);
}

.top-label {
  font-weight: 600;
  color: #78350f;
  font-size: 12px;
  align-self: flex-start;
  line-height: 1;
}

.top-value {
  font-weight: 700;
  color: #92400e;
  font-size: 12px;
  line-height: 1.1;
}

.top-company {
  color: #a16207;
  font-weight: 600;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  text-align: right;
  line-height: 1.1;
}
</style>
