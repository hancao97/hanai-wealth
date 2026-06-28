<template>
  <main class="bull-review-page">
    <div class="bull-page-header">
      <button type="button" class="back-button" @click="goBack">← 返回首页</button>
      <div class="bull-page-title-row">
        <div>
          <div class="bull-page-eyebrow">牛市复盘</div>
          <h1>924 牛市全量复盘</h1>
          <p>
            数据源为东方财富日 K；基准价使用 {{ BULL_MARKET_BASELINE_DATE }} 前复权收盘价，
            与当前选择日期的现价对比。
          </p>
        </div>
        <label class="date-picker">
          <span>复盘日期</span>
          <select v-model="currentDate" @change="handleDateChange">
            <option v-for="date in availableDates" :key="date" :value="date">
              {{ date }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div v-if="loading || bullMarketLoading" class="page-state">
      <div class="page-spinner"></div>
      <span>正在加载复盘数据...</span>
    </div>

    <div v-else-if="isBeforeBaseline" class="page-state">
      请选择 {{ BULL_MARKET_START_DATE }} 之后的数据日期
    </div>

    <div v-else-if="bullMarketError" class="page-state error">
      {{ bullMarketError }}
    </div>

    <div v-else-if="!hasReview" class="page-state">
      暂无可比较股票
    </div>

    <template v-else>
      <section class="summary-grid" aria-label="牛市复盘统计">
        <div v-for="item in statItems" :key="item.label" class="summary-card">
          <span>{{ item.label }}</span>
          <strong :class="item.className">{{ item.value }}</strong>
          <small v-if="item.hint">{{ item.hint }}</small>
        </div>
      </section>

      <section class="review-table-card">
        <div class="review-toolbar">
          <div>
            <h2>全量股票列表</h2>
            <p>
              显示 {{ filteredRows.length.toLocaleString() }} / {{ rows.length.toLocaleString() }} 条，
              当前有效样本 {{ summary.sampleCount.toLocaleString() }} / {{ summary.totalCount.toLocaleString() }}，
              缺失 {{ missingCount.toLocaleString() }}。
            </p>
          </div>
          <div class="review-controls">
            <input
              v-model.trim="searchQuery"
              type="search"
              placeholder="搜索公司、代码、行业..."
              class="review-search"
            />
            <div class="sort-tabs" role="tablist" aria-label="排序方式">
              <button
                type="button"
                :class="{ active: sortMode === 'desc' }"
                @click="sortMode = 'desc'"
              >
                涨幅排序
              </button>
              <button
                type="button"
                :class="{ active: sortMode === 'asc' }"
                @click="sortMode = 'asc'"
              >
                跌幅排序
              </button>
            </div>
          </div>
        </div>

        <div class="review-table-wrap">
          <table class="review-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>公司</th>
                <th>行业</th>
                <th>板块</th>
                <th>{{ BULL_MARKET_BASELINE_DATE }} 前复权价</th>
                <th>当前价</th>
                <th>阶段涨跌幅</th>
                <th>价值评估</th>
                <th>市值</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in pagedRows"
                :key="row.stockid || row.symbol"
                @click="viewStockDetail(row)"
              >
                <td class="rank-cell">{{ row.rank }}</td>
                <td>
                  <div class="company-cell">
                    <strong>{{ row.company || '未知公司' }}</strong>
                    <span>{{ row.symbol || 'N/A' }}</span>
                  </div>
                </td>
                <td :title="row.industry || 'N/A'">{{ row.industry || 'N/A' }}</td>
                <td>
                  <span class="board-tag" :class="getBoardClass(row.board)">
                    {{ row.board || '主板' }}
                  </span>
                </td>
                <td>{{ formatPrice(row.baselinePrice) }}</td>
                <td>{{ formatPrice(row.currentPrice) }}</td>
                <td>
                  <span class="performance-pill" :class="getPerformanceClass(row.performance)">
                    {{ formatSignedPercentage(row.performance) }}
                  </span>
                </td>
                <td :style="{ color: getValuationColor(row.gf_valuation) }">
                  {{ getValuationDescription(row.gf_valuation) }}
                </td>
                <td>{{ formatMarketCap(row.mktcap_norm_currency) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" v-if="totalPages > 1">
          <button type="button" :disabled="currentPage === 1" @click="currentPage -= 1">上一页</button>
          <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
          <button type="button" :disabled="currentPage === totalPages" @click="currentPage += 1">下一页</button>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useStockDataStore } from '@/stores/stockData'
import {
  BULL_MARKET_BASELINE_DATE,
  BULL_MARKET_START_DATE,
} from '@/utils/bullMarketReview.js'

const route = useRoute()
const router = useRouter()
const stockStore = useStockDataStore()
const {
  availableDates,
  currentDate,
  loading,
  bullMarketReview,
  bullMarketLoading,
  bullMarketError,
} = storeToRefs(stockStore)
const { loadDatesConfig, loadDataForDate } = stockStore

const searchQuery = ref('')
const sortMode = ref('desc')
const currentPage = ref(1)
const pageSize = 100

const isBeforeBaseline = computed(() => {
  return !currentDate.value || currentDate.value <= BULL_MARKET_BASELINE_DATE
})

const hasReview = computed(() => Boolean(bullMarketReview.value?.summary?.sampleCount))

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

const missingCount = computed(() => bullMarketReview.value?.missingCount || 0)
const rows = computed(() => bullMarketReview.value?.rows || [])

const statItems = computed(() => [
  {
    label: '有效样本',
    value: `${summary.value.sampleCount.toLocaleString()} / ${summary.value.totalCount.toLocaleString()}`,
    hint: '当前股票池',
  },
  {
    label: '上涨家数',
    value: summary.value.upCount.toLocaleString(),
    hint: `${formatPercentage(summary.value.upRatio)} 占比`,
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

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const baseRows = query
    ? rows.value.filter((row) => [
        row.company,
        row.symbol,
        row.industry,
        row.board,
      ].some(value => String(value || '').toLowerCase().includes(query)))
    : rows.value

  return [...baseRows]
    .sort((a, b) => {
      const diff = sortMode.value === 'desc'
        ? b.performance - a.performance
        : a.performance - b.performance
      if (diff !== 0) return diff
      return a.originalIndex - b.originalIndex
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }))
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize)))
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredRows.value.slice(start, start + pageSize)
})

