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
  
  // 以当前价格为基准，计算到价值线的涨跌幅
  // 公式：(价值 - 当前价格) / 当前价格 × 100%
  const upside = ((value - price) / price * 100)
  const upsideText = upside > 0 
    ? `+${upside.toFixed(1)}%` 
    : `${upside.toFixed(1)}%`
  
  // 根据价格相对价值的位置判断状态
  // 当前价格/价值的比率
  const priceToValueRatio = price / value
  
  if (priceToValueRatio >= 1.3) return `严重高估 ${upsideText}`  // 价格≥价值的130%
  if (priceToValueRatio >= 1.1) return `高估 ${upsideText}`      // 价格≥价值的110%
  if (priceToValueRatio >= 0.9) return `合理 ${upsideText}`      // 价格在价值的90%-110%之间
  if (priceToValueRatio >= 0.7) return `低估 ${upsideText}`      // 价格在价值的70%-90%之间
  return `严重低估 ${upsideText}`                                 // 价格<价值的70%
})

const statusBadgeClass = computed(() => {
  const text = statusText.value
  if (text.includes('严重高估')) return 'status-overvalued-severe'
  if (text.includes('高估')) return 'status-overvalued'
  if (text.includes('合理')) return 'status-fair'
  if (text.includes('低估') && !text.includes('严重')) return 'status-undervalued'
  if (text.includes('严重低估')) return 'status-undervalued-severe'
  return 'status-fair'
})

// 数据对齐函数：将价值线数据对齐到价格线的每个日期，并延伸到价值线最后日期
const alignValueDataToPrice = (medpsData, priceData) => {
  if (!medpsData.length || !priceData.length) return medpsData
  
  // 将 medpsData 转换为 Map，便于查找
  const medpsMap = new Map()
  medpsData.forEach(item => {
    const dateKey = new Date(item[0]).toDateString()
    medpsMap.set(dateKey, item[1])
  })
  
  // 获取价格线的最后一个日期和价值线的最后一个日期
  const lastPriceDate = new Date(priceData[priceData.length - 1][0])
  const lastMedpsDate = new Date(medpsData[medpsData.length - 1][0])
  
  // 确定结束日期：取价值线和价格线中较晚的日期
  const endDate = lastMedpsDate > lastPriceDate ? lastMedpsDate : lastPriceDate
  
  const result = []
  
  // 第一阶段：处理价格线的所有日期
  for (let i = 0; i < priceData.length; i++) {
    const priceDate = new Date(priceData[i][0])
    const dateKey = priceDate.toDateString()
    
    // 如果该日期在 medpsData 中存在，直接使用
    if (medpsMap.has(dateKey)) {
      result.push([priceData[i][0], medpsMap.get(dateKey)])
    } else {
      // 否则进行线性插值
      const interpolatedValue = interpolateValue(medpsData, priceDate)
      if (interpolatedValue !== null) {
        result.push([priceData[i][0], interpolatedValue])
      }
    }
  }
  
  // 第二阶段：如果价值线的日期超过了价格线，继续添加剩余的价值线数据
  if (lastMedpsDate > lastPriceDate) {
    for (let i = 0; i < medpsData.length; i++) {
      const medpsDate = new Date(medpsData[i][0])
      
      // 只添加在价格线最后日期之后的价值数据
      if (medpsDate > lastPriceDate) {
        result.push([medpsData[i][0], medpsData[i][1]])
      }
    }
  }
  
  return result
}

