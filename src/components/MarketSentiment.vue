<template>
  <div class="market-sentiment-container">
    <h3 class="market-sentiment-title">
      <span class="title-icon">📈</span>
      市场情绪波动曲线
      <span class="title-decoration"></span>
    </h3>
    <div class="sentiment-chart-wrapper">
      <div v-if="isLoadingSentiment && (!sentimentData || sentimentData.length === 0)" class="sentiment-loading">
        <div class="loading-spinner"></div>
        <p>正在加载市场情绪数据...</p>
      </div>
      <div v-else-if="!isLoadingSentiment && (!sentimentData || sentimentData.length === 0)" class="sentiment-empty">
        <p>暂无足够的历史数据</p>
      </div>
      <div v-else ref="chartRef" class="sentiment-chart"></div>
    </div>
    <div v-if="currentSentiment !== null && !isLoadingSentiment" class="sentiment-info">
      <div class="sentiment-score" :class="getSentimentClass(currentSentiment)">
        <span class="score-label">当前情绪指数</span>
        <span class="score-value">{{ currentSentiment }}</span>
        <span class="score-unit">分</span>
      </div>
      <div class="sentiment-desc">
        <span class="desc-icon">{{ getSentimentIcon(currentSentiment) }}</span>
        <span class="desc-text">{{ getSentimentDescription(currentSentiment) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  sentimentData: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// 本地加载状态
const isLoadingSentiment = ref(true)

const chartRef = ref(null)
let chart = null

// 当前情绪指数（最新一天）
const currentSentiment = computed(() => {
  if (!props.sentimentData || props.sentimentData.length === 0) return null
  return props.sentimentData[props.sentimentData.length - 1]?.value || null
})

// 初始化图表
const initChart = async () => {
  await nextTick()
  
  if (!chartRef.value) return
  
  if (chart) {
    chart.dispose()
  }
  
  chart = echarts.init(chartRef.value)
  updateChart()
}

// 更新图表
const updateChart = () => {
  if (!chart || !props.sentimentData || props.sentimentData.length === 0) return
  
  const dates = props.sentimentData.map(item => item.date)
  const values = props.sentimentData.map(item => item.value)
  
  const option = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    animationDelay: 0,
    grid: {
      left: '6%',
      right: '6%',
      top: '12%',
      bottom: '15%',
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: [12, 16],
      textStyle: {
        color: '#334155',
        fontSize: 13
      },
      extraCssText: 'box-shadow: 0 8px 24px rgba(0,0,0,0.12);',
      formatter: function(params) {
        const data = params[0]
        const value = data.value
        const sentiment = getSentimentDescription(value)
        const icon = getSentimentIcon(value)
        return `
          <div style="font-weight: 600; margin-bottom: 6px;">${data.name}</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">${icon}</span>
            <span style="font-size: 16px; font-weight: 700; color: ${getSentimentColor(value)};">
              ${value}分
            </span>
          </div>
          <div style="margin-top: 4px; font-size: 12px; color: #64748b;">
            ${sentiment}
          </div>
        `
      }
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#cbd5e1',
          width: 2
        }
      },
      axisLabel: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: 500,
        rotate: 45,
        interval: 'auto',
        formatter: function(value) {
          // 格式化日期，只显示月-日
          return value.substring(5)
        }
      },
      axisTick: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      interval: 20,
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: 500,
        formatter: '{value}'
      },
      splitLine: {
        lineStyle: {
          color: '#e2e8f0',
          type: 'dashed'
        }
      }
    },
    series: [
      // 主折线
      {
        type: 'line',
        data: values,
        z: 10,
        smooth: false,
        symbol: 'circle',
        symbolSize: 8,
        showSymbol: true,
        itemStyle: {
          color: '#ffffff',
          borderColor: '#3b82f6',
          borderWidth: 3,
          shadowBlur: 8,
          shadowColor: 'rgba(59, 130, 246, 0.3)'
        },
        lineStyle: {
          width: 3,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#10b981' },
              { offset: 0.5, color: '#3b82f6' },
              { offset: 1, color: '#8b5cf6' }
            ]
          },
          shadowBlur: 10,
          shadowColor: 'rgba(59, 130, 246, 0.3)',
          shadowOffsetY: 3
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 0.7, color: 'rgba(59, 130, 246, 0.1)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.02)' }
            ]
          }
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            width: 2,
            type: 'dashed'
          },
          label: {
            show: true,
            position: 'end',
            fontSize: 11,
            fontWeight: 600,
            distance: 8
          },
          data: [
            {
              yAxis: 80,
              lineStyle: {
                color: 'rgba(239, 68, 68, 0.4)',
                width: 2,
                type: 'dashed'
              },
              label: {
                color: 'rgba(239, 68, 68, 0.8)',
                formatter: '过热 80',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: [4, 8],
                borderRadius: 4
              }
            },
            {
              yAxis: 20,
              lineStyle: {
                color: 'rgba(99, 102, 241, 0.4)',
                width: 2,
                type: 'dashed'
              },
              label: {
                color: 'rgba(99, 102, 241, 0.8)',
                formatter: '冰点 20',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: [4, 8],
                borderRadius: 4
              }
            }
          ]
        },
        markArea: {
          silent: true,
          itemStyle: {
            color: 'transparent'
          },
          emphasis: {
            disabled: true
          },
          data: [
            // 过热区域（80-100）
            [
              {
                yAxis: 80,
                itemStyle: {
                  color: 'rgba(239, 68, 68, 0.08)'
                }
              },
              {
                yAxis: 100
              }
            ],
            // 冰点区域（0-20）
            [
              {
                yAxis: 0,
                itemStyle: {
                  color: 'rgba(99, 102, 241, 0.08)'
                }
              },
              {
                yAxis: 20
              }
            ]
          ]
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderWidth: 4,
            shadowBlur: 12,
            symbolSize: 12
          }
        },
        animationDelay: 0,
        animationDuration: 800,
        animationEasing: 'cubicOut'
      }
    ]
  }
  
  chart.setOption(option)
}

