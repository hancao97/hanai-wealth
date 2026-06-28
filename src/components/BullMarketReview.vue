<template>
  <section class="bull-review-entry" aria-label="牛市复盘入口">
    <div class="bull-review-entry-main">
      <div class="bull-review-copy">
        <div class="bull-review-eyebrow">牛市复盘</div>
        <h2>924 牛市阶段表现</h2>
        <p>
          数据源为东方财富日 K，基准价使用 {{ BULL_MARKET_BASELINE_DATE }} 前复权收盘价，
          复盘至 {{ currentDate || '--' }}。
        </p>
      </div>
      <button type="button" class="bull-review-open" @click="openReviewPage">
        查看全部股票
      </button>
    </div>

    <div v-if="bullMarketLoading" class="bull-review-state">
      <div class="bull-review-spinner"></div>
      <span>正在计算牛市复盘...</span>
    </div>
    <div v-else-if="isBeforeBaseline" class="bull-review-state">
      请选择 {{ BULL_MARKET_START_DATE }} 之后的数据日期
    </div>
    <div v-else-if="bullMarketError" class="bull-review-state error">
      {{ bullMarketError }}
    </div>
    <div v-else-if="!hasReview" class="bull-review-state">
      暂无可比较股票
    </div>

    <template v-else>
      <div class="bull-review-stats">
        <div v-for="item in statItems" :key="item.label" class="bull-review-stat">
          <span>{{ item.label }}</span>
          <strong :class="item.className">{{ item.value }}</strong>
          <small v-if="item.hint">{{ item.hint }}</small>
        </div>
      </div>

      <div class="bull-review-snapshot">
        <div class="bull-review-mini-list">
          <div class="bull-review-mini-title">涨幅代表</div>
          <button
            v-for="row in topLeaders"
            :key="`leader-${row.symbol}`"
            type="button"
            class="bull-review-mini-row"
            @click="viewStockDetail(row)"
          >
            <span>{{ row.company }}</span>
            <strong class="positive">{{ formatSignedPercentage(row.performance) }}</strong>
          </button>
        </div>
        <div class="bull-review-mini-list">
          <div class="bull-review-mini-title">跌幅代表</div>
          <button
            v-for="row in topLaggards"
            :key="`laggard-${row.symbol}`"
            type="button"
            class="bull-review-mini-row"
            @click="viewStockDetail(row)"
          >
            <span>{{ row.company }}</span>
            <strong class="negative">{{ formatSignedPercentage(row.performance) }}</strong>
          </button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useStockDataStore } from '@/stores/stockData'
import {
  BULL_MARKET_BASELINE_DATE,
  BULL_MARKET_START_DATE,
} from '@/utils/bullMarketReview.js'

const router = useRouter()
const stockStore = useStockDataStore()
const {
  bullMarketReview,
  bullMarketLoading,
  bullMarketError,
  currentDate,
} = storeToRefs(stockStore)

const isBeforeBaseline = computed(() => {
  return !currentDate.value || currentDate.value <= BULL_MARKET_BASELINE_DATE
})

const hasReview = computed(() => {
  return Boolean(bullMarketReview.value?.summary?.sampleCount)
})

const summary = computed(() => bullMarketReview.value?.summary || {
  totalCount: 0,
  sampleCount: 0,
  upCount: 0,
  upRatio: 0,
  averagePerformance: 0,
  medianPerformance: 0,
  doubleCount: 0,
  deepDropCount: 0,
})

const topLeaders = computed(() => (bullMarketReview.value?.leaders || []).slice(0, 3))
const topLaggards = computed(() => (bullMarketReview.value?.laggards || []).slice(0, 3))

