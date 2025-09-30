<template>
  <div class="valuation-chart-card">
    <div v-if="loading" class="chart-loading">
      正在加载估值数据...
    </div>
    
    <div v-if="error" class="chart-error">
      {{ error }}
    </div>
    
    <div v-if="!loading && !error" class="chart-container">
      <!-- 顶部信息栏 -->
      <div class="chart-header">
        <div class="chart-title-info">
          <div class="chart-value-info">
            <span class="value-label">大师价值线:</span>
            <span class="value-amount">¥{{ currentValue }}</span>
          </div>
        </div>
        <div class="chart-status-badge" :class="statusBadgeClass">
          {{ statusText }}
        </div>
      </div>
      
      <!-- 图表 -->
      <div ref="chartRef" class="valuation-chart"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import axios from 'axios'
import * as echarts from 'echarts'

const props = defineProps({
  stockData: {
    type: Object,
    required: true
  },
  date: {
    type: String,
    required: true
  }
})

const loading = ref(false)
const error = ref(null)
const chartRef = ref(null)
let chart = null

const currentValue = ref('--')
const currentPrice = ref('--')

const statusText = computed(() => {
  if (!currentValue.value || currentValue.value === '--') return '--'
  const price = parseFloat(currentPrice.value)
  const value = parseFloat(currentValue.value)
  if (isNaN(price) || isNaN(value)) return '--'
  
  const ratio = ((price - value) / value * 100).toFixed(1)
  if (price < value * 0.8) return '严重低估'
  if (price < value) return '低估'
  if (price > value * 1.2) return '高估'
  return '合理'
})

const statusBadgeClass = computed(() => {
  const text = statusText.value
  if (text === '严重低估') return 'status-undervalued-severe'
  if (text === '低估') return 'status-undervalued'
  if (text === '高估') return 'status-overvalued'
  return 'status-fair'
})

const initChart = (chartData) => {
  if (!chartRef.value) {
    console.error('chartRef is not available')
    return
  }
  
  // 销毁旧图表
  if (chart && !chart.isDisposed()) {
    chart.dispose()
  }
  
  chart = echarts.init(chartRef.value)
  
  // 准备数据
  const medpsData = chartData.medps || []
  const priceData = chartData.price || []
  
  console.log('medpsData length:', medpsData.length)
  console.log('priceData length:', priceData.length)
  
  // 获取最新的价值和价格
  if (medpsData.length > 0) {
    currentValue.value = medpsData[medpsData.length - 1][1].toFixed(2)
  }
  if (priceData.length > 0) {
    currentPrice.value = priceData[priceData.length - 1][1].toFixed(2)
  }
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: function(params) {
        let result = params[0].axisValue + '<br/>'
        params.forEach(item => {
          result += `${item.marker} ${item.seriesName}: ¥${item.value[1].toFixed(2)}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['大师价值线', '股价'],
      top: 10,
      textStyle: {
        color: '#666'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 60,
      containLabel: true
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      },
      axisLabel: {
        color: '#999'
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      },
      axisLabel: {
        color: '#999',
        formatter: '¥{value}'
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      }
    },
    series: [
      {
        name: '大师价值线',
        type: 'line',
        data: medpsData,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#5470c6',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(84, 112, 198, 0.3)'
            },
            {
              offset: 1,
              color: 'rgba(84, 112, 198, 0.05)'
            }
          ])
        }
      },
      {
        name: '股价',
        type: 'line',
        data: priceData,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#ee6666',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(238, 102, 102, 0.3)'
            },
            {
              offset: 1,
              color: 'rgba(238, 102, 102, 0.05)'
            }
          ])
        }
      }
    ]
  }
  
  chart.setOption(option)
}

const loadChartData = async () => {
  loading.value = true
  error.value = null
  try {
    // const response = await axios.get(`https://www.gurufocus.cn/_api/chart/${props.stockData.stockid}/valuation?locale=zh-hans`)
    // const data = response.data
    const data = await import('../templates/charts.json')
    
    // 先结束 loading 状态，让 DOM 显示出来
    loading.value = false
    
    // 等待 DOM 更新完成后再初始化图表
    await nextTick()
    initChart(data.default)
  } catch (err) {
    error.value = err.message
    console.error('Error loading chart data:', err)
    loading.value = false
  }
}

const handleResize = () => {
  if (chart && !chart.isDisposed()) {
    chart.resize()
  }
}

// 生命周期
onMounted(() => {
  loadChartData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (chart && !chart.isDisposed()) {
    chart.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.valuation-chart-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.chart-loading,
.chart-error {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.chart-error {
  color: #f56c6c;
}

.chart-container {
  width: 100%;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.chart-title-info {
  flex: 1;
}

.chart-value-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.value-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.value-amount {
  font-size: 24px;
  font-weight: 600;
  color: #5470c6;
}

.chart-status-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.status-undervalued-severe {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-undervalued {
  background-color: #f1f8e9;
  color: #558b2f;
}

.status-fair {
  background-color: #e3f2fd;
  color: #1976d2;
}

.status-overvalued {
  background-color: #ffebee;
  color: #c62828;
}

.valuation-chart {
  width: 100%;
  height: 400px;
}
</style>