watch([searchQuery, sortMode, currentDate], () => {
  currentPage.value = 1
})

watch(totalPages, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})

onMounted(async () => {
  document.title = '牛市复盘 - HANAI · WEALTH'
  if (!availableDates.value.length) {
    await loadDatesConfig()
  }

  const routeDate = route.query.date
  if (
    typeof routeDate === 'string' &&
    availableDates.value.includes(routeDate) &&
    routeDate !== currentDate.value
  ) {
    currentDate.value = routeDate
    await loadDataForDate(routeDate)
  }
})

async function handleDateChange() {
  if (!currentDate.value) return
  await loadDataForDate(currentDate.value)
  router.replace({
    name: 'BullMarketReview',
    query: { date: currentDate.value },
  })
}

function goBack() {
  router.push({ name: 'StockList' })
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

function formatPrice(value) {
  const numValue = typeof value === 'string'
    ? parseFloat(value.replace(/[^\d.-]/g, ''))
    : value
  if (!Number.isFinite(numValue)) return 'N/A'
  return `¥${numValue.toFixed(2)}`
}

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

function getValuationDescription(valuation) {
  const descriptions = {
    0: '数据不足',
    1: '数据长久未更新',
    2: '价值陷阱嫌疑',
    3: '严重低估',
    4: '低估',
    5: '合理范围',
    6: '高估',
    7: '严重高估',
  }
  return descriptions[valuation] || '未知'
}

function getValuationColor(valuation) {
  const colors = {
    0: '#64748b',
    1: '#dc2626',
    2: '#dc2626',
    3: '#059669',
    4: '#10b981',
    5: '#2563eb',
    6: '#d97706',
    7: '#dc2626',
  }
  return colors[valuation] || '#64748b'
}

function getBoardClass(board) {
  const classMap = {
    '主板': 'main',
    '创业板': 'growth',
    '科创板': 'star',
    '北证': 'north',
  }
  return classMap[board] || 'main'
}

function formatMarketCap(value) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (!Number.isFinite(numValue)) return 'N/A'
  if (numValue >= 1e12) return `${(numValue / 1e12).toFixed(2)}万亿`
  if (numValue >= 1e8) return `${(numValue / 1e8).toFixed(2)}亿`
  if (numValue >= 1e4) return `${(numValue / 1e4).toFixed(2)}万`
  return numValue.toFixed(2)
}
</script>

<style scoped>
.bull-review-page {
  min-height: 100vh;
  padding: 28px clamp(16px, 4vw, 42px);
  background: #eef4ff;
  color: #0f172a;
}

