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
  
  // 计算各条价值参考线数据
  const valuePlus30Data = medpsData.map(item => [item[0], item[1] * 1.3])
  const valuePlus10Data = medpsData.map(item => [item[0], item[1] * 1.1])
  const valueMinus10Data = medpsData.map(item => [item[0], item[1] * 0.9])
  const valueMinus30Data = medpsData.map(item => [item[0], item[1] * 0.7])
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        lineStyle: {
          type: 'solid',
          color: 'rgba(66, 165, 245, 0.6)',
          width: 1
        },
        crossStyle: {
          color: 'rgba(66, 165, 245, 0.6)',
          width: 1,
          type: 'dashed'
        },
        label: {
          backgroundColor: '#42a5f5',
          borderColor: '#42a5f5',
          borderWidth: 1,
          color: '#fff'
        }
      },
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: 'rgba(66, 165, 245, 0.3)',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: {
        color: '#333',
        fontSize: 13
      },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;',
      formatter: function(params) {
        // 格式化日期
        const date = new Date(params[0].value[0])
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const formattedDate = `${year}-${month}-${day}`
        
        let result = `<div style="font-weight: 600; margin-bottom: 10px; font-size: 14px; color: #42a5f5;">${formattedDate}</div>`
        params.forEach(item => {
          if (item.seriesName && !item.seriesName.includes('区')) {
            const color = item.color
            result += `<div style="display: flex; align-items: center; margin: 6px 0;">
              <span style="display: inline-block; width: 12px; height: 12px; background: ${color}; border-radius: 2px; margin-right: 8px;"></span>
              <span style="flex: 1; color: #666;">${item.seriesName}</span>
              <span style="font-weight: 600; margin-left: 16px; color: #333;">¥${item.value[1].toFixed(2)}</span>
            </div>`
          }
        })
        return result
      }
    },
    legend: {
      data: ['价值线+30%', '价值线+10%', '大师价值线', '价值线-10%', '价值线-30%', '股价'],
      top: 15,
      textStyle: {
        color: '#666',
        fontSize: 13,
        fontWeight: 500
      },
      itemGap: 24,
      itemWidth: 28,
      itemHeight: 3,
      icon: 'rect',
      selectedMode: false
    },
    grid: {
      left: '1%',
      right: '2%',
      bottom: '3%',
      top: 70,
      containLabel: true
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: '#e8e8e8',
          width: 1
        }
      },
      axisLabel: {
        color: '#999',
        fontSize: 12,
        fontWeight: 400,
        margin: 12
      },
      axisTick: {
        show: false
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisLabel: {
        color: '#999',
        fontSize: 12,
        fontWeight: 400,
        formatter: '¥{value}',
        margin: 12
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#f5f5f5',
          type: 'solid',
          width: 1
        }
      }
    },
    series: [
      // 背景区域 - 使用非堆叠方式，直接绘制区间
      {
        name: '严重低估区',
        type: 'line',
        data: valueMinus30Data,
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        lineStyle: {
          width: 0,
          color: 'transparent'
        },
        areaStyle: {
          color: 'rgba(46, 125, 50, 0.12)',
          origin: 'start'
        },
        silent: true,
        z: 1
      },
      {
        name: '低估区',
        type: 'line',
        data: valueMinus10Data,
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        lineStyle: {
          width: 0,
          color: 'transparent'
        },
        areaStyle: {
          color: 'rgba(102, 187, 106, 0.1)',
          origin: 'start'
        },
        silent: true,
        z: 2
      },
      {
        name: '合理偏低区',
        type: 'line',
        data: medpsData,
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        lineStyle: {
          width: 0,
          color: 'transparent'
        },
        areaStyle: {
          color: 'rgba(255, 167, 38, 0.05)',
          origin: 'start'
        },
        silent: true,
        z: 3
      },
      {
        name: '合理偏高区',
        type: 'line',
        data: valuePlus10Data,
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        lineStyle: {
          width: 0,
          color: 'transparent'
        },
        areaStyle: {
          color: 'rgba(255, 152, 0, 0.08)',
          origin: 'start'
        },
        silent: true,
        z: 4
      },
      {
        name: '高估区',
        type: 'line',
        data: valuePlus30Data,
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        lineStyle: {
          width: 0,
          color: 'transparent'
        },
        areaStyle: {
          color: 'rgba(239, 83, 80, 0.1)',
          origin: 'start'
        },
        silent: true,
        z: 5
      },
      // 价值参考线
      {
        name: '价值线+30%',
        type: 'line',
        data: valuePlus30Data,
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        itemStyle: {
          color: '#ef5350'
        },
        lineStyle: {
          color: '#ef5350',
          width: 2,
          type: [5, 5],
          cap: 'round'
        },
        emphasis: {
          lineStyle: {
            width: 3
          }
        },
        z: 6
      },
      {
        name: '价值线+10%',
        type: 'line',
        data: valuePlus10Data,
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        itemStyle: {
          color: '#ff9800'
        },
        lineStyle: {
          color: '#ff9800',
          width: 2,
          type: [5, 5],
          cap: 'round'
        },
        emphasis: {
          lineStyle: {
            width: 3
          }
        },
        z: 7
      },
      {
        name: '大师价值线',
        type: 'line',
        data: medpsData,
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        itemStyle: {
          color: '#ffa726'
        },
        lineStyle: {
          color: '#ffa726',
          width: 3.5,
          shadowColor: 'rgba(255, 167, 38, 0.4)',
          shadowBlur: 8,
          shadowOffsetY: 3,
          cap: 'round'
        },
        emphasis: {
          lineStyle: {
            width: 4.5,
            shadowBlur: 12
          }
        },
        z: 10
      },
      {
        name: '价值线-10%',
        type: 'line',
        data: valueMinus10Data,
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        itemStyle: {
          color: '#66bb6a'
        },
        lineStyle: {
          color: '#66bb6a',
          width: 2,
          type: [5, 5],
          cap: 'round'
        },
        emphasis: {
          lineStyle: {
            width: 3
          }
        },
        z: 8
      },
      {
        name: '价值线-30%',
        type: 'line',
        data: valueMinus30Data,
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        itemStyle: {
          color: '#2e7d32'
        },
        lineStyle: {
          color: '#2e7d32',
          width: 2,
          type: [5, 5],
          cap: 'round'
        },
        emphasis: {
          lineStyle: {
            width: 3
          }
        },
        z: 9
      },
      {
        name: '股价',
        type: 'line',
        data: priceData,
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        itemStyle: {
          color: '#42a5f5'
        },
        lineStyle: {
          color: '#42a5f5',
          width: 4,
          shadowColor: 'rgba(66, 165, 245, 0.5)',
          shadowBlur: 10,
          shadowOffsetY: 4,
          cap: 'round'
        },
        emphasis: {
          lineStyle: {
            width: 5,
            shadowBlur: 15
          }
        },
        z: 15
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
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 0 1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
  border: 1px solid rgba(66, 165, 245, 0.1);
  transition: all 0.3s ease;
}

.valuation-chart-card:hover {
  box-shadow: 
    0 8px 30px rgba(0, 0, 0, 0.12),
    0 0 1px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
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
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid transparent;
  background: linear-gradient(to right, rgba(66, 165, 245, 0.15), rgba(255, 167, 38, 0.15)) left bottom no-repeat;
  background-size: 100% 2px;
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
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffa726 0%, #ff9800 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.chart-status-badge {
  padding: 8px 20px;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.status-undervalued-severe {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  color: #2e7d32;
  border: 1px solid rgba(46, 125, 50, 0.2);
}

.status-undervalued {
  background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%);
  color: #558b2f;
  border: 1px solid rgba(85, 139, 47, 0.2);
}

.status-fair {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1976d2;
  border: 1px solid rgba(25, 118, 210, 0.2);
}

.status-overvalued {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  color: #c62828;
  border: 1px solid rgba(198, 40, 40, 0.2);
}

.valuation-chart {
  width: 100%;
  height: 450px;
  border-radius: 8px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(248,249,250,0.5));
  padding: 8px;
}
</style>
