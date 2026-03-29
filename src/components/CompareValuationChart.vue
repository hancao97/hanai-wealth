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

const primaryShort = computed(() => {
  const s = props.primaryStock
  return s?.company?.slice(0, 6) || `${s?.exchange_ || ''}:${s?.symbol || ''}`
})

const compareShort = computed(() => {
  const s = props.compareStock
  return s?.company?.slice(0, 6) || `${s?.exchange_ || ''}:${s?.symbol || ''}`
})

function disposeChart() {
  if (chart && !chart.isDisposed()) {
    chart.dispose()
    chart = null
  }
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
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, type: 'scroll' },
      grid: { left: 56, right: 20, top: 28, bottom: 56 },
      xAxis: { type: 'time' },
      yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { opacity: 0.2 } } },
      series: [
        {
          name: `${primaryShort.value} 股价`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: m.primaryPrice,
          lineStyle: { width: 2, color: '#42a5f5' },
        },
        {
          name: `${primaryShort.value} 价值`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: m.primaryValue,
          lineStyle: { width: 2, type: [6, 4], color: '#2e7d32' },
        },
        {
          name: `${compareShort.value} 股价`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: m.comparePrice,
          lineStyle: { width: 2, color: '#ab47bc' },
        },
        {
          name: `${compareShort.value} 价值`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: m.compareValue,
          lineStyle: { width: 2, type: [6, 4], color: '#f9a825' },
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
  border-radius: 12px;
  border: 1px solid rgba(66, 165, 245, 0.15);
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  min-height: 200px;
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
  height: 380px;
}
</style>