// 获取情绪等级
const getSentimentClass = (value) => {
  if (value >= 80) return 'sentiment-overheat'
  if (value >= 70) return 'sentiment-excellent'
  if (value >= 60) return 'sentiment-good'
  if (value >= 50) return 'sentiment-neutral'
  if (value >= 40) return 'sentiment-poor'
  if (value >= 20) return 'sentiment-bad'
  return 'sentiment-freezing'
}

// 获取情绪图标
const getSentimentIcon = (value) => {
  if (value >= 80) return '🌡️'
  if (value >= 60) return '😊'
  if (value >= 40) return '😐'
  if (value >= 20) return '😰'
  return '🥶'
}

// 获取情绪描述
const getSentimentDescription = (value) => {
  if (value >= 80) return '市场过热'
  if (value >= 60) return '市场情绪良好'
  if (value >= 40) return '市场情绪均衡'
  if (value >= 20) return '市场情绪低迷'
  return '市场冰点'
}

// 获取情绪颜色
const getSentimentColor = (value) => {
  if (value >= 80) return '#dc2626'
  if (value >= 60) return '#10b981'
  if (value >= 40) return '#f59e0b'
  if (value >= 20) return '#64748b'
  return '#6366f1'
}

// 响应式处理
const handleResize = () => {
  if (chart) {
    chart.resize()
  }
}

// 生命周期
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (chart) {
    chart.dispose()
  }
  window.removeEventListener('resize', handleResize)
})

// 监听数据变化
watch(() => props.sentimentData, async (newData) => {
  if (newData && newData.length > 0) {
    isLoadingSentiment.value = false
    await nextTick()
    if (!chart && chartRef.value) {
      await initChart()
    } else if (chart) {
      updateChart()
    }
  }
}, { deep: true, immediate: true })

watch(() => props.loading, (newLoading) => {
  if (!newLoading && props.sentimentData && props.sentimentData.length > 0) {
    isLoadingSentiment.value = false
    initChart()
  }
})
</script>

<style scoped>
.market-sentiment-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  border: none;
  border-radius: 24px;
  padding: 32px;
  margin: 24px 0;
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.25);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.market-sentiment-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent);
  background-size: 30px 30px;
  pointer-events: none;
  opacity: 0.5;
}

.market-sentiment-title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 900;
  color: white;
  text-align: center;
  text-shadow: 0 4px 8px rgba(0,0,0,0.3);
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.title-icon {
  font-size: 28px;
  animation: titleIconFloat 3s ease-in-out infinite;
}

@keyframes titleIconFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-4px) rotate(5deg); }
  75% { transform: translateY(4px) rotate(-5deg); }
}

.title-decoration {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 4px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
  border-radius: 2px;
}

.sentiment-chart-wrapper {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 20px;
  position: relative;
  z-index: 1;
  min-height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sentiment-chart {
  width: 100%;
  height: 350px;
}

.sentiment-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #64748b;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(59, 130, 246, 0.2);
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.sentiment-empty {
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
  padding: 40px;
}

.sentiment-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  position: relative;
  z-index: 1;
}

.sentiment-score {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.score-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.score-value {
  font-size: 32px;
  font-weight: 900;
  color: white;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.score-unit {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.sentiment-overheat .score-value { color: #fef2f2; text-shadow: 0 0 20px #dc2626; }
.sentiment-excellent .score-value { color: #fef2f2; text-shadow: 0 0 20px #ef4444; }
.sentiment-good .score-value { color: #dcfce7; text-shadow: 0 0 20px #10b981; }
.sentiment-neutral .score-value { color: #dbeafe; text-shadow: 0 0 20px #3b82f6; }
.sentiment-poor .score-value { color: #fef3c7; text-shadow: 0 0 20px #f59e0b; }
.sentiment-bad .score-value { color: #f1f5f9; text-shadow: 0 0 20px #64748b; }
.sentiment-freezing .score-value { color: #e0e7ff; text-shadow: 0 0 20px #6366f1; }

.sentiment-desc {
  display: flex;
  align-items: center;
  gap: 8px;
}

.desc-icon {
  font-size: 24px;
}

.desc-text {
  font-size: 14px;
  font-weight: 600;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .market-sentiment-container {
    padding: 24px 16px;
    margin: 16px 0;
  }
  
  .market-sentiment-title {
    font-size: 20px;
    margin-bottom: 16px;
  }
  
  .title-icon {
    font-size: 24px;
  }
  
  .sentiment-chart-wrapper {
    padding: 16px;
    min-height: 250px;
  }
  
  .sentiment-chart {
    height: 250px;
  }
  
  .sentiment-info {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .score-value {
    font-size: 28px;
  }
}

@media (max-width: 480px) {
  .market-sentiment-container {
    padding: 16px 12px;
  }
  
  .market-sentiment-title {
    font-size: 18px;
    gap: 8px;
  }
  
  .sentiment-chart {
    height: 220px;
  }
  
  .score-value {
    font-size: 24px;
  }
  
  .desc-text {
    font-size: 12px;
  }
}
</style>

