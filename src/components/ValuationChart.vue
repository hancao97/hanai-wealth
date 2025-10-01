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
          <div class="chart-prices-container">
            <div class="prices-label">当前价格 / 价值</div>
            <div class="chart-prices-row">
              <span class="price-amount">¥{{ currentPrice }}</span>
              <span class="price-divider">/</span>
            <span class="value-amount">¥{{ currentValue }}</span>
            </div>
          </div>
          <!-- 实时数据标识 -->
          <div class="realtime-indicator">
            <span class="realtime-dot"></span>
            <span class="realtime-text">当日数据</span>
          </div>
        </div>
        <div class="chart-status-badge" :class="statusBadgeClass">
          {{ statusText }}
        </div>
      </div>
      
      <!-- 图表和统计信息的左右布局 -->
      <div class="chart-stats-wrapper">
        <!-- 左侧：图表 -->
        <div class="chart-section">
      <div ref="chartRef" class="valuation-chart"></div>
        </div>
        
        <!-- 右侧：历史偏离统计 -->
        <div class="stats-section">
          <div class="deviation-stats">
            <div class="stats-title">
              <span class="stats-icon">📊</span>
              <span>历史偏离</span>
            </div>
            
            <div class="stat-item stat-max">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">🔥</div>
              </div>
              <div class="stat-content">
                <div class="stat-label">最大高估</div>
                <div class="stat-value">{{ maxDeviation.percentage }}</div>
                <div class="stat-date">📅 {{ maxDeviation.date }}</div>
                <div class="stat-divider"></div>
                <div class="stat-details">
                  <div class="stat-detail-row">
                    <span class="stat-detail-label">当日股价</span>
                    <span class="stat-detail-value">¥{{ maxDeviation.price }}</span>
                  </div>
                  <div class="stat-detail-row">
                    <span class="stat-detail-label">当日价值</span>
                    <span class="stat-detail-value">¥{{ maxDeviation.value }}</span>
                  </div>
                </div>
              </div>
              <div class="stat-decoration stat-decoration-max"></div>
            </div>
            
            <div class="stat-item stat-min">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">💎</div>
              </div>
              <div class="stat-content">
                <div class="stat-label">最大低估</div>
                <div class="stat-value">{{ minDeviation.percentage }}</div>
                <div class="stat-date">📅 {{ minDeviation.date }}</div>
                <div class="stat-divider"></div>
                <div class="stat-details">
                  <div class="stat-detail-row">
                    <span class="stat-detail-label">当日股价</span>
                    <span class="stat-detail-value">¥{{ minDeviation.price }}</span>
                  </div>
                  <div class="stat-detail-row">
                    <span class="stat-detail-label">当日价值</span>
                    <span class="stat-detail-value">¥{{ minDeviation.value }}</span>
                  </div>
                </div>
              </div>
              <div class="stat-decoration stat-decoration-min"></div>
            </div>
          </div>
        </div>
      </div>
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
const maxDeviation = ref({ percentage: '--', date: '--' })
const minDeviation = ref({ percentage: '--', date: '--' })