// 线性插值函数
const interpolateValue = (medpsData, targetDate) => {
  const targetTime = targetDate.getTime()
  
  // 找到目标日期前后的两个数据点
  let beforePoint = null
  let afterPoint = null
  
  for (let i = 0; i < medpsData.length; i++) {
    const currentTime = new Date(medpsData[i][0]).getTime()
    
    if (currentTime <= targetTime) {
      beforePoint = medpsData[i]
    }
    
    if (currentTime >= targetTime && !afterPoint) {
      afterPoint = medpsData[i]
      break
    }
  }
  
  // 如果找不到前后点，返回最近的值
  if (!beforePoint && !afterPoint) return null
  if (!beforePoint) return afterPoint[1]
  if (!afterPoint) return beforePoint[1]
  
  // 如果目标日期正好在某个数据点上
  const beforeTime = new Date(beforePoint[0]).getTime()
  const afterTime = new Date(afterPoint[0]).getTime()
  
  if (beforeTime === targetTime) return beforePoint[1]
  if (afterTime === targetTime) return afterPoint[1]
  
  // 线性插值计算
  const ratio = (targetTime - beforeTime) / (afterTime - beforeTime)
  const interpolatedValue = beforePoint[1] + (afterPoint[1] - beforePoint[1]) * ratio
  
  return interpolatedValue
}

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
  
  // 数据对齐：为价值线插值，使其与价格线的每个日期对齐
  const alignedMedpsData = alignValueDataToPrice(medpsData, priceData)

  console.log('chartData', medpsData, priceData)

  console.log('alignedMedpsData', alignedMedpsData,priceData)
  
  // 获取最新的价值和价格
  currentValue.value = chartData.iv?.toFixed(2) ?? '--';
  if (priceData.length > 0) {
    currentPrice.value = priceData[priceData.length - 1][1].toFixed(2)
  }

  console.log('currentValue', currentPrice.value)
  
  // 计算各条价值参考线数据
  const valuePlus30Data = alignedMedpsData.map(item => [item[0], item[1] * 1.3])
  const valuePlus10Data = alignedMedpsData.map(item => [item[0], item[1] * 1.1])
  const valueMinus10Data = alignedMedpsData.map(item => [item[0], item[1] * 0.9])
  const valueMinus30Data = alignedMedpsData.map(item => [item[0], item[1] * 0.7])
  
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
      // 背景区域 - 使用堆叠方式，避免颜色重叠失真
      // 从底部开始堆叠，每层只显示该区间的颜色
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
          color: 'rgba(46, 125, 50, 0.15)'
        },
        stack: 'valuation-bg',
        silent: true,
        z: 1
      },
      {
        name: '低估区',
        type: 'line',
        data: valueMinus10Data.map((item, index) => [
          item[0],
          item[1] - valueMinus30Data[index][1]
        ]),
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        lineStyle: {
          width: 0,
          color: 'transparent'
        },
        areaStyle: {
          color: 'rgba(102, 187, 106, 0.12)'
        },
        stack: 'valuation-bg',
        silent: true,
        z: 1
      },
      {
        name: '合理偏低区',
        type: 'line',
        data: alignedMedpsData.map((item, index) => [
          item[0],
          item[1] - valueMinus10Data[index][1]
        ]),
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        lineStyle: {
          width: 0,
          color: 'transparent'
        },
        areaStyle: {
          color: 'rgba(129, 199, 132, 0.08)'
        },
        stack: 'valuation-bg',
        silent: true,
        z: 1
      },
      {
        name: '合理偏高区',
        type: 'line',
        data: valuePlus10Data.map((item, index) => [
          item[0],
          item[1] - alignedMedpsData[index][1]
        ]),
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        lineStyle: {
          width: 0,
          color: 'transparent'
        },
        areaStyle: {
          color: 'rgba(255, 152, 0, 0.08)'
        },
        stack: 'valuation-bg',
        silent: true,
        z: 1
      },
      {
        name: '高估区',
        type: 'line',
        data: valuePlus30Data.map((item, index) => [
          item[0],
          item[1] - valuePlus10Data[index][1]
        ]),
        smooth: true,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'none',
        lineStyle: {
          width: 0,
          color: 'transparent'
        },
        areaStyle: {
          color: 'rgba(239, 83, 80, 0.12)'
        },
        stack: 'valuation-bg',
        silent: true,
        z: 1
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
        data: alignedMedpsData,
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
    const response = await axios.get(`https://www.gurufocus.cn/_api/chart/${props.stockData.stockid}/valuation?locale=zh-hans`)
    const data = response.data
    
    // 先结束 loading 状态，让 DOM 显示出来
    loading.value = false
    
    // 等待 DOM 更新完成后再初始化图表
    await nextTick()
    initChart(data)
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
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

/* 玻璃反光效果 */
.chart-status-badge::before {
  content: '';
  position: absolute;
  top: -100%;
  left: -100%;
  width: 300%;
  height: 300%;
  background: linear-gradient(
    45deg,
    transparent 35%,
    rgba(255, 255, 255, 0) 35%,
    rgba(255, 255, 255, 0.2) 48%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0.2) 52%,
    rgba(255, 255, 255, 0) 65%,
    transparent 65%
  );
  transform: translateX(-100%) translateY(-100%);
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.chart-status-badge:hover::before {
  transform: translateX(100%) translateY(100%);
}

/* 发光边缘效果 */
.chart-status-badge::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 24px;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.8),
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.8)
  );
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.chart-status-badge:hover::after {
  opacity: 1;
}

.chart-status-badge:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 
    0 8px 20px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

/* 确保文字在最上层 */
.chart-status-badge {
  z-index: 1;
}

.status-overvalued-severe {
  background: linear-gradient(135deg, #ffebee 0%, #ef9a9a 100%);
  color: #b71c1c;
  border: 1px solid rgba(183, 28, 28, 0.3);
}

.status-overvalued {
  background: linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%);
  color: #e65100;
  border: 1px solid rgba(230, 81, 0, 0.3);
}

.status-fair {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1976d2;
  border: 1px solid rgba(25, 118, 210, 0.2);
}

.status-undervalued {
  background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%);
  color: #558b2f;
  border: 1px solid rgba(85, 139, 47, 0.2);
}

.status-undervalued-severe {
  background: linear-gradient(135deg, #e8f5e9 0%, #a5d6a7 100%);
  color: #2e7d32;
  border: 1px solid rgba(46, 125, 50, 0.3);
}

.valuation-chart {
  width: 100%;
  height: 450px;
  border-radius: 8px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(248,249,250,0.5));
  padding: 8px;
}
</style>
