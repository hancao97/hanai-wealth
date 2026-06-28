<template>
  <section class="stock-compare-panel" aria-label="股票对比">
    <div class="stock-compare-panel-bar">
      <button type="button" class="stock-compare-panel-toggle" @click="expanded = !expanded">
        {{ expanded ? '收起对比' : '股票对比' }}
      </button>
      <button
        v-if="modelValue"
        type="button"
        class="stock-compare-panel-clear"
        @click="clearCompare"
      >
        清除对比
      </button>
    </div>

    <div v-show="expanded" class="stock-compare-panel-body">
      <div class="stock-compare-panel-search">
        <input
          v-model="searchQuery"
          type="search"
          class="stock-compare-panel-input"
          placeholder="搜索公司名、代码、stockid…"
          autocomplete="off"
        />
      </div>

      <div v-if="searchQuery.trim() && filteredCandidates.length" class="stock-compare-panel-list">
        <button
          v-for="row in filteredCandidates.slice(0, 80)"
          :key="row.stockid"
          type="button"
          class="stock-compare-panel-item"
          @click="selectRow(row)"
        >
          <span class="stock-compare-panel-item-name">{{ row.company }}</span>
          <span class="stock-compare-panel-item-code">{{ row.exchange_ }}:{{ row.symbol }}</span>
        </button>
      </div>
      <p v-else-if="searchQuery.trim() && !filteredCandidates.length" class="stock-compare-panel-hint">
        无匹配结果
      </p>
      <p v-else-if="!modelValue" class="stock-compare-panel-hint">输入关键词选择第二只股票</p>

      <div v-if="modelValue && compareStock" class="stock-compare-panel-metrics">
        <h4 class="stock-compare-panel-metrics-title">快照对比（当日数据）</h4>
        <table class="stock-compare-panel-table">
          <thead>
            <tr>
              <th class="stock-compare-panel-th-label">指标</th>
              <th class="stock-compare-panel-th-primary">当前</th>
              <th class="stock-compare-panel-th-compare">对比</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>名称 / 代码</td>
              <td>{{ primaryStock.company }} · {{ primaryStock.exchange_ }}:{{ primaryStock.symbol }}</td>
              <td>{{ compareStock.company }} · {{ compareStock.exchange_ }}:{{ compareStock.symbol }}</td>
            </tr>
            <tr>
              <td>市盈率 (TTM)</td>
              <td>{{ formatPE(primaryStock.pettm) }}</td>
              <td>{{ formatPE(compareStock.pettm) }}</td>
            </tr>
            <tr>
              <td>市净率</td>
              <td>{{ formatPE(primaryStock.pb) }}</td>
              <td>{{ formatPE(compareStock.pb) }}</td>
            </tr>
            <tr>
              <td>总市值</td>
              <td>{{ formatMarketCap(primaryStock.mktcap_norm_currency) }}</td>
              <td>{{ formatMarketCap(compareStock.mktcap_norm_currency) }}</td>
            </tr>
          </tbody>
        </table>

        <p class="stock-compare-panel-chart-note">
          趋势图按最新共同交易日收盘价归一为 100；悬停可查看真实股价和估值。
        </p>
        <CompareValuationChart :primary-stock="primaryStock" :compare-stock="compareStock" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CompareValuationChart from './CompareValuationChart.vue'

const props = defineProps({
  primaryStock: { type: Object, required: true },
  allStocksData: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
  initialExpanded: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const expanded = ref(false)
const searchQuery = ref('')

watch(
  () => props.initialExpanded,
  (v) => {
    if (v) expanded.value = true
  },
  { immediate: true }
)

const compareStock = computed(() =>
  props.allStocksData.find((s) => s.stockid === props.modelValue) || null
)

const filteredCandidates = computed(() => {
  const pid = props.primaryStock?.stockid
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return props.allStocksData.filter((row) => {
    if (row.stockid === pid) return false
    const hay = `${row.company || ''} ${row.symbol || ''} ${row.stockid || ''}`.toLowerCase()
    return hay.includes(q)
  })
})

function formatPE(pe) {
  if (pe === undefined || pe === null || pe === '' || pe === 'N/A') return 'N/A'
  const n = typeof pe === 'string' ? parseFloat(pe) : pe
  if (isNaN(n)) return String(pe)
  return n.toFixed(1)
}

function formatMarketCap(value) {
  if (value === undefined || value === null || value === '') return 'N/A'
  const v = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(v)) return 'N/A'
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}万亿`
  if (v >= 1e8) return `${(v / 1e8).toFixed(2)}亿`
  if (v >= 1e4) return `${(v / 1e4).toFixed(2)}万`
  return v.toFixed(2)
}

function selectRow(row) {
  emit('update:modelValue', row.stockid)
  searchQuery.value = ''
}

function clearCompare() {
  emit('update:modelValue', '')
  searchQuery.value = ''
}
</script>

<style scoped>
.stock-compare-panel {
  margin-bottom: 24px;
  padding: 20px;
  border-radius: 16px;
  background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
}

.stock-compare-panel-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.stock-compare-panel-toggle {
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  color: #fff;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
}

.stock-compare-panel-toggle:hover {
  filter: brightness(1.05);
}

.stock-compare-panel-clear {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
}

.stock-compare-panel-clear:hover {
  border-color: #94a3b8;
  color: #334155;
}

.stock-compare-panel-body {
  margin-top: 16px;
}

.stock-compare-panel-input {
  width: 100%;
  max-width: 420px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  box-sizing: border-box;
}

.stock-compare-panel-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.stock-compare-panel-list {
  margin-top: 12px;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
}

.stock-compare-panel-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
}

.stock-compare-panel-item:last-child {
  border-bottom: none;
}

.stock-compare-panel-item:hover {
  background: #f8fafc;
}

.stock-compare-panel-item-name {
  color: #0f172a;
  font-weight: 500;
}

.stock-compare-panel-item-code {
  color: #64748b;
  flex-shrink: 0;
}

.stock-compare-panel-hint {
  margin-top: 10px;
  font-size: 13px;
  color: #94a3b8;
}

.stock-compare-panel-metrics-title {
  margin: 20px 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.stock-compare-panel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
}

.stock-compare-panel-table th,
.stock-compare-panel-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
}

.stock-compare-panel-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  text-align: left;
}

.stock-compare-panel-th-primary {
  width: 32%;
}

.stock-compare-panel-th-compare {
  width: 32%;
}

.stock-compare-panel-table tbody tr:last-child td {
  border-bottom: none;
}

.stock-compare-panel-chart-note {
  margin: 14px 0 -2px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}
</style>