const statusText = computed(() => {
  if (!currentValue.value || currentValue.value === '--') return '--'
  const price = parseFloat(currentPrice.value)
  const value = parseFloat(currentValue.value)
  if (isNaN(price) || isNaN(value)) return '--'
  
  // 以价值为基准，计算价格相对价值的偏离比例
  // 公式：(价格 - 价值) / 价值 × 100%
  // 正数表示高估（价格高于价值），负数表示低估（价格低于价值，即便宜）
  const deviation = ((price - value) / value * 100)
  const upsideText = deviation > 0 
    ? `+${deviation.toFixed(1)}%` 
    : `${deviation.toFixed(1)}%`
  
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

// 计算历史偏离统计
// 找出历史上价格相对价值偏离最大和最小的时刻
const calculateDeviationStats = (alignedMedpsData, priceData) => {
  if (!alignedMedpsData.length || !priceData.length) {
    return { max: null, min: null }
  }
  
  let maxDev = { percentage: -Infinity, date: null, price: null, value: null }
  let minDev = { percentage: Infinity, date: null, price: null, value: null }
  
  // 使用对齐后的数据，确保每个价格点都有对应的价值
  const minLength = Math.min(alignedMedpsData.length, priceData.length)
  
  for (let i = 0; i < minLength; i++) {
    const date = priceData[i][0]
    const price = priceData[i][1]
    const value = alignedMedpsData[i][1]
    
    // 跳过无效数据
    if (!value || !price || price <= 0 || value <= 0) {
      continue
    }
    
    // 计算偏离百分比：(价格 - 价值) / 价值 × 100%
    const deviation = ((price - value) / value * 100)
    
    // 找最大偏离（最高估，正值最大）
    if (deviation > maxDev.percentage) {
      maxDev = {
        percentage: deviation,
        date: new Date(date),
        price: price,
        value: value
      }
    }
    
    // 找最小偏离（最低估，负值最大/最小）
    if (deviation < minDev.percentage) {
      minDev = {
        percentage: deviation,
        date: new Date(date),
        price: price,
        value: value
      }
    }
  }
  
  // 如果没有找到有效数据
  if (maxDev.percentage === -Infinity || minDev.percentage === Infinity) {
    return { max: null, min: null }
  }
  
  return { max: maxDev, min: minDev }
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
  
  // 计算历史偏离统计（使用对齐后的价值数据）
  const deviationStats = calculateDeviationStats(alignedMedpsData, priceData)
  
  console.log('deviationStats', deviationStats)
  
  if (deviationStats.max && deviationStats.max.date) {
    const date = deviationStats.max.date
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    maxDeviation.value = {
      percentage: deviationStats.max.percentage > 0 
        ? `+${deviationStats.max.percentage.toFixed(1)}%` 
        : `${deviationStats.max.percentage.toFixed(1)}%`,
      date: dateStr,
      price: deviationStats.max.price.toFixed(2),
      value: deviationStats.max.value.toFixed(2)
    }
  } else {
    maxDeviation.value = { percentage: '--', date: '--', price: '--', value: '--' }
  }
  
  if (deviationStats.min && deviationStats.min.date) {
    const date = deviationStats.min.date
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    minDeviation.value = {
      percentage: deviationStats.min.percentage > 0 
        ? `+${deviationStats.min.percentage.toFixed(1)}%` 
        : `${deviationStats.min.percentage.toFixed(1)}%`,
      date: dateStr,
      price: deviationStats.min.price.toFixed(2),
      value: deviationStats.min.value.toFixed(2)
    }
  } else {
    minDeviation.value = { percentage: '--', date: '--', price: '--', value: '--' }
  }
  
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
        
        // 查找股价和大师价值线的值
        let priceValue = null
        let valuePrice = null
        
        params.forEach(item => {
          if (item.seriesName === '股价') {
            priceValue = item.value[1]
          } else if (item.seriesName === '大师价值线') {
            valuePrice = item.value[1]
          }
        })
        
        // 显示各项数据
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
        
        // 如果同时有价格和价值，计算并显示偏离比例
        if (priceValue !== null && valuePrice !== null && valuePrice > 0) {
          const deviation = ((priceValue - valuePrice) / valuePrice * 100)
          const deviationText = deviation > 0 ? `+${deviation.toFixed(1)}%` : `${deviation.toFixed(1)}%`
          
          // 根据偏离比例确定颜色和标签
          let deviationColor
          let deviationLabel
          
          if (deviation > 10) {
            deviationColor = '#ef4444'  // 红色
            deviationLabel = '高估'
          } else if (deviation < -10) {
            deviationColor = '#10b981'  // 绿色
            deviationLabel = '低估'
          } else {
            deviationColor = '#3b82f6'  // 蓝色
            deviationLabel = '合理'
          }
          
          result += `<div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #666; font-size: 12px;">价格偏离：</span>
              <span style="font-weight: 700; font-size: 14px; color: ${deviationColor};">
                ${deviationText}
                <span style="font-size: 11px; margin-left: 4px; opacity: 0.8;">${deviationLabel}</span>
              </span>
            </div>
          </div>`
        }
        
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
  position: relative;
}

/* 实时数据标识 */
.realtime-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(102, 187, 106, 0.1));
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  color: #2e7d32;
  backdrop-filter: blur(10px);
  margin-top: 4px;
}

