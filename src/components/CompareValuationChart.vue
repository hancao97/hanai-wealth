<template>
  <div class="stock-compare-chart-card">
    <div v-if="loading" class="stock-compare-chart-loading">
      <div class="stock-compare-chart-spinner"></div>
      <p>正在加载对比估值数据…</p>
    </div>

    <div v-else-if="error === 'PRIMARY_CHART_FAILED'" class="stock-compare-chart-error">
      <div class="stock-compare-chart-error-icon">⚠️</div>
      <p>对比图加载失败（主标的估值数据不可用），请稍后重试。</p>
    </div>

    <div v-else-if="error === 'COMPARE_CHART_FAILED'" class="stock-compare-chart-notice">
      <div class="stock-compare-chart-notice-icon">📊</div>
      <p>对比标的估值走势暂不可用，下方快照指标仍可参考。</p>
    </div>

    <div
      v-else-if="merged && !merged.ok && merged.code === 'INSUFFICIENT_OVERLAP'"
      class="stock-compare-chart-empty"
    >
      <p>两只股票可对比的历史交易日不足（当前重叠 {{ merged.overlapCount }} 个交易日，至少需要 5 个）。</p>
    </div>

    <div v-else-if="merged && merged.ok" class="stock-compare-chart-body">
      <div class="stock-compare-chart-heading">
        <div>
          <h4>价格/估值相对走势</h4>
          <p>{{ chartSubtitle }}</p>
        </div>
      </div>
      <div ref="chartRef" class="stock-compare-chart-echart"></div>
    </div>

    <div v-else-if="error" class="stock-compare-chart-error">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { useCompareValuation } from '@/composables/useCompareValuation.js'

const props = defineProps({
  primaryStock: { type: Object, required: true },
  compareStock: { type: Object, required: true },
})

const chartRef = ref(null)
let chart = null

const { loading, error, merged, loadCompare } = useCompareValuation()

const CHART_COLORS = {
  primary: {
    price: '#2563eb',
    value: '#60a5fa',
    areaTop: 'rgba(37, 99, 235, 0.16)',
    areaBottom: 'rgba(37, 99, 235, 0)',
  },
  compare: {
    price: '#ea580c',
    value: '#fb923c',
    areaTop: 'rgba(234, 88, 12, 0.13)',
    areaBottom: 'rgba(234, 88, 12, 0)',
  },
}

const primaryShort = computed(() => {
  const s = props.primaryStock
  return s?.company?.slice(0, 6) || `${s?.exchange_ || ''}:${s?.symbol || ''}`
})

const compareShort = computed(() => {
  const s = props.compareStock
  return s?.company?.slice(0, 6) || `${s?.exchange_ || ''}:${s?.symbol || ''}`
})

const chartSubtitle = computed(() => {
  const m = merged.value
  if (!m?.ok) return ''
  const baseDate = m.baselineDate || formatDate(m.baselineTime)
  const maxDate = formatDate(m.maxTime)
  const suffix = m.futurePointCount && maxDate && maxDate !== baseDate
    ? `，估值预测延伸至 ${maxDate}`
    : ''
  return `${baseDate} 收盘价归一为 100，悬停查看真实价格${suffix}`
})