const statItems = computed(() => [
  {
    label: '有效样本',
    value: `${summary.value.sampleCount.toLocaleString()} / ${summary.value.totalCount.toLocaleString()}`,
    hint: '当前股票池',
  },
  {
    label: '上涨比例',
    value: formatPercentage(summary.value.upRatio),
    hint: `${summary.value.upCount.toLocaleString()} 家上涨`,
    className: 'positive',
  },
  {
    label: '平均涨跌幅',
    value: formatSignedPercentage(summary.value.averagePerformance),
    className: getPerformanceClass(summary.value.averagePerformance),
  },
  {
    label: '中位数涨跌幅',
    value: formatSignedPercentage(summary.value.medianPerformance),
    className: getPerformanceClass(summary.value.medianPerformance),
  },
  {
    label: '翻倍股',
    value: summary.value.doubleCount.toLocaleString(),
    hint: '涨幅 >= 100%',
    className: 'positive',
  },
  {
    label: '深跌股',
    value: summary.value.deepDropCount.toLocaleString(),
    hint: '跌幅 <= -30%',
    className: 'negative',
  },
])

function formatPercentage(value) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (!Number.isFinite(numValue)) return 'N/A'
  return `${numValue.toFixed(2)}%`
}

function formatSignedPercentage(value) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (!Number.isFinite(numValue)) return 'N/A'
  return `${numValue > 0 ? '+' : ''}${numValue.toFixed(2)}%`
}

function getPerformanceClass(value) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (!Number.isFinite(numValue) || numValue === 0) return 'neutral'
  return numValue > 0 ? 'positive' : 'negative'
}

function openReviewPage() {
  router.push({
    name: 'BullMarketReview',
    query: currentDate.value ? { date: currentDate.value } : {},
  })
}

function viewStockDetail(row) {
  if (!row?.stockid || !currentDate.value) return
  router.push({
    name: 'StockDetail',
    query: {
      stockid: row.stockid,
      date: currentDate.value,
    },
  })
}
</script>

<style scoped>
.bull-review-entry {
  margin: 0 0 16px;
  padding: 18px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
}

.bull-review-entry-main {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.bull-review-eyebrow {
  margin-bottom: 4px;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}

.bull-review-copy h2 {
  margin: 0 0 5px;
  color: #0f172a;
  font-size: 22px;
  line-height: 1.25;
  font-weight: 900;
}

.bull-review-copy p {
  margin: 0;
  max-width: 720px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
}

.bull-review-open {
  flex: 0 0 auto;
  min-width: 116px;
  height: 38px;
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22);
}

.bull-review-state {
  min-height: 92px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed rgba(148, 163, 184, 0.55);
  border-radius: 12px;
  color: #64748b;
  font-weight: 700;
}

.bull-review-state.error {
  border-color: rgba(239, 68, 68, 0.35);
  color: #dc2626;
  background: rgba(254, 242, 242, 0.72);
}

.bull-review-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(59, 130, 246, 0.2);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: bull-spin 0.8s linear infinite;
}

.bull-review-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.bull-review-stat {
  min-height: 74px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 12px;
  border: 1px solid rgba(226, 232, 240, 0.96);
  border-radius: 12px;
  background: #f8fafc;
}

.bull-review-stat span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.bull-review-stat strong {
  color: #0f172a;
  font-size: 18px;
  line-height: 1.1;
  font-weight: 900;
  white-space: nowrap;
}

.bull-review-stat strong.positive,
.bull-review-mini-row strong.positive {
  color: #dc2626;
}

.bull-review-stat strong.negative,
.bull-review-mini-row strong.negative {
  color: #059669;
}

.bull-review-stat strong.neutral {
  color: #475569;
}

.bull-review-stat small {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
}

.bull-review-snapshot {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.bull-review-mini-list {
  padding: 12px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 12px;
}

.bull-review-mini-title {
  margin-bottom: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 900;
}

.bull-review-mini-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 7px 0;
  border: none;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  background: transparent;
  color: #334155;
  text-align: left;
  cursor: pointer;
}

.bull-review-mini-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 700;
}

.bull-review-mini-row strong {
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
}

@keyframes bull-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1024px) {
  .bull-review-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .bull-review-entry {
    padding: 14px;
  }

  .bull-review-entry-main {
    flex-direction: column;
  }

  .bull-review-open {
    width: 100%;
  }

  .bull-review-stats,
  .bull-review-snapshot {
    grid-template-columns: 1fr;
  }
}
</style>