.realtime-dot {
  width: 6px;
  height: 6px;
  background: #4caf50;
  border-radius: 50%;
  animation: pulse-dot 2s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
}

@keyframes pulse-dot {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 0 4px rgba(76, 175, 80, 0);
  }
}

.realtime-text {
  letter-spacing: 0.3px;
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

.chart-prices-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prices-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.chart-prices-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.price-amount {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 10px rgba(66, 165, 245, 0.2);
}

.price-divider {
  font-size: 24px;
  font-weight: 300;
  color: #ccc;
  margin: 0 -4px;
}

.value-amount {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffa726 0%, #ff9800 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 10px rgba(255, 167, 38, 0.2);
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

/* 图表和统计的左右布局 */
.chart-stats-wrapper {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.chart-section {
  flex: 1;
  min-width: 0;
}

.stats-section {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.valuation-chart {
  width: 100%;
  height: 550px;
  border-radius: 12px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(248,249,250,0.5));
  padding: 8px;
}

/* 炫酷的历史偏离统计卡片 */
.deviation-stats {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.deviation-stats .stat-item {
  flex: 1;
}

.stats-title {
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.15) 100%);
  border-radius: 12px;
  color: #667eea;
  border: 1.5px solid rgba(102, 126, 234, 0.3);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.stats-icon {
  font-size: 20px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}

.stat-item {
  position: relative;
  padding: 20px;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.stat-item:hover {
  transform: translateY(-4px) scale(1.02);
}

.stat-max {
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.12) 0%, rgba(238, 90, 111, 0.15) 100%);
  border: 1.5px solid rgba(255, 107, 107, 0.3);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.15);
}

.stat-max:hover {
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.18) 0%, rgba(238, 90, 111, 0.22) 100%);
  border-color: rgba(255, 107, 107, 0.4);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.25);
}

.stat-min {
  background: linear-gradient(135deg, rgba(81, 207, 102, 0.12) 0%, rgba(55, 178, 77, 0.15) 100%);
  border: 1.5px solid rgba(81, 207, 102, 0.3);
  box-shadow: 0 4px 12px rgba(81, 207, 102, 0.15);
}

.stat-min:hover {
  background: linear-gradient(135deg, rgba(81, 207, 102, 0.18) 0%, rgba(55, 178, 77, 0.22) 100%);
  border-color: rgba(81, 207, 102, 0.4);
  box-shadow: 0 6px 20px rgba(81, 207, 102, 0.25);
}

.stat-icon-wrapper {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  font-size: 24px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stat-max .stat-label {
  color: rgba(238, 90, 111, 0.8);
}

.stat-min .stat-label {
  color: rgba(55, 178, 77, 0.8);
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 4px;
  line-height: 1;
}

.stat-max .stat-value {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-min .stat-value {
  background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-date {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

/* 分割线 */
.stat-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.08) 50%, transparent 100%);
  margin: 12px 0;
}

/* 详细信息区域 */
.stat-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.stat-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  backdrop-filter: blur(5px);
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.stat-detail-row:hover {
  background: rgba(255, 255, 255, 0.7);
  transform: translateX(4px);
  border-color: rgba(255, 255, 255, 0.8);
}

.stat-detail-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 500;
}

.stat-max .stat-detail-value {
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-min .stat-detail-value {
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 装饰元素 */
.stat-decoration {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  opacity: 0.15;
  pointer-events: none;
}

.stat-decoration-max {
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
  top: -30px;
  right: -30px;
  animation: rotate 10s linear infinite;
}

.stat-decoration-min {
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
  bottom: -30px;
  left: -30px;
  animation: rotate-reverse 10s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes rotate-reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

@media (max-width: 1024px) {
  .chart-stats-wrapper {
    flex-direction: column;
  }
  
  .stats-section {
    width: 100%;
  }
  
  .deviation-stats {
    flex-direction: row;
  }
  
  .stat-item {
    flex: 1;
  }
}

@media (max-width: 640px) {
  .deviation-stats {
    flex-direction: column;
  }
}
</style>