function disposeChart() {
  if (chart && !chart.isDisposed()) {
    chart.dispose()
    chart = null
  }
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function formatCurrency(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 'N/A'
  return `¥${n.toFixed(2)}`
}

function formatIndex(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 'N/A'
  return n.toFixed(2)
}

function formatTooltip(params) {
  const rows = Array.isArray(params) ? params : [params]
  const date = formatDate(rows[0]?.axisValue)
  const body = rows.map((row) => {
    const rawValue = row?.data?.[2]
    const indexValue = row?.data?.[1]
    const rawLabel = row?.seriesName?.includes('价值') ? '真实估值' : '真实股价'
    return `${row.marker}${row.seriesName}<br/><span style="padding-left:14px;color:#64748b">指数 ${formatIndex(indexValue)} · ${rawLabel} ${formatCurrency(rawValue)}</span>`
  }).join('<br/>')

  return `<div style="font-weight:700;margin-bottom:6px">${date}</div>${body}`
}

function renderChart() {
  const m = merged.value
  if (!m?.ok || !chartRef.value) return

  if (!chart) {
    chart = echarts.init(chartRef.value)
  }

  chart.setOption(
    {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: formatTooltip,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#dbeafe',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        extraCssText: 'box-shadow: 0 12px 32px rgba(15,23,42,0.16); border-radius: 10px;',
      },
      legend: { bottom: 8, type: 'scroll', itemGap: 18, textStyle: { color: '#475569' } },
      grid: { left: 58, right: 28, top: 42, bottom: 64 },
      xAxis: {
        type: 'time',
        max: m.maxTime,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b' },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        name: '',
        nameTextStyle: { color: '#64748b', padding: [0, 0, 8, 0] },
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#e2e8f0', opacity: 0.7 } },
      },
      series: [
        {
          name: `${primaryShort.value} 股价`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: m.primaryPrice,
          color: CHART_COLORS.primary.price,
          itemStyle: { color: CHART_COLORS.primary.price },
          lineStyle: { width: 2.5, color: CHART_COLORS.primary.price },
          emphasis: { focus: 'series' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: CHART_COLORS.primary.areaTop },
                { offset: 1, color: CHART_COLORS.primary.areaBottom },
              ],
            },
          },
          markLine: {
            symbol: 'none',
            silent: true,
            label: {
              position: 'end',
              align: 'center',
              verticalAlign: 'top',
              rotate: 0,
              distance: 8,
              offset: [0, 8],
              formatter: `当前 ${m.baselineDate || formatDate(m.baselineTime)}`,
              color: '#334155',
              fontWeight: 700,
              backgroundColor: 'rgba(255,255,255,0.86)',
              borderColor: '#cbd5e1',
              borderWidth: 1,
              borderRadius: 6,
              padding: [4, 6],
            },
            lineStyle: { color: '#94a3b8', width: 1.5, type: [5, 5] },
            data: [{ xAxis: m.baselineTime }],
          },
          markArea: m.maxTime > m.baselineTime
            ? {
                silent: true,
                itemStyle: { color: 'rgba(148, 163, 184, 0.08)' },
                data: [[{ xAxis: m.baselineTime }, { xAxis: m.maxTime }]],
              }
            : undefined,
        },
        {
          name: `${primaryShort.value} 价值`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: m.primaryValue,
          color: CHART_COLORS.primary.value,
          itemStyle: { color: CHART_COLORS.primary.value },
          lineStyle: { width: 2.2, type: [7, 5], color: CHART_COLORS.primary.value },
          symbol: 'circle',
          symbolSize: 5,
          emphasis: { focus: 'series' },
        },
        {
          name: `${compareShort.value} 股价`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: m.comparePrice,
          color: CHART_COLORS.compare.price,
          itemStyle: { color: CHART_COLORS.compare.price },
          lineStyle: { width: 2.5, color: CHART_COLORS.compare.price },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: CHART_COLORS.compare.areaTop },
                { offset: 1, color: CHART_COLORS.compare.areaBottom },
              ],
            },
          },
          emphasis: { focus: 'series' },
        },
        {
          name: `${compareShort.value} 价值`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: m.compareValue,
          color: CHART_COLORS.compare.value,
          itemStyle: { color: CHART_COLORS.compare.value },
          lineStyle: { width: 2.2, type: [7, 5], color: CHART_COLORS.compare.value },
          symbol: 'circle',
          symbolSize: 5,
          emphasis: { focus: 'series' },
        },
      ],
    },
    true
  )
}

watch(
  () => [props.primaryStock?.stockid, props.compareStock?.stockid],
  ([p, c]) => {
    disposeChart()
    if (!p || !c) return
    loadCompare(p, c)
  },
  { immediate: true }
)

watch(
  [merged, loading],
  async () => {
    if (loading.value) return
    if (!merged.value?.ok) {
      disposeChart()
      return
    }
    await nextTick()
    renderChart()
  },
  { flush: 'post' }
)

function handleResize() {
  if (chart && !chart.isDisposed()) chart.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeChart()
})
</script>

<style scoped>
.stock-compare-chart-card {
  margin-top: 16px;
  border-radius: 14px;
  border: 1px solid rgba(203, 213, 225, 0.86);
  background: #ffffff;
  min-height: 220px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.stock-compare-chart-body {
  padding: 18px 18px 0;
}

.stock-compare-chart-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 8px;
}

.stock-compare-chart-heading h4 {
  margin: 0 0 4px;
  color: #0f172a;
  font-size: 17px;
  line-height: 1.25;
  font-weight: 800;
}

.stock-compare-chart-heading p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.stock-compare-chart-loading,
.stock-compare-chart-error,
.stock-compare-chart-notice,
.stock-compare-chart-empty {
  padding: 32px 20px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}

.stock-compare-chart-error {
  color: #ef4444;
}

.stock-compare-chart-notice {
  color: #475569;
  background: rgba(99, 102, 241, 0.06);
}

.stock-compare-chart-notice-icon,
.stock-compare-chart-error-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.stock-compare-chart-spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto 12px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: stock-compare-chart-spin 0.8s linear infinite;
}

@keyframes stock-compare-chart-spin {
  to {
    transform: rotate(360deg);
  }
}

.stock-compare-chart-echart {
  width: 100%;
  height: 400px;
}

@media (max-width: 640px) {
  .stock-compare-chart-body {
    padding: 14px 12px 0;
  }

  .stock-compare-chart-heading {
    flex-direction: column;
    gap: 8px;
  }

  .stock-compare-chart-echart {
    height: 360px;
  }
}
</style>