.bull-page-header,
.review-table-card {
  max-width: 1440px;
  margin: 0 auto 18px;
}

.back-button {
  height: 36px;
  margin-bottom: 14px;
  padding: 0 12px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 9px;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.bull-page-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border: 1px solid rgba(203, 213, 225, 0.92);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.bull-page-eyebrow {
  margin-bottom: 5px;
  color: #475569;
  font-size: 12px;
  font-weight: 900;
}

.bull-page-title-row h1 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.15;
  font-weight: 900;
}

.bull-page-title-row p {
  max-width: 760px;
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
}

.date-picker {
  flex: 0 0 190px;
  display: grid;
  gap: 6px;
  color: #475569;
  font-size: 12px;
  font-weight: 900;
}

.date-picker select,
.review-search {
  width: 100%;
  height: 38px;
  padding: 0 10px;
  border: 1px solid rgba(203, 213, 225, 0.96);
  border-radius: 9px;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.page-state {
  max-width: 1440px;
  min-height: 220px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed rgba(148, 163, 184, 0.55);
  border-radius: 16px;
  background: #ffffff;
  color: #64748b;
  font-weight: 800;
}

.page-state.error {
  border-color: rgba(239, 68, 68, 0.35);
  color: #dc2626;
  background: #fff7f7;
}

.page-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(59, 130, 246, 0.2);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: page-spin 0.8s linear infinite;
}

.summary-grid {
  max-width: 1440px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin: 0 auto 18px;
}

.summary-card {
  min-height: 86px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 14px;
  border: 1px solid rgba(226, 232, 240, 0.96);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.summary-card span {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.summary-card strong {
  color: #0f172a;
  font-size: 20px;
  line-height: 1.1;
  font-weight: 900;
  white-space: nowrap;
}

.summary-card strong.positive,
.performance-pill.positive {
  color: #dc2626;
}

.summary-card strong.negative,
.performance-pill.negative {
  color: #059669;
}

.summary-card strong.neutral,
.performance-pill.neutral {
  color: #64748b;
}

.summary-card small {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
}

.review-table-card {
  padding: 18px;
  border: 1px solid rgba(203, 213, 225, 0.92);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.review-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 12px;
}

.review-toolbar h2 {
  margin: 0 0 5px;
  color: #0f172a;
  font-size: 18px;
  font-weight: 900;
}

.review-toolbar p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.review-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.review-search {
  width: 240px;
}

.sort-tabs {
  display: inline-flex;
  padding: 3px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 10px;
  background: #f8fafc;
}

.sort-tabs button {
  min-width: 78px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.sort-tabs button.active {
  color: #ffffff;
  background: #2563eb;
}

.review-table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 12px;
}

.review-table {
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
}

.review-table th,
.review-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  color: #334155;
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
}

.review-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 900;
}

.review-table tbody tr {
  cursor: pointer;
}

.review-table tbody tr:hover {
  background: #eff6ff;
}

.review-table tbody tr:last-child td {
  border-bottom: none;
}

.rank-cell {
  color: #64748b;
  font-weight: 900;
}

.company-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.company-cell strong {
  color: #1d4ed8;
  font-size: 13px;
}

.company-cell span {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.board-tag {
  display: inline-block;
  min-width: 44px;
  padding: 4px 8px;
  border-radius: 6px;
  color: #ffffff;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
}

.board-tag.main {
  background: #2563eb;
}

.board-tag.growth {
  background: #059669;
}

.board-tag.star {
  background: #d97706;
}

.board-tag.north {
  background: #7c3aed;
}

.performance-pill {
  display: inline-block;
  min-width: 74px;
  padding: 5px 8px;
  border-radius: 8px;
  text-align: center;
  font-weight: 900;
}

.performance-pill.positive {
  background: rgba(254, 226, 226, 0.75);
}

.performance-pill.negative {
  background: rgba(220, 252, 231, 0.8);
}

.performance-pill.neutral {
  background: rgba(226, 232, 240, 0.8);
}

.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  color: #475569;
  font-size: 13px;
  font-weight: 800;
}

.pagination button {
  height: 34px;
  min-width: 72px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@keyframes page-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .review-toolbar,
  .bull-page-title-row {
    flex-direction: column;
    align-items: stretch;
  }

  .date-picker {
    flex: 1 1 auto;
  }
}

@media (max-width: 700px) {
  .bull-review-page {
    padding: 16px 10px;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .review-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .review-search,
  .sort-tabs {
    width: 100%;
  }

  .sort-tabs button {
    flex: 1;
  }
}
</style>
